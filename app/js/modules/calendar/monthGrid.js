(function initCalendarMonthGrid(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function updateViewButtons(options) {
    const opts = options || {};
    const currentView = String(opts.currentView || "month");
    const monthActive = currentView === "month";
    const monthViewBtn = opts.monthViewBtn;
    const yearViewBtn = opts.yearViewBtn;
    if (monthViewBtn) {
      monthViewBtn.classList.toggle("active", monthActive);
      monthViewBtn.setAttribute("aria-pressed", monthActive ? "true" : "false");
    }
    if (yearViewBtn) {
      yearViewBtn.classList.toggle("active", !monthActive);
      yearViewBtn.setAttribute("aria-pressed", !monthActive ? "true" : "false");
    }
  }

  function renderTwoMonthCalendar(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const calendarGrid = opts.calendarGrid;
    const monthLabel = opts.monthLabel;
    const currentMonth = opts.currentMonth instanceof Date ? opts.currentMonth : null;
    if (!doc || !calendarGrid || !monthLabel || !currentMonth) return false;
    const getLocale = typeof opts.getLocale === "function" ? opts.getLocale : (() => "en");
    const renderMonthBlock = typeof opts.renderMonthBlock === "function" ? opts.renderMonthBlock : null;
    if (!renderMonthBlock) return false;

    const singleMonth = Boolean(opts.singleMonth);
    calendarGrid.className = `calendar-grid months-grid${singleMonth ? " single-month-grid" : ""}`;
    const monthA = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    if (singleMonth) {
      monthLabel.textContent = monthA.toLocaleDateString(getLocale(), { month: "long", year: "numeric" });
      calendarGrid.appendChild(renderMonthBlock(monthA));
      return true;
    }
    const monthB = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    monthLabel.textContent = `${monthA.toLocaleDateString(getLocale(), { month: "long", year: "numeric" })} - ${monthB.toLocaleDateString(getLocale(), { month: "long", year: "numeric" })}`;
    calendarGrid.appendChild(renderMonthBlock(monthA));
    calendarGrid.appendChild(renderMonthBlock(monthB));
    return true;
  }

  function renderMonthBlock(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const monthDate = opts.monthDate instanceof Date ? opts.monthDate : null;
    if (!doc || !monthDate) return null;

    const getLocale = typeof opts.getLocale === "function" ? opts.getLocale : (() => "en");
    const buildPeopleMap = typeof opts.buildPeopleMap === "function" ? opts.buildPeopleMap : (() => new Map());
    const buildEventLaneMap = typeof opts.buildEventLaneMap === "function" ? opts.buildEventLaneMap : (() => new Map());
    const toDateKey = typeof opts.toDateKey === "function" ? opts.toDateKey : (() => "");
    const createDetailedDayCell = typeof opts.createDetailedDayCell === "function" ? opts.createDetailedDayCell : null;
    if (!createDetailedDayCell) return null;

    const wrapper = doc.createElement("section");
    wrapper.className = "month-block";

    const title = doc.createElement("h3");
    title.className = "month-block-title";
    title.textContent = monthDate.toLocaleDateString(getLocale(), { month: "long", year: "numeric" });
    wrapper.appendChild(title);

    const weekHead = doc.createElement("div");
    weekHead.className = "weekday-row month-weekdays";
    const mondayStart = new Date(Date.UTC(2024, 0, 8));
    const fmt = new Intl.DateTimeFormat(getLocale(), { weekday: "short" });
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(mondayStart);
      d.setUTCDate(mondayStart.getUTCDate() + i);
      const cell = doc.createElement("div");
      cell.textContent = fmt.format(d);
      if (i >= 5) cell.classList.add("weekend-head");
      weekHead.appendChild(cell);
    }
    wrapper.appendChild(weekHead);

    const grid = doc.createElement("div");
    grid.className = "month-grid";

    const peopleMap = buildPeopleMap();
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(monthDate);
    gridStart.setDate(1 - startOffset);
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 41);
    const laneMap = buildEventLaneMap(toDateKey(gridStart), toDateKey(gridEnd));
    const visibleLanes = 4;

    for (let i = 0; i < 42; i += 1) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      const key = toDateKey(cellDate);
      const inCurrentMonth = cellDate.getMonth() === monthDate.getMonth();
      const cell = createDetailedDayCell(cellDate, key, inCurrentMonth, peopleMap, laneMap, visibleLanes);
      if (cell) grid.appendChild(cell);
    }

    wrapper.appendChild(grid);
    return wrapper;
  }

  root.ProCalModules.calendarMonthGrid = {
    updateViewButtons,
    renderTwoMonthCalendar,
    renderMonthBlock
  };
})(window);
