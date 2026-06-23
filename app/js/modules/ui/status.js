(function initUiStatus(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderConnectionStatus(options) {
    const opts = options || {};
    const badge = opts.connectionStatus;
    const textEl = opts.connectionStatusText;
    if (!badge || !textEl) return;
    const status = String(opts.realtimeConnectionStatus || "");
    const online = status === "connected";
    const hasSession = Boolean(String(opts.currentUserId || "").trim());
    const reconnecting = !online && hasSession;
    badge.classList.toggle("online", online);
    badge.classList.toggle("offline", !online && !reconnecting);
    badge.classList.toggle("reconnecting", reconnecting);
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const currentLang = String(opts.currentLang || "en");
    if (online) {
      textEl.textContent = t("online");
      return;
    }
    if (reconnecting) {
      textEl.textContent = currentLang === "bg" ? "Свързване..." : "Realtime reconnecting";
      return;
    }
    textEl.textContent = t("offline");
  }

  function renderCountBadge(options) {
    const opts = options || {};
    const badge = opts.badgeEl;
    if (!badge) return;
    const count = Number(opts.count) || 0;
    const hiddenClass = String(opts.hiddenClass || "hidden-section");
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.toggle(hiddenClass, count <= 0);
  }

  function isRealtimeConnected(options) {
    const opts = options || {};
    return String(opts.realtimeConnectionStatus || "") === "connected";
  }

  function getChatBadgePollIntervalMs(options) {
    return isRealtimeConnected(options) ? 15000 : 4000;
  }

  function getChatOpenPollIntervalMs(options) {
    return isRealtimeConnected(options) ? 8000 : 1200;
  }

  root.ProCalModules.uiStatus = {
    renderConnectionStatus,
    renderCountBadge,
    isRealtimeConnected,
    getChatBadgePollIntervalMs,
    getChatOpenPollIntervalMs
  };
})(window);
