(function initPeopleAvailabilityModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getAbsentPersonIdsForRange(startDate, endDate, options) {
    const o = options || {};
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
    const rangesOverlap = typeof o.rangesOverlap === "function" ? o.rangesOverlap : () => false;
    const absences = Array.isArray(o.absences) ? o.absences : [];
    if (!isDateKey(startDate) || !isDateKey(endDate)) return new Set();
    const blocked = new Set();
    absences.forEach((absence) => {
      const personId = String((absence && absence.personId) || "");
      if (!personId) return;
      if (rangesOverlap(startDate, endDate, absence.startDate, absence.endDate)) blocked.add(personId);
    });
    return blocked;
  }

  function applyAbsenceRulesToChecklist(container, startDate, endDate, options) {
    if (!container) return;
    const o = options || {};
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    const blocked = getAbsentPersonIdsForRange(startDate, endDate, o);
    container.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      const personId = String(el.value || "");
      const isBlocked = blocked.has(personId);
      el.disabled = isBlocked;
      if (isBlocked) el.checked = false;
      const row = el.closest(".check-item");
      if (row) {
        row.classList.toggle("check-item-disabled", isBlocked);
        row.title = isBlocked ? t("personAbsentInRange") : "";
      }
    });
  }

  function refreshEventPeopleAvailability(options) {
    const o = options || {};
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
    const selectedDateKey = String(o.selectedDateKey || "");
    const eventStartValue = o.eventStart && o.eventStart.value;
    const eventEndValue = o.eventEnd && o.eventEnd.value;
    const startDate = isDateKey(eventStartValue) ? String(eventStartValue) : selectedDateKey;
    const endDate = isDateKey(eventEndValue) ? String(eventEndValue) : selectedDateKey;
    if (!isDateKey(startDate) || !isDateKey(endDate)) return;
    applyAbsenceRulesToChecklist(o.eventPeopleChecklist, startDate, endDate, o);
  }

  function refreshTaskChecklistAvailability(dateKey, options) {
    const o = options || {};
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
    const targetDate = isDateKey(dateKey) ? dateKey : String(o.selectedDateKey || "");
    if (!isDateKey(targetDate)) return;
    applyAbsenceRulesToChecklist(o.taskPersonChecklist, targetDate, targetDate, o);
  }

  function refreshEventTaskChecklistAvailability(options) {
    const o = options || {};
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : () => false;
    const selectedDateKey = String(o.selectedDateKey || "");
    const eventStartValue = o.eventStart && o.eventStart.value;
    const eventEndValue = o.eventEnd && o.eventEnd.value;
    const startDate = isDateKey(eventStartValue) ? String(eventStartValue) : selectedDateKey;
    const endDate = isDateKey(eventEndValue) ? String(eventEndValue) : selectedDateKey;
    if (!isDateKey(startDate) || !isDateKey(endDate)) return;
    applyAbsenceRulesToChecklist(o.eventTaskPeopleChecklist, startDate, endDate, o);
  }

  root.ProCalModules.peopleAvailability = {
    getAbsentPersonIdsForRange,
    applyAbsenceRulesToChecklist,
    refreshEventPeopleAvailability,
    refreshTaskChecklistAvailability,
    refreshEventTaskChecklistAvailability
  };
})(window);

