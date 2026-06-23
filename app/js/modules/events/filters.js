(function initEventFilters(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function matchesEventFilters(evt, options) {
    const opts = options || {};
    const activeFilters = opts.activeFilters || { categoryIds: new Set(), peopleIds: new Set() };
    const getTaskAssigneeIds = typeof opts.getTaskAssigneeIds === "function"
      ? opts.getTaskAssigneeIds
      : (() => []);

    if (activeFilters.categoryIds instanceof Set && activeFilters.categoryIds.size) {
      if (!activeFilters.categoryIds.has(evt && evt.categoryId)) return false;
    }
    if (activeFilters.peopleIds instanceof Set && activeFilters.peopleIds.size) {
      const ids = Array.isArray(evt && evt.peopleIds) ? evt.peopleIds : [];
      const hasEventPerson = ids.some((id) => activeFilters.peopleIds.has(id));
      const hasTaskPerson = (Array.isArray(evt && evt.tasks) ? evt.tasks : [])
        .some((task) => getTaskAssigneeIds(task).some((id) => activeFilters.peopleIds.has(id)));
      if (!hasEventPerson && !hasTaskPerson) return false;
    }
    return true;
  }

  function matchesAbsenceFilters(absence, options) {
    const opts = options || {};
    const activeFilters = opts.activeFilters || { peopleIds: new Set() };
    if (!(activeFilters.peopleIds instanceof Set) || !activeFilters.peopleIds.size) return true;
    return activeFilters.peopleIds.has(absence && absence.personId);
  }

  root.ProCalModules.eventFilters = {
    matchesEventFilters,
    matchesAbsenceFilters
  };
})(window);
