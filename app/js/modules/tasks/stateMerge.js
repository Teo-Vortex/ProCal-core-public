(function initTaskStateMerge(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function mergeEventTasksForPersonalOverlay(personalTasks, sharedTasks) {
    const sharedRows = Array.isArray(sharedTasks) ? sharedTasks : [];
    const personalRows = Array.isArray(personalTasks) ? personalTasks : [];
    const out = [];
    const seen = new Set();
    sharedRows.forEach((task) => {
      const id = String((task && task.id) || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(task);
    });
    personalRows.forEach((task) => {
      const id = String((task && task.id) || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(task);
    });
    return out;
  }

  function mergeStandaloneTasksForPersonalOverlay(personalTasksByDate, sharedTasksByDate) {
    const personalMap = personalTasksByDate && typeof personalTasksByDate === "object" ? personalTasksByDate : {};
    const sharedMap = sharedTasksByDate && typeof sharedTasksByDate === "object" ? sharedTasksByDate : {};
    const out = {};
    const sharedTaskIds = new Set();

    Object.entries(sharedMap).forEach(([dateKey, list]) => {
      if (!Array.isArray(list)) return;
      const rows = [];
      list.forEach((task) => {
        const id = String((task && task.id) || "").trim();
        if (!id || sharedTaskIds.has(id)) return;
        sharedTaskIds.add(id);
        rows.push(task);
      });
      if (rows.length) out[dateKey] = rows;
    });

    Object.entries(personalMap).forEach(([dateKey, list]) => {
      if (!Array.isArray(list)) return;
      const extras = list.filter((task) => {
        const id = String((task && task.id) || "").trim();
        return id && !sharedTaskIds.has(id);
      });
      if (!extras.length) return;
      out[dateKey] = Array.isArray(out[dateKey]) ? out[dateKey].concat(extras) : extras.slice();
    });

    return out;
  }

  function sanitizeTaskList(list, options) {
    const o = options || {};
    const filterKnownIds = typeof o.filterKnownIds === "function" ? o.filterKnownIds : ((ids) => (Array.isArray(ids) ? ids : []));
    const createTaskId = typeof o.createTaskId === "function"
      ? o.createTaskId
      : (() => `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const knownPeople = o.knownPeople instanceof Set ? o.knownPeople : new Set();

    if (!Array.isArray(list)) return [];
    return list
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const rawIds = Array.isArray(item.personIds)
          ? item.personIds
          : (String(item.personId || "") ? [String(item.personId)] : []);
        return {
          id: typeof item.id === "string" ? item.id : createTaskId(),
          title: String(item.title || "").trim(),
          personIds: filterKnownIds(rawIds.map((v) => String(v)), knownPeople),
          categoryId: String(item.categoryId || ""),
          done: Boolean(item.done),
          createdByUserId: String(item.createdByUserId || ""),
          collabGroupId: String(item.collabGroupId || ""),
          collabOwnerUserId: String(item.collabOwnerUserId || ""),
          collabMemberUserIds: filterKnownIds(
            Array.isArray(item.collabMemberUserIds) ? item.collabMemberUserIds.map((v) => String(v)) : [],
            knownPeople
          ),
          linkedEventId: String(item.linkedEventId || ""),
          linkedEventDateKey: isDateKey(String(item.linkedEventDateKey || "")) ? String(item.linkedEventDateKey) : "",
          linkedEventTitle: String(item.linkedEventTitle || "")
        };
      })
      .filter((item) => item.title);
  }

  function sanitizeStandaloneTasks(value, options) {
    const o = options || {};
    const knownPeople = o.knownPeople instanceof Set ? o.knownPeople : new Set();
    const safeCategories = Array.isArray(o.safeCategories) ? o.safeCategories : [];
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const sanitizeTaskListFn = typeof o.sanitizeTaskList === "function"
      ? o.sanitizeTaskList
      : ((list) => (Array.isArray(list) ? list : []));

    const out = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return out;
    const knownCategories = new Set(safeCategories.map((cat) => cat.id));
    Object.entries(value).forEach(([dateKey, list]) => {
      if (!isDateKey(dateKey)) return;
      const safe = sanitizeTaskListFn(list, {
        knownPeople,
        filterKnownIds: o.filterKnownIds,
        createTaskId: o.createTaskId,
        isDateKey
      }).map((task) => ({
        ...task,
        categoryId: knownCategories.has(String(task.categoryId || "")) ? String(task.categoryId) : ""
      }));
      if (safe.length) out[dateKey] = safe;
    });
    return out;
  }

  root.ProCalModules.taskStateMerge = {
    mergeEventTasksForPersonalOverlay,
    mergeStandaloneTasksForPersonalOverlay,
    sanitizeTaskList,
    sanitizeStandaloneTasks
  };
})(window);
