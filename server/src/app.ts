import path from "path";
import fs from "fs";
import crypto from "crypto";
import express, { type Request } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { logger } from "./utils/logger";
import "./auth/types";
import { installationGate } from "./middleware/installationGate";
import { hostedRealmReadOnlyGuard } from "./middleware/hostedRealmReadOnly";
import { requireRealmFeature } from "./middleware/requireRealmFeature";
import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./health/routes";
import { setupRouter } from "./setup/routes";
import { authRouter } from "./routes/authRoutes";
import { requireAuth } from "./middleware/auth";
import { adminRouter } from "./routes/adminRoutes";
import { eventRouter } from "./routes/eventRoutes";
import { taskRouter } from "./routes/taskRoutes";
import { noteRouter } from "./routes/noteRoutes";
import { extraRouter } from "./routes/extraRoutes";
import { stateRouter } from "./routes/stateRoutes";
import { syncRouter } from "./routes/syncRoutes";
import { compensationRouter } from "./routes/compensationRoutes";
import { leaveRouter } from "./routes/leaveRoutes";
import { attendanceRouter } from "./routes/attendanceRoutes";
import { inventoryRouter } from "./routes/inventoryRoutes";
import { holidayRouter } from "./routes/holidayRoutes";
import { notificationRouter } from "./routes/notificationRoutes";
import { publicPushRouter, pushRouter } from "./routes/pushRoutes";
import { bugRouter } from "./routes/bugRoutes";
import { mediaRouter } from "./routes/mediaRoutes";
import { chatRouter } from "./routes/chatRoutes";
import { backupRouter } from "./routes/backupRoutes";
import { filesRouter } from "./routes/filesRoutes";
import { systemUpdateRouter } from "./routes/systemUpdateRoutes";
import { isInstalled } from "./db/installState";
import { getRuntimeConfig } from "./config/env";
import { buildBasePathUrl, getRequestBasePath, getStorageScope } from "./utils/publicBasePath";

type UiReleaseChannel = "stable" | "beta" | "dev";

function isTruthy(value: unknown): boolean {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function resolveTrustProxySetting(): boolean | number | string {
  const raw = String(process.env.PROCAL_TRUST_PROXY ?? process.env.TRUST_PROXY ?? "1").trim();
  if (!raw) return 1;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") {
    return false;
  }
  if (raw === "true" || raw === "yes" || raw === "on") {
    return true;
  }
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.floor(numeric);
  }
  return raw;
}

function resolveAllowedCorsOrigins(): Set<string> {
  const values = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.PROCAL_CORS_ALLOWED_ORIGINS,
    process.env.PUBLIC_DOMAIN ? `https://${process.env.PUBLIC_DOMAIN}` : "",
    process.env.PUBLIC_DOMAIN ? `http://${process.env.PUBLIC_DOMAIN}` : ""
  ]
    .join(",")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return new Set(values);
}

function normalizeCorsOrigin(value: unknown): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getCspNonce(req: Request): string {
  const requestWithNonce = req as Request & { cspNonce?: string };
  if (!requestWithNonce.cspNonce) {
    requestWithNonce.cspNonce = crypto.randomBytes(18).toString("base64");
  }
  return requestWithNonce.cspNonce;
}

function buildContentSecurityPolicy(req: Request): string {
  const nonce = getCspNonce(req);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "frame-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ].join("; ");
}

function splitHeaderValues(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item || "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRequestOriginCandidates(req: Request): Set<string> {
  const hosts = splitHeaderValues(req.headers["x-forwarded-host"] || req.headers.host);
  const forwardedProtos = splitHeaderValues(req.headers["x-forwarded-proto"])
    .map((item) => item.toLowerCase())
    .filter((item) => item === "http" || item === "https");
  const protos = forwardedProtos.length
    ? forwardedProtos
    : [req.protocol || (req.secure ? "https" : "http")];
  const origins = new Set<string>();
  for (const host of hosts) {
    for (const proto of protos) {
      origins.add(normalizeCorsOrigin(`${proto}://${host}`));
    }
  }
  return origins;
}

