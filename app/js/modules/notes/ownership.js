(function initNotesOwnership(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function isOwner(note, identityIds) {
    if (!note) return false;
    if (!(identityIds instanceof Set) || !identityIds.size) return false;
    return identityIds.has(String(note.ownerId || ""));
  }

  function classifyNote(note, identityIds) {
    return isOwner(note, identityIds) ? "owned" : "shared";
  }

  root.ProCalModules.notesOwnership = {
    isOwner,
    classifyNote
  };
})(window);
