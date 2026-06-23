(function initCalendarOccurrencesModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function expandEventOccurrences(base, rangeStart, rangeEnd, options) {
    const o = options || {};
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
    const parseDateKey = typeof o.parseDateKey === "function" ? o.parseDateKey : ((v) => new Date(v));
    const sanitizeRecurrence = typeof o.sanitizeRecurrence === "function" ? o.sanitizeRecurrence : (() => null);
    const addDaysToKey = typeof o.addDaysToKey === "function" ? o.addDaysToKey : ((v) => String(v || ""));
    const rangesOverlap = typeof o.rangesOverlap === "function" ? o.rangesOverlap : () => false;
    const toDateKey = typeof o.toDateKey === "function" ? o.toDateKey : ((d) => String(d || ""));

    if (!base || typeof base !== "object") return [];
    const start = String(base.startDate || "");
    const end = String(base.endDate || "");
    if (!isDateKey(start) || !isDateKey(end) || start > end) return [];

    const durationDays = Math.max(0, Math.floor((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86400000));
    const recurrence = sanitizeRecurrence(base.recurrence, start);

    const makeOccurrence = (occStart, index) => {
      const occEnd = addDaysToKey(occStart, durationDays);
      if (!rangesOverlap(rangeStart, rangeEnd, occStart, occEnd)) return null;
      return {
        ...base,
        seriesId: base.id,
        occurrenceId: `${base.id}#${index}@${occStart}`,
        startDate: occStart,
        endDate: occEnd
      };
    };

    if (!recurrence) {
      const single = makeOccurrence(start, 0);
      return single ? [single] : [];
    }

    const out = [];
    const startDate = parseDateKey(start);
    const maxIterations = 5000;
    let i = 0;
    while (i < maxIterations) {
      const occDate = new Date(startDate);
      if (recurrence.freq === "daily") occDate.setDate(startDate.getDate() + i);
      if (recurrence.freq === "weekly") occDate.setDate(startDate.getDate() + i * 7);
      if (recurrence.freq === "monthly") occDate.setMonth(startDate.getMonth() + i);
      if (recurrence.freq === "yearly") occDate.setFullYear(startDate.getFullYear() + i);

      const occStart = toDateKey(occDate);
      if (recurrence.endMode === "count" && i >= (recurrence.count || 0)) break;
      if (recurrence.endMode === "until" && recurrence.untilDate && occStart > recurrence.untilDate) break;
      if (occStart > rangeEnd && recurrence.endMode === "forever") {
        if (i > 0) break;
      }

      const occ = makeOccurrence(occStart, i);
      if (occ) out.push(occ);

      if (recurrence.endMode === "forever" && occStart > rangeEnd) break;
      i += 1;
    }
    return out;
  }

  root.ProCalModules.calendarOccurrences = {
    expandEventOccurrences
  };
})(window);

