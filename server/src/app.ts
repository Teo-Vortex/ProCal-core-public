import path from "path";
import fs from "fs";
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
import { holidayRouter } from "./routes/holidayRoutes";
import { notificationRouter } from "./routes/notificationRoutes";
import { pushRouter } from "./routes/pushRoutes";
import { bugRouter } from "./routes/bugRoutes";
import { mediaRouter } from "./routes/mediaRoutes";
import { chatRouter } from "./routes/chatRoutes";
import { backupRouter } from "./routes/backupRoutes";
import { filesRouter } from "./routes/filesRoutes";
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
  return output;
}

function renderHtmlDocument(req: any, filePath: string): string {
  const raw = fs.readFileSync(filePath, "utf8");
  return injectRuntimeIntoHtml(req, raw);
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
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProCal Setup</title>
<style>body{font-family:system-ui;margin:2rem;max-width:820px}label{display:block;margin-top:.7rem}input,select,button{padding:.5rem;width:100%}button{margin-top:.8rem}pre{background:#f3f3f3;padding:.8rem;overflow:auto}.hide{display:none}</style></head>
<body><h1>ProCal Setup</h1><p id="desc">Internal database mode is enabled. Create the first admin account.</p>
<form id="f">
<label>First admin username<input name="adminUsername" required></label>
<label>First admin nickname<input name="adminNickname" required></label>
<label>Full name<input name="adminFullName" required></label>
<label>Workplace<input name="adminWorkplace" required></label>
<label>Job title<input name="adminJobTitle" required></label>
<label>First admin password<input name="adminPassword" type="password" required></label>
<label>Confirm admin password<input name="adminPassword2" type="password" required></label>
<label>First user role<select name="adminRole"><option value="system_admin">system_admin</option><option value="boss">boss</option></select></label>
<button type="submit" id="submitBtn">Create admin</button>
</form><pre id="out"></pre>
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
    adminUsername:lockedAdminUsername||f.adminUsername.value,
    adminNickname:f.adminNickname.value,
    adminFullName:f.adminFullName.value,
    adminWorkplace:f.adminWorkplace.value,
    adminJobTitle:f.adminJobTitle.value,
    adminPassword:f.adminPassword.value,
    adminRole:f.adminRole.value
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
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}form{width:min(420px,92vw);padding:1rem;border:1px solid #ddd;border-radius:10px}input,button,a{width:100%;padding:.6rem;margin-top:.6rem;box-sizing:border-box}a{text-align:center;display:block;text-decoration:none;color:#0b6}#m{min-height:1.2rem}</style></head>
<body><form id="f"><h2>Sign in</h2><input name="username" placeholder="Username" required><input type="password" name="password" placeholder="Password" required><button>Login</button><a href="/register">Create account</a><p id="m"></p></form>
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
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}form{width:min(420px,92vw);padding:1rem;border:1px solid #ddd;border-radius:10px}input,button,a{width:100%;padding:.6rem;margin-top:.6rem;box-sizing:border-box}a{text-align:center;display:block;text-decoration:none;color:#0b6}#m{min-height:1.2rem}</style></head>
<body><form id="f"><h2>Create account</h2><input name="username" placeholder="Username" required><input name="nickname" placeholder="Nickname" required><input name="fullName" placeholder="Full name" required><input name="workplace" placeholder="Workplace" required><input name="jobTitle" placeholder="Job title" required><input type="password" name="password" placeholder="Password" required><input type="password" name="password2" placeholder="Confirm password" required><button>Register</button><a href="/login">Back to login</a><p id="m"></p></form>
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
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem;background:#f8fafc}main{width:min(460px,92vw);padding:1rem;border:1px solid #d1d5db;border-radius:12px;background:#fff}h2{margin:.2rem 0 .5rem}p{margin:.2rem 0;color:#475569}button{margin-top:.8rem;padding:.55rem .9rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;cursor:pointer}</style></head>
<body><main><h2>Opening ProCal</h2><p id="m">Signing in automatically...</p><button id="retryBtn" type="button" hidden>Retry</button></main>
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
  app.get("/media-monitoring", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "media-monitoring.html"))));
  app.get("/media-monitoring.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(appPath, "media-monitoring.html"))));
  app.get("/USER_GUIDE.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(projectRootPath, "USER_GUIDE.html"))));
  app.get("/USER_GUIDE_BG.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(projectRootPath, "USER_GUIDE_BG.html"))));
  app.get("/USER_GUIDE_EN.html", (req, res) => res.type("html").send(renderHtmlDocument(req, path.join(projectRootPath, "USER_GUIDE_EN.html"))));
  app.use(express.static(appPath, { extensions: ["html"] }));

  app.use(backupRouter);
  app.use(authRouter);
  app.use(requireAuth);
  app.use(hostedRealmReadOnlyGuard);
  app.use(adminRouter);
  app.use(eventRouter);
  app.use(taskRouter);
  app.use(noteRouter);
  app.use(extraRouter);
  app.use(stateRouter);
  app.use(syncRouter);
  app.use(compensationRouter);
  app.use(leaveRouter);
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





