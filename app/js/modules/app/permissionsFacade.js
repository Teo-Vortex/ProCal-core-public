(function initPermissionsFacadeModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getAcl() {
    return root.ProCalModules && root.ProCalModules.permissionsAcl;
  }

  function canUseFeature(featureFlags, key) {
    if (!key || !featureFlags || typeof featureFlags !== "object") return true;
    if (!Object.prototype.hasOwnProperty.call(featureFlags, key)) return true;
    return Boolean(featureFlags[key]);
  }

  function hasGlobalAdminPrivileges(role) {
    const acl = getAcl();
    if (!acl || typeof acl.hasGlobalAdminPrivileges !== "function") return false;
    return acl.hasGlobalAdminPrivileges(role);
  }

  function canReadAllReports(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canReadAllReports !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "reports") && acl.canReadAllReports(ctx || {});
  }

  function canReadOwnReports(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canReadOwnReports !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "reports") && acl.canReadOwnReports(ctx || {});
  }

  function canReadAllCompensations(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canReadAllCompensations !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "compensations") && acl.canReadAllCompensations(ctx || {});
  }

  function canReadOwnCompensations(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canReadOwnCompensations !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "compensations") && acl.canReadOwnCompensations(ctx || {});
  }

  function canManageCompensations(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canManageCompensations !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "compensations") && acl.canManageCompensations(ctx || {});
  }

  function canCompOverviewAccess(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canCompOverviewAccess !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "compensations") && acl.canCompOverviewAccess(ctx || {});
  }

  function canMediaAccess(permissions, featureFlags) {
    const p = permissions instanceof Set ? permissions : new Set();
    if (!canUseFeature(featureFlags, "media")) return false;
    if (p.has("*")) return true;
    return p.has("media.read");
  }

  function canChatAccess(permissions, featureFlags) {
    const p = permissions instanceof Set ? permissions : new Set();
    if (!canUseFeature(featureFlags, "chat")) return false;
    if (p.has("*")) return true;
    return p.has("chat.read");
  }

  function canChatWrite(permissions, featureFlags) {
    const p = permissions instanceof Set ? permissions : new Set();
    if (!canUseFeature(featureFlags, "chat")) return false;
    if (p.has("*")) return true;
    return p.has("chat.write");
  }

  function canLeaveAccess(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canReadAllLeave !== "function") return false;
    return canUseFeature(ctx && ctx.featureFlags, "leave") && acl.canReadAllLeave(ctx || {});
  }

  function canLeaveSelfAccess(ctx) {
    if (!canUseFeature(ctx && ctx.featureFlags, "leave")) {
      return false;
    }
    const acl = getAcl();
    if (acl && typeof acl.canReadOwnLeave === "function") {
      return acl.canReadOwnLeave(ctx || {});
    }
    const c = ctx || {};
    return canLeaveAccess(c) || Boolean(c.permissions && typeof c.permissions.has === "function" && c.permissions.has("leave.read_self"));
  }

  function isSharedUserTaskOnlyMode(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.isSharedUserTaskOnlyMode !== "function") return false;
    return acl.isSharedUserTaskOnlyMode(ctx || {});
  }

  function canManageEventAndAbsenceChanges(ctx) {
    const acl = getAcl();
    if (!acl || typeof acl.canManageEventAndAbsenceChanges !== "function") return false;
    return acl.canManageEventAndAbsenceChanges(ctx || {});
  }

  root.ProCalModules.appPermissionsFacade = {
    canUseFeature,
    hasGlobalAdminPrivileges,
    canReadAllReports,
    canReadOwnReports,
    canReadAllCompensations,
    canReadOwnCompensations,
    canManageCompensations,
    canCompOverviewAccess,
    canMediaAccess,
    canChatAccess,
    canChatWrite,
    canLeaveAccess,
    canLeaveSelfAccess,
    isSharedUserTaskOnlyMode,
    canManageEventAndAbsenceChanges
  };
})(window);
