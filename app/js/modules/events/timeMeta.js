(function initEventTimeMetaModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  const DAY_MINUTES = 24 * 60;

  function clampMinutes(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric < 0) return 0;
    if (numeric > DAY_MINUTES) return DAY_MINUTES;
    return numeric;
  }

  function parseTimeToMinutes(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (raw === "24:00") return DAY_MINUTES;
    let hours = null;
    let minutes = null;
    if (/^\d{1,2}$/.test(raw)) {
      hours = Number.parseInt(raw, 10);
      minutes = 0;
    } else if (/^\d{3,4}$/.test(raw)) {
      const compact = raw.padStart(4, "0");
      hours = Number.parseInt(compact.slice(0, 2), 10);
      minutes = Number.parseInt(compact.slice(2), 10);
    } else {
      const match = raw.match(/^(\d{1,2})[:.](\d{1,2})$/);
      if (!match) return null;
      hours = Number.parseInt(match[1], 10);
      minutes = Number.parseInt(match[2], 10);
    }
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23) return null;
    if (minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function minutesToTime(value) {
    const minutes = clampMinutes(value);
    if (minutes >= DAY_MINUTES) return "24:00";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  function roundDownMinutes(value, step) {
    const safeStep = Math.max(1, Number(step) || 1);
    return Math.floor(clampMinutes(value) / safeStep) * safeStep;
  }

  function roundUpMinutes(value, step) {
    const safeStep = Math.max(1, Number(step) || 1);
    return Math.ceil(clampMinutes(value) / safeStep) * safeStep;
  }

  function resolveEventTimeMeta(evt) {
    const event = evt && typeof evt === "object" ? evt : {};
    const startDate = String(event.startDate || "");
    const endDate = String(event.endDate || startDate || "");
    const rawStart = String(event.startTime || event.time || "").trim();
    const rawEnd = String(event.endTime || "").trim();
    const parsedStart = parseTimeToMinutes(rawStart);
    const parsedEnd = parseTimeToMinutes(rawEnd);
    const multiDay = Boolean(startDate && endDate && endDate > startDate);
    const explicitAllDay = Boolean(event.isAllDay);

    if (explicitAllDay || (parsedStart == null && parsedEnd == null)) {
      return {
        isAllDay: true,
        multiDay,
        startTime: "",
        endTime: "",
        startMinutes: 0,
        endMinutes: DAY_MINUTES,
        hasStartTime: false,
        hasEndTime: false
      };
    }

    const startMinutes = parsedStart == null
      ? 0
      : clampMinutes(parsedStart);

    let endMinutes = parsedEnd;
    if (endMinutes == null) {
      endMinutes = multiDay
        ? startMinutes
        : clampMinutes(startMinutes + 60);
    }
    endMinutes = clampMinutes(endMinutes);
    if (!multiDay && endMinutes <= startMinutes) {
      endMinutes = clampMinutes(startMinutes + 60);
    }

    return {
      isAllDay: false,
      multiDay,
      startTime: parsedStart == null ? "" : minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      startMinutes,
      endMinutes,
      hasStartTime: parsedStart != null,
      hasEndTime: parsedEnd != null
    };
  }

  function buildEventTimingFields(event) {
    const meta = resolveEventTimeMeta(event);
    if (meta.isAllDay) {
      return {
        isAllDay: true,
        startTime: "",
        endTime: "",
        time: ""
      };
    }
    return {
      isAllDay: false,
      startTime: meta.startTime,
      endTime: meta.endTime === "24:00" ? "" : meta.endTime,
      time: meta.startTime
    };
  }

  function getEventTimeRangeLabel(evt, options) {
    const o = options || {};
    const t = typeof o.t === "function" ? o.t : ((key) => key);
    const meta = resolveEventTimeMeta(evt);
    const startDate = String((evt && evt.startDate) || "");
    const endDate = String((evt && evt.endDate) || startDate || "");
    if (!startDate || !endDate) return meta.isAllDay ? t("allDay") : "";
    if (startDate === endDate) {
      if (meta.isAllDay) return t("allDay");
      return `${meta.startTime} - ${meta.endTime}`;
    }
    if (meta.isAllDay) return `${startDate} ${t("to")} ${endDate} • ${t("allDay")}`;
    return `${startDate} ${meta.startTime} ${t("to")} ${endDate} ${meta.endTime}`;
  }

  function getEventTimeLabelForDate(evt, dateKey, options) {
    const o = options || {};
    const t = typeof o.t === "function" ? o.t : ((key) => key);
    const key = String(dateKey || "");
    const startDate = String((evt && evt.startDate) || "");
    const endDate = String((evt && evt.endDate) || startDate || "");
    const meta = resolveEventTimeMeta(evt);
    if (!key || key < startDate || key > endDate) return "";
    if (meta.isAllDay) {
      if (startDate === endDate) return t("allDay");
      if (key === startDate) return `${t("allDay")} →`;
      if (key === endDate) return `← ${t("allDay")}`;
      return `← ${t("allDay")} →`;
    }
    const continuesPrev = key > startDate;
    const continuesNext = key < endDate;
    const startText = continuesPrev ? "←" : meta.startTime;
    const endText = continuesNext ? "→" : meta.endTime;
    return `${startText} - ${endText}`;
  }

  function getTimelineSegment(evt, dateKey) {
    const key = String(dateKey || "");
    const startDate = String((evt && evt.startDate) || "");
    const endDate = String((evt && evt.endDate) || startDate || "");
    if (!key || key < startDate || key > endDate) return null;
    const meta = resolveEventTimeMeta(evt);
    const continuesPrevDay = key > startDate;
    const continuesNextDay = key < endDate;
    if (meta.isAllDay) {
      return {
        isAllDay: true,
        startMinutes: 0,
        endMinutes: DAY_MINUTES,
        continuesPrevDay,
        continuesNextDay
      };
    }
    const startsToday = key === startDate;
    const endsToday = key === endDate;
    const startMinutes = startsToday ? meta.startMinutes : 0;
    const endMinutes = endsToday ? meta.endMinutes : DAY_MINUTES;
    return {
      isAllDay: false,
      startMinutes,
      endMinutes: Math.max(startMinutes + 15, endMinutes),
      continuesPrevDay,
      continuesNextDay
    };
  }

  root.ProCalModules.eventTimeMeta = {
    DAY_MINUTES,
    buildEventTimingFields,
    clampMinutes,
    getEventTimeLabelForDate,
    getEventTimeRangeLabel,
    getTimelineSegment,
    minutesToTime,
    parseTimeToMinutes,
    resolveEventTimeMeta,
    roundDownMinutes,
    roundUpMinutes
  };
})(window);
