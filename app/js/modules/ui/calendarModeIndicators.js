(function initCalendarModeIndicators(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function isHexColor(value) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
  }

  function clampOpacityPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 10;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function hexToRgbTriplet(value) {
    const hex = isHexColor(value) ? String(value).slice(1) : "0f766e";
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  function getAccentColor(options) {
    const opts = options || {};
    const personalColor = isHexColor(opts.currentUserDisplayColor) ? String(opts.currentUserDisplayColor) : "#0f766e";
    return opts.isPersonal ? personalColor : "#334155";
  }

  function getUiCopy(options) {
    const opts = options || {};
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const currentLang = String(opts.currentLang || "en");
    const isPersonal = Boolean(opts.isPersonal);
    const sharedLabel = `${t("sharedCalendar")} ${t("calendarLabel")}`;
    const personalLabel = `${t("personalCalendar")} ${t("calendarLabel")}`;
    if (isPersonal) {
      return currentLang === "bg"
        ? {
            badge: personalLabel,
            sideInfo: "Режим: Личен календар (общ + лични)",
            legend: "Контур = елемент от общия календар"
          }
        : {
            badge: personalLabel,
            sideInfo: "Mode: Personal calendar (shared + personal)",
            legend: "Outline = item from shared calendar"
          };
    }
    return currentLang === "bg"
      ? {
          badge: sharedLabel,
          sideInfo: "Режим: Общ календар",
          legend: "Контур = елемент от общия календар"
        }
      : {
          badge: sharedLabel,
          sideInfo: "Mode: Shared calendar",
          legend: "Outline = item from shared calendar"
        };
  }

  function renderIndicators(options) {
    const opts = options || {};
    const isPersonal = Boolean(opts.isPersonal);
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const accent = getAccentColor(opts);
    const accentRgb = hexToRgbTriplet(accent);
    const tintAlpha = String((clampOpacityPercent(opts.currentUserCalendarTintOpacity) / 100).toFixed(2));
    const copy = getUiCopy({
      isPersonal,
      currentLang: opts.currentLang,
      t
    });

    if (opts.appShellEl && opts.appShellEl.style) {
      opts.appShellEl.style.setProperty("--mode-accent-color", accent);
      opts.appShellEl.style.setProperty("--mode-accent-rgb", accentRgb);
      opts.appShellEl.style.setProperty("--mode-accent-panel-alpha", tintAlpha);
    }

    if (opts.calendarModeBadge) {
      opts.calendarModeBadge.textContent = copy.badge;
      opts.calendarModeBadge.classList.toggle("personal", isPersonal);
      opts.calendarModeBadge.classList.toggle("shared", !isPersonal);
      if (opts.calendarModeBadge.style) {
        opts.calendarModeBadge.style.setProperty("--mode-accent-color", accent);
      }
    }

    if (opts.sideCalendarModeInfo) {
      opts.sideCalendarModeInfo.textContent = copy.sideInfo;
      if (opts.sideCalendarModeInfo.style) {
        opts.sideCalendarModeInfo.style.color = isPersonal ? accent : "";
        opts.sideCalendarModeInfo.style.fontWeight = isPersonal ? "700" : "";
      }
    }

    if (opts.sideCalendarLegendText) {
      opts.sideCalendarLegendText.textContent = copy.legend;
    }
    if (opts.sideCalendarLegendShared) {
      opts.sideCalendarLegendShared.textContent = t("sharedCalendar");
    }
    if (opts.sideCalendarModeLegend) {
      opts.sideCalendarModeLegend.classList.toggle("hidden-section", !isPersonal);
    }

    [opts.dayPanelShell, opts.calendarPanelShell].forEach((el) => {
      if (!el || !el.style || !el.classList) return;
      el.style.setProperty("--mode-accent-color", accent);
      el.style.setProperty("--mode-accent-rgb", accentRgb);
      el.style.setProperty("--mode-accent-panel-alpha", tintAlpha);
      el.classList.toggle("mode-context-personal", isPersonal);
      el.classList.toggle("mode-context-shared", !isPersonal);
    });
  }

  root.ProCalModules.calendarModeIndicators = {
    getAccentColor,
    getUiCopy,
    renderIndicators
  };
})(window);
