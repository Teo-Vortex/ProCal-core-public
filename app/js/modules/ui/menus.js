(function initUiMenus(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function showPanel(panel) {
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }

  function hidePanel(panel) {
    if (!panel) return;
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }

  function openDayMenu(options) {
    const opts = options || {};
    const now = Number(opts.nowTs);
    const suppressUntil = Number(opts.suppressDayMenuOpenUntil);
    if (Number.isFinite(now) && Number.isFinite(suppressUntil) && now < suppressUntil) return false;

    const closeEventPreview = typeof opts.closeEventPreview === "function" ? opts.closeEventPreview : null;
    if (closeEventPreview) closeEventPreview();

    const todayKey = String(opts.todayKey || "");
    const nextSelected = String(opts.dateKey || opts.selectedDateKey || todayKey || "");
    if (!nextSelected) return false;
    if (typeof opts.setSelectedDateKey === "function") opts.setSelectedDateKey(nextSelected);

    const selectedDateTitle = opts.selectedDateTitle;
    const parseDateKey = typeof opts.parseDateKey === "function" ? opts.parseDateKey : (() => new Date());
    const getLocale = typeof opts.getLocale === "function" ? opts.getLocale : (() => "en");
    if (selectedDateTitle) {
      selectedDateTitle.textContent = parseDateKey(nextSelected).toLocaleDateString(getLocale(), {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }

    const startEventCreateMode = typeof opts.startEventCreateMode === "function" ? opts.startEventCreateMode : null;
    if (startEventCreateMode) startEventCreateMode(nextSelected);

    const categories = Array.isArray(opts.categories) ? opts.categories : [];
    if (opts.eventCategory && categories.length && !opts.eventCategory.value) {
      opts.eventCategory.value = categories[0].id;
    }

    const renderAbsentOptionsForRange = typeof opts.renderAbsentOptionsForRange === "function" ? opts.renderAbsentOptionsForRange : null;
    if (renderAbsentOptionsForRange) renderAbsentOptionsForRange();

    if (opts.absenceStart) opts.absenceStart.value = nextSelected;
    if (opts.absenceEnd) opts.absenceEnd.value = nextSelected;

    const setDayMenuSectionMode = typeof opts.setDayMenuSectionMode === "function" ? opts.setDayMenuSectionMode : null;
    if (setDayMenuSectionMode) setDayMenuSectionMode("list");

    const refreshTaskChecklistAvailability = typeof opts.refreshTaskChecklistAvailability === "function"
      ? opts.refreshTaskChecklistAvailability
      : null;
    if (refreshTaskChecklistAvailability) refreshTaskChecklistAvailability(nextSelected);

    const renderStandaloneTaskList = typeof opts.renderStandaloneTaskList === "function" ? opts.renderStandaloneTaskList : null;
    if (renderStandaloneTaskList) renderStandaloneTaskList(nextSelected);

    const showDayActionChoices = typeof opts.showDayActionChoices === "function" ? opts.showDayActionChoices : null;
    if (showDayActionChoices) showDayActionChoices();

    const renderSelectedDayPanel = typeof opts.renderSelectedDayPanel === "function" ? opts.renderSelectedDayPanel : null;
    if (renderSelectedDayPanel) renderSelectedDayPanel();

    showPanel(opts.dayMenu);
    return true;
  }

  function setDayMenuSectionMode(options) {
    const opts = options || {};
    const mode = opts.mode;
    const normalizedMode = mode === "event" || mode === "absence" || mode === "task" ? mode : "list";
    if (opts.eventFormSection) opts.eventFormSection.classList.toggle("hidden-section", normalizedMode !== "event");
    if (opts.absenceFormSection) opts.absenceFormSection.classList.toggle("hidden-section", normalizedMode !== "absence");
    if (opts.taskFormSection) opts.taskFormSection.classList.toggle("hidden-section", normalizedMode !== "task");
    if (opts.eventListWrap) opts.eventListWrap.classList.toggle("hidden-section", normalizedMode !== "list");
    if (normalizedMode === "task" && typeof opts.onTaskMode === "function") opts.onTaskMode();
    if (normalizedMode === "event" && typeof opts.onEventMode === "function") opts.onEventMode();
    return normalizedMode;
  }

  function hideDayActionChoices(options) {
    const btns = options && options.dayActionButtons;
    if (!btns) return;
    btns.classList.add("hidden-section");
  }

  function showDayActionChoices(options) {
    const opts = options || {};
    const btns = opts.dayActionButtons;
    if (!btns) return;
    btns.classList.remove("hidden-section");
    if (typeof opts.applyCalendarModePermissions === "function") opts.applyCalendarModePermissions();
    if (typeof opts.renderCalendar === "function") opts.renderCalendar();
    if (typeof opts.renderSelectedDayPanel === "function") opts.renderSelectedDayPanel();
    if (typeof opts.renderUpcomingList === "function") opts.renderUpcomingList();
  }

  function openMenu(options) {
    const opts = options || {};
    if (typeof opts.beforeOpen === "function") opts.beforeOpen();
    showPanel(opts.panel);
    if (typeof opts.afterOpen === "function") opts.afterOpen();
  }

  function closeMenu(options) {
    const opts = options || {};
    hidePanel(opts.panel);
    if (typeof opts.afterClose === "function") opts.afterClose();
  }

  function setUpcomingCollapsed(options) {
    const opts = options || {};
    const next = Boolean(opts.next);
    if (typeof opts.setValue === "function") opts.setValue(next);
    if (opts.layoutEl) opts.layoutEl.classList.toggle("upcoming-collapsed", next);
    if (opts.upcomingPanel) opts.upcomingPanel.classList.toggle("collapsed", next);
    if (opts.storageKey && opts.storageRef) {
      try {
        opts.storageRef.setItem(opts.storageKey, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
    }
    if (typeof opts.updateUpcomingToggleUI === "function") opts.updateUpcomingToggleUI();
  }

  function updateUpcomingToggleUI(options) {
    const opts = options || {};
    const btn = opts.toggleUpcomingBtn;
    if (!btn) return;
    const collapsed = Boolean(opts.upcomingCollapsed);
    btn.textContent = collapsed ? "<<" : ">>";
    btn.setAttribute("aria-label", collapsed ? "Expand upcoming panel" : "Collapse upcoming panel");
    btn.title = collapsed ? "Expand" : "Collapse";
  }

  root.ProCalModules.uiMenus = {
    showPanel,
    hidePanel,
    openDayMenu,
    setDayMenuSectionMode,
    hideDayActionChoices,
    showDayActionChoices,
    openMenu,
    closeMenu,
    setUpcomingCollapsed,
    updateUpcomingToggleUI
  };
})(window);
