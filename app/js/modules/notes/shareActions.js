(function initNotesShareActions(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function applyShareSubmit(options) {
    const opts = options || {};
    const note = opts.note;
    const stickyNotes = Array.isArray(opts.stickyNotes) ? opts.stickyNotes : [];
    const recipients = Array.isArray(opts.recipients) ? opts.recipients : [];
    const mode = String(opts.mode || "copy");
    const nowIso = String(opts.nowIso || new Date().toISOString());
    const myIds = opts.myIds instanceof Set ? opts.myIds : new Set();

    if (!note || !recipients.length) return { applied: false };
    if (mode === "send" && !myIds.has(String(note.ownerId || ""))) return { applied: false };

    const createStickyNoteId = typeof opts.createStickyNoteId === "function" ? opts.createStickyNoteId : null;
    const getPersonNameById = typeof opts.getPersonNameById === "function" ? opts.getPersonNameById : ((id) => String(id || ""));
    const normalizeHexColor = typeof opts.normalizeHexColor === "function" ? opts.normalizeHexColor : ((value, fallback) => String(value || fallback || "#fde68a"));
    const setStickyNoteOffset = typeof opts.setStickyNoteOffset === "function" ? opts.setStickyNoteOffset : null;
    const deleteStickyNoteOffset = typeof opts.deleteStickyNoteOffset === "function" ? opts.deleteStickyNoteOffset : null;

    if (mode === "copy" || mode === "send") {
      const cloneRootId = String(note.cloneRootId || note.id || "");
      recipients.forEach((personId) => {
        const existingIdx = stickyNotes.findIndex((x) =>
          String((x && x.ownerId) || "") === String(personId) &&
          String((x && x.cloneRootId) || "") === cloneRootId
        );

        if (existingIdx >= 0) {
          stickyNotes[existingIdx] = {
            ...stickyNotes[existingIdx],
            ownerId: String(personId),
            ownerName: getPersonNameById(personId),
            title: String(note.title || ""),
            text: String(note.text || ""),
            color: normalizeHexColor(note.color, "#fde68a"),
            shares: [],
            cloneRootId,
            sourceNoteId: String(note.id || ""),
            sourceOwnerId: String(note.ownerId || ""),
            updatedAt: nowIso
          };
        } else if (createStickyNoteId) {
          const id = createStickyNoteId();
          stickyNotes.push({
            id,
            ownerId: String(personId),
            ownerName: getPersonNameById(personId),
            title: String(note.title || ""),
            text: String(note.text || ""),
            color: normalizeHexColor(note.color, "#fde68a"),
            shares: [],
            cloneRootId,
            sourceNoteId: String(note.id || ""),
            sourceOwnerId: String(note.ownerId || ""),
            createdAt: nowIso,
            updatedAt: nowIso,
            offsetX: 0,
            offsetY: 0
          });
          if (setStickyNoteOffset) setStickyNoteOffset(id, 0, 0);
        }
      });

      if (mode === "send") {
        const idx = stickyNotes.findIndex((x) => String((x && x.id) || "") === String(note.id || ""));
        if (idx >= 0) {
          stickyNotes.splice(idx, 1);
          if (deleteStickyNoteOffset) deleteStickyNoteOffset(note.id);
        }
      }
    } else {
      const canEdit = mode === "sync_edit";
      note.shares = recipients.map((userId) => ({ userId: String(userId), canView: true, canEdit }));
      note.updatedAt = nowIso;
    }

    return { applied: true };
  }

  root.ProCalModules.notesShareActions = {
    applyShareSubmit
  };
})(window);
