"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const API_VERSION = process.env.DOCKER_API_VERSION || "v1.45";
const PORT = positiveInt(process.env.PORT, 7070);
const SOCKET_PATH = process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";
const STATE_PATH = process.env.PROCAL_UPDATER_STATE_PATH || "/data/state.json";
const TOKEN = String(process.env.PROCAL_UPDATER_TOKEN || "").trim();
const UPDATE_IMAGE = String(process.env.PROCAL_UPDATE_IMAGE || "").trim();
const ALLOWED_IMAGE = normalizeRepository(process.env.PROCAL_UPDATE_ALLOWED_IMAGE || UPDATE_IMAGE);
const GITHUB_REPO = String(process.env.PROCAL_UPDATE_GITHUB_REPO || "").trim();
const HEALTH_TIMEOUT_MS = positiveInt(process.env.PROCAL_UPDATE_HEALTH_TIMEOUT_SEC, 180) * 1000;
const PULL_MODE = process.env.PROCAL_UPDATE_PULL_MODE === "never" ? "never" : "always";

if (TOKEN.length < 32) throw new Error("PROCAL_UPDATER_TOKEN must contain at least 32 characters");
if (!UPDATE_IMAGE || !ALLOWED_IMAGE) throw new Error("PROCAL_UPDATE_IMAGE and PROCAL_UPDATE_ALLOWED_IMAGE are required");
if (normalizeRepository(UPDATE_IMAGE) !== ALLOWED_IMAGE) throw new Error("Update image is outside the configured allowlist");

let operation = Promise.resolve();
let state = loadState();

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseImageReference(value) {
  const raw = String(value || "").trim().replace(/^docker:\/\//, "");
  const at = raw.lastIndexOf("@");
  if (at > 0) return { repository: raw.slice(0, at).toLowerCase(), tag: raw.slice(at + 1), digest: true };
  const slash = raw.lastIndexOf("/");
  const colon = raw.lastIndexOf(":");
  if (colon > slash) return { repository: raw.slice(0, colon).toLowerCase(), tag: raw.slice(colon + 1), digest: false };
  return { repository: raw.toLowerCase(), tag: "latest", digest: false };
}

function normalizeRepository(value) {
  return parseImageReference(value).repository;
}

function jsonResponse(res, statusCode, body) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": payload.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(payload);
}

function timingSafeToken(value) {
  const supplied = Buffer.from(String(value || ""));
  const expected = Buffer.from(TOKEN);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function isAuthorized(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") && timingSafeToken(header.slice(7).trim());
}

function loadState() {
  try {
    return { phase: "idle", ...JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) };
  } catch {
    return { phase: "idle", updatedAt: new Date().toISOString(), message: "Ready", rollback: null };
  }
}

function saveState(patch) {
  state = { ...state, ...patch, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const temp = `${STATE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, STATE_PATH);
  return state;
}

function dockerRequest(method, endpoint, body, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({
      socketPath: SOCKET_PATH,
      path: `/${API_VERSION}${endpoint}`,
      method,
      timeout: timeoutMs,
      headers: payload ? { "content-type": "application/json", "content-length": payload.length } : {}
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if ((res.statusCode || 500) >= 400) {
          let detail = raw;
          try { detail = JSON.parse(raw).message || raw; } catch {}
          reject(new Error(`Docker API ${method} ${endpoint} failed (${res.statusCode}): ${detail}`));
          return;
        }
        const contentType = String(res.headers["content-type"] || "");
        if (!raw) resolve(null);
        else if (contentType.includes("json") && !raw.includes("}\n{")) {
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        } else resolve(raw);
      });
    });
    req.on("timeout", () => req.destroy(new Error(`Docker API timeout for ${method} ${endpoint}`)));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function inspectContainer(id) {
  return dockerRequest("GET", `/containers/${encodeURIComponent(id)}/json`);
}

async function inspectImage(image) {
  return dockerRequest("GET", `/images/${encodeURIComponent(image)}/json`);
}

async function ownComposeProject() {
  const own = await inspectContainer(process.env.HOSTNAME || "self");
  const project = own?.Config?.Labels?.["com.docker.compose.project"];
  if (!project) throw new Error("Updater is not running inside a Docker Compose project");
  return project;
}

async function findTarget() {
  const project = await ownComposeProject();
  const filters = encodeURIComponent(JSON.stringify({
    label: [
      `com.docker.compose.project=${project}`,
      "com.docker.compose.service=app",
      "io.procal.updater.target=true"
    ]
  }));
  const rows = await dockerRequest("GET", `/containers/json?all=0&filters=${filters}`);
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Expected one running ProCal app container in project ${project}, found ${Array.isArray(rows) ? rows.length : 0}`);
  }
  return inspectContainer(rows[0].Id);
}

