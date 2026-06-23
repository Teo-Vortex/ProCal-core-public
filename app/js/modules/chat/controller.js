(function initChatController(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  async function refreshUnreadCount(options) {
    const opts = options || {};
    const renderChatBadge = typeof opts.renderChatBadge === "function" ? opts.renderChatBadge : null;
    const setChatUnreadCount = typeof opts.setChatUnreadCount === "function" ? opts.setChatUnreadCount : null;
    if (!opts.currentUserId || !opts.canChatAccess) {
      if (setChatUnreadCount) setChatUnreadCount(0);
      if (renderChatBadge) renderChatBadge();
      return;
    }
    try {
      const body = await opts.fetchChatJson("/api/chat/unread-count");
      if (setChatUnreadCount) setChatUnreadCount(Number((body && body.unreadCount) || 0));
    } catch {
      // no-op
    }
    if (renderChatBadge) renderChatBadge();
  }

  async function loadThreads(options) {
    const opts = options || {};
    if (!opts.chatOpen || opts.chatThreadsLoading || !opts.canChatAccess) return;
    const setChatThreadsLoading = typeof opts.setChatThreadsLoading === "function" ? opts.setChatThreadsLoading : null;
    const setChatRows = typeof opts.setChatRows === "function" ? opts.setChatRows : null;
    const setChatOnlineUserIds = typeof opts.setChatOnlineUserIds === "function" ? opts.setChatOnlineUserIds : null;
    const renderChatThreadList = typeof opts.renderChatThreadList === "function" ? opts.renderChatThreadList : null;
    const getChatActiveThreadKey = typeof opts.getChatActiveThreadKey === "function" ? opts.getChatActiveThreadKey : (() => "");
    if (setChatThreadsLoading) setChatThreadsLoading(true);
    try {
      const body = await opts.fetchChatJson("/api/chat/threads");
      let rows = Array.isArray(body && body.items) ? body.items : [];
      const onlineIds = new Set(Array.isArray(body && body.onlineUserIds) ? body.onlineUserIds.map((x) => String(x || "")) : []);
      if (setChatOnlineUserIds) setChatOnlineUserIds(onlineIds);
      const activeKey = getChatActiveThreadKey();
      const active = rows.find((row) => String(row && row.threadKey || "") === String(activeKey || ""));
      if (active) {
        if (opts.chatActiveScope === "global") active.unreadCount = 0;
        if (opts.chatActiveScope === "direct" && String(active.peerUserId || "") === String(opts.chatActivePeerUserId || "")) active.unreadCount = 0;
      }
      if (setChatRows) setChatRows(rows);
      if (renderChatThreadList) renderChatThreadList();
    } catch {
      // no-op
    } finally {
      if (setChatThreadsLoading) setChatThreadsLoading(false);
      if (renderChatThreadList) renderChatThreadList();
    }
  }

  async function loadMessages(options) {
    const opts = options || {};
    if (!opts.chatOpen || opts.chatMessagesLoading || !opts.canChatAccess || !opts.chatActiveScope) return;
    const setChatMessagesLoading = typeof opts.setChatMessagesLoading === "function" ? opts.setChatMessagesLoading : null;
    const setChatMessageRows = typeof opts.setChatMessageRows === "function" ? opts.setChatMessageRows : null;
    const renderChatMessages = typeof opts.renderChatMessages === "function" ? opts.renderChatMessages : null;
    if (setChatMessagesLoading) setChatMessagesLoading(true);
    try {
      const q = opts.chatActiveScope === "global"
        ? "/api/chat/messages?scope=global&limit=150"
        : `/api/chat/messages?scope=direct&peerUserId=${encodeURIComponent(String(opts.chatActivePeerUserId || ""))}&limit=150`;
      const body = await opts.fetchChatJson(q);
      if (setChatMessageRows) setChatMessageRows(Array.isArray(body && body.items) ? body.items : []);
      if (renderChatMessages) renderChatMessages();
    } catch {
      if (setChatMessageRows) setChatMessageRows([]);
      if (renderChatMessages) renderChatMessages();
    } finally {
      if (setChatMessagesLoading) setChatMessagesLoading(false);
    }
  }

  async function markThreadRead(options) {
    const opts = options || {};
    if (!opts.chatOpen || !opts.canChatAccess || !opts.chatActiveScope || opts.chatMarkReadInFlight) return;
    const payload = opts.chatActiveScope === "global"
      ? { scope: "global" }
      : { scope: "direct", peerUserId: String(opts.chatActivePeerUserId || "") };
    const setChatMarkReadInFlight = typeof opts.setChatMarkReadInFlight === "function" ? opts.setChatMarkReadInFlight : null;
    const setChatRows = typeof opts.setChatRows === "function" ? opts.setChatRows : null;
    const setChatUnreadCount = typeof opts.setChatUnreadCount === "function" ? opts.setChatUnreadCount : null;
    const renderChatBadge = typeof opts.renderChatBadge === "function" ? opts.renderChatBadge : null;
    const renderChatThreadList = typeof opts.renderChatThreadList === "function" ? opts.renderChatThreadList : null;
    const getChatActiveThreadKey = typeof opts.getChatActiveThreadKey === "function" ? opts.getChatActiveThreadKey : (() => "");
    const activeKey = getChatActiveThreadKey();
    const rows = Array.isArray(opts.chatRows) ? opts.chatRows : [];
    const activeRow = rows.find((row) => String(row && row.threadKey || "") === String(activeKey || ""));
    const clearedUnread = Math.max(0, Number(activeRow && activeRow.unreadCount || 0));
    if (setChatMarkReadInFlight) setChatMarkReadInFlight(true);
    try {
      await opts.fetchChatJson("/api/chat/read", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      // no-op
    }
    const nextRows = rows.map((row) => {
      if (String(row && row.threadKey || "") !== String(activeKey || "")) return row;
      return { ...row, unreadCount: 0 };
    });
    if (setChatRows) setChatRows(nextRows);
    if (setChatUnreadCount) {
      const current = Number(opts.chatUnreadCount) || 0;
      setChatUnreadCount(Math.max(0, current - clearedUnread));
    }
    if (renderChatBadge) renderChatBadge();
    if (renderChatThreadList) renderChatThreadList();
    if (setChatMarkReadInFlight) setChatMarkReadInFlight(false);
  }

  async function selectThread(options) {
    const opts = options || {};
    const nextScope = opts.scope === "direct" ? "direct" : "global";
    if (typeof opts.setChatActiveScope === "function") opts.setChatActiveScope(nextScope);
    if (typeof opts.setChatActivePeerUserId === "function") {
      opts.setChatActivePeerUserId(nextScope === "direct" ? String(opts.peerUserId || "") : "");
    }
    if (typeof opts.setChatAutoStickToBottom === "function") opts.setChatAutoStickToBottom(true);
    if (typeof opts.updateChatHeader === "function") opts.updateChatHeader();
    if (typeof opts.renderChatThreadList === "function") opts.renderChatThreadList();
    if (typeof opts.loadChatMessages === "function") await opts.loadChatMessages();
    if (typeof opts.markChatThreadRead === "function") await opts.markChatThreadRead();
  }

  function openModal(options) {
    const opts = options || {};
    const chatModal = opts.chatModal;
    if (!chatModal || !opts.canChatAccess) return;
    if (typeof opts.setChatOpen === "function") opts.setChatOpen(true);
    if (typeof opts.setChatAutoStickToBottom === "function") opts.setChatAutoStickToBottom(true);
    chatModal.classList.remove("hidden");
    chatModal.setAttribute("aria-hidden", "false");
    if (typeof opts.updateChatHeader === "function") opts.updateChatHeader();
    if (typeof opts.renderChatThreadList === "function") opts.renderChatThreadList();
    if (typeof opts.renderChatMessages === "function") opts.renderChatMessages({ forceBottom: true });

    const loadChatThreads = typeof opts.loadChatThreads === "function" ? opts.loadChatThreads : null;
    const loadChatMessages = typeof opts.loadChatMessages === "function" ? opts.loadChatMessages : null;
    const markChatThreadRead = typeof opts.markChatThreadRead === "function" ? opts.markChatThreadRead : null;
    const selectChatThread = typeof opts.selectChatThread === "function" ? opts.selectChatThread : null;

    if (loadChatThreads) {
      void loadChatThreads().then(async () => {
        if (!opts.chatActiveScope && selectChatThread) {
          await selectChatThread("global", "");
        } else {
          if (loadChatMessages) await loadChatMessages();
          if (markChatThreadRead) await markChatThreadRead();
        }
      });
    }

    const getPollTimer = typeof opts.getChatOpenPollTimer === "function" ? opts.getChatOpenPollTimer : (() => null);
    const setPollTimer = typeof opts.setChatOpenPollTimer === "function" ? opts.setChatOpenPollTimer : null;
    const prev = getPollTimer();
    if (prev) clearInterval(prev);

    const getOpenPollIntervalMs = typeof opts.getChatOpenPollIntervalMs === "function" ? opts.getChatOpenPollIntervalMs : (() => 1200);
    const documentRef = opts.documentRef || root.document;
    const timer = setInterval(() => {
      if (documentRef && documentRef.visibilityState !== "visible") return;
      void (async () => {
        if (loadChatMessages) await loadChatMessages();
        if (markChatThreadRead) await markChatThreadRead();
        if (loadChatThreads) await loadChatThreads();
        if (typeof opts.refreshChatUnreadCount === "function") await opts.refreshChatUnreadCount();
      })();
    }, getOpenPollIntervalMs());
    if (setPollTimer) setPollTimer(timer);
  }

  function closeModal(options) {
    const opts = options || {};
    const chatModal = opts.chatModal;
    if (!chatModal) return;
    if (typeof opts.setChatOpen === "function") opts.setChatOpen(false);
    chatModal.classList.add("hidden");
    chatModal.setAttribute("aria-hidden", "true");
    if (opts.chatScrollBottomBtn) opts.chatScrollBottomBtn.classList.add(String(opts.hiddenClass || "hidden-section"));
    const getPollTimer = typeof opts.getChatOpenPollTimer === "function" ? opts.getChatOpenPollTimer : (() => null);
    const setPollTimer = typeof opts.setChatOpenPollTimer === "function" ? opts.setChatOpenPollTimer : null;
    const timer = getPollTimer();
    if (timer) {
      clearInterval(timer);
      if (setPollTimer) setPollTimer(null);
    }
  }

  root.ProCalModules.chatController = {
    refreshUnreadCount,
    loadThreads,
    loadMessages,
    markThreadRead,
    selectThread,
    openModal,
    closeModal
  };
})(window);

