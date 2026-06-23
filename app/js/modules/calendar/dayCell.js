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

    if (dailyTasks.length) {
      const dots = doc.createElement("div");
      dots.className = "task-dot-stack";
      dailyTasks.forEach((task) => {
        const dot = doc.createElement("span");
        const isOverdue = key < todayKey && !task.done;
        dot.className = `task-day-dot${task.done ? " task-done" : ""}${isOverdue ? " task-overdue" : ""}`;
        if (!task.done && !isOverdue) {
          dot.style.background = "#f59e0b";
        }
        dots.appendChild(dot);
      });
      day.appendChild(dots);
    }

    return day;
  }

  root.ProCalModules.calendarDayCell = {
    closeAllDayQuickAddMenus,
    toggleSideDayQuickAdd,
    createDetailedDayCell
  };
})(window);