function imageVersion(image, fallback = "unknown") {
  return String(image?.Config?.Labels?.["org.opencontainers.image.version"] || fallback || "unknown");
}

function currentDigest(image) {
  const digests = Array.isArray(image?.RepoDigests) ? image.RepoDigests : [];
  const prefix = `${ALLOWED_IMAGE}@`;
  return String(digests.find((item) => String(item).toLowerCase().startsWith(prefix)) || "").split("@")[1] || "";
}

async function registryDigest() {
  const parsed = parseImageReference(UPDATE_IMAGE);
  if (!parsed.repository.startsWith("ghcr.io/")) return "";
  const repoPath = parsed.repository.slice("ghcr.io/".length);
  const url = `https://ghcr.io/v2/${repoPath}/manifests/${encodeURIComponent(parsed.tag)}`;
  const headers = { accept: "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json" };
  let response = await fetch(url, { method: "HEAD", headers });
  if (response.status === 401) {
    const challenge = String(response.headers.get("www-authenticate") || "");
    const realm = /realm="([^"]+)"/i.exec(challenge)?.[1];
    const service = /service="([^"]+)"/i.exec(challenge)?.[1];
    const scope = /scope="([^"]+)"/i.exec(challenge)?.[1];
    if (!realm) throw new Error("Container registry did not provide an authentication realm");
    const tokenUrl = new URL(realm);
    if (service) tokenUrl.searchParams.set("service", service);
    if (scope) tokenUrl.searchParams.set("scope", scope);
    const tokenResponse = await fetch(tokenUrl, { headers: { accept: "application/json" } });
    if (!tokenResponse.ok) throw new Error(`Registry token request failed (${tokenResponse.status})`);
    const tokenBody = await tokenResponse.json();
    const registryToken = tokenBody.token || tokenBody.access_token;
    response = await fetch(url, { method: "HEAD", headers: { ...headers, authorization: `Bearer ${registryToken}` } });
  }
  if (!response.ok) throw new Error(`Container registry check failed (${response.status})`);
  return String(response.headers.get("docker-content-digest") || "");
}

