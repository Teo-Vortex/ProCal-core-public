(function initNotesSyncFlow(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function schedulePull(options) {
    const o = options || {};
    if (o.existingTimer) clearTimeout(o.existingTimer);
    const delayMs = Math.max(0, Number(o.delayMs) || 0);
    return setTimeout(() => {
      if (typeof o.onRun === "function") o.onRun();
    }, delayMs);
  }

  function schedulePush(options) {
    const o = options || {};
    if (o.existingTimer) clearTimeout(o.existingTimer);
    const delayMs = Math.max(0, Number(o.delayMs) || 250);
    return setTimeout(() => {
      if (typeof o.onRun === "function") o.onRun();
    }, delayMs);
  }

  async function syncFromShared(options) {
    const o = options || {};
    const dataProvider = o.dataProvider || root.dataProvider;
    if (!dataProvider || typeof dataProvider.loadSharedState !== "function") return false;
    try {
      const envelope = await dataProvider.loadSharedState();
      const remoteState = envelope && envelope.state && typeof envelope.state === "object" ? envelope.state : {};
      const sanitizeStickyNotes = typeof o.sanitizeStickyNotes === "function"
        ? o.sanitizeStickyNotes
        : ((list) => (Array.isArray(list) ? list : []));
      const remoteNotes = sanitizeStickyNotes(remoteState.stickyNotes);
      const currentNotes = Array.isArray(o.stickyNotes) ? o.stickyNotes : [];
      if (JSON.stringify(currentNotes) === JSON.stringify(remoteNotes)) return false;
      if (typeof o.setStickyNotes === "function") o.setStickyNotes(remoteNotes);
      if (typeof o.pruneStickyNoteOffsets === "function") {
        o.pruneStickyNoteOffsets(remoteNotes.map((n) => String((n && n.id) || "")));
      }
      if (typeof o.persistLocalStateSnapshot === "function") o.persistLocalStateSnapshot();
      if (typeof o.renderNotesPanel === "function") o.renderNotesPanel();
      return true;
    } catch {
      return false;
    }
  }

  async function pushToShared(options) {
    const o = options || {};
    if (o.readOnly) return false;
    const dataProvider = o.dataProvider || root.dataProvider;
    if (
      !dataProvider ||
      typeof dataProvider.loadSharedState !== "function" ||
      typeof dataProvider.saveSharedState !== "function"
    ) return false;
    try {
      const envelope = await dataProvider.loadSharedState();
      const remoteState = envelope && envelope.state && typeof envelope.state === "object" ? envelope.state : {};
      const sanitizeStickyNotes = typeof o.sanitizeStickyNotes === "function"
        ? o.sanitizeStickyNotes
        : ((list) => (Array.isArray(list) ? list : []));
      const stickyNotes = Array.isArray(o.stickyNotes) ? o.stickyNotes : [];
      const sharedNotes = sanitizeStickyNotes(stickyNotes.map((n) => ({
        ...n,
        offsetX: 0,
        offsetY: 0
      })));
      const nextState = {
        ...remoteState,
        stickyNotes: sharedNotes
      };
      const nowIso = typeof o.nowIso === "function" ? String(o.nowIso()) : new Date().toISOString();
      await dataProvider.saveSharedState(nextState, nowIso);
      if (typeof o.afterSave === "function") o.afterSave();
      return true;
    } catch {
      return false;
    }
  }

  function handleShareSubmit(options) {
    const o = options || {};
    const event = o.event;
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    if (o.readOnly) return false;

    const stickyNotes = Array.isArray(o.stickyNotes) ? o.stickyNotes : [];
    const note = stickyNotes.find((x) => String((x && x.id) || "") === String(o.stickyShareNoteId || ""));
    const isStickyOwner = typeof o.isStickyOwner === "function" ? o.isStickyOwner : (() => false);
    const closeStickyShareModal = typeof o.closeStickyShareModal === "function" ? o.closeStickyShareModal : (() => {});
    if (!note || !isStickyOwner(note)) {
      closeStickyShareModal();
      return false;
    }

    const getCurrentUserIdentityIds = typeof o.getCurrentUserIdentityIds === "function"
      ? o.getCurrentUserIdentityIds
      : (() => new Set());
    const myIds = getCurrentUserIdentityIds();
    const readStickyShareRecipients = typeof o.readStickyShareRecipients === "function"
      ? o.readStickyShareRecipients
      : (() => []);
    const isCurrentUserShareId = typeof o.isCurrentUserShareId === "function"
      ? o.isCurrentUserShareId
      : (() => false);
    const recipients = Array.from(new Set(
      readStickyShareRecipients()
        .map((x) => String(x || ""))
        .filter((id) => id && !myIds.has(id) && !isCurrentUserShareId(id))
    ));
    if (!recipients.length) return false;

    const stickyShareModeEl = o.stickyShareMode;
    const mode = stickyShareModeEl ? String(stickyShareModeEl.value || "copy") : "copy";
    const nowIso = new Date().toISOString();
    const shareActions = (root.ProCalModules && root.ProCalModules.notesShareActions) || {};
    if (typeof shareActions.applyShareSubmit !== "function") return false;

    const result = shareActions.applyShareSubmit({
      note,
      stickyNotes,
      recipients,
      mode,
      nowIso,
      myIds,
      createStickyNoteId: o.createStickyNoteId,
      getPersonNameById: o.getPersonNameById,
      normalizeHexColor: o.normalizeHexColor,
      setStickyNoteOffset: o.setStickyNoteOffset,
      deleteStickyNoteOffset: o.deleteStickyNoteOffset
    });
    if (!result || !result.applied) return false;

    if (typeof o.persistState === "function") o.persistState();
    if (typeof o.scheduleStickyNotesPushToShared === "function") o.scheduleStickyNotesPushToShared();
    closeStickyShareModal();
    if (typeof o.renderNotesPanel === "function") o.renderNotesPanel();
    return true;
  }

  root.ProCalModules.notesSyncFlow = {
    schedulePull,
    schedulePush,
    syncFromShared,
    pushToShared,
    handleShareSubmit
  };
})(window);
