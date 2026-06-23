(function initNotesNoteActions(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function upsertNote(options) {
    const opts = options || {};
    const stickyNotes = Array.isArray(opts.stickyNotes) ? opts.stickyNotes : [];
    const editingStickyNoteId = String(opts.editingStickyNoteId || "");
    const title = String(opts.title || "").trim();
    const text = String(opts.text || "").trim();
    const currentUserId = String(opts.currentUserId || "");
    const currentUserName = String(opts.currentUserName || "");
    const createStickyNoteId = typeof opts.createStickyNoteId === "function" ? opts.createStickyNoteId : null;
    const normalizeHexColor = typeof opts.normalizeHexColor === "function" ? opts.normalizeHexColor : ((value, fallback) => String(value || fallback || "#fde68a"));
    const canEditStickyNote = typeof opts.canEditStickyNote === "function" ? opts.canEditStickyNote : (() => false);
    const setStickyNoteOffset = typeof opts.setStickyNoteOffset === "function" ? opts.setStickyNoteOffset : null;
    const color = normalizeHexColor(opts.color, "#fde68a");
    const nowIso = new Date().toISOString();

    if (!title && !text) return { applied: false, editingStickyNoteId };

    if (editingStickyNoteId) {
      const idx = stickyNotes.findIndex((x) => String((x && x.id) || "") === editingStickyNoteId);
      if (idx >= 0 && canEditStickyNote(stickyNotes[idx])) {
        stickyNotes[idx] = {
          ...stickyNotes[idx],
          title,
          text,
          color,
          updatedAt: nowIso
        };
        return { applied: true, editingStickyNoteId };
      }
      return { applied: false, editingStickyNoteId };
    }

    if (!createStickyNoteId) return { applied: false, editingStickyNoteId };
    const id = createStickyNoteId();
    stickyNotes.push({
      id,
      ownerId: currentUserId,
      ownerName: currentUserName,
      title,
      text,
      color,
      shares: [],
      cloneRootId: id,
      sourceNoteId: "",
      sourceOwnerId: "",
      createdAt: nowIso,
      updatedAt: nowIso,
      offsetX: 0,
      offsetY: 0
    });
    if (setStickyNoteOffset) setStickyNoteOffset(id, 0, 0);
    return { applied: true, editingStickyNoteId: "" };
  }

  function deleteNote(options) {
    const opts = options || {};
    const stickyNotes = Array.isArray(opts.stickyNotes) ? opts.stickyNotes : [];
    const noteId = String(opts.noteId || "");
    const canDeleteStickyNote = typeof opts.canDeleteStickyNote === "function" ? opts.canDeleteStickyNote : (() => false);
    const getCurrentUserIdentityIds = typeof opts.getCurrentUserIdentityIds === "function" ? opts.getCurrentUserIdentityIds : (() => new Set());
    const hasGlobalAdminPrivileges = typeof opts.hasGlobalAdminPrivileges === "function" ? opts.hasGlobalAdminPrivileges : (() => false);
    const getStickyShares = typeof opts.getStickyShares === "function" ? opts.getStickyShares : (() => []);
    const currentUserId = String(opts.currentUserId || "");
    const deleteStickyNoteOffset = typeof opts.deleteStickyNoteOffset === "function" ? opts.deleteStickyNoteOffset : null;

    const idx = stickyNotes.findIndex((x) => String((x && x.id) || "") === noteId);
    if (idx < 0) return { applied: false };
    const note = stickyNotes[idx];
    if (!canDeleteStickyNote(note)) return { applied: false };

    const ids = getCurrentUserIdentityIds();
    const isOwner = ids.has(String((note && note.ownerId) || ""));
    if (isOwner || hasGlobalAdminPrivileges()) {
      stickyNotes.splice(idx, 1);
      if (deleteStickyNoteOffset) deleteStickyNoteOffset(note.id);
      return { applied: true };
    }

    const nextShares = getStickyShares(note).filter((entry) => {
      const uid = String((entry && entry.userId) || "");
      return uid && uid !== currentUserId && !ids.has(uid);
    });
    stickyNotes[idx] = {
      ...note,
      shares: nextShares,
      updatedAt: new Date().toISOString()
    };
    return { applied: true };
  }

  root.ProCalModules.notesNoteActions = {
    upsertNote,
    deleteNote
  };
})(window);
