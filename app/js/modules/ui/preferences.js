(function initUiPreferences(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function buildSessionFingerprint(options) {
    const opts = options || {};
    const perms = Array.from(opts.currentUserPermissions || []).sort().join("|");
    const featureFlags = opts.currentUserFeatureFlags && typeof opts.currentUserFeatureFlags === "object"
      ? Object.keys(opts.currentUserFeatureFlags)
        .sort()
        .map((key) => `${key}:${opts.currentUserFeatureFlags[key] ? "1" : "0"}`)
        .join("|")
      : "";
    return [
      String(opts.currentUserId || ""),
      String(opts.currentUserName || ""),
      String(opts.currentUserViewMode || ""),
      String(opts.currentUserRole || ""),
      String(opts.currentUserStatus || ""),
      String(opts.currentUserDisplayColor || ""),
      String(Number.isFinite(Number(opts.currentUserCalendarTintOpacity)) ? Number(opts.currentUserCalendarTintOpacity) : ""),
      perms,
      featureFlags
    ].join("::");
  }

  function getUserUiPrefsKey(options) {
    const opts = options || {};
    if (!opts.currentUserId) return "";
    return `${String(opts.userUiPrefsKeyPrefix || "procal_ui_prefs")}_${String(opts.currentUserId)}_${String(opts.currentCalendarMode || "shared")}`;
  }

  function normalizeMainPanel(panel) {
    const value = String(panel || "");
    return value === "notes" || value === "events" ? value : "calendar";
  }

  function readMainPanelPreference(options) {
    const opts = options || {};
    const storage = opts.storage || root.localStorage;
    const key = String(opts.mainPanelKey || "procal_main_panel");
    try {
      return normalizeMainPanel(storage.getItem(key));
    } catch {
      return "calendar";
    }
  }

  function persistUiPrefs(options) {
    const opts = options || {};
    const storage = opts.storage || root.localStorage;
    const key = getUserUiPrefsKey(opts);
    if (!key) return;
    const panel = normalizeMainPanel(opts.currentMainPanel);
    const payload = {
      view: opts.currentView === "year" ? "year" : "month",
      panel,
      filters: {
        categoryIds: Array.from((opts.activeFilters && opts.activeFilters.categoryIds) || []),
        peopleIds: Array.from((opts.activeFilters && opts.activeFilters.peopleIds) || [])
      }
    };
    try {
      storage.setItem(key, JSON.stringify(payload));
      storage.setItem(String(opts.mainPanelKey || "procal_main_panel"), panel);
    } catch {
      // no-op
    }
  }

  function restoreUiPrefs(options) {
    const opts = options || {};
    const storage = opts.storage || root.localStorage;
    const key = getUserUiPrefsKey(opts);
    if (!key) return;
    const setMainPanel = typeof opts.setMainPanel === "function" ? opts.setMainPanel : null;
    const setCurrentView = typeof opts.setCurrentView === "function" ? opts.setCurrentView : null;
    const activeFilters = opts.activeFilters || {};
    const categoryIdsSet = activeFilters.categoryIds;
    const peopleIdsSet = activeFilters.peopleIds;
    const fallbackPanel = readMainPanelPreference({
      storage,
      mainPanelKey: opts.mainPanelKey
    });
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        if (setMainPanel) setMainPanel(fallbackPanel, false);
        return;
      }
      const parsed = JSON.parse(raw);
      if (setCurrentView) setCurrentView(parsed && parsed.view === "year" ? "year" : "month");

      if (categoryIdsSet && typeof categoryIdsSet.clear === "function") categoryIdsSet.clear();
      if (peopleIdsSet && typeof peopleIdsSet.clear === "function") peopleIdsSet.clear();

      const allowedCats = new Set((Array.isArray(opts.categories) ? opts.categories : []).map((x) => String(x && x.id || "")));
      const allowedPeople = new Set((Array.isArray(opts.people) ? opts.people : []).map((x) => String(x && x.id || "")));
      const catIds = Array.isArray(parsed && parsed.filters && parsed.filters.categoryIds) ? parsed.filters.categoryIds : [];
      const peopleIds = Array.isArray(parsed && parsed.filters && parsed.filters.peopleIds) ? parsed.filters.peopleIds : [];

      catIds.forEach((id) => {
        const v = String(id || "");
        if (allowedCats.has(v) && categoryIdsSet && typeof categoryIdsSet.add === "function") categoryIdsSet.add(v);
      });
      peopleIds.forEach((id) => {
        const v = String(id || "");
        if (allowedPeople.has(v) && peopleIdsSet && typeof peopleIdsSet.add === "function") peopleIdsSet.add(v);
      });

      if (setMainPanel) setMainPanel(normalizeMainPanel(parsed && parsed.panel), false);
    } catch {
      if (setMainPanel) setMainPanel(fallbackPanel, false);
    }
  }

  function updateNotesToggleButton(options) {
    const opts = options || {};
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const notesMode = opts.currentMainPanel === "notes";
    const eventsMode = opts.currentMainPanel === "events";
    const calendarMode = !notesMode && !eventsMode;
    const tabs = [
      [opts.calendarPanelTabBtn, "calendar", calendarMode, t("calendarLabel")],
      [opts.eventsPanelTabBtn, "events", eventsMode, t("eventsTitle")],
      [opts.notesToggleBtn, "notes", notesMode, t("notesToggle")]
    ];
    tabs.forEach(([button, key, active, label]) => {
      if (!button) return;
      button.textContent = label;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.setAttribute("data-main-panel-tab", key);
    });
    if (opts.notesToggleBtn) {
      opts.notesToggleBtn.textContent = t("notesToggle");
    }
    if (opts.notesViewMonthBtn) {
      const personalActive = calendarMode && String(opts.currentCalendarMode || "shared") === "personal";
      opts.notesViewMonthBtn.textContent = t("personalCalendar");
      opts.notesViewMonthBtn.classList.toggle("active", personalActive);
      opts.notesViewMonthBtn.setAttribute("aria-pressed", personalActive ? "true" : "false");
    }
    if (opts.notesViewYearBtn) {
      const sharedActive = calendarMode && String(opts.currentCalendarMode || "shared") !== "personal";
      opts.notesViewYearBtn.textContent = t("sharedCalendar");
      opts.notesViewYearBtn.classList.toggle("active", sharedActive);
      opts.notesViewYearBtn.setAttribute("aria-pressed", sharedActive ? "true" : "false");
    }
    if (opts.notesViewToggle) {
      opts.notesViewToggle.classList.toggle("hidden-section", !calendarMode);
      opts.notesViewToggle.setAttribute("aria-hidden", calendarMode ? "false" : "true");
    }
    if (opts.notesViewModeLabel) {
      opts.notesViewModeLabel.classList.toggle("hidden-section", !calendarMode);
      opts.notesViewModeLabel.setAttribute("aria-hidden", calendarMode ? "false" : "true");
    }
  }

  function renderMainPanelUI(options) {
    const opts = options || {};
    const notesMode = opts.currentMainPanel === "notes";
    const eventsMode = opts.currentMainPanel === "events";
    if (opts.layoutEl) {
      opts.layoutEl.classList.toggle("notes-mode", notesMode);
      opts.layoutEl.classList.toggle("events-mode", eventsMode);
    }
    if (opts.notesPanel) opts.notesPanel.classList.toggle("hidden-section", !notesMode);
    if (opts.eventsPanel) opts.eventsPanel.classList.toggle("hidden-section", !eventsMode);
    const doc = opts.documentRef || root.document;
    const calendarPanel = doc && typeof doc.querySelector === "function" ? doc.querySelector(".calendar-panel") : null;
    const upcomingPanel = doc && typeof doc.getElementById === "function" ? doc.getElementById("upcomingPanel") : null;
    if (calendarPanel) calendarPanel.classList.toggle("hidden-section", notesMode || eventsMode);
    if (upcomingPanel) upcomingPanel.classList.toggle("hidden-section", eventsMode);
    updateNotesToggleButton({
      calendarPanelTabBtn: opts.calendarPanelTabBtn,
      eventsPanelTabBtn: opts.eventsPanelTabBtn,
      notesToggleBtn: opts.notesToggleBtn,
      notesViewModeLabel: opts.notesViewModeLabel,
      notesViewToggle: opts.notesViewToggle,
      notesViewMonthBtn: opts.notesViewMonthBtn,
      notesViewYearBtn: opts.notesViewYearBtn,
      currentMainPanel: opts.currentMainPanel,
      currentCalendarMode: opts.currentCalendarMode,
      t: opts.t
    });
  }

  root.ProCalModules.uiPreferences = {
    buildSessionFingerprint,
    getUserUiPrefsKey,
    readMainPanelPreference,
    persistUiPrefs,
    restoreUiPrefs,
    updateNotesToggleButton,
    renderMainPanelUI
  };
})(window);