function isCorsOriginAllowed(req: Request, allowedCorsOrigins: Set<string>): boolean {
  const normalizedOrigin = normalizeCorsOrigin(req.headers.origin);
  if (!normalizedOrigin) return true;
  if (allowedCorsOrigins.has(normalizedOrigin)) return true;
  if (getRequestOriginCandidates(req).has(normalizedOrigin)) return true;
  return process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);
}

function normalizeUiReleaseChannel(value: unknown): UiReleaseChannel {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "dev" || raw === "development") {
    return "dev";
  }
  if (raw === "beta" || raw === "beta-test") {
    return "beta";
  }
  return "stable";
}

function resolveUiReleaseChannel(): UiReleaseChannel {
  return normalizeUiReleaseChannel(
    process.env.PROCAL_RELEASE_CHANNEL || process.env.REALM_RELEASE_CHANNEL || ""
  );
}

function usesDedicatedBodyParser(req: Request): boolean {
  const parserScopedPaths = new Set([
    "/api/admin/backups/import",
    "/api/admin/backups/validate-upload",
    "/api/admin/backups/restore-upload"
  ]);
  return parserScopedPaths.has(req.path);
}

const uiReleaseChannel = resolveUiReleaseChannel();
const appPath = path.resolve(__dirname, "../../app");
const projectRootPath = path.resolve(__dirname, "../..");

function buildDocumentBaseHref(req: any): string {
  const basePath = getRequestBasePath(req);
  return `${basePath || ""}/`;
}

