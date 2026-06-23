(function initNotesShareModel(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function normalizeLegacyShares(note) {
    const sharedWith = Array.isArray(note && note.sharedWith)
      ? note.sharedWith.map((id) => String(id || "")).filter(Boolean)
      : [];
    const editable = new Set(
      Array.isArray(note && note.sharedEditableWith)
        ? note.sharedEditableWith.map((id) => String(id || "")).filter(Boolean)
        : (String((note && note.sharedMode) || "") === "sync_edit" ? sharedWith : [])
    );
    return sharedWith.map((userId) => ({ userId, canView: true, canEdit: editable.has(userId) }));
  }

  function normalizeShareEntries(note) {
    if (note && Array.isArray(note.shares)) {
      return note.shares
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          userId: String(entry.userId || entry.id || "").trim(),
          canView: true,
          canEdit: Boolean(entry.canEdit)
        }))
        .filter((entry) => entry.userId);
    }
    return normalizeLegacyShares(note);
  }

  function getStickyShares(note) {
    return normalizeShareEntries(note);
  }

  root.ProCalModules.notesShareModel = {
    normalizeShareEntries,
    getStickyShares
  };
})(window);
