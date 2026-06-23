(function initCalendarDayTimelinePrefsModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getDefaultPrefs() {
    return {
      workingStart: "08:00",
      workingEnd: "17:00",
      visibleStart: "07:30",
      visibleEnd: "17:30",
      autoFit: false
    };
  }

  function clonePrefs(prefs) {
    const fallback = getDefaultPrefs();
    const source = prefs && typeof prefs === "object" ? prefs : fallback;
    return {
      workingStart: typeof source.workingStart === "string" ? source.workingStart : fallback.workingStart,
      workingEnd: typeof source.workingEnd === "string" ? source.workingEnd : fallback.workingEnd,
      visibleStart: typeof source.visibleStart === "string" ? source.visibleStart : fallback.visibleStart,
      visibleEnd: typeof source.visibleEnd === "string" ? source.visibleEnd : fallback.visibleEnd,
      autoFit: Boolean(source.autoFit)
    };
  }

  function readDayTimelinePrefs(options) {
    const opts = options || {};
    const storage = opts.storageRef || root.localStorage;
    const storageKey = String(opts.storageKey || "procal_day_timeline_prefs_v1");
    const fallback = clonePrefs(opts.fallback);
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return fallback;
      return clonePrefs(JSON.parse(raw));
    } catch {
      return fallback;
    }
  }

  function persistDayTimelinePrefs(options) {
    const opts = options || {};
    const storage = opts.storageRef || root.localStorage;
    const storageKey = String(opts.storageKey || "procal_day_timeline_prefs_v1");
    try {
      storage.setItem(storageKey, JSON.stringify(clonePrefs(opts.prefs)));
    } catch {
      // Ignore local storage write failures.
    }
  }

  function updateDayTimelinePrefsSummary(options) {
    const opts = options || {};
    const summaryEl = opts.summaryEl;
    if (!summaryEl) return;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const prefs = clonePrefs(opts.prefs);
    const parts = [
      `${t("timelineVisibleRange")}: ${prefs.visibleStart} - ${prefs.visibleEnd}`,
      `${t("timelineWorkingRange")}: ${prefs.workingStart} - ${prefs.workingEnd}`
    ];
    if (prefs.autoFit) parts.push(t("timelineAutoFit"));
    summaryEl.textContent = parts.join(" \u2022 ");
  }

  function applyDayTimelinePrefsToInputs(options) {
    const opts = options || {};
    const prefs = clonePrefs(opts.prefs);
    if (opts.timelineWorkingStart) opts.timelineWorkingStart.value = String(prefs.workingStart || "08:00");
    if (opts.timelineWorkingEnd) opts.timelineWorkingEnd.value = String(prefs.workingEnd || "17:00");
    if (opts.timelineVisibleStart) opts.timelineVisibleStart.value = String(prefs.visibleStart || "07:30");
    if (opts.timelineVisibleEnd) opts.timelineVisibleEnd.value = String(prefs.visibleEnd || "17:30");
    if (opts.timelineAutoFit) opts.timelineAutoFit.checked = Boolean(prefs.autoFit);
    updateDayTimelinePrefsSummary({
      prefs,
      summaryEl: opts.summaryEl,
      t: opts.t
    });
  }

  function updateDayTimelinePrefsFromInputs(options) {
    const opts = options || {};
    const fallback = clonePrefs(opts.currentPrefs);
    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    const normalizeTimelineTime = (value, defaultValue) => {
      const raw = String(value || "").trim();
      if (!raw) return defaultValue;
      const minutes = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
        ? timeMeta.parseTimeToMinutes(raw)
        : null;
      if (minutes == null || !timeMeta || typeof timeMeta.minutesToTime !== "function") return defaultValue;
      return timeMeta.minutesToTime(minutes);
    };
    return {
      workingStart: normalizeTimelineTime(opts.timelineWorkingStart && opts.timelineWorkingStart.value, fallback.workingStart || "08:00"),
      workingEnd: normalizeTimelineTime(opts.timelineWorkingEnd && opts.timelineWorkingEnd.value, fallback.workingEnd || "17:00"),
      visibleStart: normalizeTimelineTime(opts.timelineVisibleStart && opts.timelineVisibleStart.value, fallback.visibleStart || "07:30"),
      visibleEnd: normalizeTimelineTime(opts.timelineVisibleEnd && opts.timelineVisibleEnd.value, fallback.visibleEnd || "17:30"),
      autoFit: Boolean(opts.timelineAutoFit && opts.timelineAutoFit.checked)
    };
  }

  root.ProCalModules.calendarDayTimelinePrefs = {
    readDayTimelinePrefs,
    persistDayTimelinePrefs,
    applyDayTimelinePrefsToInputs,
    updateDayTimelinePrefsFromInputs,
    updateDayTimelinePrefsSummary
  };
})(window);
