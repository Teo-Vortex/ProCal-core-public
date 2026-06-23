(function initTaskAssignees(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function normalizeTaskAssigneeIds(value, filterPeopleIds) {
    const filter = typeof filterPeopleIds === "function" ? filterPeopleIds : ((ids) => ids);
    if (Array.isArray(value)) return filter(value.map((v) => String(v)));
    const one = String(value || "");
    return one ? filter([one]) : [];
  }

  function getTaskAssigneeIds(task, filterPeopleIds) {
    if (!task || typeof task !== "object") return [];
    if (Array.isArray(task.personIds)) return normalizeTaskAssigneeIds(task.personIds, filterPeopleIds);
    return normalizeTaskAssigneeIds(String(task.personId || ""), filterPeopleIds);
  }

  function taskHasAssignee(task, personId, filterPeopleIds) {
    return getTaskAssigneeIds(task, filterPeopleIds).includes(String(personId || ""));
  }

  function getTaskAssigneeNames(task, people, filterPeopleIds) {
    const roster = Array.isArray(people) ? people : [];
    return getTaskAssigneeIds(task, filterPeopleIds)
      .map((id) => roster.find((p) => String((p && p.id) || "") === String(id)))
      .filter(Boolean)
      .map((p) => String(p.name || ""));
  }

  root.ProCalModules.taskAssignees = {
    normalizeTaskAssigneeIds,
    getTaskAssigneeIds,
    taskHasAssignee,
    getTaskAssigneeNames
  };
})(window);
