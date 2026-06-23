(function initCalendarWeekdays(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderWeekdays(options) {
    const opts = options || {};
    const container = opts.container;
    const locale = String(opts.locale || "en-US");
    if (!container) return;
    container.innerHTML = "";
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const mondayStart = new Date(Date.UTC(2024, 0, 8));
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(mondayStart);
      d.setUTCDate(mondayStart.getUTCDate() + i);
      const name = fmt.format(d);
      const cell = document.createElement("div");
      cell.textContent = name;
      if (i >= 5) cell.classList.add("weekend-head");
      container.appendChild(cell);
    }
  }

  root.ProCalModules.calendarWeekdays = { renderWeekdays };
})(window);
