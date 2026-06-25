(function initTaskAssignees(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function dedupeIds(ids) {
    const seen = new Set();
    const out = [];
    (Array.isArray(ids) ? ids : []).forEach((value) => {
      const id = String(value || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
    return out;
  }

  function normalizeTaskAssigneeIds(value, filterPeopleIds) {
    const filter = typeof filterPeopleIds === "function" ? filterPeopleIds : ((ids) => ids);
    const raw = Array.isArray(value)
      ? dedupeIds(value)
      : dedupeIds([value]);
    if (!raw.length) return [];
    const filtered = dedupeIds(filter(raw));
    if (filtered.length) return filtered;
    return raw;
  }

  function getTaskAssigneeIds(task, filterPeopleIds) {
    if (!task || typeof task !== "object") return [];
    if (Array.isArray(task.personIds)) return normalizeTaskAssigneeIds(task.personIds, filterPeopleIds);
    return normalizeTaskAssigneeIds(String(task.personId || ""), filterPeopleIds);
  }

  function normalizeAssigneeTargets(value) {
    const isSetLike = value && typeof value.forEach === "function" && typeof value.has === "function";
    const source = isSetLike
      ? Array.from(value)
      : (Array.isArray(value) ? value : [value]);
    const seen = new Set();
    source.forEach((item) => {
      const id = String(item || "").trim();
      if (id) seen.add(id);
    });
    return seen;
  }

  function taskHasAssignee(task, personId, filterPeopleIds) {
    const targets = normalizeAssigneeTargets(personId);
    if (!targets.size) return false;
    return getTaskAssigneeIds(task, filterPeopleIds).some((id) => targets.has(String(id || "")));
  }

  function getTaskAssigneeNames(task, people, filterPeopleIds) {
    const roster = Array.isArray(people) ? people : [];
    const ids = getTaskAssigneeIds(task, filterPeopleIds);
    return ids
      .map((id) => roster.find((p) => (
        String((p && p.id) || "") === String(id) ||
        String((p && p.userId) || "") === String(id)
      )))
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
