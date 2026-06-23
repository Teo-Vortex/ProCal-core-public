(function initEventQuery(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getEventsInRange(startDate, endDate, options) {
    const opts = options || {};
    const eventsByDate = opts.eventsByDate || {};
    const expandEventOccurrences = typeof opts.expandEventOccurrences === "function"
      ? opts.expandEventOccurrences
      : (() => []);
    const result = [];
    Object.values(eventsByDate).forEach((events) => {
      if (!Array.isArray(events)) return;
      events.forEach((evt) => {
        if (!evt || typeof evt !== "object") return;
        result.push(...expandEventOccurrences(evt, startDate, endDate));
      });
    });
    return result;
  }

  function getEventsForDate(dateKey, options) {
    return getEventsInRange(dateKey, dateKey, options);
  }

  root.ProCalModules.eventQuery = {
    getEventsForDate,
    getEventsInRange
  };
})(window);
