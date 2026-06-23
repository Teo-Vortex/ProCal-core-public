(function initSessionFacadeModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  async function refreshCurrentUserSession(showNotice, options) {
    const o = options || {};
    const ensureAccessToken = typeof o.ensureAccessToken === "function" ? o.ensureAccessToken : (async () => "");
    const fetchRef = typeof o.fetchRef === "function" ? o.fetchRef : fetch;
    const applyCurrentUserPayload = typeof o.applyCurrentUserPayload === "function" ? o.applyCurrentUserPayload : (() => {});
    const queueLeaveAbsenceSync = typeof o.queueLeaveAbsenceSync === "function" ? o.queueLeaveAbsenceSync : (() => {});
    const refreshCurrentCompBalance = typeof o.refreshCurrentCompBalance === "function" ? o.refreshCurrentCompBalance : (async () => {});
    const scheduleNotificationsRefresh = typeof o.scheduleNotificationsRefresh === "function" ? o.scheduleNotificationsRefresh : (() => {});

    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const res = await fetchRef(`/api/me?ts=${Date.now()}`, {
        headers: { authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store"
      });
      if (res.status === 304) return;
      if (!res.ok) return;
      const body = await res.json().catch(() => null);
      if (!body) return;
      applyCurrentUserPayload(body, showNotice);
      queueLeaveAbsenceSync(true);
      await refreshCurrentCompBalance();
      scheduleNotificationsRefresh(0);
    } catch {
      // ignore session refresh errors
    }
  }

  function queueCurrentUserSessionRefresh(showNotice, options) {
    const o = options || {};
    const getTimer = typeof o.getTimer === "function" ? o.getTimer : () => null;
    const setTimer = typeof o.setTimer === "function" ? o.setTimer : () => {};
    const refreshCurrentUserSessionFn = typeof o.refreshCurrentUserSession === "function" ? o.refreshCurrentUserSession : (() => {});
    if (getTimer()) return;
    const timer = setTimeout(async () => {
      setTimer(null);
      await refreshCurrentUserSessionFn(showNotice);
    }, 450);
    setTimer(timer);
  }

  function queueAdminUsersRefresh(options) {
    const o = options || {};
    const isAdminRole = typeof o.isAdminRole === "function" ? o.isAdminRole : () => false;
    if (!isAdminRole()) return;
    const getTimer = typeof o.getTimer === "function" ? o.getTimer : () => null;
    const setTimer = typeof o.setTimer === "function" ? o.setTimer : () => {};
    const loadAdminUsers = typeof o.loadAdminUsers === "function" ? o.loadAdminUsers : (() => {});
    if (getTimer()) return;
    const timer = setTimeout(() => {
      setTimer(null);
      loadAdminUsers();
    }, 500);
    setTimer(timer);
  }

  function shouldShowExternalSyncToast(payload, options) {
    const o = options || {};
    const currentUserId = String(o.currentUserId || "");
    if (!payload || typeof payload !== "object") return false;
    if (!currentUserId) return false;
    const actorId = String(payload.actorUserId || "");
    if (!actorId) return false;
    return actorId !== currentUserId;
  }

  function isNewRealtimePayload(payload, options) {
    const o = options || {};
    const normalizeCalendarMode = typeof o.normalizeCalendarMode === "function" ? o.normalizeCalendarMode : ((v) => String(v || "shared"));
    const signatureByMode = o.signatureByMode && typeof o.signatureByMode === "object" ? o.signatureByMode : {};
    if (!payload || typeof payload !== "object") return true;
    const mode = normalizeCalendarMode(payload.mode);
    const version = Number(payload.version || 0);
    const updatedAt = typeof payload.updatedAt === "string" ? payload.updatedAt : "";
    if (!version && !updatedAt) return true;
    const signature = `${version}:${updatedAt}`;
    if (signatureByMode[mode] === signature) return false;
    signatureByMode[mode] = signature;
    return true;
  }

  root.ProCalModules.appSessionFacade = {
    refreshCurrentUserSession,
    queueCurrentUserSessionRefresh,
    queueAdminUsersRefresh,
    shouldShowExternalSyncToast,
    isNewRealtimePayload
  };
})(window);

