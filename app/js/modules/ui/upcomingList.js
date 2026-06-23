(function initUpcomingListUi(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderList(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const upcomingList = opts.upcomingList;
    if (!doc || !upcomingList) return false;

    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const collectUpcomingRows = typeof opts.collectUpcomingRows === "function" ? opts.collectUpcomingRows : null;
    const isTaskViewEnabled = typeof opts.isTaskViewEnabled === "function" ? opts.isTaskViewEnabled : (() => false);
    if (!collectUpcomingRows) return false;

    const { activeRows, doneTaskRows } = collectUpcomingRows(10);
    const visibleActiveRows = isTaskViewEnabled() ? activeRows : activeRows.filter((row) => row.type !== "task");
    const visibleDoneTaskRows = isTaskViewEnabled() ? doneTaskRows : [];

    if (!visibleActiveRows.length && !visibleDoneTaskRows.length) {
      upcomingList.innerHTML = `<li class="event-item empty-card"><div class="event-main"><strong class="empty-card-title">${t("noUpcoming")}</strong><span class="empty-card-hint">${t("noUpcomingHint")}</span></div></li>`;
      return true;
    }

    const buildPeopleMap = typeof opts.buildPeopleMap === "function" ? opts.buildPeopleMap : (() => new Map());
    const peopleMap = buildPeopleMap();
    const tasksByDate = opts.tasksByDate && typeof opts.tasksByDate === "object" ? opts.tasksByDate : {};
    const getTaskAssigneeNames = typeof opts.getTaskAssigneeNames === "function" ? opts.getTaskAssigneeNames : (() => []);
    const categories = Array.isArray(opts.categories) ? opts.categories : [];
    const getCategoryById = typeof opts.getCategoryById === "function" ? opts.getCategoryById : (() => null);
    const getCategoryBgColor = typeof opts.getCategoryBgColor === "function" ? opts.getCategoryBgColor : (() => "");
    const todayKey = String(opts.todayKey || "");
    const toggleStandaloneTaskDone = typeof opts.toggleStandaloneTaskDone === "function" ? opts.toggleStandaloneTaskDone : null;
    const getEventsForDate = typeof opts.getEventsForDate === "function" ? opts.getEventsForDate : (() => []);
    const matchesEventFilters = typeof opts.matchesEventFilters === "function" ? opts.matchesEventFilters : (() => true);
    const setSelectedDateKey = typeof opts.setSelectedDateKey === "function" ? opts.setSelectedDateKey : (() => {});
    const renderCalendar = typeof opts.renderCalendar === "function" ? opts.renderCalendar : (() => {});
    const renderSelectedDayPanel = typeof opts.renderSelectedDayPanel === "function" ? opts.renderSelectedDayPanel : (() => {});
    const openEventPreview = typeof opts.openEventPreview === "function" ? opts.openEventPreview : null;
    const openDayMenu = typeof opts.openDayMenu === "function" ? opts.openDayMenu : null;
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || ""));
    const getOperationalPeople = typeof opts.getOperationalPeople === "function" ? opts.getOperationalPeople : (() => []);

    const findTaskByRow = (row) => (tasksByDate[row.dateKey] || []).find((task) => task.id === row.taskId) || null;

    const applyUpcomingVisualStyle = (li, row, task) => {
      li.style.background = "";
      li.style.borderColor = "";
      li.style.color = "";

      if (row.type === "event") {
        const cat = getCategoryById(row.categoryId);
        if (cat) {
          li.classList.add("upcoming-solid");
          li.style.background = getCategoryBgColor(cat.id);
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
        const cat = taskCategoryId ? categories.find((item) => item.id === taskCategoryId) : null;
        li.classList.add("upcoming-outline");
        li.style.background = "transparent";
        li.style.borderColor = cat ? cat.color : "#64748b";
        li.style.color = "#334155";
      }
    };

    const buildTaskItem = (row, checked) => {
      const li = doc.createElement("li");
      li.className = `event-item upcoming-task-item${checked ? " task-done" : ""}`;
      const task = findTaskByRow(row);
      applyUpcomingVisualStyle(li, row, task);

      const names = task ? getTaskAssigneeNames(task) : [];
      const taskCategoryId = String(row.categoryId || (task ? task.categoryId : ""));
      const cat = taskCategoryId ? categories.find((item) => item.id === taskCategoryId) : null;
      const statusColor = checked ? "#22c55e" : (row.dateKey < todayKey ? "#ef4444" : "#f59e0b");

      const top = doc.createElement("div");
      top.className = "upcoming-task-top";
      const cb = doc.createElement("input");
      cb.type = "checkbox";
      cb.checked = Boolean(checked);
      cb.addEventListener("change", () => {
        if (toggleStandaloneTaskDone) toggleStandaloneTaskDone(row.dateKey, row.taskId, cb.checked);
      });
      const title = doc.createElement("strong");
      title.className = "upcoming-task-title";
      title.textContent = row.title;
      title.title = row.title;
      top.append(cb, title);

      const body = doc.createElement("div");
      body.className = "upcoming-task-body";
      body.style.background = cat ? getCategoryBgColor(cat.id) : "rgba(148,163,184,0.16)";

      const metaLine = doc.createElement("div");
      metaLine.className = "upcoming-task-meta-line";
      const dot = doc.createElement("span");
      dot.className = "upcoming-task-status-dot";
      dot.style.background = statusColor;
      const date = doc.createElement("span");
      date.className = "event-time upcoming-task-date";
      date.textContent = row.when;
      metaLine.append(dot, date);
      if (names.length) {
        const sep = doc.createElement("span");
        sep.className = "event-time";
        sep.textContent = " | ";
        const meta = doc.createElement("span");
        meta.className = "event-people";
        meta.textContent = names.join(", ");
        meta.title = names.join(", ");
        metaLine.append(sep, meta);
      }

      body.appendChild(metaLine);
      li.append(top, body);
      return li;
    };

    upcomingList.innerHTML = "";
    visibleActiveRows.forEach((row) => {
      if (row.type === "task" && row.taskId) {
        upcomingList.appendChild(buildTaskItem(row, false));
        return;
      }

      const li = doc.createElement("li");
      li.className = "event-item";
      applyUpcomingVisualStyle(li, row, null);
      if (row.type === "event") {
        li.classList.add("editable-event");
        li.addEventListener("click", (event) => {
          if (event.target && event.target.closest("button, input, select, textarea, summary, details")) return;
          const match = getEventsForDate(row.dateKey)
            .filter(matchesEventFilters)
            .find((evt) => String(evt.occurrenceId || evt.id) === String(row.key));
          setSelectedDateKey(row.dateKey);
          renderCalendar();
          renderSelectedDayPanel();
          if (match) {
            if (openEventPreview) openEventPreview(match, row.dateKey);
            return;
          }
          if (openDayMenu) openDayMenu(row.dateKey);
        });
      }

      const main = doc.createElement("div");
      main.className = "event-main";
      const title = doc.createElement("strong");
      if (row.type === "absence" && row.personId) {
        const p = peopleMap.get(row.personId);
        const personLabel = p ? getPersonDisplayName(p, getOperationalPeople()) : t("person");
        title.textContent = `[${personLabel}] ${t("absentVerb")}`;
      } else {
        title.textContent = row.title;
      }
      const when = doc.createElement("span");
      when.className = "event-time";
      when.textContent = row.when;
      main.append(title, when);
      li.appendChild(main);
      upcomingList.appendChild(li);
    });

    if (visibleDoneTaskRows.length) {
      const completedLabel = t("completedTasks");
      const doneHeader = doc.createElement("li");
      doneHeader.className = "event-item upcoming-done-header";
      doneHeader.innerHTML = `<div class="event-main"><strong class="report-text">${completedLabel}</strong></div>`;
      upcomingList.appendChild(doneHeader);

      visibleDoneTaskRows.forEach((row) => {
        upcomingList.appendChild(buildTaskItem(row, true));
      });
    }

    return true;
  }

  root.ProCalModules.upcomingListUi = {
    renderList
  };
})(window);
