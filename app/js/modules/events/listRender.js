(function initEventsListRender(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderAbsenceRow(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const absence = opts.absence;
    const list = opts.eventList;
    if (!doc || !absence || !list) return;

    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const getOperationalPeople = typeof opts.getOperationalPeople === "function" ? opts.getOperationalPeople : (() => []);
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || ""));

    const li = doc.createElement("li");
    li.className = "event-item absence upcoming-outline";

    const roster = getOperationalPeople();
    const person = roster.find((p) => String((p && p.id) || "") === String(absence.personId || "")) || null;
    li.style.background = "transparent";
    li.style.borderWidth = "2px";
    li.style.borderStyle = "solid";
    li.style.borderColor = person ? person.color : "#64748b";
    li.style.color = person ? person.color : "#334155";

    const main = doc.createElement("div");
    main.className = "event-main";
    const title = doc.createElement("strong");
    title.textContent = person ? `[${getPersonDisplayName(person, roster)}] ${t("absentVerb")}` : `${t("person")} ${t("absentVerb")}`;
    if (person) title.style.color = person.color;

    const when = doc.createElement("span");
    when.className = "event-time";
    when.textContent = `${absence.startDate} ${t("to")} ${absence.endDate}`;
    if (person) when.style.color = person.color;

    main.append(title, when);
    if (absence.note) {
      const note = doc.createElement("span");
      note.className = "event-people";
      note.textContent = absence.note;
      if (person) note.style.color = person.color;
      main.appendChild(note);
    }

    li.appendChild(main);
    list.appendChild(li);
  }

  function createSectionHeader(doc, label, count) {
    const li = doc.createElement("li");
    li.className = "list-section-header";

    const title = doc.createElement("span");
    title.className = "list-section-label";
    title.textContent = String(label || "");

    const badge = doc.createElement("span");
    badge.className = "list-section-count";
    badge.textContent = String(Number(count) || 0);

    li.append(title, badge);
    return li;
  }

  function createEmptyCard(doc, titleText, hintText) {
    const li = doc.createElement("li");
    li.className = "event-item empty-card";

    const main = doc.createElement("div");
    main.className = "event-main";

    const title = doc.createElement("strong");
    title.className = "empty-card-title";
    title.textContent = String(titleText || "");
    main.appendChild(title);

    if (hintText) {
      const hint = doc.createElement("span");
      hint.className = "empty-card-hint";
      hint.textContent = String(hintText || "");
      main.appendChild(hint);
    }

    li.appendChild(main);
    return li;
  }

  function renderEventTasksInline(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const container = opts.container;
    const evt = opts.event;
    if (!doc || !container || !evt) return;

    const isTaskViewEnabled = typeof opts.isTaskViewEnabled === "function" ? opts.isTaskViewEnabled : (() => false);
    if (!isTaskViewEnabled()) return;

    const tasks = Array.isArray(evt.tasks) ? evt.tasks : [];
    const getLinkedStandaloneTaskRowsForEvent = typeof opts.getLinkedStandaloneTaskRowsForEvent === "function"
      ? opts.getLinkedStandaloneTaskRowsForEvent
      : (() => []);
    const linkedRows = getLinkedStandaloneTaskRowsForEvent(evt, opts.dateKeyHint);
    const isSharedEventReadOnlyInPersonalMode = typeof opts.isSharedEventReadOnlyInPersonalMode === "function"
      ? opts.isSharedEventReadOnlyInPersonalMode
      : (() => false);
    const sharedReadOnlyEvent = isSharedEventReadOnlyInPersonalMode(evt);
    if (!tasks.length && !linkedRows.length) return;

    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const markSharedOriginVisual = typeof opts.markSharedOriginVisual === "function" ? opts.markSharedOriginVisual : null;
    const readOnly = Boolean(opts.readOnly);
    const todayKey = String(opts.todayKey || "");
    const getTaskAssigneeNames = typeof opts.getTaskAssigneeNames === "function" ? opts.getTaskAssigneeNames : (() => []);
    const getLinkedTaskContextLabel = typeof opts.getLinkedTaskContextLabel === "function"
      ? opts.getLinkedTaskContextLabel
      : (() => "");

    const onToggleEventTask = typeof opts.onToggleEventTask === "function" ? opts.onToggleEventTask : null;
    const onToggleLinkedTask = typeof opts.onToggleLinkedTask === "function" ? opts.onToggleLinkedTask : null;
    const onEditLinkedTask = typeof opts.onEditLinkedTask === "function" ? opts.onEditLinkedTask : null;
    const onDeleteLinkedTask = typeof opts.onDeleteLinkedTask === "function" ? opts.onDeleteLinkedTask : null;

    const details = doc.createElement("details");
    details.className = "task-collapsible";
    const summary = doc.createElement("summary");
    summary.className = "task-collapsible-summary";
    summary.textContent = `${t("eventTasks")} (${tasks.length + linkedRows.length})`;
    details.appendChild(summary);

    const wrap = doc.createElement("div");
    wrap.className = "task-inline-wrap";

    tasks.forEach((task) => {
      const row = doc.createElement("div");
      const isOverdue = String(evt.endDate || "") < todayKey && !task.done;
      row.className = `task-inline-item${task.done ? " task-done" : ""}${isOverdue ? " task-overdue" : ""}`;
      if (sharedReadOnlyEvent && markSharedOriginVisual) markSharedOriginVisual(row);

      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.checked = Boolean(task.done);
      cb.disabled = readOnly;
      cb.addEventListener("change", () => {
        if (!onToggleEventTask) return;
        onToggleEventTask({
          eventId: evt.seriesId || evt.id,
          taskId: task.id,
          checked: cb.checked,
          task,
          event: evt
        });
      });

      const name = doc.createElement("span");
      const assignees = getTaskAssigneeNames(task);
      const linkedLabel = getLinkedTaskContextLabel(task, false);
      const baseText = assignees.length ? `${task.title} (${assignees.join(", ")})` : task.title;
      name.textContent = linkedLabel ? `${baseText} • ${linkedLabel}` : baseText;
      row.append(cb, name);
      wrap.appendChild(row);
    });

    linkedRows.forEach((entry) => {
      const task = entry && entry.task;
      if (!task) return;
      const row = doc.createElement("div");
      const isOverdue = String((entry && entry.dateKey) || "") < todayKey && !task.done;
      row.className = `task-inline-item${task.done ? " task-done" : ""}${isOverdue ? " task-overdue" : ""}`;
      row.style.borderLeft = "3px solid #0f766e";

      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.checked = Boolean(task.done);
      cb.disabled = readOnly;
      cb.addEventListener("change", () => {
        if (!onToggleLinkedTask) return;
        onToggleLinkedTask(entry, cb.checked);
      });

      const name = doc.createElement("span");
      const assignees = getTaskAssigneeNames(task);
      const linkedLabel = getLinkedTaskContextLabel(task, false);
      const baseText = assignees.length ? `${task.title} (${assignees.join(", ")})` : task.title;
      name.textContent = linkedLabel ? `${baseText} • ${linkedLabel}` : baseText;
      row.append(cb, name);

      if (!readOnly) {
        const editBtn = doc.createElement("button");
        editBtn.type = "button";
        editBtn.className = "delete-btn";
        editBtn.textContent = t("edit");
        editBtn.addEventListener("click", () => {
          if (onEditLinkedTask) onEditLinkedTask(entry);
        });

        const delBtn = doc.createElement("button");
        delBtn.type = "button";
        delBtn.className = "delete-btn";
        delBtn.textContent = t("delete");
        delBtn.addEventListener("click", () => {
          if (onDeleteLinkedTask) onDeleteLinkedTask(entry);
        });

        row.append(editBtn, delBtn);
      }

      wrap.appendChild(row);
    });

    details.appendChild(wrap);
    container.appendChild(details);
  }

  function renderEventRow(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const evt = opts.event;
    const list = opts.eventList;
    if (!doc || !evt || !list) return;

    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const isSharedEventReadOnlyInPersonalMode = typeof opts.isSharedEventReadOnlyInPersonalMode === "function"
      ? opts.isSharedEventReadOnlyInPersonalMode
      : (() => false);
    const markSharedOriginVisual = typeof opts.markSharedOriginVisual === "function" ? opts.markSharedOriginVisual : null;
    const describeEventPeople = typeof opts.describeEventPeople === "function" ? opts.describeEventPeople : (() => "");
    const renderEventTasksInline = typeof opts.renderEventTasksInline === "function" ? opts.renderEventTasksInline : null;
    const canManageEventAndAbsenceChanges = typeof opts.canManageEventAndAbsenceChanges === "function"
      ? opts.canManageEventAndAbsenceChanges
      : (() => false);
    const onOpenPreview = typeof opts.onOpenPreview === "function" ? opts.onOpenPreview : null;
    const onEditEvent = typeof opts.onEditEvent === "function" ? opts.onEditEvent : null;
    const onDeleteEvent = typeof opts.onDeleteEvent === "function" ? opts.onDeleteEvent : null;
    const selectedDateKey = opts.selectedDateKey;
    const formatEventTimeLabel = typeof opts.formatEventTimeLabel === "function"
      ? opts.formatEventTimeLabel
      : ((eventRow, dateKey) => {
        const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
        return timeMeta && typeof timeMeta.getEventTimeLabelForDate === "function"
          ? timeMeta.getEventTimeLabelForDate(eventRow, dateKey, { t })
          : (eventRow.time || t("anyTime"));
      });

    const li = doc.createElement("li");
    li.className = "event-item";
    if (isSharedEventReadOnlyInPersonalMode(evt) && markSharedOriginVisual) markSharedOriginVisual(li);

    const main = doc.createElement("div");
    main.className = "event-main";
    const title = doc.createElement("strong");
    title.textContent = evt.title;

    const time = doc.createElement("span");
    time.className = "event-time";
    time.textContent = formatEventTimeLabel(evt, selectedDateKey);

    main.append(title, time);
    main.classList.add("clickable-summary");
    main.addEventListener("click", (event) => {
      if (event.target && event.target.closest("button, input, select, textarea, summary, details")) return;
      if (onOpenPreview) onOpenPreview(evt, selectedDateKey);
    });

    const peopleMeta = describeEventPeople(evt);
    if (peopleMeta) {
      const peopleLine = doc.createElement("span");
      peopleLine.className = "event-people";
      peopleLine.textContent = peopleMeta;
      main.appendChild(peopleLine);
    }

    if (evt.description) {
      const desc = doc.createElement("span");
      desc.className = "event-people";
      desc.textContent = evt.description;
      main.appendChild(desc);
    }

    if (renderEventTasksInline) renderEventTasksInline(main, evt, selectedDateKey);

    const actions = doc.createElement("div");
    actions.className = "person-actions";
    if (!canManageEventAndAbsenceChanges() || isSharedEventReadOnlyInPersonalMode(evt)) {
      li.append(main);
      list.appendChild(li);
      return;
    }

    const editBtn = doc.createElement("button");
    editBtn.className = "delete-btn";
    editBtn.type = "button";
    editBtn.textContent = t("edit");
    editBtn.addEventListener("click", () => {
      if (onEditEvent) onEditEvent(evt, selectedDateKey);
    });

    const delBtn = doc.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.type = "button";
    delBtn.textContent = t("delete");
    delBtn.addEventListener("click", () => {
      if (onDeleteEvent) onDeleteEvent(evt, selectedDateKey);
    });

    actions.append(editBtn, delBtn);
    li.append(main, actions);
    list.appendChild(li);
  }

  function renderStandaloneTaskRow(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const task = opts.task;
    const dateKey = String(opts.dateKey || "");
    const list = opts.eventList;
    if (!doc || !task || !list) return;

    const isTaskViewEnabled = typeof opts.isTaskViewEnabled === "function" ? opts.isTaskViewEnabled : (() => false);
    if (!isTaskViewEnabled()) return;

    const readOnly = Boolean(opts.readOnly);
    const todayKey = String(opts.todayKey || "");
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const isSharedStandaloneTaskInPersonalMode = typeof opts.isSharedStandaloneTaskInPersonalMode === "function"
      ? opts.isSharedStandaloneTaskInPersonalMode
      : (() => false);
    const markSharedOriginVisual = typeof opts.markSharedOriginVisual === "function" ? opts.markSharedOriginVisual : null;
    const getTaskAssigneeNames = typeof opts.getTaskAssigneeNames === "function" ? opts.getTaskAssigneeNames : (() => []);
    const getLinkedTaskContextLabel = typeof opts.getLinkedTaskContextLabel === "function"
      ? opts.getLinkedTaskContextLabel
      : (() => "");
    const onToggleStandaloneTask = typeof opts.onToggleStandaloneTask === "function" ? opts.onToggleStandaloneTask : null;
    const onEditStandaloneTask = typeof opts.onEditStandaloneTask === "function" ? opts.onEditStandaloneTask : null;
    const onDeleteStandaloneTask = typeof opts.onDeleteStandaloneTask === "function" ? opts.onDeleteStandaloneTask : null;

    const li = doc.createElement("li");
    li.className = "event-item";
    if (isSharedStandaloneTaskInPersonalMode(task) && markSharedOriginVisual) markSharedOriginVisual(li);

    const main = doc.createElement("div");
    main.className = "event-main";
    const row = doc.createElement("div");
    const isOverdue = dateKey < todayKey && !task.done;
    row.className = `task-inline-item${task.done ? " task-done" : ""}${isOverdue ? " task-overdue" : ""}`;

    const cb = doc.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(task.done);
    cb.disabled = readOnly;
    cb.addEventListener("change", () => {
      if (onToggleStandaloneTask) onToggleStandaloneTask(task, dateKey, cb.checked);
    });

    const assignees = getTaskAssigneeNames(task);
    const title = doc.createElement("strong");
    const linkedLabel = getLinkedTaskContextLabel(task, true);
    const baseTaskText = assignees.length ? `${task.title} (${assignees.join(", ")})` : task.title;
    title.textContent = linkedLabel ? `${baseTaskText} • ${linkedLabel}` : baseTaskText;
    row.append(cb, title);

    if (!readOnly) {
      const editBtn = doc.createElement("button");
      editBtn.type = "button";
      editBtn.className = "delete-btn";
      editBtn.textContent = t("edit");
      editBtn.addEventListener("click", () => {
        if (onEditStandaloneTask) onEditStandaloneTask(task, dateKey);
      });
      row.appendChild(editBtn);
    }

    main.appendChild(row);
    const info = doc.createElement("span");
    info.className = "event-time";
    info.textContent = dateKey;
    main.appendChild(info);

    if (readOnly) {
      li.append(main);
    } else {
      const delBtn = doc.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.type = "button";
      delBtn.textContent = t("delete");
      delBtn.addEventListener("click", () => {
        if (onDeleteStandaloneTask) onDeleteStandaloneTask(task, dateKey);
      });
      li.append(main, delBtn);
    }

    list.appendChild(li);
  }

  function createSideItemMenu(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    if (!doc) return null;
    if (opts.readOnly || !opts.allowActions) return null;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const onEdit = typeof opts.onEdit === "function" ? opts.onEdit : null;
    const onDelete = typeof opts.onDelete === "function" ? opts.onDelete : null;

    const details = doc.createElement("details");
    details.className = "side-item-menu";
    const summary = doc.createElement("summary");
    summary.className = "side-item-menu-trigger";
    summary.textContent = "...";
    const menu = doc.createElement("div");
    menu.className = "side-item-menu-list";

    const editBtn = doc.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = t("edit");
    editBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      details.open = false;
      if (onEdit) onEdit();
    });

    const delBtn = doc.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-btn";
    delBtn.textContent = t("delete");
    delBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      details.open = false;
      if (onDelete) onDelete();
    });

    menu.append(editBtn, delBtn);
    details.append(summary, menu);
    return details;
  }

  function renderSideDayPanel(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const sideSelectedDateTitle = opts.sideSelectedDateTitle;
    const sideDayList = opts.sideDayList;
    if (!doc || !sideSelectedDateTitle || !sideDayList) return;

    const getSelectedDateKey = typeof opts.getSelectedDateKey === "function" ? opts.getSelectedDateKey : (() => "");
    const setSelectedDateKey = typeof opts.setSelectedDateKey === "function" ? opts.setSelectedDateKey : (() => {});
    const todayKey = String(opts.todayKey || "");
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const parseDateKey = typeof opts.parseDateKey === "function" ? opts.parseDateKey : (() => new Date());
    const getLocale = typeof opts.getLocale === "function" ? opts.getLocale : (() => "en");

    let selectedDateKey = String(getSelectedDateKey() || "");
    if (!selectedDateKey) {
      selectedDateKey = todayKey;
      setSelectedDateKey(selectedDateKey);
    }

    const date = parseDateKey(selectedDateKey);
    sideSelectedDateTitle.textContent = date.toLocaleDateString(getLocale(), {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const events = Array.isArray(opts.events) ? opts.events : [];
    const dayAbsences = Array.isArray(opts.dayAbsences) ? opts.dayAbsences : [];
    const dayTasks = Array.isArray(opts.dayTasks) ? opts.dayTasks : [];

    sideDayList.innerHTML = "";
    if (!events.length && !dayAbsences.length && !dayTasks.length) {
      sideDayList.appendChild(createEmptyCard(doc, t("noEventsForDay"), t("noEventsForDayHint")));
      return;
    }

    const isSharedEventReadOnlyInPersonalMode = typeof opts.isSharedEventReadOnlyInPersonalMode === "function"
      ? opts.isSharedEventReadOnlyInPersonalMode
      : (() => false);
    const markSharedOriginVisual = typeof opts.markSharedOriginVisual === "function" ? opts.markSharedOriginVisual : null;
    const getCategoryBgColor = typeof opts.getCategoryBgColor === "function" ? opts.getCategoryBgColor : (() => "");
    const describeEventPeople = typeof opts.describeEventPeople === "function" ? opts.describeEventPeople : (() => "");
    const openEventPreview = typeof opts.onOpenEventPreview === "function" ? opts.onOpenEventPreview : null;
    const renderEventTasksInline = typeof opts.renderEventTasksInline === "function" ? opts.renderEventTasksInline : null;
    const canManageEventAndAbsenceChanges = typeof opts.canManageEventAndAbsenceChanges === "function"
      ? opts.canManageEventAndAbsenceChanges
      : (() => false);
    const onEditEvent = typeof opts.onEditEvent === "function" ? opts.onEditEvent : null;
    const onDeleteEvent = typeof opts.onDeleteEvent === "function" ? opts.onDeleteEvent : null;

    const readOnly = Boolean(opts.readOnly);
    const getOperationalPeople = typeof opts.getOperationalPeople === "function" ? opts.getOperationalPeople : (() => []);
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || ""));
    const isSharedStandaloneTaskInPersonalMode = typeof opts.isSharedStandaloneTaskInPersonalMode === "function"
      ? opts.isSharedStandaloneTaskInPersonalMode
      : (() => false);
    const categories = Array.isArray(opts.categories) ? opts.categories : [];
    const getTaskAssigneeNames = typeof opts.getTaskAssigneeNames === "function" ? opts.getTaskAssigneeNames : (() => []);
    const getLinkedTaskContextLabel = typeof opts.getLinkedTaskContextLabel === "function"
      ? opts.getLinkedTaskContextLabel
      : (() => "");
    const onToggleStandaloneTask = typeof opts.onToggleStandaloneTask === "function" ? opts.onToggleStandaloneTask : null;
    const onEditStandaloneTask = typeof opts.onEditStandaloneTask === "function" ? opts.onEditStandaloneTask : null;
    const onDeleteStandaloneTask = typeof opts.onDeleteStandaloneTask === "function" ? opts.onDeleteStandaloneTask : null;
    const formatEventTimeLabel = typeof opts.formatEventTimeLabel === "function"
      ? opts.formatEventTimeLabel
      : ((eventRow, dateKey) => {
        const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
        return timeMeta && typeof timeMeta.getEventTimeLabelForDate === "function"
          ? timeMeta.getEventTimeLabelForDate(eventRow, dateKey, { t })
          : (eventRow.time || t("anyTime"));
      });

    if (events.length) {
      sideDayList.appendChild(createSectionHeader(doc, t("sectionEvents"), events.length));
    }
    events.forEach((evt) => {
      const li = doc.createElement("li");
      li.className = "event-item";
      if (isSharedEventReadOnlyInPersonalMode(evt) && markSharedOriginVisual) markSharedOriginVisual(li);
      li.style.background = getCategoryBgColor(evt.categoryId);

      const main = doc.createElement("div");
      main.className = "event-main";
      const title = doc.createElement("strong");
      title.textContent = evt.title;
      const when = doc.createElement("span");
      when.className = "event-time";
      when.textContent = formatEventTimeLabel(evt, selectedDateKey);
      main.append(title, when);
      const peopleMeta = describeEventPeople(evt);
      if (peopleMeta) {
        const peopleLine = doc.createElement("span");
        peopleLine.className = "event-people";
        peopleLine.textContent = peopleMeta;
        main.appendChild(peopleLine);
      }
      if (evt.description) {
        const desc = doc.createElement("span");
        desc.className = "event-people";
        desc.textContent = evt.description;
        main.appendChild(desc);
      }
      main.classList.add("clickable-summary");
      main.addEventListener("click", (event) => {
        if (event.target && event.target.closest("button, input, select, textarea, summary, details")) return;
        if (openEventPreview) openEventPreview(evt, selectedDateKey);
      });

      if (renderEventTasksInline) renderEventTasksInline(main, evt, selectedDateKey);

      const menu = createSideItemMenu({
        documentRef: doc,
        readOnly,
        t,
        allowActions: canManageEventAndAbsenceChanges() && !isSharedEventReadOnlyInPersonalMode(evt),
        onEdit: () => { if (onEditEvent) onEditEvent(evt, selectedDateKey); },
        onDelete: () => { if (onDeleteEvent) onDeleteEvent(evt, selectedDateKey); }
      });

      if (menu) li.append(main, menu);
      else li.appendChild(main);
      sideDayList.appendChild(li);
    });

    const roster = getOperationalPeople();
    if (dayAbsences.length) {
      sideDayList.appendChild(createSectionHeader(doc, t("sectionAbsences"), dayAbsences.length));
    }
    dayAbsences.forEach((absence) => {
      const li = doc.createElement("li");
      li.className = "event-item absence upcoming-outline";
      const person = roster.find((p) => String((p && p.id) || "") === String(absence.personId || ""));
      li.style.background = "transparent";
      li.style.borderWidth = "2px";
      li.style.borderStyle = "solid";
      li.style.borderColor = person ? person.color : "#64748b";
      li.style.color = person ? person.color : "#334155";
      const main = doc.createElement("div");
      main.className = "event-main";
      const title = doc.createElement("strong");
      title.textContent = person ? `[${getPersonDisplayName(person, roster)}] ${t("absentVerb")}` : `${t("person")} ${t("absentVerb")}`;
      const when = doc.createElement("span");
      when.className = "event-time";
      when.textContent = `${absence.startDate} ${t("to")} ${absence.endDate}`;
      main.append(title, when);
      if (absence.note) {
        const note = doc.createElement("span");
        note.className = "event-people";
        note.textContent = absence.note;
        main.appendChild(note);
      }
      li.appendChild(main);
      sideDayList.appendChild(li);
    });

    if (dayTasks.length) {
      sideDayList.appendChild(createSectionHeader(doc, t("sectionTasks"), dayTasks.length));
    }
    dayTasks.forEach((task) => {
      const li = doc.createElement("li");
      li.className = `event-item upcoming-task-item${task.done ? " task-done" : ""}`;
      if (isSharedStandaloneTaskInPersonalMode(task) && markSharedOriginVisual) markSharedOriginVisual(li);

      const taskCategoryId = String(task.categoryId || "");
      const cat = taskCategoryId ? categories.find((item) => String(item.id) === taskCategoryId) : null;
      li.classList.add("upcoming-outline");
      li.style.background = "transparent";
      li.style.borderColor = cat ? cat.color : "#64748b";
      li.style.color = "#334155";

      const names = getTaskAssigneeNames(task);
      const isOverdue = selectedDateKey < todayKey && !task.done;
      const statusColor = task.done ? "#22c55e" : (isOverdue ? "#ef4444" : "#f59e0b");

      const top = doc.createElement("div");
      top.className = "upcoming-task-top";

      const topLeft = doc.createElement("div");
      topLeft.className = "upcoming-task-top-left";
      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.checked = Boolean(task.done);
      cb.disabled = readOnly;
      cb.addEventListener("change", () => {
        if (onToggleStandaloneTask) onToggleStandaloneTask(task, selectedDateKey, cb.checked);
      });
      const title = doc.createElement("strong");
      title.className = "upcoming-task-title";
      title.textContent = task.title;
      title.title = task.title;
      topLeft.append(cb, title);

      const menu = createSideItemMenu({
        documentRef: doc,
        readOnly,
        t,
        allowActions: true,
        onEdit: () => { if (onEditStandaloneTask) onEditStandaloneTask(task, selectedDateKey); },
        onDelete: () => { if (onDeleteStandaloneTask) onDeleteStandaloneTask(task, selectedDateKey); }
      });

      top.appendChild(topLeft);
      if (menu) top.appendChild(menu);

      const body = doc.createElement("div");
      body.className = "upcoming-task-body";
      body.style.background = cat ? getCategoryBgColor(cat.id) : "rgba(148,163,184,0.16)";

      const metaLine = doc.createElement("div");
      metaLine.className = "upcoming-task-meta-line";
      const dot = doc.createElement("span");
      dot.className = "upcoming-task-status-dot";
      dot.style.background = statusColor;
      metaLine.appendChild(dot);

      if (names.length) {
        const meta = doc.createElement("span");
        meta.className = "event-people";
        meta.textContent = names.join(", ");
        meta.title = names.join(", ");
        metaLine.appendChild(meta);
      }

      body.appendChild(metaLine);
      const linkedTaskLabel = getLinkedTaskContextLabel(task, true);
      if (linkedTaskLabel) {
        const linkedMeta = doc.createElement("span");
        linkedMeta.className = "event-time";
        linkedMeta.textContent = linkedTaskLabel;
        body.appendChild(linkedMeta);
      }
      const main = doc.createElement("div");
      main.className = "event-main";
      main.append(top, body);
      li.appendChild(main);
      sideDayList.appendChild(li);
    });
  }

  root.ProCalModules.eventsListRender = {
    renderAbsenceRow,
    renderEventTasksInline,
    renderEventRow,
    renderStandaloneTaskRow,
    createSideItemMenu,
    renderSideDayPanel
  };
})(window);
