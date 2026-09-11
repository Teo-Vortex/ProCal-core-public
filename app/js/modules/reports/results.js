(function initReportsResults(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function normalizeIdentityTargets(value) {
    const isSetLike = value && typeof value.forEach === "function" && typeof value.has === "function";
    const source = isSetLike
      ? Array.from(value)
      : (Array.isArray(value) ? value : [value]);
    const seen = new Set();
    source.forEach((item) => {
      const id = String(item || "").trim();
      if (id) seen.add(id);
    });
    return seen;
  }

  function getReportPersonTargets(options, selectedPersonId) {
    const opts = options || {};
    const canReadAllReports = typeof opts.canReadAllReports === "function"
      ? opts.canReadAllReports
      : () => false;
    const getCurrentUserIdentityIds = typeof opts.getCurrentUserIdentityIds === "function"
      ? opts.getCurrentUserIdentityIds
      : null;
    const identityIds = getCurrentUserIdentityIds ? getCurrentUserIdentityIds() : [];
    const targets = normalizeIdentityTargets(identityIds);
    if (canReadAllReports()) {
      const selectedTargets = normalizeIdentityTargets(opts.reportPersonIdentityIds || selectedPersonId);
      return selectedTargets.size ? selectedTargets : normalizeIdentityTargets(selectedPersonId);
    }
    if (!targets.size) return normalizeIdentityTargets(opts.currentUserId || selectedPersonId);
    return targets;
  }

  function pickDisplayPersonId(targets, people, fallback) {
    const isSetLike = targets && typeof targets.forEach === "function" && typeof targets.has === "function";
    const ids = isSetLike ? targets : normalizeIdentityTargets(targets);
    const roster = Array.isArray(people) ? people : [];
    const match = roster.find((person) => {
      const id = String((person && person.id) || "");
      const userId = String((person && person.userId) || "");
      return (id && ids.has(id)) || (userId && ids.has(userId));
    });
    if (match && match.id) return String(match.id);
    return String(fallback || Array.from(ids)[0] || "");
  }

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
    const getTaskMemberState = typeof opts.getTaskMemberState === "function"
      ? opts.getTaskMemberState
      : ((task) => ({
        status: task && task.done ? "done" : (task && task.workStartedOn ? "in_progress" : "open"),
        startedOn: String((task && task.workStartedOn) || ""),
        completedOn: String((task && task.workCompletedOn) || "")
      }));
    const addDaysToKey = typeof opts.addDaysToKey === "function" ? opts.addDaysToKey : (dateKey) => dateKey;

    let personId = String((reportPerson && reportPerson.value) || "");
    const personTargets = getReportPersonTargets(opts, personId);
    if (!canReadAllReports()) personId = pickDisplayPersonId(personTargets, opts.people, opts.currentUserId || personId);
    const startDate = String((reportStart && reportStart.value) || "");
    const endDate = String((reportEnd && reportEnd.value) || "");
    if (!personId || !isDateKey(startDate) || !isDateKey(endDate) || startDate > endDate) return;

    const locale = String(opts.locale || "en");
    const documentRef = opts.documentRef || document;
    const reportState = opts.reportState && typeof opts.reportState === "object" ? opts.reportState : {};
    const absences = Array.isArray(reportState.absences)
      ? reportState.absences
      : (Array.isArray(opts.absences) ? opts.absences : []);
    const tasksByDate = reportState.tasks && typeof reportState.tasks === "object"
      ? reportState.tasks
      : (opts.tasksByDate || {});

    const formatReportDate = (dateKey) => {
      const dt = parseDateKey(dateKey);
      if (!dt) return dateKey;
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = String(dt.getFullYear());
      return `${dd}.${mm}.${yyyy}`;
    };

    const formatTaskWorkStatus = (task, memberState) => {
      const state = memberState || getTaskMemberState(task, personTargets);
      const startedOn = String((state && state.startedOn) || "");
      if (!isDateKey(startedOn)) return "";
      const completedOn = String((state && state.completedOn) || "");
      const startedLabel = `${t("taskWorkStartedOn")} ${formatReportDate(startedOn)}`;
      if (isDateKey(completedOn)) {
        return `${startedLabel}; ${t("taskWorkCompletedOn")} ${formatReportDate(completedOn)}`;
      }
      return `${startedLabel}; ${t("taskWorkStillActive")}`;
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
      .filter((absence) => personTargets.has(String((absence && absence.personId) || "")))
      .filter((absence) => rangesOverlap(startDate, endDate, absence.startDate, absence.endDate))
      .forEach((absence) => {
        const rowDate = absence.startDate < startDate ? startDate : absence.startDate;
        const note = absence.note ? ` - ${absence.note}` : "";
        ensureDateBucket(rowDate).absences.push(
          `${t("periodAbsent")} ${formatReportDate(absence.startDate)} ${t("to")} ${formatReportDate(absence.endDate)}${note}`
        );
      });

    getEventsInRange(startDate, endDate).forEach((evt) => {
      const assignedTasks = (evt.tasks || []).filter((task) => taskHasAssignee(task, personTargets));
      const markedOnEvent = Array.isArray(evt.peopleIds)
        ? evt.peopleIds.some((id) => personTargets.has(String(id)))
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
      assignedTasks.forEach((task) => {
        const memberState = getTaskMemberState(task, personTargets);
        eventEntry.tasks.push({
          title: task.title,
          done: memberState.status === "done",
          workStatus: formatTaskWorkStatus(task, memberState)
        });
      });
    });

    Object.entries(tasksByDate).forEach(([taskDateKey, taskList]) => {
      if (!Array.isArray(taskList)) return;
      taskList
        .filter((task) => taskHasAssignee(task, personTargets))
        .forEach((task) => {
          const memberState = getTaskMemberState(task, personTargets);
          const startedOn = String((memberState && memberState.startedOn) || "");
          const reportDate = isDateKey(startedOn) ? startedOn : taskDateKey;
          if (reportDate < startDate || reportDate > endDate) return;
          ensureDateBucket(reportDate).standaloneTasks.push({
            title: task.title,
            done: memberState.status === "done",
            workStatus: formatTaskWorkStatus(task, memberState)
          });
        });
    });

    const appendReportRow = (className, text, textClassName, strong) => {
      const row = documentRef.createElement("li");
      row.className = className;
      const main = documentRef.createElement("div");
      main.className = "event-main";
      const content = documentRef.createElement(strong ? "strong" : "span");
      content.className = textClassName;
      content.textContent = String(text || "");
      main.appendChild(content);
      row.appendChild(main);
      reportResults.appendChild(row);
      return row;
    };

    const appendTaskRow = (taskItem) => {
      const row = appendReportRow(
        `event-item report-row report-level-2${taskItem.done ? " report-done" : ""}`,
        `${taskItem.done ? "\u2713" : "\u2610"} ${String(taskItem.title || "")}`,
        "event-time report-text",
        false
      );
      if (!taskItem.workStatus) return;
      const text = row.querySelector(".report-text");
      if (!text) return;
      const workStatus = documentRef.createElement("small");
      workStatus.className = "report-task-work";
      workStatus.textContent = ` ${String(taskItem.workStatus)}`;
      text.appendChild(workStatus);
    };

    reportResults.replaceChildren();
    const summary = opts.periodSummary;
    if (summary && summary.from === startDate && summary.to === endDate) {
      const row = appendReportRow("event-item report-period-summary", `${t("reportsPeriodSummary")}: ${formatReportDate(startDate)} – ${formatReportDate(endDate)}`, "report-text", true);
      const details = documentRef.createElement("div");
      details.className = "report-summary-details";
      [
        `${t("reportsWorkingDays")}: ${summary.workingDays}`,
        `${t("reportsLeaveDays")}: ${summary.leaveDays} (${t("reportsPaidLeave")}: ${summary.leaveByType.paid}; ${t("reportsUnpaidLeave")}: ${summary.leaveByType.unpaid}; ${t("reportsStudyLeave")}: ${summary.leaveByType.study})`,
        `${t("reportsSickDays")}: ${summary.sickDays}`
      ].forEach((label) => {
        const item = documentRef.createElement("div");
        item.textContent = label;
        details.appendChild(item);
      });
      const basis = documentRef.createElement("small");
      basis.textContent = t("reportsWorkdaysBasis");
      details.appendChild(basis);
      row.appendChild(details);
    }
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
    if (!sortedDates.length) {
      const noRowsText = String(t("reportsNoRowsInRange") || "");
      const fallback = String(opts.locale || "").toLowerCase().startsWith("bg")
        ? "Няма записи в отчета за избрания период."
        : "No report rows in selected range.";
      const empty = documentRef.createElement("li");
      empty.className = "empty";
      empty.textContent = (noRowsText && noRowsText !== "reportsNoRowsInRange") ? noRowsText : fallback;
      reportResults.appendChild(empty);
      return;
    }

    sortedDates.forEach((dateKey) => {
      const bucket = dateMap.get(dateKey);

      appendReportRow("event-item report-day-item", dateKey, "", true);

      bucket.absences.forEach((absenceText) => {
        appendReportRow("event-item absence report-row report-level-1", absenceText, "event-time report-text", false);
      });

      const events = Array.from(bucket.events.values()).sort((a, b) => {
        if ((a.sortTime || "99:99") !== (b.sortTime || "99:99")) return (a.sortTime || "99:99").localeCompare(b.sortTime || "99:99");
        return a.label.localeCompare(b.label, locale, { sensitivity: "base" });
      });

      events.forEach((eventEntry) => {
        appendReportRow("event-item report-row report-level-1", eventEntry.label, "report-text", true);
        eventEntry.tasks.forEach(appendTaskRow);
      });

      if (bucket.standaloneTasks.length) {
        appendReportRow("event-item report-row report-level-1 report-group-row", t("tasksWithoutEvent"), "report-text", true);
        bucket.standaloneTasks.forEach(appendTaskRow);
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
    const personTargets = getReportPersonTargets(opts, personId);
    if (!canReadAllReports()) personId = pickDisplayPersonId(personTargets, people, opts.currentUserId || personId);
    const person = people.find((p) => {
      const id = String((p && p.id) || "");
      const userId = String((p && p.userId) || "");
      return id === personId || (id && personTargets.has(id)) || (userId && personTargets.has(userId));
    });
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
  li { border-bottom: 1px solid #ddd; padding: 8px 0; break-inside: avoid; page-break-inside: avoid; }
  .report-day-item { background: #f4f6f8; padding: 8px; margin-top: 8px; border-radius: 4px; }
  .report-period-summary { padding: 12px; border: 1px solid #bbb; margin-bottom: 12px; }
  .report-summary-details { margin-top: 8px; line-height: 1.6; }
  .report-summary-details small { display: block; color: #555; }
  .report-level-1 { padding-left: 10px; }
  .report-level-2 { padding-left: 24px; color: #333; }
  .report-done { color: #166534; background: #f0fdf4; border-left: 3px solid #22c55e; text-decoration: none; }
  .report-done .report-text { color: #166534; font-weight: 600; text-decoration: none; }
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
