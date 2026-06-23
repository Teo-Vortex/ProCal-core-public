(function initAppAccessTokenModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  async function ensureAccessToken(options) {
    const o = options || {};
    const storageRef = o.storageRef || localStorage;
    const fetchRef = typeof o.fetchRef === "function" ? o.fetchRef : fetch;
    const isJwtAccessTokenFresh = typeof o.isJwtAccessTokenFresh === "function" ? o.isJwtAccessTokenFresh : (() => false);
    const getLocalRefreshPromise = typeof o.getLocalRefreshPromise === "function" ? o.getLocalRefreshPromise : (() => null);
    const setLocalRefreshPromise = typeof o.setLocalRefreshPromise === "function" ? o.setLocalRefreshPromise : (() => {});

    let token = String(storageRef.getItem("procal_access_token") || "");
    if (token && isJwtAccessTokenFresh(token, 20)) return token;

    const shared = root.ProCalAuthRefresh || (root.ProCalAuthRefresh = {});
    const isTransientRefreshError = (err) => {
      if (!err) return false;
      const name = String(err.name || "");
      const msg = String(err.message || "");
      if (name === "AbortError") return true;
      return /Failed to fetch|NetworkError|ERR_EMPTY_RESPONSE|ERR_CONNECTION|fetch/i.test(msg);
    };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    if (shared.promise) {
      try {
        token = String((await shared.promise) || "");
        return token;
      } catch {
        return "";
      }
    }

    const localPromise = getLocalRefreshPromise();
    if (localPromise) {
      try {
        token = String((await localPromise) || "");
        return token;
      } catch {
        return "";
      }
    }

    const nextLocalPromise = (async () => {
      try {
        if (shared.promise) return String((await shared.promise) || "");
        shared.promise = (async () => {
          try {
            const runOnce = async () => {
              const r = await fetchRef("/api/auth/refresh", { method: "POST", credentials: "include" });
              if (!r.ok) {
                if (r.status === 401 || r.status === 403) {
                  shared.lastFailureKind = "unauthorized";
                  try { storageRef.removeItem("procal_access_token"); } catch {}
                  return "";
                }
                const e = new Error(`HTTP ${r.status}`);
                e.procalTransient = true;
                throw e;
              }
              const body = await r.json();
              const nextToken = String((body && body.accessToken) || "");
              if (nextToken) {
                storageRef.setItem("procal_access_token", nextToken);
                shared.lastFailureKind = "";
              } else {
                shared.lastFailureKind = "unauthorized";
                try { storageRef.removeItem("procal_access_token"); } catch {}
              }
              return nextToken;
            };
            try {
              return await runOnce();
            } catch (err) {
              if (!(err && (err.procalTransient || isTransientRefreshError(err)))) {
                shared.lastFailureKind = "transient";
                throw err;
              }
              await sleep(150);
              try {
                return await runOnce();
              } catch (err2) {
                if (err2 && (err2.procalTransient || isTransientRefreshError(err2))) {
                  shared.lastFailureKind = "transient";
                }
                throw err2;
              }
            }
          } catch {
            if (shared.lastFailureKind === "unauthorized") {
              try { storageRef.removeItem("procal_access_token"); } catch {}
            }
            return "";
          } finally {
            shared.promise = null;
          }
        })();
        return String((await shared.promise) || "");
      } finally {
        setLocalRefreshPromise(null);
      }
    })();

    setLocalRefreshPromise(nextLocalPromise);
    try {
      return String((await nextLocalPromise) || "");
    } catch {
      return "";
    }
  }

  root.ProCalModules.appAccessToken = {
    ensureAccessToken
  };
})(window);

