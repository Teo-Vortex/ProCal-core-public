(function initReportsPanel(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function openMenu(options) {
    const opts = options || {};
    if (!opts.canReadOwnReports) return;
    if (typeof opts.renderReportPeopleOptions === "function") opts.renderReportPeopleOptions();
    if (opts.reportStart && !opts.reportStart.value && opts.selectedDateKey) opts.reportStart.value = String(opts.selectedDateKey);
    if (opts.reportEnd && !opts.reportEnd.value && opts.selectedDateKey) opts.reportEnd.value = String(opts.selectedDateKey);
    if (opts.reportResults) opts.reportResults.innerHTML = "";
    if (opts.reportsMenu) {
      opts.reportsMenu.classList.remove("hidden");
      opts.reportsMenu.setAttribute("aria-hidden", "false");
    }
  }

  function closeMenu(options) {
    const menu = options && options.reportsMenu;
    if (!menu) return;
    menu.classList.add("hidden");
    menu.setAttribute("aria-hidden", "true");
  }

  root.ProCalModules.reportsPanel = { openMenu, closeMenu };
})(window);
