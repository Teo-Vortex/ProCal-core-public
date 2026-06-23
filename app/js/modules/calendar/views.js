(function initCalendarViews(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderCalendar(options) {
    const o = options || {};
    if (!o.calendarGrid) return false;
    o.calendarGrid.innerHTML = "";
    if (o.weekdayRow) o.weekdayRow.innerHTML = "";
    if (typeof o.updateViewButtons === "function") o.updateViewButtons();
    if (o.currentView === "year") {
      if (typeof o.renderYearCalendar === "function") o.renderYearCalendar();
      return true;
    }
    if (typeof o.renderTwoMonthCalendar === "function") o.renderTwoMonthCalendar();
    return true;
  }

  function renderSelectedDayPanel(options) {
    const o = options || {};
    if (!o.selectedDateKey) {
      if (o.selectedDateTitle) o.selectedDateTitle.textContent = o.t("selectDay");
      if (o.eventList) o.eventList.innerHTML = `<li class="empty">${o.t("noDaySelected")}</li>`;
      if (typeof o.renderSideDayPanel === "function") o.renderSideDayPanel([], [], []);
      return true;
    }

    const date = o.parseDateKey(o.selectedDateKey);
    if (o.selectedDateTitle) {
      o.selectedDateTitle.textContent = date.toLocaleDateString(o.getLocale(), {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }

    const events = o.getEventsForDate(o.selectedDateKey).filter(o.matchesEventFilters).slice().sort(o.sortEvents);
    const dayAbsences = o.getAbsencesForDate(o.selectedDateKey).filter(o.matchesAbsenceFilters);
    const dayTasks = o.isTaskViewEnabled()
      ? o.getStandaloneTasksForDate(o.selectedDateKey)
        .filter((task) => !(typeof o.isLinkedStandaloneTask === "function" && o.isLinkedStandaloneTask(task)))
        .filter(o.matchesTaskFilters)
      : [];

    o.renderSideDayPanel(events, dayAbsences, dayTasks);

    if (!events.length && !dayAbsences.length && !dayTasks.length) {
      if (o.eventList) o.eventList.innerHTML = `<li class="empty">${o.t("noEvents")}</li>`;
      return true;
    }

    if (o.eventList) o.eventList.innerHTML = "";
    events.forEach((evt) => o.renderEventRow(evt));
    dayAbsences.forEach((absence) => o.renderAbsenceRow(absence));
    dayTasks.forEach((task) => o.renderStandaloneTaskRow(task, o.selectedDateKey));
    return true;
  }

  function renderUpcomingList(options) {
    const o = options || {};
    const { activeRows, doneTaskRows } = o.collectUpcomingRows(10);
    const visibleActiveRows = o.isTaskViewEnabled() ? activeRows : activeRows.filter((row) => row.type !== "task");
    const visibleDoneTaskRows = o.isTaskViewEnabled() ? doneTaskRows : [];

    if (!visibleActiveRows.length && !visibleDoneTaskRows.length) {
      o.upcomingList.innerHTML = `<li class="event-item empty-card"><div class="event-main"><strong class="empty-card-title">${o.t("noUpcoming")}</strong><span class="empty-card-hint">${o.t("noUpcomingHint")}</span></div></li>`;
      return true;
    }

    const peopleMap = o.buildPeopleMap();
    const findTaskByRow = (row) => (o.tasksByDate[row.dateKey] || []).find((task) => task.id === row.taskId) || null;
    const applyUpcomingVisualStyle = (li, row, task) => {
      li.style.background = "";
      li.style.borderColor = "";
      li.style.color = "";

      if (row.type === "event") {
        const cat = o.getCategoryById(row.categoryId);
        if (cat) {
          li.classList.add("upcoming-solid");
          li.style.background = o.getCategoryBgColor(cat.id);
          li.style.borderColor = cat.color;
        }
        return;
      }

      if (row.type === "absence") {
        const person = peopleMap.get(row.personId);
        li.classList.add("upcoming-outline");
        li.style.background = "transparent";
        li.style.borderColor = person ? person.color : "#64748b";
        li.style.color = person ? person.color : "#334155";
        return;
      }

      if (row.type === "task") {
        const taskCategoryId = String(row.categoryId || (task ? task.categoryId : ""));
        const cat = taskCategoryId ? o.categories.find((item) => item.id === taskCategoryId) : null;
        li.classList.add("upcoming-outline");
        li.style.background = "transparent";
        li.style.borderColor = cat ? cat.color : "#64748b";
        li.style.color = "#334155";
      }
    };

    const buildTaskItem = (row, checked) => {
      const li = document.createElement("li");
      li.className = `event-item upcoming-task-item${checked ? " task-done" : ""}`;
      const task = findTaskByRow(row);
      applyUpcomingVisualStyle(li, row, task);

      const names = task ? o.getTaskAssigneeNames(task) : [];
      const taskCategoryId = String(row.categoryId || (task ? task.categoryId : ""));
      const cat = taskCategoryId ? o.categories.find((item) => item.id === taskCategoryId) : null;
      const statusColor = checked ? "#22c55e" : (row.dateKey < o.todayKey ? "#ef4444" : "#f59e0b");

      const top = document.createElement("div");
      top.className = "upcoming-task-top";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = Boolean(checked);
      cb.addEventListener("change", () => {
        o.toggleStandaloneTaskDone(row.dateKey, row.taskId, cb.checked);
      });
      const title = document.createElement("strong");
      title.className = "upcoming-task-title";
      title.textContent = row.title;
      top.append(cb, title);

      const body = document.createElement("div");
      body.className = "upcoming-task-body";
      body.style.background = cat ? o.getCategoryBgColor(cat.id) : "rgba(148,163,184,0.16)";

      const metaLine = document.createElement("div");
      metaLine.className = "upcoming-task-meta-line";
      const dot = document.createElement("span");
      dot.className = "upcoming-task-status-dot";
      dot.style.background = statusColor;
      const date = document.createElement("span");
      date.className = "event-time upcoming-task-date";
      date.textContent = row.when;
      metaLine.append(dot, date);
      if (names.length) {
        const sep = document.createElement("span");
        sep.className = "event-time";
        sep.textContent = " | ";
        const meta = document.createElement("span");
        meta.className = "event-people";
        meta.textContent = names.join(", ");
        metaLine.append(sep, meta);
      }

      body.appendChild(metaLine);
      li.append(top, body);
      return li;
    };

    o.upcomingList.innerHTML = "";
    visibleActiveRows.forEach((row) => {
      if (row.type === "task" && row.taskId) {
        o.upcomingList.appendChild(buildTaskItem(row, false));
        return;
      }

      const li = document.createElement("li");
      li.className = "event-item";
      applyUpcomingVisualStyle(li, row, null);
      if (row.type === "event") {
        li.classList.add("editable-event");
        li.addEventListener("click", (event) => {
          if (event.target && event.target.closest("button, input, select, textarea, summary, details")) return;
          const rows = o.getEventsForDate(row.dateKey).filter(o.matchesEventFilters);
          let match = rows.find((evt) => String(evt.occurrenceId || evt.id) === String(row.key));
          if (!match && row.key) {
            match = rows.find((evt) => String(evt.seriesId || evt.id) === String(row.key));
          }
          if (!match && row.title) {
            match = rows.find((evt) => String(evt.title || "") === String(row.title || ""));
          }
          o.setSelectedDateKey(row.dateKey);
          o.renderCalendar();
          o.renderSelectedDayPanel();
          if (match) {
            o.openEventPreview(match, row.dateKey);
            return;
          }
          o.openDayMenu(row.dateKey);
        });
      }

      const main = document.createElement("div");
      main.className = "event-main";
      const title = document.createElement("strong");
      if (row.type === "absence" && row.personId) {
        const p = peopleMap.get(row.personId);
        title.textContent = `[${p ? p.name : o.t("person")}] ${o.t("absentVerb")}`;
      } else {
        title.textContent = row.title;
      }
      const when = document.createElement("span");
      when.className = "event-time";
      when.textContent = row.when;
      main.append(title, when);

      li.appendChild(main);
      o.upcomingList.appendChild(li);
    });

    if (visibleDoneTaskRows.length) {
      const completedLabel = o.t("completedTasks");
      const doneHeader = document.createElement("li");
      doneHeader.className = "event-item upcoming-done-header";
      doneHeader.innerHTML = `<div class="event-main"><strong class="report-text">${completedLabel}</strong></div>`;
      o.upcomingList.appendChild(doneHeader);

      visibleDoneTaskRows.forEach((row) => {
        o.upcomingList.appendChild(buildTaskItem(row, true));
      });
    }
    return true;
  }

  root.ProCalModules.calendarViews = {
    renderCalendar,
    renderSelectedDayPanel,
    renderUpcomingList
  };
})(window);
