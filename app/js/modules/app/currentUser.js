(function initCurrentUserModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function normalizeDisplayColor(value) {
    const raw = String(value || "");
    return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "#64748b";
  }

  function normalizeTintOpacity(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 10;
    return Math.max(0, Math.min(100, n));
  }

  function normalizeCurrentUserPayload(body) {
    return {
      currentUserName: String(body && (body.nickname || body.username) ? (body.nickname || body.username) : ""),
      currentUserId: String(body && body.id ? body.id : ""),
      currentUserViewMode: "tasks",
      currentUserRole: String(body && body.role ? body.role : ""),
      currentUserStatus: String(body && body.status ? body.status : ""),
      currentUserDisplayColor: normalizeDisplayColor(body && body.displayColor),
      currentUserCalendarTintOpacity: normalizeTintOpacity(body && body.calendarTintOpacity),
      currentUserFullName: String(body && body.fullName ? body.fullName : ""),
      currentUserWorkplace: String(body && body.workplace ? body.workplace : ""),
      currentUserJobTitle: String(body && body.jobTitle ? body.jobTitle : ""),
      currentUserFeatureFlags: body && body.featureFlags && typeof body.featureFlags === "object" && !Array.isArray(body.featureFlags)
        ? { ...body.featureFlags }
        : {},
      currentUserPermissions: new Set(
        Array.isArray(body && body.permissions)
          ? body.permissions.map((x) => String(x || "")).filter(Boolean)
          : []
      )
    };
  }

  function applyCurrentUserPayload(body, showNotice, options) {
    const o = options || {};
    const buildSessionFingerprint = typeof o.buildSessionFingerprint === "function" ? o.buildSessionFingerprint : (() => "");
    const prevFingerprint = (typeof o.getLastSessionFingerprint === "function" ? o.getLastSessionFingerprint() : "") || buildSessionFingerprint();

    const nextState = normalizeCurrentUserPayload(body);
    const hasGlobalAdminPrivilegesForRole = typeof o.hasGlobalAdminPrivilegesForRole === "function"
      ? o.hasGlobalAdminPrivilegesForRole
      : (() => false);
    if (hasGlobalAdminPrivilegesForRole(nextState.currentUserRole)) nextState.currentUserPermissions.add("*");

    const readStickyLayoutMap = typeof o.readStickyLayoutMap === "function" ? o.readStickyLayoutMap : (() => ({}));
    const stickyLayoutById = readStickyLayoutMap();

    const commitState = typeof o.commitState === "function" ? o.commitState : (() => {});
    commitState(nextState, stickyLayoutById);

    const nextFingerprint = buildSessionFingerprint();
    const changed = Boolean(prevFingerprint && prevFingerprint !== nextFingerprint);
    if (typeof o.setLastSessionFingerprint === "function") o.setLastSessionFingerprint(nextFingerprint);

    const afterApplyUi = typeof o.afterApplyUi === "function" ? o.afterApplyUi : (() => {});
    afterApplyUi(nextState);

    if (showNotice && changed) {
      const t = typeof o.t === "function" ? o.t : ((k) => k);
      const showSyncToast = typeof o.showSyncToast === "function" ? o.showSyncToast : (() => {});
      showSyncToast(t("sessionChangedNotice"));
    }
    return changed;
  }

  root.ProCalModules.appCurrentUser = {
    normalizeCurrentUserPayload,
    applyCurrentUserPayload
  };
})(window);
