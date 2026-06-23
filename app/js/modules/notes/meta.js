(function initNotesMeta(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function buildMetaLines(note, options) {
    const opts = options || {};
    const t = typeof opts.t === "function" ? opts.t : ((k) => String(k || ""));
    const getPersonNameById = typeof opts.getPersonNameById === "function"
      ? opts.getPersonNameById
      : ((id) => String(id || ""));
    const getStickyShares = typeof opts.getStickyShares === "function"
      ? opts.getStickyShares
      : (() => []);
    const dedupeStrings = typeof opts.dedupeStrings === "function"
      ? opts.dedupeStrings
      : ((list) => Array.from(new Set(Array.isArray(list) ? list : [])));

    const ownerName = (note && note.ownerName) || getPersonNameById(note && note.ownerId) || String((note && note.ownerId) || "");
    const lines = [{ kind: "owner", text: `${t("noteOwnerLabel")}: ${ownerName}` }];

    const shares = getStickyShares(note);
    const readonlyAudience = dedupeStrings(
      shares.filter((entry) => !entry.canEdit).map((entry) => getPersonNameById(entry.userId))
    );
    const editableAudience = dedupeStrings(
      shares.filter((entry) => entry.canEdit).map((entry) => getPersonNameById(entry.userId))
    );

    if (readonlyAudience.length) {
      lines.push({
        kind: "readonly",
        text: `${t("noteSharedReadonlyWith")}: ${readonlyAudience.join(", ")}`
      });
    }
    if (editableAudience.length) {
      lines.push({
        kind: "editable",
        text: `${t("noteSharedEditableWith")}: ${editableAudience.join(", ")}`
      });
    }
    return lines;
  }

  root.ProCalModules.notesMeta = {
    buildMetaLines
  };
})(window);
