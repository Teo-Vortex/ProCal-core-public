(function initAndroidShellModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  let androidShellState = null;
  let androidPushSyncFingerprint = "";
  let androidPushSyncInFlight = false;
  let androidPushRetryTimer = null;
  let pushIntentHandled = false;
  let shellStateListenerAttached = false;

  function getWindow(options) {
    return (options && options.windowObj) || root;
  }

  function getSessionStorage(options) {
    return (options && options.sessionStorageRef) || root.sessionStorage;
  }

  function getTimeouts(options) {
    const win = getWindow(options);
    return {
      setTimeoutFn: (options && options.setTimeoutFn) || win.setTimeout.bind(win),
      clearTimeoutFn: (options && options.clearTimeoutFn) || win.clearTimeout.bind(win)
    };
  }

  function getCurrentUserId(options) {
    return typeof options.getCurrentUserId === "function"
      ? String(options.getCurrentUserId() || "")
      : "";
  }

  function getAndroidShellBridge(options) {
    const win = getWindow(options);
    return win.ProCalAndroidShell && typeof win.ProCalAndroidShell.getShellStateJson === "function"
      ? win.ProCalAndroidShell
      : null;
  }

  function normalizeAndroidShellState(input) {
    const row = input && typeof input === "object" ? input : {};
    return {
      platform: String(row.platform || "").trim().toLowerCase(),
      installationId: String(row.installationId || "").trim(),
      pushSupported: row.pushSupported === false ? false : true,
      pushToken: String(row.pushToken || "").trim(),
      notificationPermission: String(row.notificationPermission || "").trim().toLowerCase(),
      appVersion: String(row.appVersion || "").trim()
    };
  }

  function clearAndroidPushRetryTimer(options) {
    if (!androidPushRetryTimer) return;
    const { clearTimeoutFn } = getTimeouts(options || {});
    clearTimeoutFn(androidPushRetryTimer);
    androidPushRetryTimer = null;
  }

  function refreshAndroidShellState(options) {
    const bridge = getAndroidShellBridge(options || {});
    if (!bridge) {
      androidShellState = null;
      return null;
    }
    try {
      const raw = bridge.getShellStateJson();
      if (!raw) {
        androidShellState = null;
        return null;
      }
      const parsed = JSON.parse(String(raw));
      androidShellState = normalizeAndroidShellState(parsed);
      return androidShellState;
    } catch {
      androidShellState = null;
      return null;
    }
  }

  function scheduleAndroidPushRetry(options, delayMs) {
    const opts = options || {};
    const state = androidShellState || refreshAndroidShellState(opts);
    if (!state || state.platform !== "android") return;
    if (androidPushRetryTimer) return;
    const { setTimeoutFn } = getTimeouts(opts);
    const delay = Math.max(1500, Number(delayMs) || 10000);
    androidPushRetryTimer = setTimeoutFn(() => {
      androidPushRetryTimer = null;
      void syncAndroidPushRegistration(opts, true);
    }, delay);
  }

  function maybeRequestAndroidPushPermission(options) {
    const opts = options || {};
    const bridge = getAndroidShellBridge(opts);
    const state = androidShellState || refreshAndroidShellState(opts);
    if (!bridge || !state || state.platform !== "android") return;
    if (!state.pushSupported) return;
    if (state.notificationPermission !== "prompt") return;
    const currentUserId = getCurrentUserId(opts);
    if (!currentUserId) return;
    const storage = getSessionStorage(opts);
    const promptKey = `procal_android_push_prompted_${currentUserId}`;
    if (storage.getItem(promptKey) === "1") return;
    storage.setItem(promptKey, "1");
    if (typeof bridge.requestNotificationPermission === "function") {
      try {
        bridge.requestNotificationPermission();
      } catch {
        // ignore native bridge errors
      }
    }
  }

  async function unregisterAndroidPushDevice(options) {
    const opts = options || {};
    const state = androidShellState || refreshAndroidShellState(opts);
    if (!state || state.platform !== "android" || !state.installationId) return;
    try {
      const token = typeof opts.ensureAccessToken === "function"
        ? await opts.ensureAccessToken()
        : "";
      if (!token) return;
      const fetchImpl = opts.fetchImpl || root.fetch.bind(root);
      await fetchImpl("/api/mobile/push/unregister", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          installationId: state.installationId,
          token: state.pushToken || ""
        })
      });
    } catch {
      // no-op
    } finally {
      clearAndroidPushRetryTimer(opts);
      androidPushSyncFingerprint = "";
    }
  }

  async function isServerMobilePushConfigured(options, token) {
    const opts = options || {};
    const authToken = String(token || "").trim();
    if (!authToken) return false;
    const fetchImpl = opts.fetchImpl || root.fetch.bind(root);
    const res = await fetchImpl("/api/mobile/push/status", {
      method: "GET",
      credentials: "include",
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });
    if (!res.ok) {
      throw new Error("push status unavailable");
    }
    const body = await res.json().catch(() => null);
    return !body || body.configured !== false;
  }

  async function syncAndroidPushRegistration(options, force) {
    const opts = options || {};
    const state = androidShellState || refreshAndroidShellState(opts);
    const currentUserId = getCurrentUserId(opts);
    if (!state || state.platform !== "android" || !currentUserId) return;
    if (!state.pushSupported) return;
    if (!state.installationId) return;
    if (androidPushSyncInFlight) return;

    const notificationsEnabled = state.notificationPermission === "granted" && Boolean(state.pushToken);
    const nextFingerprint = notificationsEnabled
      ? [currentUserId, state.installationId, state.pushToken, state.notificationPermission, state.appVersion].join("|")
      : `${currentUserId}|${state.installationId}|disabled`;

    if (!force && nextFingerprint === androidPushSyncFingerprint) return;

    androidPushSyncInFlight = true;
    try {
      const token = typeof opts.ensureAccessToken === "function"
        ? await opts.ensureAccessToken()
        : "";
      if (!token) {
        scheduleAndroidPushRetry(opts, 8000);
        return;
      }

      const fetchImpl = opts.fetchImpl || root.fetch.bind(root);
      if (!notificationsEnabled) {
        const res = await fetchImpl("/api/mobile/push/unregister", {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            installationId: state.installationId,
            token: state.pushToken || ""
          })
        });
        if (res.ok) {
          clearAndroidPushRetryTimer(opts);
          androidPushSyncFingerprint = nextFingerprint;
        } else {
          scheduleAndroidPushRetry(opts, 12000);
        }
        return;
      }

      const serverPushConfigured = await isServerMobilePushConfigured(opts, token);
      if (!serverPushConfigured) {
        const res = await fetchImpl("/api/mobile/push/unregister", {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            installationId: state.installationId,
            token: state.pushToken || ""
          })
        });
        if (res.ok) {
          clearAndroidPushRetryTimer(opts);
          androidPushSyncFingerprint = `${currentUserId}|${state.installationId}|server-push-disabled`;
        } else {
          scheduleAndroidPushRetry(opts, 12000);
        }
        return;
      }

      const res = await fetchImpl("/api/mobile/push/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: "android",
          installationId: state.installationId,
          token: state.pushToken,
          appVersion: state.appVersion || "",
          deviceLabel: "ProCal Android",
          notificationsEnabled: true
        })
      });
      if (res.ok) {
        clearAndroidPushRetryTimer(opts);
        androidPushSyncFingerprint = nextFingerprint;
      } else {
        scheduleAndroidPushRetry(opts, 12000);
      }
    } catch {
      scheduleAndroidPushRetry(opts, 12000);
    } finally {
      androidPushSyncInFlight = false;
    }
  }

  function applyAndroidShellState(nextState, options) {
    const opts = options || {};
    androidShellState = normalizeAndroidShellState(nextState);
    if (!getCurrentUserId(opts)) return androidShellState;
    maybeRequestAndroidPushPermission(opts);
    void syncAndroidPushRegistration(opts, false);
    return androidShellState;
  }

  function attachShellStateListener(options) {
    if (shellStateListenerAttached) return;
    const opts = options || {};
    const win = getWindow(opts);
    win.addEventListener("procal-android-shell-state", (event) => {
      const detail = event && event.detail ? event.detail : {};
      applyAndroidShellState(detail, opts);
    });
    shellStateListenerAttached = true;
  }

  function handlePushIntentFromUrl(options) {
    const opts = options || {};
    if (pushIntentHandled) return;
    const locationRef = opts.locationRef || root.location;
    const historyRef = opts.historyRef || root.history;
    const params = new URLSearchParams(locationRef.search || "");
    const pushKind = String(params.get("push") || "").trim().toLowerCase();
    if (!pushKind) return;
    pushIntentHandled = true;

    const nextUrl = new URL(locationRef.href);
    nextUrl.searchParams.delete("push");
    nextUrl.searchParams.delete("scope");
    nextUrl.searchParams.delete("peerUserId");
    historyRef.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

    const setTimeoutFn = (opts.setTimeoutFn || root.setTimeout.bind(root));
    if (pushKind === "notifications") {
      setTimeoutFn(() => {
        if (typeof opts.openNotificationsMenu === "function") {
          opts.openNotificationsMenu();
        }
      }, 120);
      return;
    }

    if (pushKind === "chat" && typeof opts.canChatAccess === "function" && opts.canChatAccess()) {
      const scope = String(params.get("scope") || "").trim().toLowerCase() === "direct" ? "direct" : "global";
      const peerUserId = String(params.get("peerUserId") || "").trim();
      setTimeoutFn(async () => {
        if (typeof opts.openChatModal === "function") {
          opts.openChatModal();
        }
        if (typeof opts.selectChatThread !== "function") return;
        if (scope === "direct" && peerUserId) {
          await opts.selectChatThread("direct", peerUserId);
          return;
        }
        await opts.selectChatThread("global", "");
      }, 120);
    }
  }

  root.ProCalModules.appAndroidShell = {
    getAndroidShellBridge,
    normalizeAndroidShellState,
    applyAndroidShellState,
    clearAndroidPushRetryTimer,
    scheduleAndroidPushRetry,
    refreshAndroidShellState,
    attachShellStateListener,
    maybeRequestAndroidPushPermission,
    unregisterAndroidPushDevice,
    syncAndroidPushRegistration,
    handlePushIntentFromUrl
  };
})(window);
