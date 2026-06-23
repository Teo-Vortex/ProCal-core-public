(function initChatMeta(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getThreadLabel(item, options) {
    const opts = options || {};
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const getPersonNameById = typeof opts.getPersonNameById === "function"
      ? opts.getPersonNameById
      : ((id) => String(id || ""));
    if (!item || item.scope === "global") return t("chatGlobal");
    const peerId = String(item.peerUserId || "");
    return getPersonNameById(peerId) || peerId || t("unknown");
  }

  function getThreadColor(item, options) {
    const opts = options || {};
    if (!item || item.scope === "global") return "#0f766e";
    const peerId = String(item.peerUserId || "");
    const roster = Array.isArray(opts.operationalPeople) ? opts.operationalPeople : [];
    const person = roster.find((p) => String(p && p.id || "") === peerId);
    return person && person.color ? person.color : "#64748b";
  }

  function getActiveThreadKey(options) {
    const opts = options || {};
    if (opts.chatActiveScope === "global") return "global";
    const me = String(opts.currentUserId || "");
    const peer = String(opts.chatActivePeerUserId || "");
    if (!me || !peer) return "";
    return me < peer ? `dm:${me}:${peer}` : `dm:${peer}:${me}`;
  }

  root.ProCalModules.chatMeta = {
    getThreadLabel,
    getThreadColor,
    getActiveThreadKey
  };
})(window);

