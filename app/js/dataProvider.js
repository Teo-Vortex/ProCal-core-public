(function () {
  const ACCESS_KEY = "procal_access_token";
  const CALENDAR_MODE_KEY = "procal_calendar_mode";
  const AUTH_REFRESH_NS = "ProCalAuthRefresh";
  const resolveRuntimePath = (value) => {
    const runtime = window.PROCAL_RUNTIME || {};
    return runtime && typeof runtime.resolvePath === "function"
      ? runtime.resolvePath(value)
      : value;
  };
  let cachedVersion = 0;
  let calendarMode = localStorage.getItem(CALENDAR_MODE_KEY) === "personal" ? "personal" : "shared";

  let realtimeCallback = null;
  let realtimeAbortController = null;
  let realtimeReconnectTimer = null;
  let realtimeBackoffMs = 1000;
  let realtimeWatchdogTimer = null;

  const REALTIME_WATCHDOG_MS = 70000;

  function clearRealtimeWatchdog() {
    if (!realtimeWatchdogTimer) return;
    clearTimeout(realtimeWatchdogTimer);
    realtimeWatchdogTimer = null;
  }

  function touchRealtimeWatchdog() {
    clearRealtimeWatchdog();
    realtimeWatchdogTimer = setTimeout(() => {
      if (realtimeAbortController) {
        realtimeAbortController.abort();
      }
    }, REALTIME_WATCHDOG_MS);
  }

  function emitRealtimeStatus(status) {
    try {
      window.dispatchEvent(new CustomEvent("procal-realtime-status", { detail: { status } }));
    } catch {}
  }

  function getModeQuery() {
    return `mode=${calendarMode}`;
  }

  function stopRealtime() {
    emitRealtimeStatus("disconnected");
    clearRealtimeWatchdog();
    if (realtimeReconnectTimer) {
      clearTimeout(realtimeReconnectTimer);
      realtimeReconnectTimer = null;
    }
    if (realtimeAbortController) {
      realtimeAbortController.abort();
      realtimeAbortController = null;
    }
  }

  function scheduleRealtimeReconnect() {
    if (!realtimeCallback || realtimeReconnectTimer) return;
    const delay = Math.min(realtimeBackoffMs, 10000);
    realtimeReconnectTimer = setTimeout(() => {
      realtimeReconnectTimer = null;
      startRealtime();
    }, delay);
    realtimeBackoffMs = Math.min(realtimeBackoffMs * 2, 10000);
  }

  function parseSseChunk(buffer, onEvent) {
    let sepIndex = buffer.indexOf("\n\n");
    while (sepIndex !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const lines = rawEvent.split("\n");
      let eventName = "message";
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }

      if (dataLines.length) {
        try {
          const payload = JSON.parse(dataLines.join("\n"));
          onEvent(eventName, payload);
        } catch {
          // ignore invalid chunks
        }
      }

      sepIndex = buffer.indexOf("\n\n");
    }

    return buffer;
  }

  function getSharedAuthRefresh() {
    const root = window;
    root[AUTH_REFRESH_NS] = root[AUTH_REFRESH_NS] || {};
    return root[AUTH_REFRESH_NS];
  }

  function setRefreshFailureKind(kind) {
    try {
      const shared = getSharedAuthRefresh();
      shared.lastFailureKind = kind || "";
    } catch {}
  }

  function getRefreshFailureKind() {
    try {
      const shared = getSharedAuthRefresh();
      return String(shared.lastFailureKind || "");
    } catch {
      return "";
    }
  }

  function isTransientRefreshError(err) {
    if (!err) return false;
    const name = String(err.name || "");
    const msg = String(err.message || "");
    if (name === "AbortError") return true;
    return /Failed to fetch|NetworkError|ERR_EMPTY_RESPONSE|ERR_CONNECTION|fetch/i.test(msg);
  }

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function refreshAccessTokenNetworkOnce() {
    const r = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include"
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        setRefreshFailureKind("unauthorized");
        try { localStorage.removeItem(ACCESS_KEY); } catch {}
        return null;
      }
      const err = new Error(`HTTP ${r.status}`);
      err.procalTransient = true;
      throw err;
    }
    const body = await r.json();
    const token = body && body.accessToken ? String(body.accessToken) : "";
    if (token) {
      localStorage.setItem(ACCESS_KEY, token);
      setRefreshFailureKind("");
      return token;
    }
    setRefreshFailureKind("unauthorized");
    try { localStorage.removeItem(ACCESS_KEY); } catch {}
    return null;
  }

  async function refreshAccessTokenNetwork() {
    try {
      return await refreshAccessTokenNetworkOnce();
    } catch (err) {
      if (!(err && (err.procalTransient || isTransientRefreshError(err)))) {
        setRefreshFailureKind("transient");
        throw err;
      }
      await sleep(150);
      try {
        return await refreshAccessTokenNetworkOnce();
      } catch (err2) {
        if (err2 && (err2.procalTransient || isTransientRefreshError(err2))) {
          setRefreshFailureKind("transient");
        }
        throw err2;
      }
    }
  }

  async function refreshAccessToken() {
    const shared = getSharedAuthRefresh();
    if (shared.promise) {
      try {
        return await shared.promise;
      } catch {
        return null;
      }
    }
    shared.promise = (async () => {
      try {
        return await refreshAccessTokenNetwork();
      } finally {
        shared.promise = null;
      }
    })();
    try {
      return await shared.promise;
    } catch {
      return null;
    }
  }

  async function api(path, options) {
    let token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        if (getRefreshFailureKind() === "unauthorized") {
          window.location.href = resolveRuntimePath("/login");
          throw new Error("Not logged in");
        }
        throw new Error("Auth refresh unavailable");
      }
      token = refreshed;
    }

    const run = async (bearer) => fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(options && options.headers ? options.headers : {}),
        authorization: `Bearer ${bearer}`
      }
    });

    let res = await run(token);
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        if (getRefreshFailureKind() === "unauthorized") {
          window.location.href = resolveRuntimePath("/login");
          throw new Error("Session expired");
        }
        throw new Error("Auth refresh unavailable");
      }
      res = await run(refreshed);
    }
    return res;
  }

  async function startRealtime() {
    if (!realtimeCallback) { emitRealtimeStatus("disconnected"); return; }

    stopRealtime();
    let token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      token = await refreshAccessToken();
      if (!token) { emitRealtimeStatus("disconnected"); return; }
    }

    realtimeAbortController = new AbortController();

    try {
      let res = await fetch(`/api/sync/stream?${getModeQuery()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "text/event-stream"
        },
        signal: realtimeAbortController.signal
      });

      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          if (getRefreshFailureKind() === "unauthorized") {
            window.location.href = resolveRuntimePath("/login");
          }
          return;
        }
        res = await fetch(`/api/sync/stream?${getModeQuery()}`, {
          method: "GET",
          credentials: "include",
          headers: {
            authorization: `Bearer ${refreshed}`,
            accept: "text/event-stream"
          },
          signal: realtimeAbortController.signal
        });
      }

      if (!res.ok || !res.body) {
        emitRealtimeStatus("disconnected");
        scheduleRealtimeReconnect();
        return;
      }

      realtimeBackoffMs = 1000;
      emitRealtimeStatus("connected");
      touchRealtimeWatchdog();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        touchRealtimeWatchdog();
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        buffer = parseSseChunk(buffer, (eventName, payload) => {
          if (eventName === "legacy_state_changed" && realtimeCallback) {
            realtimeCallback(payload);
            return;
          }
          if (eventName === "notification") {
            try {
              window.dispatchEvent(new CustomEvent("procal-notification", { detail: payload || {} }));
            } catch {}
            return;
          }
          if (eventName === "chat_message" || eventName === "chat_presence") {
            try {
              window.dispatchEvent(new CustomEvent("procal-chat", { detail: { event: eventName, payload: payload || {} } }));
            } catch {}
          }
        });
      }
    } catch {
      emitRealtimeStatus("disconnected");
      // stream disconnected
    } finally {
      clearRealtimeWatchdog();
      if (realtimeAbortController && realtimeAbortController.signal.aborted) {
        return;
      }
      realtimeAbortController = null;
      emitRealtimeStatus("disconnected");
      scheduleRealtimeReconnect();
    }
  }

  async function loadState() {
    try {
      const res = await api(`/api/legacy/state?${getModeQuery()}`, { method: "GET" });
      if (!res.ok) return null;
      const body = await res.json();
      cachedVersion = Number(body.version || 0);
      return {
        mode: body.mode || calendarMode,
        state: body.state || null,
        updatedAt: body.updatedAt || null,
        modifiedAt: body.updatedAt || null,
        version: Number(body.version || 0)
      };
    } catch {
      return null;
    }
  }

  async function saveState(state, modifiedAt) {
    const payload = { state, modifiedAt, version: cachedVersion || undefined };
    const res = await api(`/api/legacy/state?${getModeQuery()}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    if (res.status === 409) {
      const remote = await loadState();
      return { ok: false, conflict: true, remote };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to save");
    }

    const body = await res.json();
    cachedVersion = Number(body.version || cachedVersion + 1);
    return { ok: true, version: cachedVersion };
  }

  async function loadSharedState() {
    try {
      const res = await api(`/api/legacy/state?mode=shared`, { method: "GET" });
      if (!res.ok) return null;
      const body = await res.json();
      return {
        mode: "shared",
        state: body.state || null,
        updatedAt: body.updatedAt || null,
        modifiedAt: body.updatedAt || null,
        version: Number(body.version || 0)
      };
    } catch {
      return null;
    }
  }

  async function saveSharedState(state, modifiedAt) {
    const remote = await loadSharedState();
    const payload = {
      state,
      modifiedAt,
      version: remote && remote.version ? remote.version : undefined
    };

    const res = await api(`/api/legacy/state?mode=shared`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to save shared state");
    }

    const body = await res.json();
    return { ok: true, version: Number(body.version || 0) };
  }
  window.dataProvider = {
    loadState,
    saveState,
    loadSharedState,
    saveSharedState,
    getCalendarMode: function () {
      return calendarMode;
    },
    setCalendarMode: function (mode) {
      calendarMode = mode === "personal" ? "personal" : "shared";
      cachedVersion = 0;
      localStorage.setItem(CALENDAR_MODE_KEY, calendarMode);
      if (realtimeCallback) startRealtime();
      return calendarMode;
    },
    subscribeRealtime: function (callback) {
      realtimeCallback = typeof callback === "function" ? callback : null;
      if (realtimeCallback) startRealtime();
      return function unsubscribe() {
        realtimeCallback = null;
        stopRealtime();
      };
    },
    clearAuth: async function (options) {
      stopRealtime();
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {}
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(CALENDAR_MODE_KEY);
      const redirectTo = options && typeof options.redirectTo === "string"
        ? String(options.redirectTo).trim()
        : "";
      window.location.href = redirectTo || resolveRuntimePath("/login");
    }
  };
  window.addEventListener("online", () => {
    if (realtimeCallback) startRealtime();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (realtimeCallback && !realtimeAbortController) {
      startRealtime();
    }
  });
})();




