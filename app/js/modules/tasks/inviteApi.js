(function initTaskInviteApi(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  async function sendPersonalTaskCollabInvites(options) {
    const o = options || {};
    const task = o.task;
    const isPersonalCalendarMode = typeof o.isPersonalCalendarMode === "function" ? o.isPersonalCalendarMode : (() => false);
    if (!task || !isPersonalCalendarMode()) return false;

    const getPersonalTaskInviteeUserIds = typeof o.getPersonalTaskInviteeUserIds === "function"
      ? o.getPersonalTaskInviteeUserIds
      : (() => []);
    const inviteeUserIds = getPersonalTaskInviteeUserIds(task, o.selectedIds);
    if (!inviteeUserIds.length) return false;

    try {
      const ensureAccessToken = typeof o.ensureAccessToken === "function" ? o.ensureAccessToken : null;
      const token = ensureAccessToken ? await ensureAccessToken() : "";
      if (!token) return false;
      const fetchImpl = typeof o.fetchImpl === "function" ? o.fetchImpl : root.fetch;
      const res = await fetchImpl("/api/legacy/personal-task-collab/invite", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId: String((task && task.id) || ""),
          dateKey: String(o.dateKey || ""),
          inviteeUserIds
        })
      });
      if (!res.ok) {
        if (o.allowRetry !== false && (res.status === 404 || res.status === 409) && typeof o.retryFn === "function") {
          o.retryFn();
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  root.ProCalModules.taskInviteApi = {
    sendPersonalTaskCollabInvites
  };
})(window);
