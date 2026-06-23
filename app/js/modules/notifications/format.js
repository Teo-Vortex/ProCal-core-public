(function initNotificationsFormat(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function formatNotificationDateTime(value, options) {
    const opts = options || {};
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const locale = String(opts.locale || "en-US");
    if (!value) return t("notificationsNow");
    const dt = new Date(String(value));
    if (Number.isNaN(dt.getTime())) return String(value);
    const dateTimeUi = root.ProCalModules && root.ProCalModules.uiDateTime;
    if (dateTimeUi && typeof dateTimeUi.formatDateTime24 === "function") {
      return dateTimeUi.formatDateTime24(dt, { locale });
    }
    return dt.toLocaleString(locale, { hour12: false });
  }

  function formatNotificationActor(item, options) {
    const opts = options || {};
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const getPersonNameById = typeof opts.getPersonNameById === "function" ? opts.getPersonNameById : (() => "");
    const currentUserId = String(opts.currentUserId || "");
    const meta = item && item.metaJson && typeof item.metaJson === "object" ? item.metaJson : null;
    const actorUserId = String((meta && meta.actorUserId) || "").trim();
    if (!actorUserId) return "";
    if (currentUserId && actorUserId === currentUserId) return t("notificationsActorMe");
    const name = getPersonNameById(actorUserId);
    return String(name || actorUserId).trim();
  }

  function isImportantNotificationType(type) {
    const value = String(type || "").trim().toLowerCase();
    return value === "admin.important";
  }

  function isPersonalTaskCollabInviteNotification(item) {
    return String(item && item.type || "").trim().toLowerCase() === "task.personal_collab_invite";
  }

  root.ProCalModules.notificationsFormat = {
    formatNotificationDateTime,
    formatNotificationActor,
    isImportantNotificationType,
    isPersonalTaskCollabInviteNotification
  };
})(window);
