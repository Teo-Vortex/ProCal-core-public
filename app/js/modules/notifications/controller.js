(function initNotificationsController(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  async function refreshUnreadCount(options) {
    const opts = options || {};
    const setUnreadCount = typeof opts.setUnreadCount === "function" ? opts.setUnreadCount : null;
    const renderBadge = typeof opts.renderNotificationsBadge === "function" ? opts.renderNotificationsBadge : null;
    if (!opts.currentUserId) {
      if (setUnreadCount) setUnreadCount(0);
      if (renderBadge) renderBadge();
      return;
    }
    try {
      const body = await opts.fetchNotifications("/api/notifications/unread-count");
      if (setUnreadCount) setUnreadCount(Number((body && body.unreadCount) || 0));
    } catch {
      // no-op
    }
    if (renderBadge) renderBadge();
  }

  async function load(options) {
    const opts = options || {};
    const getLoadInFlight = typeof opts.getLoadInFlight === "function" ? opts.getLoadInFlight : (() => false);
    const setLoadInFlight = typeof opts.setLoadInFlight === "function" ? opts.setLoadInFlight : null;
    const setRows = typeof opts.setRows === "function" ? opts.setRows : null;
    const setUnreadCount = typeof opts.setUnreadCount === "function" ? opts.setUnreadCount : null;
    const renderList = typeof opts.renderNotificationsList === "function" ? opts.renderNotificationsList : null;
    const renderBadge = typeof opts.renderNotificationsBadge === "function" ? opts.renderNotificationsBadge : null;
    const unreadOnly = Boolean(opts.notificationsUnreadOnly);

    if (getLoadInFlight()) return;
    if (setLoadInFlight) setLoadInFlight(true);
    try {
      const query = unreadOnly ? "?unread=1&limit=50" : "?limit=50";
      const body = await opts.fetchNotifications(`/api/notifications${query}`);
      if (setRows) setRows(Array.isArray(body && body.items) ? body.items : []);
      if (setUnreadCount) setUnreadCount(Number((body && body.unreadCount) || 0));
    } catch {
      if (setRows) setRows([]);
    } finally {
      if (setLoadInFlight) setLoadInFlight(false);
      if (renderList) renderList();
      if (renderBadge) renderBadge();
    }
  }

  function scheduleRefresh(options) {
    const opts = options || {};
    const getTimer = typeof opts.getRefreshTimer === "function" ? opts.getRefreshTimer : (() => null);
    const setTimer = typeof opts.setRefreshTimer === "function" ? opts.setRefreshTimer : null;
    const refreshUnread = typeof opts.refreshNotificationUnreadCount === "function" ? opts.refreshNotificationUnreadCount : null;
    const loadNotifications = typeof opts.loadNotifications === "function" ? opts.loadNotifications : null;
    const isMenuOpen = typeof opts.isNotificationsMenuOpen === "function" ? opts.isNotificationsMenuOpen : (() => false);
    const delay = Math.max(0, Number(opts.delay) || 0);

    const prev = getTimer();
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      if (setTimer) setTimer(null);
      if (refreshUnread) void refreshUnread();
      if (isMenuOpen() && loadNotifications) void loadNotifications();
    }, delay);
    if (setTimer) setTimer(timer);
  }

  async function markRead(options) {
    const opts = options || {};
    const id = String(opts.id || "").trim();
    if (!id) return;
    const setUnreadCount = typeof opts.setUnreadCount === "function" ? opts.setUnreadCount : null;
    try {
      const body = await opts.fetchNotifications(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST", body: "{}" });
      if (setUnreadCount) setUnreadCount(Number((body && body.unreadCount) || 0));
    } catch {
      // no-op
    }
    if (typeof opts.loadNotifications === "function") await opts.loadNotifications();
  }

  async function markAllRead(options) {
    const opts = options || {};
    const setUnreadCount = typeof opts.setUnreadCount === "function" ? opts.setUnreadCount : null;
    try {
      await opts.fetchNotifications("/api/notifications/read-all", { method: "POST", body: "{}" });
      if (setUnreadCount) setUnreadCount(0);
    } catch {
      // no-op
    }
    if (typeof opts.loadNotifications === "function") await opts.loadNotifications();
  }

  async function clearForCurrentUser(options) {
    const opts = options || {};
    const setRows = typeof opts.setRows === "function" ? opts.setRows : null;
    const setUnreadCount = typeof opts.setUnreadCount === "function" ? opts.setUnreadCount : null;
    const renderList = typeof opts.renderNotificationsList === "function" ? opts.renderNotificationsList : null;
    const renderBadge = typeof opts.renderNotificationsBadge === "function" ? opts.renderNotificationsBadge : null;
    try {
      await opts.fetchNotifications("/api/notifications/clear", { method: "POST", body: "{}" });
      if (setRows) setRows([]);
      if (setUnreadCount) setUnreadCount(0);
      if (renderList) renderList();
      if (renderBadge) renderBadge();
    } catch {
      // no-op
    }
    if (typeof opts.loadNotifications === "function") await opts.loadNotifications();
  }

  function openMenu(options) {
    const opts = options || {};
    const menuEl = opts.notificationsMenu;
    if (!menuEl) return;
    menuEl.classList.remove("hidden");
    menuEl.setAttribute("aria-hidden", "false");
    if (typeof opts.loadNotifications === "function") void opts.loadNotifications();
  }

  function closeMenu(options) {
    const menuEl = options && options.notificationsMenu;
    if (!menuEl) return;
    menuEl.classList.add("hidden");
    menuEl.setAttribute("aria-hidden", "true");
  }

  root.ProCalModules.notificationsController = {
    refreshUnreadCount,
    load,
    scheduleRefresh,
    markRead,
    markAllRead,
    clearForCurrentUser,
    openMenu,
    closeMenu
  };
})(window);