function injectRuntimeIntoHtml(req: any, html: string): string {
  const basePath = getRequestBasePath(req);
  let output = html;
  if (basePath) {
    output = output
      .replace(/location\.href='\/(?!\/)/g, `location.href='${basePath}/`)
      .replace(/location\.href="\/(?!\/)/g, `location.href="${basePath}/`)
      .replace(/location\.replace\('\/(?!\/)/g, `location.replace('${basePath}/`)
      .replace(/location\.replace\("\/(?!\/)/g, `location.replace("${basePath}/`)
      .replace(/window\.location\.href = '\/(?!\/)/g, `window.location.href = '${basePath}/`)
      .replace(/window\.location\.href = "\/(?!\/)/g, `window.location.href = "${basePath}/`)
      .replace(/window\.open\('\/(?!\/)/g, `window.open('${basePath}/`)
      .replace(/window\.open\("\/(?!\/)/g, `window.open("${basePath}/`)
      .replace(/(\s)href="\/(?!\/)/g, `$1href="${basePath}/`)
      .replace(/(\s)href='\/(?!\/)/g, `$1href='${basePath}/`);
  }

  const baseHref = buildDocumentBaseHref(req);
  const runtimeScriptUrl = buildBasePathUrl(req, "/app-runtime.js");
  const headInjection = `<base href="${baseHref}">\n  <script src="${runtimeScriptUrl}"></script>`;
  output = output.includes("<head>")
    ? output.replace("<head>", `<head>\n  ${headInjection}`)
    : `${headInjection}\n${output}`;
  const nonce = getCspNonce(req as Request);
  output = output.replace(/<script(?![^>]*\bnonce=)(?=[\s>])/gi, `<script nonce="${nonce}"`);
  return output;
}

function renderHtmlDocument(req: any, filePath: string): string {
  const raw = fs.readFileSync(filePath, "utf8");
  return injectRuntimeIntoHtml(req, raw);
}

const PROCAL_BRAND_MARK = '<img src="favicon.ico" alt="" width="46" height="46">';
const PROCAL_BRAND_CSS = '.procal-brand{display:flex;align-items:center;gap:.65rem;margin-bottom:.85rem;font-weight:800;color:#0f766e}.procal-brand img{width:46px;height:46px;flex:0 0 auto}.procal-brand span{font-size:1.15rem}';

function renderProCalBrand(): string {
  return `<div class="procal-brand">${PROCAL_BRAND_MARK}<span>ProCal</span></div>`;
}

function buildHostedAuthHtml(req: any, title: string, description: string): string {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem}main{width:min(460px,92vw);padding:1rem;border:1px solid #ddd;border-radius:10px}a{display:block;margin-top:1rem;text-align:center;text-decoration:none;color:#0b6}</style></head>
<body><main><h2>${title}</h2><p>${description}</p><a href="/login">Back to login</a></main></body></html>`;
  return injectRuntimeIntoHtml(req, html);
}

function buildHostedLoginHtml(req: any): string {
  return buildHostedAuthHtml(req, "Local login required", "This self-hosted build uses local login.");
}

function buildHostedRegisterHtml(req: any): string {
  return buildHostedAuthHtml(req, "Local registration required", "This self-hosted build uses local registration.");
}

const setupHtml = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProCal Setup</title><link rel="icon" type="image/x-icon" href="favicon.ico">
<style>
${PROCAL_BRAND_CSS}
:root{color-scheme:light;--bg-1:#f4efe4;--bg-2:#e7f3ee;--ink:#1f2a2e;--muted:#64727a;--card:rgba(255,255,255,.9);--surface:#f8fafc;--line:rgba(31,42,46,.14);--accent:#0f766e;--accent-ink:#fff;--shadow:0 20px 50px rgba(31,42,46,.12)}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;padding:clamp(20px,5vw,56px) 18px;font-family:"Segoe UI","Trebuchet MS",sans-serif;color:var(--ink);background:linear-gradient(135deg,var(--bg-1) 0%,#f7f8f6 48%,var(--bg-2) 100%)}
.setup-shell{width:min(760px,100%);margin:0 auto}
.setup-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.procal-brand{margin:0;color:var(--ink)}
.procal-brand img{width:48px;height:48px}
.procal-brand span{font-size:1.45rem}
.setup-badge{padding:7px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.62);color:var(--muted);font-size:.78rem;font-weight:700}
.setup-card{padding:clamp(22px,5vw,40px);border:1px solid var(--line);border-radius:8px;background:var(--card);box-shadow:var(--shadow);backdrop-filter:blur(14px)}
.eyebrow{margin:0 0 7px;color:var(--accent);font-size:.75rem;font-weight:800;text-transform:uppercase}
h1{margin:0;font-size:clamp(1.75rem,5vw,2.35rem);line-height:1.1}
#desc{margin:10px 0 26px;color:var(--muted);line-height:1.55}
.section-title{margin:24px 0 12px;padding-top:22px;border-top:1px solid var(--line);font-size:.82rem;font-weight:800;text-transform:uppercase;color:var(--muted)}
.section-title.first{margin-top:0;padding-top:0;border-top:0}
.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 16px}
label{display:grid;gap:7px;min-width:0;font-size:.88rem;font-weight:700}
label.full{grid-column:1/-1}
.optional{margin-left:4px;color:var(--muted);font-size:.74rem;font-weight:600}
input{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font:inherit;outline:none;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}
input:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px rgba(15,118,110,.13)}
input[readonly]{color:var(--muted);background:#eef2f3}
.admin-note{display:flex;align-items:flex-start;gap:10px;margin:20px 0 0;padding:12px 14px;border-left:3px solid var(--accent);background:rgba(15,118,110,.07);color:var(--muted);font-size:.88rem;line-height:1.45}
.admin-note strong{color:var(--ink);white-space:nowrap}
button{width:100%;min-height:46px;margin-top:20px;padding:10px 16px;border:0;border-radius:7px;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:800;cursor:pointer;box-shadow:0 12px 28px rgba(15,118,110,.18)}
button:hover{filter:brightness(1.05)}
button:focus-visible{outline:3px solid rgba(15,118,110,.25);outline-offset:2px}
button:disabled{cursor:not-allowed;opacity:.55;box-shadow:none}
pre{margin:18px 0 0;padding:13px 14px;overflow:auto;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word}
pre:empty{display:none}
.hide{display:none!important}
@media(max-width:620px){body{padding:18px 12px}.setup-head{align-items:flex-start}.setup-badge{margin-top:6px}.setup-card{padding:20px 16px}.field-grid{grid-template-columns:1fr}.field-grid label{grid-column:1}.admin-note{display:block}.admin-note strong{display:block;margin-bottom:3px}}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--bg-1:#07141b;--bg-2:#10241f;--ink:#e6edf0;--muted:#a5b6bf;--card:rgba(15,29,38,.94);--surface:rgba(8,18,25,.92);--line:rgba(176,200,210,.22);--accent:#2dd4bf;--accent-ink:#03201c;--shadow:0 20px 50px rgba(0,0,0,.42)}body{background:linear-gradient(145deg,#071017 0%,#0b151d 52%,#10241f 100%)}input:focus{background:#0b1821;box-shadow:0 0 0 3px rgba(45,212,191,.15)}input[readonly]{background:#132630}.setup-badge{background:rgba(15,29,38,.72)}.admin-note{background:rgba(45,212,191,.08)}button{box-shadow:0 12px 28px rgba(45,212,191,.18)}}
</style></head>
<body><main class="setup-shell">
<header class="setup-head">${renderProCalBrand()}<span class="setup-badge">Initial setup</span></header>
<section class="setup-card">
<p class="eyebrow">Self-hosted server</p><h1>Set up ProCal</h1><p id="desc">Create the first administrator account for this server.</p>
<form id="f">
<p class="section-title first">Server authorization</p>
<div class="field-grid"><label class="full">Setup token<input name="setupToken" type="password" required autocomplete="off"></label></div>
<p class="section-title">Administrator profile</p>
<div class="field-grid">
<label>Username<input name="adminUsername" required autocomplete="username"></label>
<label><span>Nickname <span class="optional">Optional</span></span><input name="adminNickname"></label>
<label class="full"><span>Full name <span class="optional">Optional</span></span><input name="adminFullName" autocomplete="name"></label>
<label><span>Workplace <span class="optional">Optional</span></span><input name="adminWorkplace"></label>
<label><span>Job title <span class="optional">Optional</span></span><input name="adminJobTitle"></label>
<label id="adminPasswordLabel">Password<input name="adminPassword" type="password" required autocomplete="new-password"></label>
<label id="adminPassword2Label">Confirm password<input name="adminPassword2" type="password" required autocomplete="new-password"></label>
</div>
<p class="admin-note"><strong>System administrator</strong><span>The first account always receives full system administration access.</span></p>
<button type="submit" id="submitBtn">Create administrator</button>
</form><pre id="out" role="status" aria-live="polite"></pre>
</section></main>
<script>
const f=document.getElementById('f');
const out=document.getElementById('out');
const desc=document.getElementById('desc');
const submitBtn=document.getElementById('submitBtn');
const lockedAdminUsername=${JSON.stringify(process.env.FIRST_ADMIN_USERNAME || "")};

function toErrorText(err){
  if(!err) return 'Request failed';
  if(typeof err==='string') return err;
  if(err.error){
    if(typeof err.error==='string') return err.error;
    if(err.error.fieldErrors) return JSON.stringify(err.error.fieldErrors);
  }
  return JSON.stringify(err);
}

async function init(){
  if(lockedAdminUsername){
    f.adminUsername.value=lockedAdminUsername;
    f.adminUsername.readOnly=true;
  }
  try{
    const r=await fetch('/api/setup/status');
    const s=await r.json();
    if(!s || !s.dbConfigured){
      submitBtn.disabled=true;
      desc.textContent='Internal database is not ready. Start the bundled stack (app + db) and refresh this page.';
      out.textContent='Database is not configured in runtime yet.';
    }
  }catch{}
}

f.onsubmit=async(e)=>{
  e.preventDefault();
  if(f.adminPassword.value!==f.adminPassword2.value){
    out.textContent='Passwords do not match';
    return;
  }

  const body={
    setupToken:f.setupToken.value,
    adminUsername:lockedAdminUsername||f.adminUsername.value,
    adminNickname:f.adminNickname.value,
    adminFullName:f.adminFullName.value,
    adminWorkplace:f.adminWorkplace.value,
    adminJobTitle:f.adminJobTitle.value,
    adminPassword:f.adminPassword.value
  };

  const r=await fetch('/api/setup/register-first-admin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json();
  if(!r.ok){
    out.textContent=toErrorText(j);
    return;
  }

  out.textContent=JSON.stringify(j,null,2)+'\\n\\nCopy the service token now. It is shown only once.';
  try{
    const lr=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:lockedAdminUsername||f.adminUsername.value,password:f.adminPassword.value})});
    const lj=await lr.json();
    if(lr.ok&&lj.accessToken){
      localStorage.setItem('procal_access_token',lj.accessToken);
      location.href='/';
      return;
    }
  }catch{}
  location.href='/login';
};

init();
</script></body></html>`;
const loginHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login</title>
<style>${PROCAL_BRAND_CSS}body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}form{width:min(420px,92vw);padding:1rem;border:1px solid #ddd;border-radius:10px}input,button,a{width:100%;padding:.6rem;margin-top:.6rem;box-sizing:border-box}a{text-align:center;display:block;text-decoration:none;color:#0b6}#changeServerBtn{background:transparent;border:1px solid #8aa;color:inherit;border-radius:6px}#m{min-height:1.2rem}</style></head>
<body><form id="f">${renderProCalBrand()}<h2>Sign in</h2><input name="username" placeholder="Username" required><input type="password" name="password" placeholder="Password" required><button>Login</button><button id="changeServerBtn" type="button" hidden>Change server</button><a href="/register">Create account</a><p id="m"></p></form>
<script>
function toErrorText(err){
  if(!err) return 'Login failed';
  if(typeof err==='string') return err;
  if(err.error){
    if(typeof err.error==='string') return err.error;
    if(err.error.fieldErrors) return JSON.stringify(err.error.fieldErrors);
  }
  return JSON.stringify(err);
}
const changeServerBtn=document.getElementById('changeServerBtn');
const androidShell=window.ProCalAndroidShell;
if(changeServerBtn&&androidShell&&typeof androidShell.openServerManager==='function'){
  changeServerBtn.hidden=false;
  changeServerBtn.addEventListener('click',()=>androidShell.openServerManager());
}
document.getElementById('f').onsubmit=async(e)=>{
  e.preventDefault();
  const body=Object.fromEntries(new FormData(e.target).entries());
  const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({error:'Login failed'}));
  if(!r.ok){document.getElementById('m').textContent=toErrorText(j);return;}
  localStorage.setItem('procal_access_token',j.accessToken);
  location.href='/';
};
</script></body></html>`;

const handoffHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in unavailable</title>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem}main{width:min(420px,92vw);padding:1rem;border:1px solid #ddd;border-radius:10px}a{display:block;margin-top:1rem;text-align:center;text-decoration:none;color:#0b6}#m{min-height:1.2rem}</style></head>
<body><main><h2>Sign in unavailable</h2><p id="m">This self-hosted build uses local login.</p><a href="/login">Back to login</a></main></body></html>`;
const registerHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Register</title>
<style>${PROCAL_BRAND_CSS}body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}form{width:min(420px,92vw);padding:1rem;border:1px solid #ddd;border-radius:10px}input,button,a{width:100%;padding:.6rem;margin-top:.6rem;box-sizing:border-box}a{text-align:center;display:block;text-decoration:none;color:#0b6}#m{min-height:1.2rem}</style></head>
<body><form id="f">${renderProCalBrand()}<h2>Create account</h2><input name="username" placeholder="Username" required><input name="nickname" placeholder="Nickname" required><input name="fullName" placeholder="Full name" required><input name="workplace" placeholder="Workplace" required><input name="jobTitle" placeholder="Job title" required><input type="password" name="password" placeholder="Password" required><input type="password" name="password2" placeholder="Confirm password" required><button>Register</button><a href="/login">Back to login</a><p id="m"></p></form>
<script>
function toErrorText(err){
  if(!err) return 'Register failed';
  if(typeof err==='string') return err;
  if(err.error){
    if(typeof err.error==='string') return err.error;
    if(err.error.fieldErrors) return JSON.stringify(err.error.fieldErrors);
  }
  return JSON.stringify(err);
}
document.getElementById('f').onsubmit=async(e)=>{
  e.preventDefault();
  const fd=Object.fromEntries(new FormData(e.target).entries());
  if(fd.password!==fd.password2){document.getElementById('m').textContent='Passwords do not match';return;}
  const body={username:fd.username,nickname:fd.nickname,fullName:fd.fullName,workplace:fd.workplace,jobTitle:fd.jobTitle,password:fd.password};
  const r=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({error:'Register failed'}));
  if(!r.ok){document.getElementById('m').textContent=toErrorText(j);return;}
  document.getElementById('m').textContent='Registration submitted. Wait for admin approval.';
};
</script></body></html>`;

const internalAutoLoginHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProCal</title>
<style>${PROCAL_BRAND_CSS}body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem;background:#f8fafc}main{width:min(460px,92vw);padding:1rem;border:1px solid #d1d5db;border-radius:12px;background:#fff}h2{margin:.2rem 0 .5rem}p{margin:.2rem 0;color:#475569}button{margin-top:.8rem;padding:.55rem .9rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer}</style></head>
<body><main>${renderProCalBrand()}<h2>Opening ProCal</h2><p id="m">Signing in automatically...</p><button id="retryBtn" type="button" hidden>Retry</button></main>
<script>
const ACCESS_KEY='procal_access_token';
const msg=document.getElementById('m');
const retryBtn=document.getElementById('retryBtn');
async function run(){
  try{
    const existing=localStorage.getItem(ACCESS_KEY);
    if(existing){ location.replace('/index.html'); return; }
    const r=await fetch('/api/auth/internal-auto-login',{method:'POST',credentials:'include'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j||!j.accessToken){
      msg.textContent=(j&&j.error)?String(j.error):'Automatic sign-in failed.';
      retryBtn.hidden=false;
      return;
    }
    localStorage.setItem(ACCESS_KEY,j.accessToken);
    location.replace('/index.html');
  }catch{
    msg.textContent='Automatic sign-in failed.';
    retryBtn.hidden=false;
  }
}
retryBtn.onclick=()=>{ retryBtn.hidden=true; msg.textContent='Signing in automatically...'; run(); };
run();
</script></body></html>`;

export function createApp() {
  const app = express();
  app.set("trust proxy", resolveTrustProxySetting());
  const hostedIdentityEnabled = false;
  const internalAutoLoginEnabled = isTruthy(process.env.PROCAL_INTERNAL_AUTO_LOGIN);
  const jsonBodyLimit = String(process.env.API_JSON_LIMIT || "20mb").trim() || "20mb";
  const globalJsonParser = express.json({ limit: jsonBodyLimit });

  app.use(pinoHttp({ logger }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", buildContentSecurityPolicy(req));
    next();
  });
  const allowedCorsOrigins = resolveAllowedCorsOrigins();
  app.use(cors((req, callback) => {
    callback(null, {
      credentials: true,
      origin: isCorsOriginAllowed(req as Request, allowedCorsOrigins)
    });
  }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (usesDedicatedBodyParser(req)) {
      next();
      return;
    }
    globalJsonParser(req, res, next);
  });

  app.use(healthRouter);
  app.use(setupRouter);

  app.get("/setup", async (req, res) => {
    if (hostedIdentityEnabled) {
      res.redirect(buildBasePathUrl(req, "/login"));
      return;
    }
    const installed = await isInstalled();
    if (installed) {
      res.status(403).type("html").send("<h1>Setup locked</h1><p>Application is already installed.</p>");
      return;
    }
    res.type("html").send(injectRuntimeIntoHtml(req, setupHtml));
  });
  app.get("/favicon.ico", (_req, res) => {
    res.sendFile(path.join(appPath, "favicon.ico"));
  });
  app.use(installationGate);

  app.get("/login", (req, res) => {
    if (internalAutoLoginEnabled) {
      res.type("html").send(injectRuntimeIntoHtml(req, internalAutoLoginHtml));
      return;
    }
    if (hostedIdentityEnabled) {
      res.type("html").send(buildHostedLoginHtml(req));
      return;
    }
    res.type("html").send(injectRuntimeIntoHtml(req, loginHtml));
  });
  app.get("/login/handoff", (req, res) => res.type("html").send(injectRuntimeIntoHtml(req, handoffHtml)));
  app.get("/register", (req, res) => {
    if (internalAutoLoginEnabled) {
      res.type("html").send(injectRuntimeIntoHtml(req, internalAutoLoginHtml));
      return;
    }
    if (hostedIdentityEnabled) {
      res.type("html").send(buildHostedRegisterHtml(req));
      return;
    }
    res.type("html").send(injectRuntimeIntoHtml(req, registerHtml));
  });

  app.get("/app-runtime.js", (req, res) => {
    const runtime = getRuntimeConfig();
    const basePath = getRequestBasePath(req);
    const rootPath = buildBasePathUrl(req, "/");
    const instanceSlug = String(runtime.instanceSlug || process.env.INSTANCE_SLUG || "").trim().toLowerCase();
    const storageScope = getStorageScope(req, instanceSlug);
    const script = [
      "(function(){",
      "  const runtime = window.PROCAL_RUNTIME = window.PROCAL_RUNTIME || {};",
      `  runtime.releaseChannel = ${JSON.stringify(uiReleaseChannel)};`,
      `  runtime.basePath = ${JSON.stringify(basePath)};`,
      `  runtime.rootPath = ${JSON.stringify(rootPath)};`,
      `  runtime.mobileAppDownloadUrl = ${JSON.stringify(runtime.mobileAppDownloadUrl || "")};`,
      `  runtime.bugReportUrl = ${JSON.stringify(runtime.bugReportUrl || "")};`,
      `  runtime.instanceSlug = ${JSON.stringify(instanceSlug)};`,
      `  runtime.storagePrefix = ${JSON.stringify(`procal:${storageScope}:`)};`,
      "  runtime.resolvePath = function(value){",
      "    const raw = String(value == null ? '' : value);",
      "    if (!runtime.basePath || !raw) return raw || runtime.rootPath;",
      "    if (/^[a-zA-Z][a-zA-Z\\d+\\-.]*:/.test(raw) || raw.startsWith('//')) return raw;",
      "    if (!raw.startsWith('/')) return raw;",
      "    if (raw === '/') return runtime.rootPath;",
      "    if (raw === runtime.basePath || raw.startsWith(runtime.basePath + '/')) return raw;",
      "    return runtime.basePath + raw;",
      "  };",
      "  const patchStorage = function(){",
      "    const proto = window.Storage && window.Storage.prototype;",
      "    if (!proto || proto.__procalRealmStoragePatched) return;",
      "    const nativeGetItem = proto.getItem;",
      "    const nativeSetItem = proto.setItem;",
      "    const nativeRemoveItem = proto.removeItem;",
      "    const prefixKey = function(key){ return runtime.storagePrefix + String(key || ''); };",
      "    proto.getItem = function(key){ return nativeGetItem.call(this, prefixKey(key)); };",
      "    proto.setItem = function(key, value){ return nativeSetItem.call(this, prefixKey(key), value); };",
      "    proto.removeItem = function(key){ return nativeRemoveItem.call(this, prefixKey(key)); };",
      "    proto.__procalRealmStoragePatched = true;",
      "  };",
      "  const patchFetch = function(){",
      "    if (window.__procalRealmFetchPatched || typeof window.fetch !== 'function') return;",
      "    const nativeFetch = window.fetch.bind(window);",
      "    const prefixStringUrl = function(value){",
      "      if (!runtime.basePath) return value;",
      "      const raw = String(value || '');",
      "      if (!raw) return raw;",
      "      if (/^[a-zA-Z][a-zA-Z\\d+\\-.]*:/.test(raw)) {",
      "        try {",
      "          const parsed = new URL(raw, window.location.href);",
      "          if (parsed.origin !== window.location.origin) return raw;",
      "          const nextPath = runtime.resolvePath(parsed.pathname);",
      "          return `${parsed.origin}${nextPath}${parsed.search}${parsed.hash}`;",
      "        } catch { return raw; }",
      "      }",
      "      if (raw.startsWith('//') || !raw.startsWith('/')) return raw;",
      "      return runtime.resolvePath(raw);",
      "    };",
      "    window.fetch = function(input, init){",
      "      if (typeof input === 'string') return nativeFetch(prefixStringUrl(input), init);",
      "      if (typeof Request !== 'undefined' && input instanceof Request) {",
      "        const nextUrl = prefixStringUrl(input.url);",
      "        if (nextUrl === input.url) return nativeFetch(input, init);",
      "        return nativeFetch(new Request(nextUrl, input), init);",
      "      }",
      "      return nativeFetch(input, init);",
      "    };",
      "    window.__procalRealmFetchPatched = true;",
      "  };",
      "  const patchEventSource = function(){",
      "    if (window.__procalRealmEventSourcePatched || typeof window.EventSource !== 'function') return;",
      "    const NativeEventSource = window.EventSource;",
      "    const WrappedEventSource = function(url, config){ return new NativeEventSource(runtime.resolvePath(url), config); };",
      "    WrappedEventSource.prototype = NativeEventSource.prototype;",
      "    window.EventSource = WrappedEventSource;",
      "    window.__procalRealmEventSourcePatched = true;",
      "  };",
      "  patchStorage();",
      "  patchFetch();",
      "  patchEventSource();",
      `  window.PROCAL_RELEASE_CHANNEL = ${JSON.stringify(uiReleaseChannel)};`,
      "})();"
    ].join("\n");
    res
      .set("Cache-Control", "no-store")
      .type("application/javascript; charset=utf-8")
      .send(script);
  });
  app.get("/", (req, res) => {
    if (internalAutoLoginEnabled) {
      res.type("html").send(injectRuntimeIntoHtml(req, internalAutoLoginHtml));
      return;
    }
    res.type("html").send(renderHtmlDocument(req, path.join(appPath, "index.html")));
  });
  app.get("/index.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "index.html"))));
  app.get("/admin", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "admin.html"))));
  app.get("/admin.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "admin.html"))));
  app.get("/leave", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "leave.html"))));
  app.get("/leave.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "leave.html"))));
  app.get("/attendance", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "attendance.html"))));
  app.get("/attendance.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "attendance.html"))));
  app.get("/inventory", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "inventory.html"))));
  app.get("/inventory.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "inventory.html"))));
  app.get("/media-monitoring", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "media-monitoring.html"))));
  app.get("/media-monitoring.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "media-monitoring.html"))));
  app.get("/USER_GUIDE.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(projectRootPath, "USER_GUIDE.html"))));
  app.get("/USER_GUIDE_BG.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(projectRootPath, "USER_GUIDE_BG.html"))));
  app.get("/USER_GUIDE_EN.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(projectRootPath, "USER_GUIDE_EN.html"))));
  app.use(express.static(appPath, { extensions: ["html"] }));

  app.use(backupRouter);
  app.use(authRouter);
  app.use(publicPushRouter);
  app.use(requireAuth);
  app.use(hostedRealmReadOnlyGuard);
  app.use(adminRouter);
  app.use(systemUpdateRouter);
  app.use(eventRouter);
  app.use(taskRouter);
  app.use(noteRouter);
  app.use(extraRouter);
  app.use(stateRouter);
  app.use(syncRouter);
  app.use(compensationRouter);
  app.use(leaveRouter);
  app.use(attendanceRouter);
  app.use(inventoryRouter);
  app.use(holidayRouter);
  app.use(notificationRouter);
  app.use(pushRouter);
  app.use(bugRouter);
  app.use(mediaRouter);
  app.use(chatRouter);
  app.use(filesRouter);

  app.use(errorHandler);
  return app;
}





