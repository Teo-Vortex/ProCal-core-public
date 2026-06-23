(function initCalendarYearGrid(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderYearCalendar(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const calendarGrid = opts.calendarGrid;
    const monthLabel = opts.monthLabel;
    const currentMonth = opts.currentMonth instanceof Date ? opts.currentMonth : null;
    if (!doc || !calendarGrid || !monthLabel || !currentMonth) return false;

    const getLocale = typeof opts.getLocale === "function" ? opts.getLocale : (() => "en");
    const toDateKey = typeof opts.toDateKey === "function" ? opts.toDateKey : (() => "");
    const getHolidayNamesForDate = typeof opts.getHolidayNamesForDate === "function" ? opts.getHolidayNamesForDate : (() => []);
    const isDayOffHoliday = typeof opts.isDayOffHoliday === "function" ? opts.isDayOffHoliday : (() => false);
    const getEventsForDate = typeof opts.getEventsForDate === "function" ? opts.getEventsForDate : (() => []);
    const matchesEventFilters = typeof opts.matchesEventFilters === "function" ? opts.matchesEventFilters : (() => true);
    const getCategoryById = typeof opts.getCategoryById === "function" ? opts.getCategoryById : (() => null);
    const hexToAlpha = typeof opts.hexToAlpha === "function" ? opts.hexToAlpha : (() => "");
    const todayKey = String(opts.todayKey || "");
    const setCurrentView = typeof opts.setCurrentView === "function" ? opts.setCurrentView : (() => {});
    const setCurrentMonth = typeof opts.setCurrentMonth === "function" ? opts.setCurrentMonth : (() => {});
    const setSelectedDateKey = typeof opts.setSelectedDateKey === "function" ? opts.setSelectedDateKey : (() => {});
    const renderCalendar = typeof opts.renderCalendar === "function" ? opts.renderCalendar : (() => {});
    const renderSelectedDayPanel = typeof opts.renderSelectedDayPanel === "function" ? opts.renderSelectedDayPanel : (() => {});

    calendarGrid.className = "calendar-grid year-grid";
    monthLabel.textContent = String(currentMonth.getFullYear());

    const year = currentMonth.getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const block = doc.createElement("section");
      block.className = "year-month-block";

      const title = doc.createElement("button");
      title.type = "button";
      title.className = "year-month-title ghost-btn";
      title.textContent = new Date(year, month, 1).toLocaleDateString(getLocale(), { month: "long" });
      title.addEventListener("click", () => {
        setCurrentView("month");
        setCurrentMonth(new Date(year, month, 1));
        renderCalendar();
      });
      block.appendChild(title);

      const weekdays = doc.createElement("div");
      weekdays.className = "year-weekdays";
      const mondayStart = new Date(Date.UTC(2024, 0, 8));
      const fmt = new Intl.DateTimeFormat(getLocale(), { weekday: "narrow" });
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(mondayStart);
        d.setUTCDate(mondayStart.getUTCDate() + i);
        const cell = doc.createElement("div");
        cell.textContent = fmt.format(d);
        weekdays.appendChild(cell);
      }
      block.appendChild(weekdays);

      const grid = doc.createElement("div");
      grid.className = "year-month-grid";

      const first = new Date(year, month, 1);
      const offset = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < offset; i += 1) {
        const empty = doc.createElement("div");
        empty.className = "year-day muted";
        grid.appendChild(empty);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const key = toDateKey(date);
        const holidayNames = getHolidayNamesForDate(key);
        const isDayOff = isDayOffHoliday(key);
        const events = getEventsForDate(key).filter(matchesEventFilters);

        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "year-day";
        if (date.getDay() === 0 || date.getDay() === 6 || isDayOff) btn.classList.add("weekend");
        if (holidayNames.length) btn.title = holidayNames.join(", ");
        if (key === todayKey) btn.classList.add("today");
        if (events.length === 1) {
          btn.classList.add("has-event");
          const cat = getCategoryById(events[0].categoryId);
          if (cat) btn.style.background = hexToAlpha(cat.color, 0.26);
        } else if (events.length > 1) {
          btn.classList.add("has-multi-event");
        }

        btn.textContent = String(day);
        btn.addEventListener("click", () => {
          setCurrentView("month");
          setCurrentMonth(new Date(year, month, 1));
          setSelectedDateKey(key);
          renderCalendar();
          renderSelectedDayPanel();
        });
        grid.appendChild(btn);
      }

      block.appendChild(grid);
      calendarGrid.appendChild(block);
    }

    return true;
  }

  root.ProCalModules.calendarYearGrid = {
    renderYearCalendar
  };
})(window);
