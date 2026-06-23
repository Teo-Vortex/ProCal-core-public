(function initLeaveOverlaySyncModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getVisibleLeaveMatrixMonths(options) {
    const o = options || {};
    const currentView = String(o.currentView || "month");
    const currentMonth = o.currentMonth instanceof Date ? o.currentMonth : new Date();
    if (currentView === "year") {
      const y = currentMonth.getFullYear();
      return Array.from({ length: 12 }, (_x, idx) => ({ year: y, month: idx + 1 }));
    }
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth() + 1;
    if (m === 12) return [{ year: y, month: 12 }, { year: y + 1, month: 1 }];
    return [{ year: y, month: m }, { year: y, month: m + 1 }];
  }

  function normalizeLeaveNote(leaveType, note, options) {
    const o = options || {};
    const currentLang = String(o.currentLang || "en");
    const raw = String(note || "").trim();
    const key = String(leaveType || "").trim();
    const labelMap = {
      paid: currentLang === "bg" ? "\u041E\u0442\u043F\u0443\u0441\u043A\u0430" : "Leave",
      sick: currentLang === "bg" ? "\u0411\u043E\u043B\u043D\u0438\u0447\u0435\u043D" : "Sick leave",
      unpaid: currentLang === "bg" ? "\u041D\u0435\u043F\u043B\u0430\u0442\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A" : "Unpaid leave",
      study: currentLang === "bg" ? "\u0423\u0447\u0435\u0431\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A" : "Study leave"
    };
    const lead = labelMap[key] || key;
    if (!lead) return raw;
    return raw ? `${lead} - ${raw}` : lead;
  }

  async function syncLeaveAbsencesForCurrentMonth(force, options) {
    const o = options || {};
    const canLeaveAccess = typeof o.canLeaveAccess === "function" ? o.canLeaveAccess : () => false;
    if (!canLeaveAccess()) return;

    const getLeaveAbsenceSyncInFlight = typeof o.getLeaveAbsenceSyncInFlight === "function" ? o.getLeaveAbsenceSyncInFlight : () => false;
    const setLeaveAbsenceSyncInFlight = typeof o.setLeaveAbsenceSyncInFlight === "function" ? o.setLeaveAbsenceSyncInFlight : () => {};
    if (getLeaveAbsenceSyncInFlight()) return;

    const getLeaveAbsenceViewKey = typeof o.getLeaveAbsenceViewKey === "function" ? o.getLeaveAbsenceViewKey : () => "";
    const getLeaveAbsenceLoadedViewKey = typeof o.getLeaveAbsenceLoadedViewKey === "function" ? o.getLeaveAbsenceLoadedViewKey : () => "";
    const setLeaveAbsenceLoadedViewKey = typeof o.setLeaveAbsenceLoadedViewKey === "function" ? o.setLeaveAbsenceLoadedViewKey : () => {};
    const viewKey = getLeaveAbsenceViewKey();
    if (!force && getLeaveAbsenceLoadedViewKey() === viewKey) return;

    setLeaveAbsenceSyncInFlight(true);
    try {
      const ensureAccessToken = typeof o.ensureAccessToken === "function" ? o.ensureAccessToken : (async () => "");
      const token = await ensureAccessToken();
      if (!token) return;

      const getVisibleLeaveMatrixMonthsFn = typeof o.getVisibleLeaveMatrixMonths === "function"
        ? o.getVisibleLeaveMatrixMonths
        : (() => []);
      const months = getVisibleLeaveMatrixMonthsFn();

      const fetchRef = typeof o.fetchRef === "function" ? o.fetchRef : fetch;
      const responses = await Promise.all(months.map(async ({ year, month }) => {
        const res = await fetchRef(`/api/leave/matrix?year=${year}&month=${month}`, {
          headers: { authorization: `Bearer ${token}` },
          credentials: "include"
        });
        if (!res.ok) return [];
        const body = await res.json().catch(() => null);
        return body && Array.isArray(body.records) ? body.records : [];
      }));

      const mergedRows = responses.flat();
      const uniqById = new Map();
      mergedRows.forEach((row) => {
        const key = String((row && row.id) || "");
        if (!key) return;
        if (!uniqById.has(key)) uniqById.set(key, row);
      });

      const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
      const normalizeLeaveNoteFn = typeof o.normalizeLeaveNote === "function"
        ? o.normalizeLeaveNote
        : ((leaveType, note) => normalizeLeaveNote(leaveType, note));
      const nextAbsences = Array.from(uniqById.values())
        .filter((row) => String((row && row.status) || "approved") === "approved")
        .map((row) => ({
          id: `leave_${row.id}`,
          personId: String(row.userId || ""),
          startDate: String(row.startDate || ""),
          endDate: String(row.endDate || ""),
          note: normalizeLeaveNoteFn(row.leaveType, row.note)
        }))
        .filter((row) => row.personId && isDateKey(row.startDate) && isDateKey(row.endDate));

      const getAbsences = typeof o.getAbsences === "function" ? o.getAbsences : () => [];
      const setAbsences = typeof o.setAbsences === "function" ? o.setAbsences : () => {};
      const prevAbsences = Array.isArray(getAbsences()) ? getAbsences() : [];
      const nextSig = JSON.stringify(nextAbsences.map((x) => `${x.id}:${x.personId}:${x.startDate}:${x.endDate}:${x.note || ""}`));
      const prevSig = JSON.stringify(prevAbsences.map((x) => `${x.id}:${x.personId}:${x.startDate}:${x.endDate}:${x.note || ""}`));

      setAbsences(nextAbsences);
      setLeaveAbsenceLoadedViewKey(viewKey);

      if (typeof o.refreshEventPeopleAvailability === "function") o.refreshEventPeopleAvailability();
      if (typeof o.refreshTaskChecklistAvailability === "function") o.refreshTaskChecklistAvailability(o.selectedDateKey);
      if (typeof o.refreshEventTaskChecklistAvailability === "function") o.refreshEventTaskChecklistAvailability();

      if (nextSig !== prevSig) {
        if (typeof o.renderCalendar === "function") o.renderCalendar();
        if (typeof o.renderSelectedDayPanel === "function") o.renderSelectedDayPanel();
        if (typeof o.renderUpcomingList === "function") o.renderUpcomingList();
      }
    } catch {
      // ignore leave matrix sync errors
    } finally {
      setLeaveAbsenceSyncInFlight(false);
    }
  }

  function queueLeaveAbsenceSync(force, options) {
    const o = options || {};
    const canLeaveAccess = typeof o.canLeaveAccess === "function" ? o.canLeaveAccess : () => false;
    if (!canLeaveAccess()) return;
    const getLeaveAbsenceSyncTimer = typeof o.getLeaveAbsenceSyncTimer === "function" ? o.getLeaveAbsenceSyncTimer : () => null;
    const setLeaveAbsenceSyncTimer = typeof o.setLeaveAbsenceSyncTimer === "function" ? o.setLeaveAbsenceSyncTimer : () => {};
    const syncLeaveAbsence = typeof o.syncLeaveAbsencesForCurrentMonth === "function" ? o.syncLeaveAbsencesForCurrentMonth : (() => {});
    const timer = getLeaveAbsenceSyncTimer();
    if (timer) clearTimeout(timer);
    const nextTimer = setTimeout(() => {
      setLeaveAbsenceSyncTimer(null);
      syncLeaveAbsence(Boolean(force));
    }, 80);
    setLeaveAbsenceSyncTimer(nextTimer);
  }

  function getHolidayVisibleRange(options) {
    const o = options || {};
    const currentView = String(o.currentView || "month");
    const currentMonth = o.currentMonth instanceof Date ? o.currentMonth : new Date();
    const toDateKey = typeof o.toDateKey === "function" ? o.toDateKey : ((d) => String(d || ""));
    if (currentView === "year") {
      const y = currentMonth.getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    const monthA = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstDay = new Date(monthA.getFullYear(), monthA.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const from = new Date(monthA);
    from.setDate(1 - startOffset);
    const to = new Date(from);
    to.setDate(from.getDate() + 41 + 42);
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  function getHolidayNamesForDate(dateKey, options) {
    const o = options || {};
    const holidayMetaByDate = o.holidayMetaByDate instanceof Map ? o.holidayMetaByDate : new Map();
    const meta = holidayMetaByDate.get(String(dateKey || ""));
    return meta && Array.isArray(meta.names) ? meta.names : [];
  }

  function isDayOffHoliday(dateKey, options) {
    const o = options || {};
    const holidayMetaByDate = o.holidayMetaByDate instanceof Map ? o.holidayMetaByDate : new Map();
    const meta = holidayMetaByDate.get(String(dateKey || ""));
    return Boolean(meta && meta.dayOff);
  }

  async function syncHolidayDatesForView(force, options) {
    const o = options || {};
    const getHolidaySyncInFlight = typeof o.getHolidaySyncInFlight === "function" ? o.getHolidaySyncInFlight : () => false;
    const setHolidaySyncInFlight = typeof o.setHolidaySyncInFlight === "function" ? o.setHolidaySyncInFlight : () => {};
    if (getHolidaySyncInFlight()) return;

    const getHolidayVisibleRangeFn = typeof o.getHolidayVisibleRange === "function"
      ? o.getHolidayVisibleRange
      : (() => ({ from: "", to: "" }));
    const { from, to } = getHolidayVisibleRangeFn();
    const currentView = String(typeof o.getCurrentView === "function" ? o.getCurrentView() : (o.currentView || "month"));
    const viewKey = `${currentView}:${from}:${to}`;
    const getHolidayLoadedViewKey = typeof o.getHolidayLoadedViewKey === "function" ? o.getHolidayLoadedViewKey : () => "";
    const setHolidayLoadedViewKey = typeof o.setHolidayLoadedViewKey === "function" ? o.setHolidayLoadedViewKey : () => {};
    if (!force && getHolidayLoadedViewKey() === viewKey) return;

    setHolidaySyncInFlight(true);
    try {
      const ensureAccessToken = typeof o.ensureAccessToken === "function" ? o.ensureAccessToken : (async () => "");
      const token = await ensureAccessToken();
      if (!token) return;

      const fetchRef = typeof o.fetchRef === "function" ? o.fetchRef : fetch;
      const res = await fetchRef(`/api/holidays?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: { authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (!res.ok) return;

      const body = await res.json().catch(() => ({}));
      const items = Array.isArray(body && body.items) ? body.items : [];
      const nextMap = new Map();
      const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
      items.forEach((row) => {
        const key = String((row && row.dateKey) || "");
        if (!isDateKey(key)) return;
        const names = Array.isArray(row && row.names)
          ? row.names.map((n) => String(n || "").trim()).filter(Boolean)
          : [];
        if (!names.length) return;
        nextMap.set(key, { names, dayOff: Boolean(row && row.dayOff) });
      });

      const getHolidaySignature = typeof o.getHolidaySignature === "function" ? o.getHolidaySignature : () => "";
      const setHolidaySignature = typeof o.setHolidaySignature === "function" ? o.setHolidaySignature : () => {};
      const setHolidayMetaByDate = typeof o.setHolidayMetaByDate === "function" ? o.setHolidayMetaByDate : () => {};
      const nextSignature = JSON.stringify(Array.from(nextMap.entries()));
      const changed = nextSignature !== getHolidaySignature();

      setHolidayMetaByDate(nextMap);
      setHolidaySignature(nextSignature);
      setHolidayLoadedViewKey(viewKey);
      if (changed && typeof o.renderCalendar === "function") o.renderCalendar();
    } catch {
      // ignore holiday load errors
    } finally {
      setHolidaySyncInFlight(false);
    }
  }

  function queueHolidaySync(force, options) {
    const o = options || {};
    const getHolidaySyncTimer = typeof o.getHolidaySyncTimer === "function" ? o.getHolidaySyncTimer : () => null;
    const setHolidaySyncTimer = typeof o.setHolidaySyncTimer === "function" ? o.setHolidaySyncTimer : () => {};
    const syncHolidayDatesForViewFn = typeof o.syncHolidayDatesForView === "function" ? o.syncHolidayDatesForView : (() => {});
    const timer = getHolidaySyncTimer();
    if (timer) clearTimeout(timer);
    const nextTimer = setTimeout(() => {
      setHolidaySyncTimer(null);
      void syncHolidayDatesForViewFn(Boolean(force));
    }, 80);
    setHolidaySyncTimer(nextTimer);
  }

  root.ProCalModules.leaveOverlaySync = {
    getVisibleLeaveMatrixMonths,
    normalizeLeaveNote,
    syncLeaveAbsencesForCurrentMonth,
    queueLeaveAbsenceSync,
    getHolidayVisibleRange,
    getHolidayNamesForDate,
    isDayOffHoliday,
    syncHolidayDatesForView,
    queueHolidaySync
  };
})(window);

