(function initNotesShare(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderPeopleChecklist(options) {
    const opts = options || {};
    const container = opts.container;
    const rows = Array.isArray(opts.rows) ? opts.rows : [];
    const selectedIds = Array.isArray(opts.selectedIds) ? opts.selectedIds : [];
    const resolvePersonShareId = typeof opts.resolvePersonShareId === "function"
      ? opts.resolvePersonShareId
      : ((person) => String((person && person.id) || ""));
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || ""));

    if (!container) return;
    const selected = new Set(selectedIds.map((x) => String(x || "")).filter(Boolean));
    container.innerHTML = "";
    rows.forEach((person) => {
      const id = String((person && person.shareId) || resolvePersonShareId(person) || "");
      const label = document.createElement("label");
      label.className = "check-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = id;
      cb.checked = selected.has(id);
      const text = document.createElement("span");
      text.textContent = getPersonDisplayName(person, rows) || id;
      label.append(cb, text);
      container.appendChild(label);
    });
  }

  function setRecipients(container, enabled) {
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = Boolean(enabled);
    });
  }

  function readRecipients(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map((cb) => String(cb.value || ""))
      .filter(Boolean);
  }

  root.ProCalModules.notesShare = {
    renderPeopleChecklist,
    setRecipients,
    readRecipients
  };
})(window);