async function latestRelease() {
  if (!GITHUB_REPO) return null;
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "ProCal-Core-Updater" }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub release check failed (${response.status})`);
  const value = await response.json();
  return {
    tag: String(value.tag_name || ""),
    name: String(value.name || value.tag_name || ""),
    url: String(value.html_url || ""),
    publishedAt: value.published_at || null,
    notes: String(value.body || "").slice(0, 8000)
  };
}

async function collectStatus(checkRemote = false) {
  let target;
  try {
    target = await findTarget();
  } catch (error) {
    if (["queued", "updating", "rolling_back"].includes(state.phase)) {
      return {
        enabled: true,
        phase: state.phase,
        message: state.message || "Operation in progress",
        error: state.error || "",
        latest: { digest: state.remoteDigest || "", release: state.release || null },
        updateAvailable: false,
        lastCheckedAt: state.lastCheckedAt || null,
        checkError: state.checkError || "",
        canRollback: Boolean(state.rollback?.containerId),
        updatedAt: state.updatedAt || null
      };
    }
    throw error;
  }
  const image = await inspectImage(target.Image).catch(() => ({
    Id: target.Image,
    Config: { Labels: target.Config?.Labels || {} },
    RepoDigests: []
  }));
  let remoteDigest = state.remoteDigest || "";
  let release = state.release || null;
  let checkError = "";
  if (checkRemote) {
    try {
      [remoteDigest, release] = await Promise.all([registryDigest(), latestRelease()]);
      saveState({ remoteDigest, release, lastCheckedAt: new Date().toISOString(), checkError: "" });
    } catch (error) {
      checkError = error instanceof Error ? error.message : String(error);
      saveState({ lastCheckedAt: new Date().toISOString(), checkError });
    }
  }
  const digest = currentDigest(image);
  return {
    enabled: true,
    phase: state.phase || "idle",
    message: state.message || "Ready",
    error: state.error || "",
    current: { image: UPDATE_IMAGE, imageId: image.Id || target.Image, digest, version: imageVersion(image, envValue(target.Config?.Env, "PROCAL_APP_VERSION")) },
    latest: { digest: remoteDigest, release },
    updateAvailable: Boolean(remoteDigest && digest && remoteDigest !== digest),
    lastCheckedAt: state.lastCheckedAt || null,
    checkError: checkError || state.checkError || "",
    canRollback: Boolean(state.rollback?.containerId),
    updatedAt: state.updatedAt || null
  };
}

function envValue(env, name) {
  const prefix = `${name}=`;
  return String((Array.isArray(env) ? env : []).find((item) => String(item).startsWith(prefix)) || "").slice(prefix.length);
}

function replaceEnv(env, name, value) {
  const prefix = `${name}=`;
  const next = (Array.isArray(env) ? env : []).filter((item) => !String(item).startsWith(prefix));
  next.push(`${name}=${value}`);
  return next;
}

function endpointConfig(network) {
  return {
    Aliases: Array.isArray(network?.Aliases) ? network.Aliases : undefined,
    DriverOpts: network?.DriverOpts || undefined,
    IPAMConfig: network?.IPAMConfig || undefined
  };
}

function createConfig(old, imageReference, version) {
  const source = old.Config || {};
  const configKeys = ["Hostname", "Domainname", "User", "AttachStdin", "AttachStdout", "AttachStderr", "ExposedPorts", "Tty", "OpenStdin", "StdinOnce", "Env", "Cmd", "Healthcheck", "ArgsEscaped", "Volumes", "WorkingDir", "Entrypoint", "NetworkDisabled", "MacAddress", "OnBuild", "Labels", "StopSignal", "StopTimeout", "Shell"];
  const config = {};
  for (const key of configKeys) if (source[key] !== undefined && source[key] !== null) config[key] = source[key];
  config.Image = imageReference;
  if (version && version !== "unknown") config.Env = replaceEnv(config.Env, "PROCAL_APP_VERSION", version);
  const endpoints = {};
  for (const [name, value] of Object.entries(old.NetworkSettings?.Networks || {})) endpoints[name] = endpointConfig(value);
  return { ...config, HostConfig: old.HostConfig || {}, NetworkingConfig: { EndpointsConfig: endpoints } };
}

async function pullImage() {
  if (PULL_MODE === "never") return;
  const parsed = parseImageReference(UPDATE_IMAGE);
  const endpoint = `/images/create?fromImage=${encodeURIComponent(parsed.repository)}&tag=${encodeURIComponent(parsed.tag)}`;
  const output = String(await dockerRequest("POST", endpoint, null, 10 * 60 * 1000) || "");
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    try {
      const event = JSON.parse(line);
      if (event.error) throw new Error(event.error);
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
  }
}

async function stopContainer(id) {
  try {
    await dockerRequest("POST", `/containers/${encodeURIComponent(id)}/stop?t=15`, null, 25_000);
  } catch (error) {
    if (String(error.message).includes("304")) return;
    const current = await inspectContainer(id).catch(() => null);
    if (current && current.State?.Running === false) return;
    throw error;
  }
}

async function disconnectNetworks(containerId, networks) {
  for (const network of Object.keys(networks || {})) {
    await dockerRequest("POST", `/networks/${encodeURIComponent(network)}/disconnect`, { Container: containerId, Force: true }).catch(() => {});
  }
}

async function connectNetworks(containerId, networks) {
  for (const [network, value] of Object.entries(networks || {})) {
    await dockerRequest("POST", `/networks/${encodeURIComponent(network)}/connect`, { Container: containerId, EndpointConfig: endpointConfig(value) }).catch(() => {});
  }
}

async function waitHealthy(id) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let last = "starting";
  while (Date.now() < deadline) {
    const value = await inspectContainer(id);
    const running = Boolean(value?.State?.Running);
    const health = String(value?.State?.Health?.Status || (running ? "running" : value?.State?.Status || "stopped"));
    last = health;
    if (running && (health === "healthy" || !value?.State?.Health)) return;
    if (!running || health === "unhealthy") throw new Error(`Updated app became ${health}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Updated app did not become healthy within ${Math.round(HEALTH_TIMEOUT_MS / 1000)} seconds (last state: ${last})`);
}

async function discardPreviousRollback() {
  const previousId = state.rollback?.containerId;
  if (!previousId) return;
  await dockerRequest("DELETE", `/containers/${encodeURIComponent(previousId)}?force=true`).catch((error) => {
    if (!String(error.message).includes("404")) throw error;
  });
  saveState({ rollback: null });
}

async function restoreOld(old, failedId) {
  if (failedId) {
    await stopContainer(failedId).catch(() => {});
    await dockerRequest("DELETE", `/containers/${encodeURIComponent(failedId)}?force=true`).catch(() => {});
  }
  const desiredName = old.Name.replace(/^\//, "");
  const current = await inspectContainer(old.Id);
  if (current.Name.replace(/^\//, "") !== desiredName) {
    await dockerRequest("POST", `/containers/${encodeURIComponent(old.Id)}/rename?name=${encodeURIComponent(desiredName)}`);
  }
  await connectNetworks(old.Id, old.networks);
  await dockerRequest("POST", `/containers/${encodeURIComponent(old.Id)}/start`);
  await waitHealthy(old.Id);
}

async function performUpdate() {
  if (["updating", "rolling_back"].includes(state.phase)) throw new Error("Another update operation is already running");
  saveState({ phase: "updating", message: "Pulling the new image", error: "" });
  const target = await findTarget();
  if (normalizeRepository(target.Config?.Image || UPDATE_IMAGE) !== ALLOWED_IMAGE) throw new Error("Running app image is outside the updater allowlist");
  const currentImage = await inspectImage(target.Image).catch(() => ({
    Id: target.Image,
    Config: { Labels: target.Config?.Labels || {} }
  }));
  await pullImage();
  const nextImage = await inspectImage(UPDATE_IMAGE);
  if (nextImage.Id === currentImage.Id) {
    saveState({ phase: "idle", message: "Already running the newest image", error: "" });
    return;
  }
  await discardPreviousRollback();
  const originalName = target.Name.replace(/^\//, "");
  const rollbackName = `${originalName}-rollback-${Date.now()}`;
  const networks = target.NetworkSettings?.Networks || {};
  let newId = "";
  try {
    saveState({ phase: "updating", message: "Replacing the application container" });
    await stopContainer(target.Id);
    await disconnectNetworks(target.Id, networks);
    await dockerRequest("POST", `/containers/${encodeURIComponent(target.Id)}/rename?name=${encodeURIComponent(rollbackName)}`);
    const created = await dockerRequest("POST", `/containers/create?name=${encodeURIComponent(originalName)}`, createConfig(target, UPDATE_IMAGE, imageVersion(nextImage)));
    newId = created.Id;
    await dockerRequest("POST", `/containers/${encodeURIComponent(newId)}/start`);
    await waitHealthy(newId);
    saveState({
      phase: "idle",
      message: "Update completed",
      error: "",
      rollback: { containerId: target.Id, originalName, rollbackName, networks, imageId: currentImage.Id, version: imageVersion(currentImage), createdAt: new Date().toISOString() },
      lastUpdatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await restoreOld({ Id: target.Id, Name: originalName, networks }, newId).catch((restoreError) => {
      throw new Error(`${message}; automatic rollback failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
    });
    saveState({ phase: "failed", message: "Update failed; previous version restored", error: message, rollback: null });
    throw error;
  }
}

