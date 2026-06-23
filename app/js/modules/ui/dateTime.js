(function initDateTimeUiModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function normalizeLocale(locale) {
    const raw = String(locale || "").trim();
    return raw || "en-US";
  }

  function formatDateTime24(value, options) {
    const opts = options || {};
    if (!value) return "";
    const dt = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(dt.getTime())) return String(value);
    const locale = normalizeLocale(opts.locale);
    try {
      return dt.toLocaleString(locale, { hour12: false });
    } catch {
      return dt.toLocaleString();
    }
  }

  function get24hTimeInputLang(options) {
    const opts = options || {};
    const locale = normalizeLocale(opts.locale).toLowerCase();
    if (locale.startsWith("bg")) return "bg-BG";
    if (locale.startsWith("en")) return "en-GB";
    return "en-GB";
  }

  function apply24hTimeInput(input, options) {
    if (!input || typeof input !== "object") return;
    const type = String(input.type || "").toLowerCase();
    const invalidMessage = String((options && options.invalidMessage) || "Use HH:MM");
    const minuteStep = Math.max(1, Number.parseInt(String((options && options.minuteStep) || "1"), 10) || 1);
    const allowMidnight24 = Boolean(options && options.allowMidnight24);

    function normalizeTimeTextValue(value) {
      const raw = String(value || "").trim().replace(/\./g, ":");
      if (!raw) return "";
      if (allowMidnight24 && raw === "24:00") return "24:00";
      if (/^\d{1,2}$/.test(raw)) {
        const hoursOnly = Number.parseInt(raw, 10);
        if (Number.isInteger(hoursOnly) && hoursOnly >= 0 && hoursOnly <= 23) {
          return `${String(hoursOnly).padStart(2, "0")}:00`;
        }
        return null;
      }
      if (/^\d{3,4}$/.test(raw)) {
        const compact = raw.padStart(4, "0");
        const hours = Number.parseInt(compact.slice(0, 2), 10);
        const minutes = Number.parseInt(compact.slice(2), 10);
        if (Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        }
        return null;
      }
      const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
      if (!match) return null;
      const hours = Number.parseInt(match[1], 10);
      const minutes = Number.parseInt(match[2], 10);
      if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
      }
      const snappedMinutes = minuteStep > 1
        ? Math.floor(minutes / minuteStep) * minuteStep
        : minutes;
      return `${String(hours).padStart(2, "0")}:${String(snappedMinutes).padStart(2, "0")}`;
    }

    try {
      input.setAttribute("inputmode", "numeric");
      if (type === "time") {
        input.setAttribute("step", String((options && options.stepSeconds) || 60));
        input.setAttribute("lang", get24hTimeInputLang(options));
        return;
      }
      input.setAttribute("maxlength", "5");
      input.setAttribute("placeholder", "HH:MM");
      if (allowMidnight24 && minuteStep === 15) {
        input.setAttribute("pattern", "^(?:(?:[01]\\d|2[0-3]):(?:00|15|30|45)|24:00)$");
      } else if (minuteStep === 15) {
        input.setAttribute("pattern", "^(?:[01]\\d|2[0-3]):(?:00|15|30|45)$");
      } else if (allowMidnight24) {
        input.setAttribute("pattern", "^(?:(?:[01]\\d|2[0-3]):[0-5]\\d|24:00)$");
      } else {
        input.setAttribute("pattern", "^(?:[01]\\d|2[0-3]):[0-5]\\d$");
      }
      if (input.dataset.procal24hBound === "1") return;
      input.dataset.procal24hBound = "1";
      input.addEventListener("input", () => {
        try {
          input.setCustomValidity("");
        } catch {}
      });
      input.addEventListener("blur", () => {
        const current = String(input.value || "").trim();
        if (!current) {
          try {
            input.setCustomValidity("");
          } catch {}
          return;
        }
        const normalized = normalizeTimeTextValue(current);
        if (!normalized) {
          try {
            input.setCustomValidity(invalidMessage);
            input.reportValidity();
          } catch {}
          return;
        }
        input.value = normalized;
        try {
          input.setCustomValidity("");
        } catch {}
      });
    } catch {
      return;
    }
  }

  function formatClockParts(options) {
    const opts = options || {};
    const locale = normalizeLocale(typeof opts.locale === "function" ? opts.locale() : opts.locale);
    const now = opts.now instanceof Date ? opts.now : new Date();
    const safe = Number.isNaN(now.getTime()) ? new Date() : now;
    let time = "--:--";
    let date = "-";
    let weekday = "-";
    try {
      time = safe.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch {
      time = `${String(safe.getHours()).padStart(2, "0")}:${String(safe.getMinutes()).padStart(2, "0")}`;
    }
    try {
      date = safe.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      date = safe.toLocaleDateString();
    }
    try {
      weekday = safe.toLocaleDateString(locale, { weekday: "long" });
    } catch {
      weekday = safe.toLocaleDateString();
    }
    return { time, date, weekday };
  }

  function startLiveClock(options) {
    const opts = options || {};
    const timeEl = opts.timeEl;
    const dateEl = opts.dateEl;
    const weekdayEl = opts.weekdayEl;
    if (!timeEl && !dateEl && !weekdayEl) return null;
    let timer = null;
    const render = () => {
      const parts = formatClockParts({
        locale: opts.getLocale,
        now: new Date()
      });
      try {
        if (timeEl) timeEl.textContent = parts.time;
        if (dateEl) dateEl.textContent = parts.date;
        if (weekdayEl) weekdayEl.textContent = parts.weekday;
      } catch {}
    };
    render();
    timer = root.setInterval(render, 1000);
    return function stopLiveClock() {
      if (timer) {
        root.clearInterval(timer);
        timer = null;
      }
    };
  }

  root.ProCalModules.uiDateTime = {
    formatDateTime24,
    get24hTimeInputLang,
    apply24hTimeInput,
    formatClockParts,
    startLiveClock
  };
})(window);
