(function initPermissionsAcl(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function hasGlobalAdminPrivileges(role) {
    const value = String(role || "");
    return value === "system_admin";
  }

  function hasPermission(permissions, permissionKey) {
    const set = permissions instanceof Set ? permissions : new Set();
    const key = String(permissionKey || "");
    if (!key) return false;
    return set.has("*") || set.has(key);
  }

  function normalizePermissions(value) {
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value.map((item) => String(item || "").trim()).filter(Boolean));
    return new Set();
  }

  function canReadAllReports(ctx) {
    const c = ctx || {};
    return hasGlobalAdminPrivileges(c.role) || hasPermission(c.permissions, "reports.read_all");
  }

  function canReadOwnReports(ctx) {
    const c = ctx || {};
    return canReadAllReports(c) || hasPermission(c.permissions, "reports.read_self");
  }

  function canReadAllCompensations(ctx) {
    const c = ctx || {};
    return hasGlobalAdminPrivileges(c.role) || hasPermission(c.permissions, "comp.read_all");
  }

  function canReadOwnCompensations(ctx) {
    const c = ctx || {};
    return canReadAllCompensations(c) || hasPermission(c.permissions, "comp.read_self");
  }

  function canManageCompensations(ctx) {
    const c = ctx || {};
    return hasGlobalAdminPrivileges(c.role) || hasPermission(c.permissions, "comp.manage");
  }

  function canCompOverviewAccess(ctx) {
    const c = ctx || {};
    return canReadAllCompensations(c) || canManageCompensations(c);
  }

  function canReadAllLeave(ctx) {
    const c = ctx || {};
    return hasGlobalAdminPrivileges(c.role) || hasPermission(c.permissions, "leave.read_all") || hasPermission(c.permissions, "leave.manage");
  }

  function canReadOwnLeave(ctx) {
    const c = ctx || {};
    return canReadAllLeave(c) || hasPermission(c.permissions, "leave.read_self");
  }

  function canManageLeave(ctx) {
    const c = ctx || {};
    return hasGlobalAdminPrivileges(c.role) || hasPermission(c.permissions, "leave.manage");
  }

  function isSharedUserTaskOnlyMode(ctx) {
    const c = ctx || {};
    if (String(c.calendarMode || "") !== "shared") return false;
    const permissions = normalizePermissions(c.permissions);
    if (permissions.size) {
      return !hasPermission(permissions, "events.create")
        && !hasPermission(permissions, "events.update")
        && !hasPermission(permissions, "events.delete");
    }
    const role = String(c.role || "");
    return role === "user" || role === "hr" || role === "pr";
  }

  function canManageEventAndAbsenceChanges(ctx) {
    const c = ctx || {};
    if (Boolean(c.readOnly)) return false;
    if (String(c.calendarMode || "") !== "shared") return true;
    const permissions = normalizePermissions(c.permissions);
    if (permissions.size) {
      return hasPermission(permissions, "events.create")
        || hasPermission(permissions, "events.update")
        || hasPermission(permissions, "events.delete");
    }
    return !isSharedUserTaskOnlyMode(c);
  }

  root.ProCalModules.permissionsAcl = {
    hasGlobalAdminPrivileges,
    hasPermission,
    canReadAllReports,
    canReadOwnReports,
    canReadAllCompensations,
    canReadOwnCompensations,
    canManageCompensations,
    canCompOverviewAccess,
    canReadAllLeave,
    canReadOwnLeave,
    canManageLeave,
    isSharedUserTaskOnlyMode,
    canManageEventAndAbsenceChanges
  };
})(window);