async function performRollback() {
  const rollback = state.rollback;
  if (!rollback?.containerId) throw new Error("No previous version is available for rollback");
  saveState({ phase: "rolling_back", message: "Restoring the previous application image", error: "" });
  const current = await findTarget();
  const currentNetworks = current.NetworkSettings?.Networks || {};
  try {
    await stopContainer(current.Id);
    await disconnectNetworks(current.Id, currentNetworks);
    await dockerRequest("DELETE", `/containers/${encodeURIComponent(current.Id)}?force=true`);
    await dockerRequest("POST", `/containers/${encodeURIComponent(rollback.containerId)}/rename?name=${encodeURIComponent(rollback.originalName)}`);
    await connectNetworks(rollback.containerId, rollback.networks || {});
    await dockerRequest("POST", `/containers/${encodeURIComponent(rollback.containerId)}/start`);
    await waitHealthy(rollback.containerId);
    saveState({ phase: "idle", message: "Rollback completed", error: "", rollback: null, lastUpdatedAt: new Date().toISOString() });
  } catch (error) {
    saveState({ phase: "failed", message: "Rollback failed", error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

function queueOperation(name, fn) {
  if (["updating", "rolling_back", "queued"].includes(state.phase)) return false;
  saveState({ phase: "queued", message: `${name} queued`, error: "" });
  operation = operation.then(fn).catch((error) => {
    if (state.phase !== "failed") saveState({ phase: "failed", message: `${name} failed`, error: error instanceof Error ? error.message : String(error) });
    console.error(error);
  });
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://updater.local");
  if (req.method === "GET" && url.pathname === "/health") {
    jsonResponse(res, 200, { ok: true });
    return;
  }
  if (!url.pathname.startsWith("/v1/") || !isAuthorized(req)) {
    jsonResponse(res, 401, { error: "Unauthorized" });
    return;
  }
  try {
    if (req.method === "GET" && url.pathname === "/v1/status") {
      jsonResponse(res, 200, await collectStatus(false));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/check") {
      jsonResponse(res, 200, await collectStatus(true));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/update") {
      if (!queueOperation("Update", performUpdate)) {
        jsonResponse(res, 409, { error: "Another update operation is already running" });
        return;
      }
      jsonResponse(res, 202, { accepted: true, phase: "queued" });
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/rollback") {
      if (!state.rollback?.containerId) {
        jsonResponse(res, 409, { error: "No previous version is available for rollback" });
        return;
      }
      if (!queueOperation("Rollback", performRollback)) {
        jsonResponse(res, 409, { error: "Another update operation is already running" });
        return;
      }
      jsonResponse(res, 202, { accepted: true, phase: "queued" });
      return;
    }
    jsonResponse(res, 404, { error: "Not found" });
  } catch (error) {
    jsonResponse(res, 503, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`ProCal updater listening on ${PORT}`));
