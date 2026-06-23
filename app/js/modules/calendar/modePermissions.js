(function initCalendarModePermissionsModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function updateSideDayQuickAddVisibility(options) {
    const o = options || {};
    const canQuickAddEvent = Boolean(o.canQuickAddEvent);
    const canQuickAddTask = Boolean(o.canQuickAddTask);
    const canQuickAddComp = Boolean(o.canQuickAddComp);
    if (o.sideAddEventBtn) o.sideAddEventBtn.style.display = canQuickAddEvent ? "" : "none";
    if (o.sideAddTaskBtn) o.sideAddTaskBtn.style.display = canQuickAddTask ? "" : "none";
    if (o.sideAddCompBtn) o.sideAddCompBtn.style.display = canQuickAddComp ? "" : "none";
    if (!o.sideDayQuickAdd) return;
    const hasActions = canQuickAddEvent || canQuickAddTask || canQuickAddComp;
    o.sideDayQuickAdd.style.display = hasActions ? "" : "none";
    if (!hasActions && typeof o.toggleSideDayQuickAdd === "function") o.toggleSideDayQuickAdd(false);
  }

  function applyCalendarModePermissions(options) {
    const o = options || {};
    const restrict = Boolean(o.restrict);
    const restrictSharedEventCreate = Boolean(o.restrictSharedEventCreate);
    const restrictSharedTaskCreate = Boolean(o.restrictSharedTaskCreate);
    const taskViewEnabled = Boolean(o.taskViewEnabled);
    const legacyAbsenceEditEnabled = Boolean(o.legacyAbsenceEditEnabled);

    if (o.openEventFormBtn) o.openEventFormBtn.style.display = (restrict || restrictSharedEventCreate) ? "none" : "";
    if (o.openTaskFormBtn) o.openTaskFormBtn.style.display = (!taskViewEnabled || restrictSharedTaskCreate) ? "none" : "";
    if (o.addEventBtn) o.addEventBtn.style.display = restrictSharedEventCreate ? "none" : "";
    if (o.openAbsenceFormBtn) o.openAbsenceFormBtn.style.display = "none";
    if (o.sideAddAbsenceBtn) o.sideAddAbsenceBtn.style.display = "none";

    if (typeof o.updateSideDayQuickAddVisibility === "function") o.updateSideDayQuickAddVisibility();

    if (restrict || !legacyAbsenceEditEnabled) {
      if (o.eventFormSection) o.eventFormSection.classList.add("hidden-section");
      if (o.absenceFormSection) o.absenceFormSection.classList.add("hidden-section");
    }
  }

  root.ProCalModules.calendarModePermissions = {
    updateSideDayQuickAddVisibility,
    applyCalendarModePermissions
  };
})(window);
