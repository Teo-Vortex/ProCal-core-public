(function initTaskLinkedFlow(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getLinkedStandaloneTaskRowsForEvent(options) {
    const o = options || {};
    const evt = o.event;
    const isPersonalCalendarMode = typeof o.isPersonalCalendarMode === "function" ? o.isPersonalCalendarMode : (() => false);
    if (!evt || !isPersonalCalendarMode()) return [];
    const getEventBaseId = typeof o.getEventBaseId === "function" ? o.getEventBaseId : (() => "");
    const eventBaseId = getEventBaseId(evt);
    if (!eventBaseId) return [];
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const dateKeyHint = o.dateKeyHint;
    const targetDateKey = isDateKey(dateKeyHint) ? String(dateKeyHint) : String((evt && evt.startDate) || "");
    const tasksByDate = o.tasksByDate && typeof o.tasksByDate === "object" ? o.tasksByDate : {};
    const out = [];
    Object.entries(tasksByDate).forEach(([dateKey, list]) => {
      if (!Array.isArray(list)) return;
      list.forEach((task) => {
        if (!task || typeof task !== "object") return;
        if (String(task.linkedEventId || "") !== eventBaseId) return;
        const linkedDate = String(task.linkedEventDateKey || "");
        const effectiveDateKey = isDateKey(linkedDate) ? linkedDate : dateKey;
        if (targetDateKey && effectiveDateKey !== targetDateKey) return;
        out.push({ dateKey: effectiveDateKey, storageDateKey: dateKey, task });
      });
    });
    return out;
  }

  function createLinkedStandaloneTaskForEvent(options) {
    const o = options || {};
    const evt = o.event;
    const isPersonalCalendarMode = typeof o.isPersonalCalendarMode === "function" ? o.isPersonalCalendarMode : (() => false);
    if (o.readOnly || !evt || !isPersonalCalendarMode()) return false;

    const payload = o.payload && typeof o.payload === "object" ? o.payload : {};
    const title = String(payload.title || "").trim();
    if (!title) return false;

    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const targetDateKey = isDateKey(o.dateKeyHint)
      ? String(o.dateKeyHint)
      : String((evt && evt.startDate) || o.selectedDateKey || "");
    if (!isDateKey(targetDateKey)) return false;

    const getAbsentPersonIdsForRange = typeof o.getAbsentPersonIdsForRange === "function"
      ? o.getAbsentPersonIdsForRange
      : (() => new Set());
    const blockedAssignees = getAbsentPersonIdsForRange(targetDateKey, targetDateKey);

    const normalizeTaskAssigneeIds = typeof o.normalizeTaskAssigneeIds === "function" ? o.normalizeTaskAssigneeIds : (() => []);
    const normalizePersonalTaskAssignees = typeof o.normalizePersonalTaskAssignees === "function"
      ? o.normalizePersonalTaskAssignees
      : ((ids) => (Array.isArray(ids) ? ids : []));

    const selectedIds = normalizeTaskAssigneeIds(payload.personIds).filter((id) => !blockedAssignees.has(id));
    const personIds = normalizePersonalTaskAssignees(selectedIds);

    const people = Array.isArray(o.people) ? o.people : [];
    if (personIds.some((id) => !people.some((p) => String((p && p.id) || "") === String(id)))) return false;

    const tasksByDate = o.tasksByDate && typeof o.tasksByDate === "object" ? o.tasksByDate : {};
    const list = Array.isArray(tasksByDate[targetDateKey]) ? tasksByDate[targetDateKey] : [];
    const createTaskId = typeof o.createTaskId === "function" ? o.createTaskId : null;
    const getEventBaseId = typeof o.getEventBaseId === "function" ? o.getEventBaseId : (() => "");
    if (!createTaskId) return false;

    const newTask = {
      id: createTaskId(),
      title,
      personIds,
      categoryId: String((evt && evt.categoryId) || ""),
      done: false,
      createdByUserId: String(o.currentUserId || ""),
      linkedEventId: getEventBaseId(evt),
      linkedEventDateKey: targetDateKey,
      linkedEventTitle: String((evt && evt.title) || "")
    };
    list.push(newTask);
    tasksByDate[targetDateKey] = list;

    if (typeof o.persistState === "function") o.persistState();
    if (typeof o.sendPersonalTaskCollabInvites === "function") {
      void o.sendPersonalTaskCollabInvites(targetDateKey, newTask, personIds, true);
    }
    if (typeof o.renderStandaloneTaskList === "function") o.renderStandaloneTaskList(targetDateKey);
    if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
    if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
    if (typeof o.renderCalendar === "function") o.renderCalendar();
    return true;
  }

  function openLinkedTaskCreateForEvent(options) {
    const o = options || {};
    const evt = o.event;
    const isPersonalCalendarMode = typeof o.isPersonalCalendarMode === "function" ? o.isPersonalCalendarMode : (() => false);
    if (!evt || !isPersonalCalendarMode()) return false;
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const targetDateKey = isDateKey(o.dateKeyHint)
      ? String(o.dateKeyHint)
      : String((evt && evt.startDate) || o.selectedDateKey || "");
    const normalizePersonalTaskAssignees = typeof o.normalizePersonalTaskAssignees === "function"
      ? o.normalizePersonalTaskAssignees
      : ((ids) => (Array.isArray(ids) ? ids : []));
    const defaultIds = normalizePersonalTaskAssignees([]);
    const openTaskEditDialog = typeof o.openTaskEditDialog === "function" ? o.openTaskEditDialog : null;
    const createLinkedStandaloneTaskForEvent = typeof o.createLinkedStandaloneTaskForEvent === "function"
      ? o.createLinkedStandaloneTaskForEvent
      : null;
    if (!openTaskEditDialog || !createLinkedStandaloneTaskForEvent) return false;

    openTaskEditDialog({
      title: "",
      personIds: defaultIds,
      categoryId: String((evt && evt.categoryId) || "")
    }, ({ title, personIds }) => {
      createLinkedStandaloneTaskForEvent(evt, targetDateKey, { title, personIds });
    }, { allowCategory: false, dialogTitleText: typeof o.t === "function" ? o.t("addTask") : "Add task" });
    return true;
  }

  root.ProCalModules.taskLinkedFlow = {
    getLinkedStandaloneTaskRowsForEvent,
    createLinkedStandaloneTaskForEvent,
    openLinkedTaskCreateForEvent
  };
})(window);
