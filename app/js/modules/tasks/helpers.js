(function initTaskHelpers(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getSelectedPersonIds(options) {
    const o = options || {};
    const sourceEl = o.sourceEl;
    const filterPeopleIds = typeof o.filterPeopleIds === "function" ? o.filterPeopleIds : ((ids) => ids);
    if (!sourceEl) return [];
    if (String(sourceEl.tagName || "").toUpperCase() === "SELECT") {
      return filterPeopleIds(Array.from(sourceEl.selectedOptions || []).map((opt) => String((opt && opt.value) || "")));
    }
    return filterPeopleIds(
      Array.from(sourceEl.querySelectorAll('input[type="checkbox"]:checked'))
        .map((el) => String((el && el.value) || ""))
    );
  }

  function getStandaloneTasksForDate(options) {
    const o = options || {};
    const tasksByDate = o.tasksByDate && typeof o.tasksByDate === "object" ? o.tasksByDate : {};
    const dateKey = String(o.dateKey || "");
    return Array.isArray(tasksByDate[dateKey]) ? tasksByDate[dateKey].slice() : [];
  }

  function isPersonalCalendarMode(options) {
    const o = options || {};
    return String(o.currentCalendarMode || "shared") === "personal";
  }

  function normalizePersonalTaskAssignees(options) {
    const o = options || {};
    const filterPeopleIds = typeof o.filterPeopleIds === "function" ? o.filterPeopleIds : ((ids) => ids);
    const ids = filterPeopleIds(Array.isArray(o.personIds) ? o.personIds : []);
    const me = String(o.currentUserId || "");
    if (!isPersonalCalendarMode({ currentCalendarMode: o.currentCalendarMode }) || !me) return ids;
    return ids.includes(me) ? ids : [me, ...ids];
  }

  function getTaskCollabMembers(task, options) {
    const o = options || {};
    if (!task || typeof task !== "object") return [];
    const filterPeopleIds = typeof o.filterPeopleIds === "function" ? o.filterPeopleIds : ((ids) => ids);
    const getTaskAssigneeIds = typeof o.getTaskAssigneeIds === "function" ? o.getTaskAssigneeIds : (() => []);
    const normalizePersonal = typeof o.normalizePersonalTaskAssignees === "function"
      ? o.normalizePersonalTaskAssignees
      : ((ids) => ids);
    const members = Array.isArray(task.collabMemberUserIds) ? task.collabMemberUserIds : [];
    if (members.length) return filterPeopleIds(members.map((x) => String(x)));
    return normalizePersonal(getTaskAssigneeIds(task));
  }

  function isCollaborativePersonalTask(task, options) {
    const o = options || {};
    return Boolean(task && isPersonalCalendarMode({ currentCalendarMode: o.currentCalendarMode }) && String(task.collabGroupId || ""));
  }

  function isCollaborativePersonalTaskOwner(task, options) {
    const o = options || {};
    if (!task) return false;
    const ownerId = String(task.collabOwnerUserId || task.createdByUserId || "");
    if (!ownerId) return false;
    return ownerId === String(o.currentUserId || "");
  }

  function getPersonalTaskInviteeUserIds(task, selectedIds, options) {
    const o = options || {};
    if (!isPersonalCalendarMode({ currentCalendarMode: o.currentCalendarMode })) return [];
    const me = String(o.currentUserId || "");
    if (!me) return [];
    const normalizePersonal = typeof o.normalizePersonalTaskAssignees === "function"
      ? o.normalizePersonalTaskAssignees
      : ((ids) => (Array.isArray(ids) ? ids : []));
    const isCollab = typeof o.isCollaborativePersonalTask === "function"
      ? o.isCollaborativePersonalTask
      : (() => false);
    const isOwner = typeof o.isCollaborativePersonalTaskOwner === "function"
      ? o.isCollaborativePersonalTaskOwner
      : (() => false);
    const list = normalizePersonal(selectedIds);
    if (isCollab(task) && !isOwner(task)) return [];
    return list.filter((id) => id && id !== me);
  }

  function matchesTaskFilters(task, options) {
    const o = options || {};
    const activeFilters = o.activeFilters || {};
    const categoryIds = activeFilters.categoryIds instanceof Set ? activeFilters.categoryIds : new Set();
    const peopleIds = activeFilters.peopleIds instanceof Set ? activeFilters.peopleIds : new Set();
    if (categoryIds.size) {
      const taskCategoryId = String((task && task.categoryId) || "");
      if (!taskCategoryId || !categoryIds.has(taskCategoryId)) return false;
    }
    if (peopleIds.size) {
      const getTaskAssigneeIds = typeof o.getTaskAssigneeIds === "function" ? o.getTaskAssigneeIds : (() => []);
      const ids = getTaskAssigneeIds(task);
      if (!ids.length) return false;
      if (!ids.some((id) => peopleIds.has(id))) return false;
    }
    return true;
  }

  function collectStandaloneTaskIds(tasksByDateInput) {
    const out = new Set();
    const map = tasksByDateInput && typeof tasksByDateInput === "object" ? tasksByDateInput : {};
    Object.values(map).forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((task) => {
        const id = String((task && task.id) || "").trim();
        if (id) out.add(id);
      });
    });
    return out;
  }

  function isLinkedStandaloneTask(task) {
    return Boolean(task && String(task.linkedEventId || "").trim());
  }

  function isSharedStandaloneTaskInPersonalMode(task, options) {
    const o = options || {};
    if (!isPersonalCalendarMode({ currentCalendarMode: o.currentCalendarMode })) return false;
    const id = String((task && task.id) || "").trim();
    if (!id) return false;
    const set = o.personalSharedOverlayTaskIds instanceof Set ? o.personalSharedOverlayTaskIds : new Set();
    return set.has(id);
  }

  function getLinkedTaskContextLabel(task, options) {
    const o = options || {};
    const includeEventTitle = o.includeEventTitle !== false;
    if (!isLinkedStandaloneTask(task)) return "";
    const prefix = String(o.currentLang || "en") === "bg" ? "Към събитие" : "Linked to event";
    const eventTitle = String((task && task.linkedEventTitle) || "").trim();
    if (!includeEventTitle || !eventTitle) return prefix;
    return `${prefix}: ${eventTitle}`;
  }

  root.ProCalModules.taskHelpers = {
    getSelectedPersonIds,
    getStandaloneTasksForDate,
    isPersonalCalendarMode,
    normalizePersonalTaskAssignees,
    getTaskCollabMembers,
    isCollaborativePersonalTask,
    isCollaborativePersonalTaskOwner,
    getPersonalTaskInviteeUserIds,
    matchesTaskFilters,
    collectStandaloneTaskIds,
    isLinkedStandaloneTask,
    isSharedStandaloneTaskInPersonalMode,
    getLinkedTaskContextLabel
  };
})(window);
