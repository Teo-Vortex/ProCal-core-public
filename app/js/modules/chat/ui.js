(function initChatUi(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function isNearBottom(options) {
    const opts = options || {};
    const messagesEl = opts.chatMessagesEl;
    if (!messagesEl) return true;
    const threshold = Number.isFinite(Number(opts.thresholdPx)) ? Number(opts.thresholdPx) : 56;
    const distance = Math.max(0, messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight);
    return distance <= threshold;
  }

  function scrollToBottom(options) {
    const messagesEl = options && options.chatMessagesEl;
    if (!messagesEl) return;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateScrollBottomButton(options) {
    const opts = options || {};
    const btn = opts.chatScrollBottomBtn;
    const messagesEl = opts.chatMessagesEl;
    if (!btn || !messagesEl) return;
    const show = Boolean(opts.chatOpen) && Boolean(opts.chatActiveScope) && !isNearBottom({
      chatMessagesEl: messagesEl,
      thresholdPx: opts.thresholdPx
    });
    btn.classList.toggle(String(opts.hiddenClass || "hidden-section"), !show);
  }

  function decodeComponent(value) {
    const raw = String(value || "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  function parseMessageTokens(body) {
    const raw = String(body || "");
    const markerRe = /\[\[file:([a-zA-Z0-9_-]+):([^\]]+)\]\]/g;
    const tokens = [];
    let cursor = 0;
    let match = markerRe.exec(raw);
    while (match) {
      if (match.index > cursor) {
        tokens.push({
          kind: "text",
          value: raw.slice(cursor, match.index)
        });
      }
      const markerId = String(match[1] || "").trim();
      if (markerId) {
        const decodedName = decodeComponent(String(match[2] || ""));
        tokens.push({
          kind: "file",
          id: markerId,
          fileName: String(decodedName || "file.bin").trim() || "file.bin"
        });
      }
      cursor = match.index + match[0].length;
      match = markerRe.exec(raw);
    }
    if (cursor < raw.length) {
      tokens.push({
        kind: "text",
        value: raw.slice(cursor)
      });
    }
    if (!tokens.length) {
      tokens.push({
        kind: "text",
        value: raw
      });
    }
    return tokens;
  }

  function appendTextWithLineBreaks(doc, parent, text) {
    const normalized = String(text || "").replace(/\r\n?/g, "\n");
    const lines = normalized.split("\n");
    lines.forEach((line, idx) => {
      if (idx > 0) parent.appendChild(doc.createElement("br"));
      if (line) parent.appendChild(doc.createTextNode(line));
    });
  }

  function appendBubbleContent(options) {
    const opts = options || {};
    const doc = opts.documentRef;
    const bubble = opts.bubbleEl;
    if (!doc || !bubble) return;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const tokens = parseMessageTokens(opts.body);
    let hasContent = false;

    tokens.forEach((token) => {
      if (!token || typeof token !== "object") return;
      if (token.kind === "text") {
        const value = String(token.value || "");
        if (!value) return;
        if (hasContent) bubble.appendChild(doc.createElement("br"));
        appendTextWithLineBreaks(doc, bubble, value);
        hasContent = true;
        return;
      }
      if (token.kind === "file") {
        const id = String(token.id || "").trim();
        if (!id) return;
        const fileName = String(token.fileName || "file.bin").trim() || "file.bin";
        if (hasContent) bubble.appendChild(doc.createElement("br"));
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "chat-file-link";
        btn.dataset.fileDownloadId = encodeURIComponent(id);
        btn.dataset.fileName = encodeURIComponent(fileName);
        btn.textContent = `${t("filesDownload")}: ${fileName}`;
        bubble.appendChild(btn);
        hasContent = true;
      }
    });

    if (!hasContent) {
      bubble.textContent = "";
    }
  }

  function buildThreadPreview(body, t) {
    const translate = typeof t === "function" ? t : ((key) => key);
    const tokens = parseMessageTokens(body);
    const parts = [];
    tokens.forEach((token) => {
      if (!token || typeof token !== "object") return;
      if (token.kind === "text") {
        const cleaned = String(token.value || "").replace(/\s+/g, " ").trim();
        if (cleaned) parts.push(cleaned);
        return;
      }
      if (token.kind === "file") {
        const fileName = String(token.fileName || "file.bin").trim() || "file.bin";
        parts.push(`[${translate("files")}: ${fileName}]`);
      }
    });
    return parts.join(" ").trim();
  }

  function renderMessages(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const messagesEl = opts.chatMessagesEl;
    if (!doc || !messagesEl) {
      return { chatAutoStickToBottom: Boolean(opts.chatAutoStickToBottom) };
    }
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const getPersonNameById = typeof opts.getPersonNameById === "function" ? opts.getPersonNameById : ((id) => String(id || ""));
    const formatDateTime = typeof opts.formatNotificationDateTime === "function"
      ? opts.formatNotificationDateTime
      : ((v) => String(v || ""));
    const rows = Array.isArray(opts.chatMessageRows) ? opts.chatMessageRows : [];
    const currentUserId = String(opts.currentUserId || "");
    const nearThreshold = Number.isFinite(Number(opts.nearBottomThresholdPx)) ? Number(opts.nearBottomThresholdPx) : 64;

    const wasNearBottom = isNearBottom({ chatMessagesEl: messagesEl, thresholdPx: nearThreshold });
    const prevBottomDistance = Math.max(0, messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight);
    messagesEl.innerHTML = "";

    if (!opts.chatActiveScope) {
      const empty = doc.createElement("div");
      empty.className = "chat-empty";
      empty.textContent = t("chatSelectThread");
      messagesEl.appendChild(empty);
      updateScrollBottomButton({
        chatScrollBottomBtn: opts.chatScrollBottomBtn,
        chatMessagesEl: messagesEl,
        chatOpen: opts.chatOpen,
        chatActiveScope: opts.chatActiveScope,
        thresholdPx: nearThreshold,
        hiddenClass: opts.hiddenClass
      });
      return { chatAutoStickToBottom: Boolean(opts.chatAutoStickToBottom) };
    }

    if (!rows.length) {
      const empty = doc.createElement("div");
      empty.className = "chat-empty";
      empty.textContent = t("chatNoMessages");
      messagesEl.appendChild(empty);
      updateScrollBottomButton({
        chatScrollBottomBtn: opts.chatScrollBottomBtn,
        chatMessagesEl: messagesEl,
        chatOpen: opts.chatOpen,
        chatActiveScope: opts.chatActiveScope,
        thresholdPx: nearThreshold,
        hiddenClass: opts.hiddenClass
      });
      return { chatAutoStickToBottom: Boolean(opts.chatAutoStickToBottom) };
    }

    rows.forEach((msg) => {
      const mine = String(msg.senderId || "") === currentUserId;
      const wrap = doc.createElement("div");
      wrap.className = `chat-msg ${mine ? "mine" : "other"}`;

      const meta = doc.createElement("div");
      meta.className = "chat-msg-meta";
      const senderName = mine ? t("chatYou") : (getPersonNameById(msg.senderId) || String(msg.senderId || ""));
      meta.textContent = `${senderName} - ${formatDateTime(msg.createdAt)}`;

      const bubble = doc.createElement("div");
      bubble.className = "chat-msg-bubble";
      appendBubbleContent({
        documentRef: doc,
        bubbleEl: bubble,
        body: String(msg.body || ""),
        t
      });
      wrap.append(meta, bubble);
      messagesEl.appendChild(wrap);
    });

    const shouldStick = Boolean(opts.forceBottom) || Boolean(opts.chatAutoStickToBottom) || wasNearBottom;
    if (shouldStick) {
      scrollToBottom({ chatMessagesEl: messagesEl });
    } else {
      messagesEl.scrollTop = Math.max(0, messagesEl.scrollHeight - messagesEl.clientHeight - prevBottomDistance);
    }
    updateScrollBottomButton({
      chatScrollBottomBtn: opts.chatScrollBottomBtn,
      chatMessagesEl: messagesEl,
      chatOpen: opts.chatOpen,
      chatActiveScope: opts.chatActiveScope,
      thresholdPx: nearThreshold,
      hiddenClass: opts.hiddenClass
    });
    return { chatAutoStickToBottom: shouldStick ? true : Boolean(opts.chatAutoStickToBottom) };
  }

  function updateHeader(options) {
    const opts = options || {};
    const headerEl = opts.chatThreadHeader;
    if (!headerEl) return;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const getPersonNameById = typeof opts.getPersonNameById === "function" ? opts.getPersonNameById : ((id) => String(id || ""));
    if (!opts.chatActiveScope) {
      headerEl.textContent = t("chatSelectThread");
      return;
    }
    if (opts.chatActiveScope === "global") {
      headerEl.textContent = t("chatGlobal");
      return;
    }
    headerEl.textContent = getPersonNameById(opts.chatActivePeerUserId) || String(opts.chatActivePeerUserId || "") || t("unknown");
  }

  function renderThreadList(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const listEl = opts.chatThreadList;
    if (!doc || !listEl) return;
    listEl.innerHTML = "";

    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    if (!opts.canChatAccess) {
      const div = doc.createElement("div");
      div.className = "chat-empty";
      div.textContent = t("forbidden");
      listEl.appendChild(div);
      return;
    }

    const rowsSource = Array.isArray(opts.chatRows) ? opts.chatRows : [];
    const byPeer = new Map();
    let globalRow = null;
    rowsSource.forEach((row) => {
      if (!row || typeof row !== "object") return;
      if (row.scope === "global") globalRow = row;
      if (row.scope === "direct" && row.peerUserId) byPeer.set(String(row.peerUserId), row);
    });

    const currentUserId = String(opts.currentUserId || "");
    const roster = (Array.isArray(opts.operationalPeople) ? opts.operationalPeople : [])
      .filter((p) => String(p && p.id || "") && String(p && p.id || "") !== currentUserId);

    const getThreadLabel = typeof opts.getChatThreadLabel === "function"
      ? opts.getChatThreadLabel
      : ((row) => row && row.scope === "global" ? t("chatGlobal") : String(row && row.peerUserId || ""));
    const getLocale = typeof opts.getLocale === "function" ? opts.getLocale : (() => "en");

    const directRows = roster.map((person) => {
      const existing = byPeer.get(String(person.id || ""));
      return existing || {
        threadKey: "",
        scope: "direct",
        peerUserId: String(person.id || ""),
        unreadCount: 0,
        lastMessageAt: null,
        lastMessage: null
      };
    }).sort((a, b) => {
      const ta = a && a.lastMessageAt ? Date.parse(String(a.lastMessageAt)) : 0;
      const tb = b && b.lastMessageAt ? Date.parse(String(b.lastMessageAt)) : 0;
      if (ta !== tb) return tb - ta;
      return getThreadLabel(a).localeCompare(getThreadLabel(b), getLocale(), { sensitivity: "base" });
    });

    const rows = [globalRow || { scope: "global", threadKey: "global", unreadCount: 0, lastMessage: null, lastMessageAt: null, peerUserId: "" }, ...directRows];
    const getThreadColor = typeof opts.getChatThreadColor === "function" ? opts.getChatThreadColor : (() => "#64748b");
    const formatDateTime = typeof opts.formatNotificationDateTime === "function"
      ? opts.formatNotificationDateTime
      : ((v) => String(v || ""));
    const onlineSet = opts.chatOnlineUserIds instanceof Set ? opts.chatOnlineUserIds : new Set();
    const activeScope = String(opts.chatActiveScope || "");
    const activePeerUserId = String(opts.chatActivePeerUserId || "");
    const onSelectThread = typeof opts.onSelectThread === "function" ? opts.onSelectThread : null;

    rows.forEach((row) => {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "chat-thread-item";
      const isActive = (row.scope === "global" && activeScope === "global")
        || (row.scope === "direct" && activeScope === "direct" && String(row.peerUserId || "") === activePeerUserId);
      if (isActive) btn.classList.add("active");
      btn.addEventListener("click", async () => {
        if (!onSelectThread) return;
        if (row.scope === "global") {
          await onSelectThread("global", "");
        } else {
          await onSelectThread("direct", String(row.peerUserId || ""));
        }
      });

      const top = doc.createElement("div");
      top.className = "chat-thread-top";

      const presence = doc.createElement("span");
      presence.className = `chat-presence-dot ${row.scope === "global" ? "online" : (onlineSet.has(String(row.peerUserId || "")) ? "online" : "offline")}`;
      if (row.scope === "global") presence.title = t("chatGlobal");

      const name = doc.createElement("span");
      name.className = "chat-thread-name";
      name.textContent = getThreadLabel(row);
      name.style.color = getThreadColor(row);
      top.append(presence, name);

      if (Number(row.unreadCount || 0) > 0) {
        const dot = doc.createElement("span");
        dot.className = "chat-unread-dot";
        dot.title = String(row.unreadCount);
        top.appendChild(dot);
      }

      const preview = doc.createElement("div");
      preview.className = "chat-thread-preview";
      preview.textContent = row.lastMessage && row.lastMessage.body
        ? buildThreadPreview(String(row.lastMessage.body || ""), t)
        : "";

      const time = doc.createElement("div");
      time.className = "chat-thread-time";
      time.textContent = row.lastMessageAt ? formatDateTime(row.lastMessageAt) : "";

      btn.append(top, preview, time);
      listEl.appendChild(btn);
    });
  }

  root.ProCalModules.chatUi = {
    isNearBottom,
    scrollToBottom,
    updateScrollBottomButton,
    renderMessages,
    updateHeader,
    renderThreadList
  };
})(window);
