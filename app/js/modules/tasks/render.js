(function initTaskRender(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderStandaloneTaskList(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const taskFormSection = opts.taskFormSection;
    const dateKey = String(opts.dateKey || "");
    if (!doc || !taskFormSection) return;
    if (taskFormSection.classList.contains("hidden-section")) return;

    const getStandaloneTasksForDate = typeof opts.getStandaloneTasksForDate === "function" ? opts.getStandaloneTasksForDate : (() => []);
    const isLinkedStandaloneTask = typeof opts.isLinkedStandaloneTask === "function" ? opts.isLinkedStandaloneTask : (() => false);
    const list = getStandaloneTasksForDate(dateKey).filter((task) => !isLinkedStandaloneTask(task));

    const existing = taskFormSection.querySelector(".task-list");
    if (existing) existing.remove();

    const ul = doc.createElement("ul");
    ul.className = "task-list";

    const todayKey = String(opts.todayKey || "");
    const isSharedStandaloneTaskInPersonalMode = typeof opts.isSharedStandaloneTaskInPersonalMode === "function"
      ? opts.isSharedStandaloneTaskInPersonalMode
      : (() => false);
    const markSharedOriginVisual = typeof opts.markSharedOriginVisual === "function" ? opts.markSharedOriginVisual : null;
    const toggleStandaloneTaskDone = typeof opts.toggleStandaloneTaskDone === "function" ? opts.toggleStandaloneTaskDone : null;
    const getTaskAssigneeNames = typeof opts.getTaskAssigneeNames === "function" ? opts.getTaskAssigneeNames : (() => []);
    const getLinkedTaskContextLabel = typeof opts.getLinkedTaskContextLabel === "function"
      ? opts.getLinkedTaskContextLabel
      : (() => "");
    const readOnly = Boolean(opts.readOnly);
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const onEditTask = typeof opts.onEditTask === "function" ? opts.onEditTask : null;
    const onDeleteTask = typeof opts.onDeleteTask === "function" ? opts.onDeleteTask : null;
    const isTaskDone = typeof opts.isTaskDone === "function" ? opts.isTaskDone : ((task) => Boolean(task && task.done));
    const canToggleTask = typeof opts.canToggleTask === "function" ? opts.canToggleTask : (() => !readOnly);
    const canEditTask = typeof opts.canEditTask === "function" ? opts.canEditTask : (() => !readOnly);
    const canDeleteTask = typeof opts.canDeleteTask === "function" ? opts.canDeleteTask : (() => !readOnly);

    list.forEach((task) => {
      const li = doc.createElement("li");
      const done = isTaskDone(task);
      const isOverdue = dateKey < todayKey && !done;
      li.className = `task-inline-item${done ? " task-done" : ""}${isOverdue ? " task-overdue" : ""}`;
      if (isSharedStandaloneTaskInPersonalMode(task) && markSharedOriginVisual) markSharedOriginVisual(li);

      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.checked = done;
      cb.disabled = !canToggleTask(task);
      cb.addEventListener("change", () => {
        if (toggleStandaloneTaskDone) toggleStandaloneTaskDone(dateKey, task.id, cb.checked);
      });

      const assignees = getTaskAssigneeNames(task);
      const span = doc.createElement("span");
      const linkedLabel = getLinkedTaskContextLabel(task, true);
      const baseTaskText = assignees.length ? `${task.title} (${assignees.join(", ")})` : task.title;
      span.textContent = linkedLabel ? `${baseTaskText} • ${linkedLabel}` : baseTaskText;
      li.append(cb, span);

      if (!readOnly && (canEditTask(task) || canDeleteTask(task))) {
        if (canEditTask(task)) {
        const editBtn = doc.createElement("button");
        editBtn.type = "button";
        editBtn.className = "delete-btn";
        editBtn.textContent = t("edit");
        editBtn.addEventListener("click", () => {
          if (onEditTask) onEditTask(task, dateKey);
        });

        li.appendChild(editBtn);
        }

        if (canDeleteTask(task)) {
        const delBtn = doc.createElement("button");
        delBtn.type = "button";
        delBtn.className = "delete-btn";
        delBtn.textContent = t("delete");
        delBtn.addEventListener("click", () => {
          if (onDeleteTask) onDeleteTask(task, dateKey);
        });

        li.appendChild(delBtn);
        }
      }

      ul.appendChild(li);
    });

    taskFormSection.appendChild(ul);
  }

  function renderEventDraftTaskList(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const eventTaskList = opts.eventTaskList;
    if (!doc || !eventTaskList) return;

    const draftEventTasks = Array.isArray(opts.draftEventTasks) ? opts.draftEventTasks : [];
    const getTaskAssigneeNames = typeof opts.getTaskAssigneeNames === "function" ? opts.getTaskAssigneeNames : (() => []);
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const onDeleteDraftTask = typeof opts.onDeleteDraftTask === "function" ? opts.onDeleteDraftTask : null;

    eventTaskList.innerHTML = "";
    draftEventTasks.forEach((task) => {
      const li = doc.createElement("li");
      li.className = `task-inline-item${task.done ? " task-done" : ""}`;
      const assignees = getTaskAssigneeNames(task);
      const title = doc.createElement("span");
      title.textContent = assignees.length ? `${task.title} (${assignees.join(", ")})` : task.title;
      const del = doc.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.textContent = t("delete");
      del.addEventListener("click", () => {
        if (onDeleteDraftTask) onDeleteDraftTask(task);
      });
      li.append(title, del);
      eventTaskList.appendChild(li);
    });
  }

  root.ProCalModules.taskRender = {
    renderStandaloneTaskList,
    renderEventDraftTaskList
  };
})(window);
