(function initUiMobileSheetsModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  const MOBILE_SHEET_MIN_VH = 42;
  const MOBILE_SHEET_MAX_VH = 92;
  let activeMobileSheetDrag = null;

  function clampMobileSheetHeightVh(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return MOBILE_SHEET_MIN_VH;
    return Math.min(MOBILE_SHEET_MAX_VH, Math.max(MOBILE_SHEET_MIN_VH, numeric));
  }

  function setMobileSheetHeight(panelEl, heightVh) {
    if (!panelEl) return;
    panelEl.style.setProperty("--mobile-sheet-height", `${clampMobileSheetHeightVh(heightVh)}vh`);
  }

  function clearMobileSheetHeight(panelEl) {
    if (!panelEl) return;
    panelEl.style.removeProperty("--mobile-sheet-height");
    panelEl.classList.remove("mobile-sheet-dragging");
  }

  function getMobileSheetHeight(panelEl, fallbackVh) {
    if (!panelEl) return fallbackVh;
    const raw = panelEl.style.getPropertyValue("--mobile-sheet-height");
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clampMobileSheetHeightVh(parsed) : fallbackVh;
  }

  function startMobileSheetDrag(options) {
    const opts = options || {};
    const event = opts.event;
    const panelEl = opts.panelEl;
    const fallbackVh = Number.isFinite(Number(opts.fallbackVh)) ? Number(opts.fallbackVh) : MOBILE_SHEET_MIN_VH;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!isMobileViewport() || !panelEl || !event || typeof event.clientY !== "number") return;
    if (typeof event.button === "number" && event.button !== 0) return;
    if (event.target && typeof event.target.closest === "function" && event.target.closest("button")) return;
    activeMobileSheetDrag = {
      panelEl,
      pointerId: typeof event.pointerId === "number" ? event.pointerId : null,
      startY: event.clientY,
      startVh: getMobileSheetHeight(panelEl, fallbackVh)
    };
    panelEl.classList.add("mobile-sheet-dragging");
    event.preventDefault();
  }

  function handleMobileSheetDragMove(event) {
    if (!activeMobileSheetDrag) return;
    if (
      activeMobileSheetDrag.pointerId !== null &&
      typeof event.pointerId === "number" &&
      event.pointerId !== activeMobileSheetDrag.pointerId
    ) {
      return;
    }
    const viewportHeight = Math.max(root.innerHeight || 0, 1);
    const startPx = (activeMobileSheetDrag.startVh / 100) * viewportHeight;
    const nextPx = startPx - (event.clientY - activeMobileSheetDrag.startY);
    const nextVh = (nextPx / viewportHeight) * 100;
    setMobileSheetHeight(activeMobileSheetDrag.panelEl, nextVh);
    event.preventDefault();
  }

  function finishMobileSheetDrag() {
    if (!activeMobileSheetDrag) return;
    activeMobileSheetDrag.panelEl.classList.remove("mobile-sheet-dragging");
    activeMobileSheetDrag = null;
  }

  function closeMobileUpcomingPanel(options) {
    const opts = options || {};
    const upcomingPanel = opts.upcomingPanel;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!upcomingPanel || !isMobileViewport()) return;
    upcomingPanel.classList.add("hidden-section");
    upcomingPanel.setAttribute("aria-hidden", "true");
    clearMobileSheetHeight(upcomingPanel);
  }

  function closeMobileDayPanel(options) {
    const opts = options || {};
    const dayPanelShell = opts.dayPanelShell;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!dayPanelShell || !isMobileViewport()) return;
    dayPanelShell.classList.remove("mobile-sheet-open");
    dayPanelShell.setAttribute("aria-hidden", "true");
    clearMobileSheetHeight(dayPanelShell);
  }

  function openMobileUpcomingPanel(options) {
    const opts = options || {};
    const upcomingPanel = opts.upcomingPanel;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!upcomingPanel || !isMobileViewport()) return;
    closeMobileDayPanel(opts);
    setMobileSheetHeight(upcomingPanel, Number(opts.defaultHeightVh || MOBILE_SHEET_MIN_VH));
    upcomingPanel.classList.remove("hidden-section");
    upcomingPanel.setAttribute("aria-hidden", "false");
  }

  function openMobileDayPanel(options) {
    const opts = options || {};
    const dayPanelShell = opts.dayPanelShell;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!dayPanelShell || !isMobileViewport()) return;
    closeMobileUpcomingPanel(opts);
    setMobileSheetHeight(dayPanelShell, Number(opts.defaultHeightVh || MOBILE_SHEET_MIN_VH));
    dayPanelShell.classList.add("mobile-sheet-open");
    dayPanelShell.setAttribute("aria-hidden", "false");
  }

  function updateMobileResponsivePanels(options) {
    const opts = options || {};
    const upcomingPanel = opts.upcomingPanel;
    const dayPanelShell = opts.dayPanelShell;
    const toggleUpcomingBtn = opts.toggleUpcomingBtn;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const updateUpcomingToggleUI = typeof opts.updateUpcomingToggleUI === "function" ? opts.updateUpcomingToggleUI : null;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!upcomingPanel) return;
    const mobile = isMobileViewport();
    upcomingPanel.classList.toggle("mobile-sheet", mobile);
    if (dayPanelShell) {
      dayPanelShell.classList.remove("mobile-sheet-open");
      clearMobileSheetHeight(dayPanelShell);
      if (mobile) dayPanelShell.setAttribute("aria-hidden", "true");
      else dayPanelShell.removeAttribute("aria-hidden");
    }
    if (mobile) {
      upcomingPanel.classList.add("hidden-section");
      upcomingPanel.setAttribute("aria-hidden", "true");
      clearMobileSheetHeight(upcomingPanel);
      if (toggleUpcomingBtn) {
        toggleUpcomingBtn.textContent = "\u00D7";
        toggleUpcomingBtn.setAttribute("aria-label", t("close"));
        toggleUpcomingBtn.title = t("close");
      }
      return;
    }
    upcomingPanel.classList.remove("hidden-section");
    upcomingPanel.setAttribute("aria-hidden", "false");
    clearMobileSheetHeight(upcomingPanel);
    if (updateUpcomingToggleUI) updateUpcomingToggleUI();
  }

  function handleMobileSheetOutsidePointerDown(options) {
    const opts = options || {};
    const event = opts.event;
    const dayPanelShell = opts.dayPanelShell;
    const upcomingPanel = opts.upcomingPanel;
    const isMobileViewport = typeof opts.isMobileViewport === "function" ? opts.isMobileViewport : (() => false);
    if (!isMobileViewport() || !event) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const dayPanelOpen = Boolean(dayPanelShell && dayPanelShell.classList.contains("mobile-sheet-open"));
    const upcomingOpen = Boolean(
      upcomingPanel &&
      upcomingPanel.classList.contains("mobile-sheet") &&
      !upcomingPanel.classList.contains("hidden-section")
    );

    if (dayPanelOpen && dayPanelShell && !dayPanelShell.contains(target) && !target.closest("#mobileDayBtn")) {
      closeMobileDayPanel(opts);
    }
    if (upcomingOpen && upcomingPanel && !upcomingPanel.contains(target) && !target.closest("#mobileUpcomingBtn")) {
      closeMobileUpcomingPanel(opts);
    }
  }

  root.ProCalModules.uiMobileSheets = {
    clampMobileSheetHeightVh,
    setMobileSheetHeight,
    clearMobileSheetHeight,
    getMobileSheetHeight,
    startMobileSheetDrag,
    handleMobileSheetDragMove,
    finishMobileSheetDrag,
    updateMobileResponsivePanels,
    openMobileUpcomingPanel,
    closeMobileUpcomingPanel,
    openMobileDayPanel,
    closeMobileDayPanel,
    handleMobileSheetOutsidePointerDown
  };
})(window);
