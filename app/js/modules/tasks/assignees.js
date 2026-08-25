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

  function getTaskMemberState(task, personIds, filterPeopleIds) {
    if (!task || typeof task !== "object") return { status: "open", startedOn: "", completedOn: "" };
    const targets = normalizeAssigneeTargets(personIds);
    const states = task.memberStates && typeof task.memberStates === "object" && !Array.isArray(task.memberStates)
      ? task.memberStates
      : {};
    for (const id of targets) {
      const row = states[id];
      if (!row || typeof row !== "object") continue;
      const status = row.status === "done" || row.status === "in_progress" ? row.status : "open";
      return {
        status,
        startedOn: String(row.startedOn || ""),
        completedOn: String(row.completedOn || "")
      };
    }
    const assignedIds = getTaskAssigneeIds(task, filterPeopleIds);
    if (targets.size && !assignedIds.some((id) => targets.has(String(id)))) {
      return { status: "open", startedOn: "", completedOn: "" };
    }
    const completedOn = String(task.workCompletedOn || "");
    const startedOn = String(task.workStartedOn || "");
    return {
      status: Boolean(task.done) || completedOn ? "done" : (startedOn ? "in_progress" : "open"),
      startedOn,
      completedOn
    };
  }

  function setTaskMemberState(task, personIds, nextState, filterPeopleIds) {
    if (!task || typeof task !== "object") return false;
    const targets = normalizeAssigneeTargets(personIds);
    const assignedIds = getTaskAssigneeIds(task, filterPeopleIds);
    const targetId = assignedIds.find((id) => targets.has(String(id))) || Array.from(targets)[0] || "";
    if (!targetId) return false;

    const legacyState = {
      status: Boolean(task.done) || task.workCompletedOn ? "done" : (task.workStartedOn ? "in_progress" : "open"),
      startedOn: String(task.workStartedOn || ""),
      completedOn: String(task.workCompletedOn || "")
    };
    const states = task.memberStates && typeof task.memberStates === "object" && !Array.isArray(task.memberStates)
      ? { ...task.memberStates }
      : {};
    assignedIds.forEach((id) => {
      if (!states[id] || typeof states[id] !== "object") states[id] = { ...legacyState };
    });
    const value = nextState && typeof nextState === "object" ? nextState : {};
    states[targetId] = {
      status: value.status === "done" || value.status === "in_progress" ? value.status : "open",
      startedOn: String(value.startedOn || ""),
      completedOn: String(value.completedOn || "")
    };
    task.memberStates = states;

    const activeStates = assignedIds.map((id) => states[id] || legacyState);
    task.done = activeStates.length > 0 && activeStates.every((row) => row.status === "done");
    const starts = activeStates.map((row) => String(row.startedOn || "")).filter(Boolean).sort();
    const completions = activeStates.map((row) => String(row.completedOn || "")).filter(Boolean).sort();
    task.workStartedOn = starts[0] || "";
    task.workCompletedOn = task.done ? (completions[completions.length - 1] || "") : "";
    return true;
  }

  root.ProCalModules.taskAssignees = {
    normalizeTaskAssigneeIds,
    getTaskAssigneeIds,
    taskHasAssignee,
    getTaskAssigneeNames,
    getTaskMemberState,
    setTaskMemberState
  };
})(window);
