(function initAuthFetch(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function extractErrorMessage(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload.trim();
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
    const error = payload.error;
    if (error && typeof error === "object") {
      if (Array.isArray(error.formErrors) && error.formErrors.length) {
        const hit = error.formErrors.find((item) => typeof item === "string" && item.trim());
        if (hit) return hit.trim();
      }
      if (error.fieldErrors && typeof error.fieldErrors === "object") {
        const fieldGroups = Object.values(error.fieldErrors);
        for (const group of fieldGroups) {
          if (!Array.isArray(group)) continue;
          const hit = group.find((item) => typeof item === "string" && item.trim());
          if (hit) return hit.trim();
        }
      }
    }
    return "";
  }

  async function fetchJsonWithBearer(path, init, options) {
    const opts = options || {};
    const ensureAccessToken = typeof opts.ensureAccessToken === "function" ? opts.ensureAccessToken : null;
    if (!ensureAccessToken) throw new Error("auth");
    const token = await ensureAccessToken();
    if (!token) throw new Error("auth");
    const errorPrefix = String(opts.errorPrefix || "http");
    const requestInit = init || {};
    const requestHeaders = { ...((requestInit && requestInit.headers) || {}) };
    const isFormDataBody = typeof FormData !== "undefined" && requestInit.body instanceof FormData;
    const res = await fetch(path, {
      ...requestInit,
      headers: {
        authorization: `Bearer ${token}`,
        ...(isFormDataBody ? {} : { "content-type": "application/json" }),
        ...requestHeaders
      },
      credentials: "include"
    });
    if (!res.ok) {
      let errorMessage = "";
      try {
        const raw = await res.text();
        if (raw) {
          try {
            errorMessage = extractErrorMessage(JSON.parse(raw));
          } catch (_) {
            errorMessage = raw.trim();
          }
        }
      } catch (_) {
        errorMessage = "";
      }
      throw new Error(errorMessage || `${errorPrefix}:${res.status}`);
    }
    return res.json();
  }

  root.ProCalModules.authFetch = { fetchJsonWithBearer };
})(window);
