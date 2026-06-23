(function initTaskStandaloneUpdate(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function updateStandaloneTask(options) {
    const o = options || {};
    const tasksByDate = o.tasksByDate && typeof o.tasksByDate === "object" ? o.tasksByDate : {};
    const dateKey = String(o.dateKey || "");
    const taskId = String(o.taskId || "");
    const list = Array.isArray(tasksByDate[dateKey]) ? tasksByDate[dateKey] : [];
    const hit = list.find((task) => String((task && task.id) || "") === taskId);
    if (!hit) return false;

    const patch = o.patch && typeof o.patch === "object" ? o.patch : {};
    const prevTitle = String(hit.title || "");
    const prevCategoryId = String(hit.categoryId || "");
    const hasCategoryPatch = Boolean(Object.prototype.hasOwnProperty.call(patch, "categoryId"));

    const normalizeTaskAssigneeIds = typeof o.normalizeTaskAssigneeIds === "function" ? o.normalizeTaskAssigneeIds : (() => []);
    const normalizePersonalTaskAssignees = typeof o.normalizePersonalTaskAssignees === "function"
      ? o.normalizePersonalTaskAssignees
      : ((ids) => (Array.isArray(ids) ? ids : []));
    const isCollaborativePersonalTask = typeof o.isCollaborativePersonalTask === "function"
      ? o.isCollaborativePersonalTask
      : (() => false);
    const getTaskCollabMembers = typeof o.getTaskCollabMembers === "function" ? o.getTaskCollabMembers : (() => []);
    const isCollaborativePersonalTaskOwner = typeof o.isCollaborativePersonalTaskOwner === "function"
      ? o.isCollaborativePersonalTaskOwner
      : (() => false);
    const isPersonalCalendarMode = typeof o.isPersonalCalendarMode === "function" ? o.isPersonalCalendarMode : (() => false);

    const nextTitle = String(patch.title || "").trim();
    const rawNextIds = normalizeTaskAssigneeIds(patch.personIds);
    const nextIds = normalizePersonalTaskAssignees(rawNextIds);
    const nextCategoryId = hasCategoryPatch ? String(patch.categoryId || "") : prevCategoryId;
    if (!nextTitle) return false;

    let collabInviteCandidates = [];
    hit.title = nextTitle;

    if (isCollaborativePersonalTask(hit)) {
      const members = getTaskCollabMembers(hit);
      if (isCollaborativePersonalTaskOwner(hit)) {
        const selectedMembers = normalizePersonalTaskAssignees(nextIds);
        collabInviteCandidates = selectedMembers.filter((id) => !members.includes(id));
        const acceptedMembers = members.filter((id) => selectedMembers.includes(id));
        const ownerId = String(hit.collabOwnerUserId || hit.createdByUserId || o.currentUserId || "");
        const nextAcceptedMembers = ownerId && !acceptedMembers.includes(ownerId)
          ? [ownerId, ...acceptedMembers]
          : acceptedMembers;
        hit.personIds = nextAcceptedMembers.slice();
        hit.collabMemberUserIds = nextAcceptedMembers.slice();
        hit.collabOwnerUserId = String(hit.collabOwnerUserId || hit.createdByUserId || o.currentUserId || "");
        hit.collabGroupId = String(hit.collabGroupId || "");
      } else {
        const me = String(o.currentUserId || "");
        const wantsToLeave = Boolean(me) && !rawNextIds.includes(me);
        const nextMembers = wantsToLeave ? members.filter((id) => id !== me) : members.slice();
        hit.personIds = nextMembers.slice();
        hit.collabMemberUserIds = nextMembers.slice();
      }
    } else {
      hit.personIds = nextIds;
    }

    if (isCollaborativePersonalTask(hit) && !isCollaborativePersonalTaskOwner(hit)) {
      hit.title = prevTitle;
      hit.categoryId = prevCategoryId;
    } else {
      const categories = Array.isArray(o.categories) ? o.categories : [];
      hit.categoryId = categories.some((cat) => String((cat && cat.id) || "") === nextCategoryId) ? nextCategoryId : "";
    }

    if (!String(hit.createdByUserId || "")) hit.createdByUserId = String(o.currentUserId || "");

    if (typeof o.persistState === "function") o.persistState();

    const sendInvites = typeof o.sendPersonalTaskCollabInvites === "function" ? o.sendPersonalTaskCollabInvites : null;
    if (sendInvites && isPersonalCalendarMode() && !isCollaborativePersonalTask(hit)) {
      void sendInvites(dateKey, hit, nextIds, true);
    } else if (sendInvites && isPersonalCalendarMode() && isCollaborativePersonalTask(hit) && collabInviteCandidates.length) {
      void sendInvites(dateKey, hit, collabInviteCandidates, true);
    }

    if (typeof o.renderStandaloneTaskList === "function") o.renderStandaloneTaskList(dateKey);
    if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
    if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
    if (typeof o.renderCalendar === "function") o.renderCalendar();
    return true;
  }

  root.ProCalModules.taskStandaloneUpdate = {
    updateStandaloneTask
  };
})(window);
