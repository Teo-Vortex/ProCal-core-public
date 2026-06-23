(function initCalendarAggregationModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function sortEvents(a, b, options) {
    const o = options || {};
    const getLocale = typeof o.getLocale === "function" ? o.getLocale : (() => "en-US");
    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    const ta = timeMeta && typeof timeMeta.resolveEventTimeMeta === "function"
      ? timeMeta.resolveEventTimeMeta(a)
      : { isAllDay: !String((a && a.time) || "").trim(), startMinutes: 24 * 60, endMinutes: 24 * 60 };
    const tb = timeMeta && typeof timeMeta.resolveEventTimeMeta === "function"
      ? timeMeta.resolveEventTimeMeta(b)
      : { isAllDay: !String((b && b.time) || "").trim(), startMinutes: 24 * 60, endMinutes: 24 * 60 };
    if (ta.isAllDay !== tb.isAllDay) return ta.isAllDay ? -1 : 1;
    if (ta.startMinutes !== tb.startMinutes) return ta.startMinutes - tb.startMinutes;
    if (ta.endMinutes !== tb.endMinutes) return ta.endMinutes - tb.endMinutes;
    return String((a && a.title) || "").localeCompare(String((b && b.title) || ""), getLocale(), { sensitivity: "base" });
  }

  function findBaseEventById(seriesId, options) {
    const o = options || {};
    const eventsByDate = o.eventsByDate || {};
    const key = String(seriesId || "");
    for (const list of Object.values(eventsByDate)) {
      if (!Array.isArray(list)) continue;
      const found = list.find((evt) => String((evt && evt.id) || "") === key);
      if (found) return found;
    }
    return null;
  }

  function deleteEventById(seriesId, options) {
    const o = options || {};
    const eventsByDate = o.eventsByDate || {};
    const key = String(seriesId || "");
    Object.keys(eventsByDate).forEach((dateKey) => {
      eventsByDate[dateKey] = (eventsByDate[dateKey] || []).filter((evt) => String((evt && evt.id) || "") !== key);
      if (!eventsByDate[dateKey].length) delete eventsByDate[dateKey];
    });
  }

  function getAbsencesForDate(dateKey, options) {
    const o = options || {};
    const absences = Array.isArray(o.absences) ? o.absences : [];
    const isDateInRange = typeof o.isDateInRange === "function" ? o.isDateInRange : () => false;
    return absences.filter((absence) => isDateInRange(dateKey, absence.startDate, absence.endDate));
  }

  function buildPeopleMap(options) {
    const o = options || {};
    const getOperationalPeople = typeof o.getOperationalPeople === "function" ? o.getOperationalPeople : () => [];
    return new Map(getOperationalPeople().map((p) => [p.id, p]));
  }

  function describeEventPeople(evt, options) {
    const o = options || {};
    const getOperationalPeople = typeof o.getOperationalPeople === "function" ? o.getOperationalPeople : () => [];
    const getPersonDisplayName = typeof o.getPersonDisplayName === "function" ? o.getPersonDisplayName : ((p) => String((p && p.name) || ""));
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    const roster = getOperationalPeople();
    const names = ((evt && evt.peopleIds) || [])
      .map((id) => roster.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => getPersonDisplayName(p, roster));
    const absentNames = ((evt && evt.absentIds) || [])
      .map((id) => roster.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => getPersonDisplayName(p, roster));

    const parts = [];
    if (names.length) parts.push(`${t("peoplePrefix")}: ${names.join(", ")}`);
    if (absentNames.length) parts.push(`${t("absentPrefix")}: ${absentNames.join(", ")}`);
    return parts.join(" | ");
  }

  function buildEventLaneMap(rangeStart, rangeEnd, options) {
    const o = options || {};
    const getEventsInRange = typeof o.getEventsInRange === "function" ? o.getEventsInRange : () => [];
    const sortEventsFn = typeof o.sortEvents === "function" ? o.sortEvents : ((a, b) => sortEvents(a, b, o));
    const map = new Map();
    const events = getEventsInRange(rangeStart, rangeEnd).slice().sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return sortEventsFn(a, b);
    });

    const laneEnds = [];
    events.forEach((evt) => {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] >= evt.startDate) lane += 1;
      laneEnds[lane] = evt.endDate;
      const key = evt.occurrenceId || evt.id;
      map.set(key, lane);
      map.set(evt.id, lane);
    });
    return map;
  }

  function collectUpcomingRows(limit, options) {
    const o = options || {};
    const rows = [];
    const doneTaskRows = [];
    const addDaysToKey = typeof o.addDaysToKey === "function" ? o.addDaysToKey : ((v) => String(v || ""));
    const todayKey = String(o.todayKey || "");
    const end = addDaysToKey(todayKey, 365);
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    const getLocale = typeof o.getLocale === "function" ? o.getLocale : (() => "en-US");
    const getEventsInRange = typeof o.getEventsInRange === "function" ? o.getEventsInRange : () => [];
    const matchesEventFilters = typeof o.matchesEventFilters === "function" ? o.matchesEventFilters : () => true;
    const matchesAbsenceFilters = typeof o.matchesAbsenceFilters === "function" ? o.matchesAbsenceFilters : () => true;
    const matchesTaskFilters = typeof o.matchesTaskFilters === "function" ? o.matchesTaskFilters : () => true;
    const absences = Array.isArray(o.absences) ? o.absences : [];
    const tasksByDate = o.tasksByDate || {};
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
    const isLinkedStandaloneTask = typeof o.isLinkedStandaloneTask === "function" ? o.isLinkedStandaloneTask : () => false;
    const getTaskAssigneeIds = typeof o.getTaskAssigneeIds === "function" ? o.getTaskAssigneeIds : (() => []);

    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    getEventsInRange(todayKey, end).filter(matchesEventFilters).forEach((evt) => {
      const meta = timeMeta && typeof timeMeta.resolveEventTimeMeta === "function"
        ? timeMeta.resolveEventTimeMeta(evt)
        : { startMinutes: 24 * 60 };
      const when = timeMeta && typeof timeMeta.getEventTimeRangeLabel === "function"
        ? timeMeta.getEventTimeRangeLabel(evt, { t })
        : (evt.startDate === evt.endDate
          ? (evt.time ? `${evt.startDate} ${evt.time}` : evt.startDate)
          : `${evt.startDate} ${t("to")} ${evt.endDate}`);
      rows.push({
        type: "event",
        key: evt.occurrenceId || evt.id,
        dateKey: evt.startDate,
        categoryId: evt.categoryId,
        title: evt.title,
        when,
        time: meta.isAllDay ? "00:00" : String(meta.startTime || evt.time || "99:99")
      });
    });

    absences.filter((a) => a.endDate >= todayKey).filter(matchesAbsenceFilters).forEach((absence) => {
      rows.push({
        type: "absence",
        key: absence.id,
        dateKey: absence.startDate,
        personId: absence.personId,
        title: t("openAbsence"),
        when: `${absence.startDate} ${t("to")} ${absence.endDate}`,
        time: "00:00"
      });
    });

    Object.entries(tasksByDate).forEach(([dateKey, tasks]) => {
      if (!isDateKey(dateKey) || dateKey < todayKey) return;
      (tasks || []).filter((task) => !isLinkedStandaloneTask(task)).filter(matchesTaskFilters).forEach((task) => {
        const row = {
          type: "task",
          key: `${dateKey}_${task.id}`,
          taskId: task.id,
          dateKey,
          categoryId: task.categoryId || "",
          peopleIds: getTaskAssigneeIds(task),
          title: task.title,
          when: dateKey,
          time: "99:99"
        };
        if (task.done) doneTaskRows.push(row);
        else rows.push(row);
      });
    });

    rows.sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
      if (a.time !== b.time) return a.time.localeCompare(b.time);
      return String(a.title || "").localeCompare(String(b.title || ""), getLocale(), { sensitivity: "base" });
    });

    doneTaskRows.sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
      return String(a.title || "").localeCompare(String(b.title || ""), getLocale(), { sensitivity: "base" });
    });

    return { activeRows: rows.slice(0, limit), doneTaskRows };
  }

  root.ProCalModules.calendarAggregation = {
    sortEvents,
    findBaseEventById,
    deleteEventById,
    getAbsencesForDate,
    buildPeopleMap,
    describeEventPeople,
    buildEventLaneMap,
    collectUpcomingRows
  };
})(window);
