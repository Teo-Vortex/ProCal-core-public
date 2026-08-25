(function initCalendarDayCell(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function closeAllDayQuickAddMenus(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    if (!doc) return;
    doc.querySelectorAll(".day-quick-add.open").forEach((el) => {
      el.classList.remove("open");
      const ownerDay = el.closest(".day");
      if (ownerDay) ownerDay.classList.remove("quick-add-open");
    });
    if (opts.sideDayQuickAddTrigger) opts.sideDayQuickAddTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleSideDayQuickAdd(options) {
    const opts = options || {};
    const sideDayQuickAdd = opts.sideDayQuickAdd;
    if (!sideDayQuickAdd) return;
    const forceOpen = Object.prototype.hasOwnProperty.call(opts, "forceOpen") ? opts.forceOpen : null;
    const nextOpen = forceOpen === null ? !sideDayQuickAdd.classList.contains("open") : Boolean(forceOpen);
    if (nextOpen) {
      if (typeof opts.closeAllDayQuickAddMenus === "function") opts.closeAllDayQuickAddMenus();
      sideDayQuickAdd.classList.add("open");
      if (opts.sideDayQuickAddTrigger) opts.sideDayQuickAddTrigger.setAttribute("aria-expanded", "true");
      return;
    }
    sideDayQuickAdd.classList.remove("open");
    if (opts.sideDayQuickAddTrigger) opts.sideDayQuickAddTrigger.setAttribute("aria-expanded", "false");
  }

  let activeTaskSummaryModal = null;
  let taskPopoverDismissBound = false;

  function closeOpenTaskPopovers(doc, exceptWidget) {
    if (!doc) return;
    doc.querySelectorAll(".calendar-task-widget.is-open").forEach((widget) => {
      if (widget === exceptWidget) return;
      widget.classList.remove("is-open");
      const trigger = widget.querySelector(".calendar-complex-task");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function ensureTaskPopoverDismiss(doc) {
    if (!doc || taskPopoverDismissBound) return;
    taskPopoverDismissBound = true;
    doc.addEventListener("pointerdown", (event) => {
      if (event.target && event.target.closest && event.target.closest(".calendar-task-widget")) return;
      closeOpenTaskPopovers(doc);
    });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeOpenTaskPopovers(doc);
    });
  }

  function closeTaskSummaryModal() {
    if (!activeTaskSummaryModal) return;
    activeTaskSummaryModal.remove();
    activeTaskSummaryModal = null;
  }

  function buildTaskSummaryContent(doc, summary, options) {
    const opts = options || {};
    const content = doc.createElement("span");
    content.className = "calendar-task-summary-content";

    const statusRow = doc.createElement("span");
    statusRow.className = "calendar-task-summary-statuses";
    summary.statuses.filter((status) => status.count > 0).forEach((status) => {
      const item = doc.createElement("span");
      item.className = `calendar-task-summary-status status-${status.key}`;
      item.textContent = `${status.label} ${status.count}`;
      statusRow.appendChild(item);
    });
    content.appendChild(statusRow);

    summary.sections.filter((section) => section.rows.length > 0).forEach((section) => {
      const sectionEl = doc.createElement("span");
      sectionEl.className = "calendar-task-summary-section";

      const heading = doc.createElement("span");
      heading.className = "calendar-task-summary-heading";
      heading.textContent = section.title;
      sectionEl.appendChild(heading);

      section.rows.forEach((row) => {
        const rowEl = doc.createElement("span");
        rowEl.className = `calendar-task-summary-row status-${row.status}`;

        const checkbox = doc.createElement("span");
        const checked = row.status === "completed";
        checkbox.className = `calendar-task-summary-checkbox${checked ? " checked" : ""}`;
        checkbox.setAttribute("role", "checkbox");
        checkbox.setAttribute("aria-checked", checked ? "true" : "false");
        checkbox.setAttribute("aria-label", `${row.statusLabel}: ${row.title}`);
        checkbox.setAttribute("tabindex", row.canToggle ? "0" : "-1");
        if (!row.canToggle) checkbox.setAttribute("aria-disabled", "true");

        const toggle = (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!row.canToggle || typeof row.onToggle !== "function") return;
          row.onToggle(!checked);
          if (typeof opts.afterToggle === "function") opts.afterToggle();
        };
        checkbox.addEventListener("click", toggle);
        checkbox.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          toggle(event);
        });

        const rowCopy = doc.createElement("span");
        rowCopy.className = "calendar-task-summary-row-copy";
        const rowTitle = doc.createElement("span");
        rowTitle.className = "calendar-task-summary-row-title";
        rowTitle.textContent = row.title;
        rowCopy.appendChild(rowTitle);
        if (row.assigneeLabel) {
          const assignee = doc.createElement("span");
          assignee.className = "calendar-task-summary-row-assignee";
          assignee.textContent = row.assigneeLabel;
          rowCopy.appendChild(assignee);
        }

        const rowStatus = doc.createElement("span");
        rowStatus.className = "calendar-task-summary-row-status";
        rowStatus.textContent = row.statusLabel;
        rowEl.append(checkbox, rowCopy, rowStatus);
        sectionEl.appendChild(rowEl);
      });
      content.appendChild(sectionEl);
    });
    return content;
  }

  function openTaskSummaryModal(doc, summary, labels, onOpenTasks) {
    closeTaskSummaryModal();
    const modal = doc.createElement("div");
    modal.className = "modal calendar-task-summary-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", labels.title);

    const card = doc.createElement("div");
    card.className = "modal-card compact-modal-card calendar-task-summary-modal-card";

    const head = doc.createElement("div");
    head.className = "modal-head";
    const title = doc.createElement("h3");
    title.textContent = labels.title;
    const close = doc.createElement("button");
    close.type = "button";
    close.className = "ghost-btn";
    close.textContent = labels.close;
    close.addEventListener("click", closeTaskSummaryModal);
    head.append(title, close);

    const body = doc.createElement("div");
    body.className = "calendar-task-summary-modal-body";
    body.appendChild(buildTaskSummaryContent(doc, summary, { afterToggle: closeTaskSummaryModal }));

    const actions = doc.createElement("div");
    actions.className = "modal-actions calendar-task-summary-modal-actions";
    const openTasks = doc.createElement("button");
    openTasks.type = "button";
    openTasks.className = "accent-btn";
    openTasks.textContent = labels.openTasks;
    openTasks.addEventListener("click", () => {
      closeTaskSummaryModal();
      if (typeof onOpenTasks === "function") onOpenTasks();
    });
    actions.appendChild(openTasks);

    card.append(head, body, actions);
    modal.appendChild(card);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeTaskSummaryModal();
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeTaskSummaryModal();
    });
    doc.body.appendChild(modal);
    activeTaskSummaryModal = modal;
    close.focus();
  }

  function createDetailedDayCell(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    if (!doc) return null;
    const cellDate = opts.cellDate instanceof Date ? opts.cellDate : null;
    if (!cellDate) return null;

    const key = String(opts.key || "");
    const inCurrentMonth = Boolean(opts.inCurrentMonth);
    const peopleMap = opts.peopleMap instanceof Map ? opts.peopleMap : new Map();
    const laneMap = opts.laneMap instanceof Map ? opts.laneMap : new Map();
    const visibleLanes = Number.isFinite(Number(opts.visibleLanes)) ? Number(opts.visibleLanes) : 4;

    const t = typeof opts.t === "function" ? opts.t : ((k) => k);
    const getHolidayNamesForDate = typeof opts.getHolidayNamesForDate === "function" ? opts.getHolidayNamesForDate : (() => []);
    const isDayOffHoliday = typeof opts.isDayOffHoliday === "function" ? opts.isDayOffHoliday : (() => false);
    const getEventsForDate = typeof opts.getEventsForDate === "function" ? opts.getEventsForDate : (() => []);
    const matchesEventFilters = typeof opts.matchesEventFilters === "function" ? opts.matchesEventFilters : (() => true);
    const getAbsencesForDate = typeof opts.getAbsencesForDate === "function" ? opts.getAbsencesForDate : (() => []);
    const matchesAbsenceFilters = typeof opts.matchesAbsenceFilters === "function" ? opts.matchesAbsenceFilters : (() => true);
    const getStandaloneTasksForDate = typeof opts.getStandaloneTasksForDate === "function" ? opts.getStandaloneTasksForDate : (() => []);
    const getWorkingTasksForDate = typeof opts.getWorkingTasksForDate === "function" ? opts.getWorkingTasksForDate : (() => []);
    const getComplexTasksForDate = typeof opts.getComplexTasksForDate === "function" ? opts.getComplexTasksForDate : getWorkingTasksForDate;
    const getCalendarTaskRowsForDate = typeof opts.getCalendarTaskRowsForDate === "function" ? opts.getCalendarTaskRowsForDate : null;
    const isTaskDone = typeof opts.isTaskDone === "function" ? opts.isTaskDone : ((task) => Boolean(task && task.done));
    const canToggleTask = typeof opts.canToggleTask === "function" ? opts.canToggleTask : (() => false);
    const onToggleTask = typeof opts.onToggleTask === "function" ? opts.onToggleTask : null;
    const canToggleTaskRow = typeof opts.canToggleTaskRow === "function" ? opts.canToggleTaskRow : (() => false);
    const onToggleTaskRow = typeof opts.onToggleTaskRow === "function" ? opts.onToggleTaskRow : null;
    const isLinkedStandaloneTask = typeof opts.isLinkedStandaloneTask === "function" ? opts.isLinkedStandaloneTask : (() => false);
    const matchesTaskFilters = typeof opts.matchesTaskFilters === "function" ? opts.matchesTaskFilters : (() => true);
    const getCategoryBgColor = typeof opts.getCategoryBgColor === "function" ? opts.getCategoryBgColor : (() => "");
    const isSharedEventReadOnlyInPersonalMode = typeof opts.isSharedEventReadOnlyInPersonalMode === "function"
      ? opts.isSharedEventReadOnlyInPersonalMode
      : (() => false);
    const markSharedOriginVisual = typeof opts.markSharedOriginVisual === "function" ? opts.markSharedOriginVisual : null;
    const addDaysToKey = typeof opts.addDaysToKey === "function" ? opts.addDaysToKey : ((v) => v);
    const isDateInRange = typeof opts.isDateInRange === "function" ? opts.isDateInRange : (() => false);
    const canOpenEventCreateInCurrentCalendar = typeof opts.canOpenEventCreateInCurrentCalendar === "function"
      ? opts.canOpenEventCreateInCurrentCalendar
      : (() => false);
    const canOpenTaskCreateInCurrentCalendar = typeof opts.canOpenTaskCreateInCurrentCalendar === "function"
      ? opts.canOpenTaskCreateInCurrentCalendar
      : (() => false);
    const canCompOverviewAccess = typeof opts.canCompOverviewAccess === "function" ? opts.canCompOverviewAccess : (() => false);
    const closeAllDayQuickAddMenusCb = typeof opts.closeAllDayQuickAddMenus === "function" ? opts.closeAllDayQuickAddMenus : null;
    const setSelectedDateKey = typeof opts.setSelectedDateKey === "function" ? opts.setSelectedDateKey : (() => {});
    const renderCalendar = typeof opts.renderCalendar === "function" ? opts.renderCalendar : (() => {});
    const renderSelectedDayPanel = typeof opts.renderSelectedDayPanel === "function" ? opts.renderSelectedDayPanel : (() => {});
    const openWorkingTasksForDate = typeof opts.openWorkingTasksForDate === "function" ? opts.openWorkingTasksForDate : null;
    const onDaySelected = typeof opts.onDaySelected === "function" ? opts.onDaySelected : null;
    const openEventPreview = typeof opts.openEventPreview === "function" ? opts.openEventPreview : null;
    const openDayMenu = typeof opts.openDayMenu === "function" ? opts.openDayMenu : null;
    const startEventCreateMode = typeof opts.startEventCreateMode === "function" ? opts.startEventCreateMode : null;
    const hideDayActionChoices = typeof opts.hideDayActionChoices === "function" ? opts.hideDayActionChoices : null;
    const setDayMenuSectionMode = typeof opts.setDayMenuSectionMode === "function" ? opts.setDayMenuSectionMode : null;
    const renderStandaloneTaskList = typeof opts.renderStandaloneTaskList === "function" ? opts.renderStandaloneTaskList : null;
    const openCompensationMenu = typeof opts.openCompensationMenu === "function" ? opts.openCompensationMenu : null;
    const todayKey = String(opts.todayKey || "");
    const selectedDateKey = String(opts.selectedDateKey || "");
    const categories = Array.isArray(opts.categories) ? opts.categories : [];

    const holidayNames = getHolidayNamesForDate(key);
    const isHoliday = holidayNames.length > 0;
    const isDayOff = isDayOffHoliday(key);
    const events = getEventsForDate(key).filter(matchesEventFilters);
    const dailyAbsences = getAbsencesForDate(key).filter(matchesAbsenceFilters);
    const dailyTasks = getStandaloneTasksForDate(key).filter((task) => !isLinkedStandaloneTask(task)).filter(matchesTaskFilters);
    const workingTasks = getWorkingTasksForDate(key);
    const spanningComplexTasks = getComplexTasksForDate(key).filter(matchesTaskFilters);
    const workingTaskIds = new Set(workingTasks.map((task) => String((task && task.id) || "")).filter(Boolean));
    const managedTaskRows = getCalendarTaskRowsForDate ? getCalendarTaskRowsForDate(key) : null;

    const dayOfWeek = cellDate.getDay();
    const day = doc.createElement("button");
    day.type = "button";
    day.className = "day";
    if (dayOfWeek === 0 || dayOfWeek === 6 || isDayOff) day.classList.add("weekend");
    if (isHoliday) day.title = holidayNames.join(", ");
    if (!inCurrentMonth) day.classList.add("muted");
    if (key === todayKey) day.classList.add("today");
    if (key === selectedDateKey) day.classList.add("selected");
    day.setAttribute("role", "gridcell");
    day.setAttribute("aria-label", cellDate.toDateString());
    day.addEventListener("click", () => {
      setSelectedDateKey(key);
      renderCalendar();
      renderSelectedDayPanel();
      if (onDaySelected) onDaySelected(key);
    });

    const head = doc.createElement("div");
    head.className = "day-head";
    head.textContent = String(cellDate.getDate());
    day.appendChild(head);

    if (isHoliday) {
      const holidayStack = doc.createElement("div");
      holidayStack.className = "holiday-stack";
      const maxShown = 1;
      holidayNames.slice(0, maxShown).forEach((holidayName) => {
        const badge = doc.createElement("span");
        badge.className = `holiday-chip${isDayOff ? " day-off" : ""}`;
        badge.textContent = holidayName;
        holidayStack.appendChild(badge);
      });
      if (holidayNames.length > maxShown) {
        const more = doc.createElement("span");
        more.className = `holiday-chip${isDayOff ? " day-off" : ""}`;
        more.textContent = `+${holidayNames.length - maxShown}`;
        holidayStack.appendChild(more);
      }
      day.appendChild(holidayStack);
    }

    const canQuickAddEventAbsence = canOpenEventCreateInCurrentCalendar();
    const canQuickAddTask = canOpenTaskCreateInCurrentCalendar();
    const canQuickAddComp = canCompOverviewAccess();
    if (canQuickAddEventAbsence || canQuickAddTask || canQuickAddComp) {
      const quickAdd = doc.createElement("div");
      quickAdd.className = "day-quick-add";

      const trigger = doc.createElement("span");
      trigger.className = "day-quick-add-trigger";
      trigger.textContent = "+";
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-label", t("add"));

      const menu = doc.createElement("div");
      menu.className = "day-quick-add-menu";

      const selectDateAndOpenDayPanel = () => {
        setSelectedDateKey(key);
        renderCalendar();
        if (openDayMenu) openDayMenu(key);
      };

      const addQuickItem = (labelText, titleText, onPick) => {
        const item = doc.createElement("span");
        item.className = "day-quick-add-item";
        item.textContent = labelText;
        item.title = titleText;
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (closeAllDayQuickAddMenusCb) closeAllDayQuickAddMenusCb();
          onPick();
        });
        item.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          if (closeAllDayQuickAddMenusCb) closeAllDayQuickAddMenusCb();
          onPick();
        });
        menu.appendChild(item);
      };

      if (canQuickAddEventAbsence) {
        addQuickItem(t("quickEventShort"), t("addEvent"), () => {
          selectDateAndOpenDayPanel();
          if (startEventCreateMode) startEventCreateMode(key);
          if (hideDayActionChoices) hideDayActionChoices();
          if (setDayMenuSectionMode) setDayMenuSectionMode("event");
          if (opts.eventTitleInput && typeof opts.eventTitleInput.focus === "function") opts.eventTitleInput.focus();
        });
      }

      if (canQuickAddTask) {
        addQuickItem(t("quickTaskShort"), t("addTask"), () => {
          selectDateAndOpenDayPanel();
          if (hideDayActionChoices) hideDayActionChoices();
          if (setDayMenuSectionMode) setDayMenuSectionMode("task");
          if (renderStandaloneTaskList) renderStandaloneTaskList(key);
          if (opts.taskTitleInput && typeof opts.taskTitleInput.focus === "function") opts.taskTitleInput.focus();
        });
      }

      if (canQuickAddComp) {
        addQuickItem(t("quickCompShort"), t("compensations"), () => {
          setSelectedDateKey(key);
          renderCalendar();
          if (openCompensationMenu) openCompensationMenu(key);
        });
      }

      const toggleQuickMenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !quickAdd.classList.contains("open");
        if (closeAllDayQuickAddMenusCb) closeAllDayQuickAddMenusCb();
        if (willOpen) {
          quickAdd.classList.add("open");
          day.classList.add("quick-add-open");
        }
      };

      trigger.addEventListener("click", toggleQuickMenu);
      trigger.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        toggleQuickMenu(event);
      });

      quickAdd.appendChild(trigger);
      quickAdd.appendChild(menu);
      day.appendChild(quickAdd);
    }

    if (dailyAbsences.length) {
      const absenceStack = doc.createElement("div");
      absenceStack.className = "absence-stack";
      dailyAbsences.slice(0, 3).forEach((abs) => {
        const person = peopleMap.get(abs.personId);
        if (!person) return;
        const bar = doc.createElement("span");
        bar.className = "absence-chip";
        bar.style.color = person.color;
        bar.style.borderColor = person.color;
        bar.textContent = `[${person.name}] ${t("absentVerb")}`;
        const prevKey = addDaysToKey(key, -1);
        const nextKey = addDaysToKey(key, 1);
        if (dayOfWeek !== 0 && isDateInRange(prevKey, abs.startDate, abs.endDate)) bar.classList.add("cont-left");
        if (dayOfWeek !== 6 && isDateInRange(nextKey, abs.startDate, abs.endDate)) bar.classList.add("cont-right");
        absenceStack.appendChild(bar);
      });
      if (dailyAbsences.length > 3) {
        const more = doc.createElement("span");
        more.className = "absence-chip";
        more.textContent = `+${dailyAbsences.length - 3} ${t("absentCount")}`;
        absenceStack.appendChild(more);
      }
      day.appendChild(absenceStack);
    }

    const chips = doc.createElement("div");
    chips.className = "chips lanes";
    const eventsByLane = new Map();
    events.forEach((evt) => {
      const lane = laneMap.get(evt.id);
      const lane2 = laneMap.get(evt.occurrenceId || evt.id);
      const effectiveLane = lane2 === undefined ? lane : lane2;
      if (effectiveLane === undefined) return;
      eventsByLane.set(effectiveLane, evt);
    });

    for (let lane = 0; lane < visibleLanes; lane += 1) {
      const evt = eventsByLane.get(lane);
      if (!evt) {
        const spacer = doc.createElement("span");
        spacer.className = "chip-spacer";
        chips.appendChild(spacer);
        continue;
      }
      const chip = doc.createElement("span");
      chip.className = "chip";
      chip.style.background = getCategoryBgColor(evt.categoryId);
      if (isSharedEventReadOnlyInPersonalMode(evt) && markSharedOriginVisual) markSharedOriginVisual(chip);
      chip.textContent = evt.time ? `${evt.time} ${evt.title}` : evt.title;
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedDateKey(key);
        renderCalendar();
        renderSelectedDayPanel();
        if (openEventPreview) openEventPreview(evt, key);
      });
      const prevKey = addDaysToKey(key, -1);
      const nextKey = addDaysToKey(key, 1);
      if (dayOfWeek !== 0 && isDateInRange(prevKey, evt.startDate, evt.endDate)) chip.classList.add("cont-left");
      if (dayOfWeek !== 6 && isDateInRange(nextKey, evt.startDate, evt.endDate)) chip.classList.add("cont-right");
      chips.appendChild(chip);
    }

    const hiddenCount = Array.from(eventsByLane.keys()).filter((lane) => lane >= visibleLanes).length;
    if (hiddenCount > 0) {
      const more = doc.createElement("span");
      more.className = "chip";
      more.textContent = `+${hiddenCount}`;
      chips.appendChild(more);
    }
    day.appendChild(chips);

    const legacyRows = () => {
      const complexTasksById = new Map();
      dailyTasks.filter((task) => Boolean(task && task.workStartedOn)).forEach((task) => {
        complexTasksById.set(String(task.id || `${task.title || "task"}-${task.workStartedOn}`), task);
      });
      spanningComplexTasks.forEach((task) => {
        complexTasksById.set(String(task.id || `${task.title || "task"}-${task.workStartedOn}`), task);
      });
      return [
        ...Array.from(complexTasksById.values()).map((task) => ({
          task,
          title: String((task && task.title) || ""),
          assigneeLabel: "",
          workStartedOn: String((task && task.workStartedOn) || ""),
          status: workingTaskIds.has(String((task && task.id) || "")) ? "working" : "completed"
        })),
        ...dailyTasks.filter((task) => !task || !task.workStartedOn).map((task) => ({
          task,
          title: String((task && task.title) || ""),
          assigneeLabel: "",
          workStartedOn: "",
          status: isTaskDone(task) ? "completed" : "open"
        }))
      ];
    };
    const taskRows = (Array.isArray(managedTaskRows) ? managedTaskRows : legacyRows())
      .slice()
      .sort((left, right) => {
        if (left.status !== right.status) return left.status === "working" ? -1 : 1;
        return String(left.title || "").localeCompare(String(right.title || ""));
      });
    const complexTaskRows = taskRows.filter((row) => Boolean(row.isLongRunning) || isDateKey(String(row.workStartedOn || "")));
    const ordinaryTaskRows = taskRows.filter((row) => !row.isLongRunning && !isDateKey(String(row.workStartedOn || "")));
    const openComplexTasks = complexTaskRows.filter((row) => row.status === "open");
    const workingComplexTasks = complexTaskRows.filter((row) => row.status === "working");
    const completedComplexTasks = complexTaskRows.filter((row) => row.status === "completed");
    const overdueTasks = ordinaryTaskRows.filter((row) => key < todayKey && row.status !== "completed");
    const activeTasks = ordinaryTaskRows.filter((row) => key >= todayKey && row.status !== "completed");
    const completedTasks = ordinaryTaskRows.filter((row) => row.status === "completed");

    if (complexTaskRows.length || ordinaryTaskRows.length) {
      const hasOpenTask = openComplexTasks.length > 0 || workingComplexTasks.length > 0 || overdueTasks.length > 0 || activeTasks.length > 0;
      const statusLabels = {
        working: String(opts.workingTaskLabel || "Working on"),
        overdue: String(opts.overdueTaskLabel || "Overdue"),
        active: String(opts.activeTaskLabel || "Active"),
        completed: String(opts.completedTaskLabel || "Completed")
      };
      const toSummaryRow = (row, status) => ({
        title: String(row.title || (row.task && row.task.title) || opts.complexTaskLabel || "Task"),
        assigneeLabel: String(row.assigneeLabel || ""),
        status,
        statusLabel: statusLabels[status],
        canToggle: Array.isArray(managedTaskRows) ? canToggleTaskRow(row) : canToggleTask(row.task),
        onToggle: (done) => {
          if (Array.isArray(managedTaskRows)) {
            if (onToggleTaskRow) onToggleTaskRow(row, done);
          } else if (onToggleTask) {
            onToggleTask(row.task, done);
          }
        }
      });
      const summary = {
        statuses: [
          { key: "overdue", label: statusLabels.overdue, count: overdueTasks.length },
          { key: "active", label: statusLabels.active, count: activeTasks.length + openComplexTasks.length },
          { key: "working", label: statusLabels.working, count: workingComplexTasks.length },
          { key: "completed", label: statusLabels.completed, count: completedTasks.length + completedComplexTasks.length }
        ],
        sections: [
          {
            title: String(opts.complexTasksLabel || opts.workingTaskLabel || "Long-running tasks"),
            rows: [
              ...workingComplexTasks.map((row) => toSummaryRow(row, "working")),
              ...openComplexTasks.map((row) => toSummaryRow(row, "active"))
            ]
          },
          {
            title: String(opts.datedTasksLabel || "Dated tasks"),
            rows: [
              ...overdueTasks.map((row) => toSummaryRow(row, "overdue")),
              ...activeTasks.map((row) => toSummaryRow(row, "active")),
              ...completedTasks.map((row) => toSummaryRow(row, "completed"))
            ]
          },
          {
            title: String(opts.completedWorkLabel || "Completed work"),
            rows: completedComplexTasks.map((row) => toSummaryRow(row, "completed"))
          }
        ]
      };
      ensureTaskPopoverDismiss(doc);
      const widget = doc.createElement("div");
      widget.className = "calendar-task-widget";
      if (dayOfWeek >= 4) widget.classList.add("popover-align-right");

      const chip = doc.createElement("button");
      chip.type = "button";
      chip.className = `calendar-complex-task${hasOpenTask ? " is-working" : " is-completed"}`;
      chip.setAttribute("aria-expanded", "false");

      const title = doc.createElement("span");
      title.className = "calendar-complex-task-title";
      title.textContent = String(opts.tasksLabel || "Tasks");
      chip.appendChild(title);

      const indexes = doc.createElement("span");
      indexes.className = "calendar-task-indexes";
      summary.statuses.filter((status) => status.count > 0).forEach((status) => {
        const index = doc.createElement("span");
        index.className = `calendar-task-index status-${status.key}`;
        index.textContent = String(status.count);
        index.title = `${status.label}: ${status.count}`;
        indexes.appendChild(index);
      });
      chip.appendChild(indexes);

      const openDetailedTasks = () => {
        closeOpenTaskPopovers(doc);
        if (openWorkingTasksForDate) openWorkingTasksForDate(key);
      };

      const popover = doc.createElement("div");
      popover.className = "calendar-task-popover";
      popover.appendChild(buildTaskSummaryContent(doc, summary));
      popover.addEventListener("click", (event) => event.stopPropagation());

      const popoverActions = doc.createElement("div");
      popoverActions.className = "calendar-task-popover-actions";
      const detailsButton = doc.createElement("button");
      detailsButton.type = "button";
      detailsButton.className = "ghost-btn calendar-task-details-btn";
      detailsButton.textContent = String(opts.openTasksLabel || "Details");
      detailsButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDetailedTasks();
      });
      popoverActions.appendChild(detailsButton);
      popover.appendChild(popoverActions);

      const ariaText = summary.sections
        .filter((section) => section.rows.length > 0)
        .map((section) => `${section.title}: ${section.rows.map((row) => `${row.title}, ${row.statusLabel}`).join("; ")}`)
        .join(". ");
      chip.setAttribute("aria-label", ariaText);

      const openSummary = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const compactMode = root.matchMedia
          && root.matchMedia("(hover: none), (pointer: coarse), (max-width: 980px)").matches;
        if (compactMode) {
          openTaskSummaryModal(doc, summary, {
            title: String(opts.taskSummaryTitle || "Tasks for the day"),
            close: String(opts.closeLabel || "Close"),
            openTasks: String(opts.openTasksLabel || "Details")
          }, openDetailedTasks);
          return;
        }
        const willOpen = !widget.classList.contains("is-open");
        closeOpenTaskPopovers(doc, widget);
        widget.classList.toggle("is-open", willOpen);
        chip.setAttribute("aria-expanded", willOpen ? "true" : "false");
      };
      chip.addEventListener("click", openSummary);
      widget.append(chip, popover);
      day.appendChild(widget);
    }

    return day;
  }

  root.ProCalModules.calendarDayCell = {
    closeAllDayQuickAddMenus,
    toggleSideDayQuickAdd,
    createDetailedDayCell
  };
})(window);
