(function initLeaveQuickCalendar(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderQuickCalendar(options) {
    const o = options || {};
    const leaveQuickCalendar = o.leaveQuickCalendar;
    if (!leaveQuickCalendar) return;

    const records = Array.isArray(o.records) ? o.records : [];
    const monthStart = o.monthStart;
    const monthEnd = o.monthEnd;
    if (!(monthStart instanceof Date) || Number.isNaN(monthStart.getTime())) return;
    if (!(monthEnd instanceof Date) || Number.isNaN(monthEnd.getTime())) return;

    const documentRef = o.documentRef || document;
    const getLocale = typeof o.getLocale === "function" ? o.getLocale : () => "en";
    const parseDateKey = typeof o.parseDateKey === "function" ? o.parseDateKey : () => null;
    const toDateKey = typeof o.toDateKey === "function" ? o.toDateKey : () => "";
    const getLeaveTagText = typeof o.getLeaveTagText === "function" ? o.getLeaveTagText : (type) => String(type || "");
    const currentLang = String(o.currentLang || "en");

    leaveQuickCalendar.innerHTML = "";
    const weekdays = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(Date.UTC(2024, 0, 1 + i));
      weekdays.push(d.toLocaleDateString(getLocale(), { weekday: "short" }));
    }
    weekdays.forEach((w) => {
      const h = documentRef.createElement("div");
      h.className = "leave-quick-weekday";
      h.textContent = w;
      leaveQuickCalendar.appendChild(h);
    });

    const tagsByDay = new Map();
    records.forEach((row) => {
      const start = parseDateKey(String(row.startDate || ""));
      const end = parseDateKey(String(row.endDate || ""));
      if (!(start instanceof Date) || Number.isNaN(start.getTime())) return;
      if (!(end instanceof Date) || Number.isNaN(end.getTime())) return;
      const type = String(row.leaveType || "");
      const status = String(row.status || "approved");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        if (key < toDateKey(monthStart) || key > toDateKey(monthEnd)) continue;
        if (!tagsByDay.has(key)) tagsByDay.set(key, new Map());
        const dayMap = tagsByDay.get(key);
        if (!dayMap.has(type)) dayMap.set(type, { pending: false, approved: false });
        const statusBucket = dayMap.get(type);
        if (status === "pending") statusBucket.pending = true;
        else statusBucket.approved = true;
      }
    });

    const firstDow = (monthStart.getDay() + 6) % 7;
    const daysInMonth = monthEnd.getDate();
    for (let i = 0; i < firstDow; i += 1) {
      const blank = documentRef.createElement("div");
      blank.className = "leave-quick-day muted";
      leaveQuickCalendar.appendChild(blank);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const key = toDateKey(cellDate);
      const cell = documentRef.createElement("div");
      cell.className = "leave-quick-day";
      const head = documentRef.createElement("div");
      head.className = "leave-quick-day-head";
      head.textContent = String(day);
      const tags = documentRef.createElement("div");
      tags.className = "leave-quick-day-tags";
      const dayMap = tagsByDay.get(key) || new Map();
      Array.from(dayMap.entries()).forEach(([type, flags]) => {
        const tag = documentRef.createElement("span");
        tag.className = `leave-tag ${type}`;
        if (flags && flags.pending) tag.classList.add("pending");
        if (flags && flags.pending && !flags.approved) {
          tag.title = currentLang === "bg" ? "\u0427\u0430\u043A\u0430 \u043F\u043E\u0442\u0432\u044A\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043E\u0442 HR" : "Pending HR approval";
        }
        tag.textContent = getLeaveTagText(type);
        tags.appendChild(tag);
      });
      cell.append(head, tags);
      leaveQuickCalendar.appendChild(cell);
    }
  }

  root.ProCalModules.leaveQuickCalendar = { renderQuickCalendar };
})(window);
