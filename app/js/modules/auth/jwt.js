(function initAuthJwt(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function parseJwtPayload(token) {
    try {
      const raw = String(token || "").trim();
      if (!raw.includes(".")) return null;
      const payload = raw.split(".")[1] || "";
      const norm = payload.replace(/-/g, "+").replace(/_/g, "/");
      const pad = norm + "=".repeat((4 - (norm.length % 4)) % 4);
      const json = atob(pad);
      const obj = JSON.parse(json);
      return obj && typeof obj === "object" ? obj : null;
    } catch {
      return null;
    }
  }

  function isJwtAccessTokenFresh(token, skewSeconds) {
    const payload = parseJwtPayload(token);
    if (!payload) return false;
    const exp = Number(payload.exp || 0);
    if (!Number.isFinite(exp) || exp <= 0) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    const skew = Math.max(0, Number(skewSeconds) || 0);
    return exp > (nowSec + skew);
  }

  function getUserIdFromToken(token) {
    const obj = parseJwtPayload(token);
    if (!obj) return "";
    return String(obj.userId || "");
  }

  root.ProCalModules.authJwt = {
    parseJwtPayload,
    isJwtAccessTokenFresh,
    getUserIdFromToken
  };
})(window);

