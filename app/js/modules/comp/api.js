(function initCompApi(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function formatCompMinutes(value) {
    const minutes = Number(value || 0);
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
  }

  async function fetchCompJson(path, init, options) {
    const opts = options || {};
    const ensureAccessToken = typeof opts.ensureAccessToken === "function" ? opts.ensureAccessToken : null;
    if (!ensureAccessToken) throw new Error("unauthorized");
    const token = await ensureAccessToken();
    if (!token) throw new Error("unauthorized");
    const res = await fetch(path, {
      credentials: "include",
      ...(init || {}),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...((init && init.headers) || {})
      }
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(body.error || `HTTP ${res.status}`));
    return body;
  }

  root.ProCalModules.compApi = { formatCompMinutes, fetchCompJson };
})(window);
