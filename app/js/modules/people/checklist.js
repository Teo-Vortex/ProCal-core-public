(function initPeopleChecklist(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderChecklist(options) {
    const opts = options || {};
    const container = opts.container;
    const roster = Array.isArray(opts.roster) ? opts.roster : [];
    const selectedIds = Array.isArray(opts.selectedIds) ? opts.selectedIds : [];
    const inputName = String(opts.inputName || "");
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || ""));

    if (!container) return;
    const selected = new Set(selectedIds.map((id) => String(id || "")));
    container.innerHTML = "";

    roster.forEach((person) => {
      const id = String((person && person.id) || "");
      if (!id) return;
      const row = document.createElement("label");
      row.className = "check-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = id;
      if (inputName) input.name = inputName;
      input.checked = selected.has(id);
      const span = document.createElement("span");
      span.textContent = getPersonDisplayName(person, roster);
      if (person && person.color) span.style.color = String(person.color);
      row.append(input, span);
      container.appendChild(row);
    });
  }

  function renderEventPeopleChecklist(options) {
    const opts = options || {};
    renderChecklist({
      container: opts.container,
      roster: opts.roster,
      selectedIds: opts.selectedIds,
      inputName: "eventPeople",
      getPersonDisplayName: opts.getPersonDisplayName
    });
    if (typeof opts.refreshEventPeopleAvailability === "function") {
      opts.refreshEventPeopleAvailability();
    }
  }

  function renderTaskPeopleOptions(options) {
    const opts = options || {};
    renderChecklist({
      container: opts.taskPersonChecklist,
      roster: opts.roster,
      selectedIds: [],
      getPersonDisplayName: opts.getPersonDisplayName
    });
    renderChecklist({
      container: opts.eventTaskPeopleChecklist,
      roster: opts.roster,
      selectedIds: [],
      getPersonDisplayName: opts.getPersonDisplayName
    });
    if (typeof opts.refreshTaskChecklistAvailability === "function") {
      opts.refreshTaskChecklistAvailability(opts.selectedDateKey);
    }
    if (typeof opts.refreshEventTaskChecklistAvailability === "function") {
      opts.refreshEventTaskChecklistAvailability();
    }
  }

  function getCheckedIds(options) {
    const opts = options || {};
    const container = opts.container;
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => String(el.value || ""));
  }

  function clearChecks(options) {
    const opts = options || {};
    const container = opts.container;
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      el.checked = false;
    });
  }

  root.ProCalModules.peopleChecklist = {
    renderChecklist,
    renderEventPeopleChecklist,
    renderTaskPeopleOptions,
    getCheckedIds,
    clearChecks
  };
})(window);
