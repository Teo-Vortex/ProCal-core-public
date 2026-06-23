(function initTaskMutations(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function toggleStandaloneTaskDone(options) {
    const o = options || {};
    const tasksByDate = o.tasksByDate && typeof o.tasksByDate === "object" ? o.tasksByDate : {};
    const dateKey = String(o.dateKey || "");
    const taskId = String(o.taskId || "");
    const list = Array.isArray(tasksByDate[dateKey]) ? tasksByDate[dateKey] : [];
    const hit = list.find((task) => String((task && task.id) || "") === taskId);
    if (!hit) return false;
    hit.done = Boolean(o.done);
    if (typeof o.persistState === "function") o.persistState();
    if (typeof o.renderStandaloneTaskList === "function") o.renderStandaloneTaskList(dateKey);
    if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
    if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
    if (typeof o.renderCalendar === "function") o.renderCalendar();
    return true;
  }

  function toggleEventTaskDone(options) {
    const o = options || {};
    const findBaseEventById = typeof o.findBaseEventById === "function" ? o.findBaseEventById : null;
    if (!findBaseEventById) return false;
    const base = findBaseEventById(o.seriesId);
    if (!base || !Array.isArray(base.tasks)) return false;
    const taskId = String(o.taskId || "");
    const hit = base.tasks.find((task) => String((task && task.id) || "") === taskId);
    if (!hit) return false;
    hit.done = Boolean(o.done);
    if (typeof o.persistState === "function") o.persistState();
    if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
    if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
    return true;
  }

  function updateEventTask(options) {
    const o = options || {};
    const findBaseEventById = typeof o.findBaseEventById === "function" ? o.findBaseEventById : null;
    if (!findBaseEventById) return false;
    const base = findBaseEventById(o.seriesId);
    if (!base || !Array.isArray(base.tasks)) return false;
    const taskId = String(o.taskId || "");
    const hit = base.tasks.find((task) => String((task && task.id) || "") === taskId);
    if (!hit) return false;

    const patch = o.patch && typeof o.patch === "object" ? o.patch : {};
    const nextTitle = String(patch.title || "").trim();
    const normalizeTaskAssigneeIds = typeof o.normalizeTaskAssigneeIds === "function" ? o.normalizeTaskAssigneeIds : (() => []);
    const nextIds = normalizeTaskAssigneeIds(patch.personIds);
    if (!nextTitle) return false;
    hit.title = nextTitle;
    hit.personIds = nextIds;
    if (typeof o.persistState === "function") o.persistState();
    if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
    if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
    if (typeof o.renderCalendar === "function") o.renderCalendar();
    return true;
  }

  function addEventTaskToSeries(options) {
    const o = options || {};
    if (o.readOnly) return false;
    const title = String(o.titleValue || "").trim();
    const normalizeTaskAssigneeIds = typeof o.normalizeTaskAssigneeIds === "function" ? o.normalizeTaskAssigneeIds : (() => []);
    const personIds = normalizeTaskAssigneeIds(o.personIdsValue);
    if (!title) return false;
    const people = Array.isArray(o.people) ? o.people : [];
    if (personIds.some((id) => !people.some((p) => String((p && p.id) || "") === String(id)))) return false;
    const findBaseEventById = typeof o.findBaseEventById === "function" ? o.findBaseEventById : null;
    if (!findBaseEventById) return false;
    const base = findBaseEventById(o.seriesId);
    if (!base) return false;
    if (!Array.isArray(base.tasks)) base.tasks = [];
    const createTaskId = typeof o.createTaskId === "function" ? o.createTaskId : null;
    if (!createTaskId) return false;
    base.tasks.push({ id: createTaskId(), title, personIds, done: false });
    if (typeof o.persistState === "function") o.persistState();
    if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
    if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
    if (typeof o.renderCalendar === "function") o.renderCalendar();
    return true;
  }

  root.ProCalModules.taskMutations = {
    toggleStandaloneTaskDone,
    toggleEventTaskDone,
    updateEventTask,
    addEventTaskToSeries
  };
})(window);
