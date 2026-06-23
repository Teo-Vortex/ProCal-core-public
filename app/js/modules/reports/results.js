(function initReportsResults(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderResults(options) {
    const opts = options || {};
    const reportPerson = opts.reportPerson;
    const reportStart = opts.reportStart;
    const reportEnd = opts.reportEnd;
    const reportResults = opts.reportResults;
    if (!reportPerson || !reportStart || !reportEnd || !reportResults) return;

    const canReadAllReports = typeof opts.canReadAllReports === "function"
      ? opts.canReadAllReports
      : () => false;
    const isDateKey = typeof opts.isDateKey === "function" ? opts.isDateKey : () => false;
    const parseDateKey = typeof opts.parseDateKey === "function" ? opts.parseDateKey : () => null;
    const rangesOverlap = typeof opts.rangesOverlap === "function" ? opts.rangesOverlap : () => false;
    const t = typeof opts.t === "function" ? opts.t : (key) => String(key || "");
    const getEventsInRange = typeof opts.getEventsInRange === "function" ? opts.getEventsInRange : () => [];
    const taskHasAssignee = typeof opts.taskHasAssignee === "function" ? opts.taskHasAssignee : () => false;
    const addDaysToKey = typeof opts.addDaysToKey === "function" ? opts.addDaysToKey : (dateKey) => dateKey;

    let personId = String((reportPerson && reportPerson.value) || "");
    if (!canReadAllReports()) personId = String(opts.currentUserId || personId);
    const startDate = String((reportStart && reportStart.value) || "");
    const endDate = String((reportEnd && reportEnd.value) || "");
    if (!personId || !isDateKey(startDate) || !isDateKey(endDate) || startDate > endDate) return;

    const locale = String(opts.locale || "en");
    const documentRef = opts.documentRef || document;
    const absences = Array.isArray(opts.absences) ? opts.absences : [];
    const tasksByDate = opts.tasksByDate || {};

    const formatReportDate = (dateKey) => {
      const dt = parseDateKey(dateKey);
      if (!dt) return dateKey;
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = String(dt.getFullYear());
      return `${dd}.${mm}.${yyyy}`;
    };

    const dateMap = new Map();
    const ensureDateBucket = (dateKey) => {
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          absences: [],
          events: new Map(),
          standaloneTasks: []
        });
      }
      return dateMap.get(dateKey);
    };

    absences
      .filter((absence) => absence.personId === personId)
      .filter((absence) => rangesOverlap(startDate, endDate, absence.startDate, absence.endDate))
      .forEach((absence) => {
        const rowDate = absence.startDate < startDate ? startDate : absence.startDate;
        const note = absence.note ? ` - ${absence.note}` : "";
        ensureDateBucket(rowDate).absences.push(
          `${t("periodAbsent")} ${formatReportDate(absence.startDate)} ${t("to")} ${formatReportDate(absence.endDate)}${note}`
        );
      });

    getEventsInRange(startDate, endDate).forEach((evt) => {
      const assignedTasks = (evt.tasks || []).filter((task) => taskHasAssignee(task, personId));
      const markedOnEvent = Array.isArray(evt.peopleIds)
        ? evt.peopleIds.some((id) => String(id) === personId)
        : false;
      if (!markedOnEvent && !assignedTasks.length) return;

      const bucket = ensureDateBucket(evt.startDate);
      const eventKey = evt.occurrenceId || `${evt.seriesId || evt.id}@${evt.startDate}_${evt.endDate}_${evt.time || ""}_${evt.title}`;
      const eventLabel = evt.startDate !== evt.endDate
        ? `${evt.title} (${formatReportDate(evt.startDate)} ${t("to")} ${formatReportDate(evt.endDate)})`
        : (evt.time ? `${evt.time} - ${evt.title}` : evt.title);

      if (!bucket.events.has(eventKey)) {
        bucket.events.set(eventKey, {
          label: eventLabel,
          sortTime: evt.time || "99:99",
          tasks: []
        });
      }

      const eventEntry = bucket.events.get(eventKey);
      assignedTasks.forEach((task) => eventEntry.tasks.push({ title: task.title, done: Boolean(task.done) }));
    });

    for (let d = startDate; d <= endDate; d = addDaysToKey(d, 1)) {
      const ownTasks = (tasksByDate[d] || [])
        .filter((task) => taskHasAssignee(task, personId))
        .map((task) => ({ title: task.title, done: Boolean(task.done) }));
      if (ownTasks.length) {
        const bucket = ensureDateBucket(d);
        bucket.standaloneTasks.push(...ownTasks);
      }
    }

    reportResults.innerHTML = "";
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
    if (!sortedDates.length) {
      const noRowsText = String(t("reportsNoRowsInRange") || "");
      const fallback = String(opts.locale || "").toLowerCase().startsWith("bg")
        ? "Няма записи в отчета за избрания период."
        : "No report rows in selected range.";
      reportResults.innerHTML = `<li class="empty">${(noRowsText && noRowsText !== "reportsNoRowsInRange") ? noRowsText : fallback}</li>`;
      return;
    }

    sortedDates.forEach((dateKey) => {
      const bucket = dateMap.get(dateKey);

      const dayLi = documentRef.createElement("li");
      dayLi.className = "event-item report-day-item";
      dayLi.innerHTML = `<div class="event-main"><strong>${dateKey}</strong></div>`;
      reportResults.appendChild(dayLi);

      bucket.absences.forEach((absenceText) => {
        const li = documentRef.createElement("li");
        li.className = "event-item absence report-row report-level-1";
        li.innerHTML = `<div class="event-main"><span class="event-time report-text">${absenceText}</span></div>`;
        reportResults.appendChild(li);
      });

      const events = Array.from(bucket.events.values()).sort((a, b) => {
        if ((a.sortTime || "99:99") !== (b.sortTime || "99:99")) return (a.sortTime || "99:99").localeCompare(b.sortTime || "99:99");
        return a.label.localeCompare(b.label, locale, { sensitivity: "base" });
      });

      events.forEach((eventEntry) => {
        const liEvent = documentRef.createElement("li");
        liEvent.className = "event-item report-row report-level-1";
        liEvent.innerHTML = `<div class="event-main"><strong class="report-text">${eventEntry.label}</strong></div>`;
        reportResults.appendChild(liEvent);

        eventEntry.tasks.forEach((taskItem) => {
          const liTask = documentRef.createElement("li");
          liTask.className = `event-item report-row report-level-2${taskItem.done ? " report-done" : ""}`;
          const marker = taskItem.done ? "[x] " : "[ ] ";
          liTask.innerHTML = `<div class="event-main"><span class="event-time report-text">${marker}${taskItem.title}</span></div>`;
          reportResults.appendChild(liTask);
        });
      });

      if (bucket.standaloneTasks.length) {
        const liStandalone = documentRef.createElement("li");
        liStandalone.className = "event-item report-row report-level-1 report-group-row";
        liStandalone.innerHTML = `<div class="event-main"><strong class="report-text">${t("tasksWithoutEvent")}</strong></div>`;
        reportResults.appendChild(liStandalone);

        bucket.standaloneTasks.forEach((taskItem) => {
          const liTask = documentRef.createElement("li");
          liTask.className = `event-item report-row report-level-2${taskItem.done ? " report-done" : ""}`;
          const marker = taskItem.done ? "[x] " : "[ ] ";
          liTask.innerHTML = `<div class="event-main"><span class="event-time report-text">${marker}${taskItem.title}</span></div>`;
          reportResults.appendChild(liTask);
        });
      }
    });
  }

  function saveAsPdf(options) {
    const opts = options || {};
    const reportResults = opts.reportResults;
    if (!reportResults) return;

    const renderReportResults = typeof opts.renderReportResults === "function" ? opts.renderReportResults : null;
    const hasRows = reportResults.querySelector("li");
    if (!hasRows && renderReportResults) {
      renderReportResults();
    }

    const t = typeof opts.t === "function" ? opts.t : (key) => String(key || "");
    const escapeHtml = typeof opts.escapeHtml === "function"
      ? opts.escapeHtml
      : (value) => String(value || "");
    const canReadAllReports = typeof opts.canReadAllReports === "function"
      ? opts.canReadAllReports
      : () => false;

    const reportPerson = opts.reportPerson;
    const reportStart = opts.reportStart;
    const reportEnd = opts.reportEnd;
    const people = Array.isArray(opts.people) ? opts.people : [];

    let personId = String((reportPerson && reportPerson.value) || "");
    if (!canReadAllReports()) personId = String(opts.currentUserId || personId);
    const person = people.find((p) => p.id === personId);
    const personName = person ? person.name : "-";
    const startDate = String((reportStart && reportStart.value) || "-");
    const endDate = String((reportEnd && reportEnd.value) || "-");

    const title = `${t("reports")} - ${personName}`;
    const htmlRows = reportResults ? reportResults.innerHTML : "";

    const windowRef = opts.windowRef || window;
    const popup = windowRef.open("", "_blank", "width=1024,height=768");
    if (!popup) return;

    popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  .meta { margin: 0 0 16px; color: #333; font-size: 13px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { border-bottom: 1px solid #ddd; padding: 8px 0; }
  .report-day-item { background: #f4f6f8; padding: 8px; margin-top: 8px; border-radius: 4px; }
  .report-level-1 { padding-left: 10px; }
  .report-level-2 { padding-left: 24px; color: #333; }
  .report-done { color: #666; text-decoration: line-through; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>${escapeHtml(t("reports"))}</h1>
  <p class="meta">${escapeHtml(t("person"))}: ${escapeHtml(personName)} | ${escapeHtml(t("from"))}: ${escapeHtml(startDate)} | ${escapeHtml(t("toLabel"))}: ${escapeHtml(endDate)}</p>
  <ul>${htmlRows}</ul>
</body>
</html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  root.ProCalModules.reportsResults = { renderResults, saveAsPdf };
})(window);
