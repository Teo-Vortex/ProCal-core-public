(function initCalendarDayMenuFlowModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function startAbsenceCreateMode(options) {
    const o = options || {};
    if (!o.legacyAbsenceEditEnabled) {
      if (typeof o.setEditingAbsenceId === "function") o.setEditingAbsenceId(null);
      if (o.absenceFormSection) o.absenceFormSection.classList.add("hidden-section");
      return;
    }
    if (typeof o.setEditingAbsenceId === "function") o.setEditingAbsenceId(null);
    if (o.absenceForm && typeof o.absenceForm.reset === "function") o.absenceForm.reset();
    const base = String(o.baseDateKey || o.selectedDateKey || o.todayKey || "");
    if (o.absenceStart) o.absenceStart.value = base;
    if (o.absenceEnd) o.absenceEnd.value = base;
    if (typeof o.applyTranslations === "function") o.applyTranslations();
  }

  function updateEventTasksToggleLabel(options) {
    const o = options || {};
    if (!o.toggleEventTasksBtn || !o.eventTasksEditorWrap) return;
    const expanded = !o.eventTasksEditorWrap.classList.contains("hidden-section");
    const t = typeof o.t === "function" ? o.t : ((key) => key);
    o.toggleEventTasksBtn.textContent = `${t("manageEventTasks")} ${expanded ? "[v]" : "[>]"}`;
  }

  function startEventCreateMode(options) {
    const o = options || {};
    if (typeof o.setEditingEventSeriesId === "function") o.setEditingEventSeriesId(null);
    const base = String(o.baseDateKey || o.selectedDateKey || o.todayKey || "");
    const prepareCreateForm = typeof o.prepareCreateForm === "function" ? o.prepareCreateForm : null;
    if (!prepareCreateForm) return;
    prepareCreateForm({
      eventForm: o.eventForm,
      baseDateKey: base,
      eventStart: o.eventStart,
      eventEnd: o.eventEnd,
      eventAllDay: o.eventAllDay,
      eventTimeInput: o.eventTimeInput,
      eventTimeEndInput: o.eventTimeEndInput,
      repeatFreq: o.repeatFreq,
      repeatEndMode: o.repeatEndMode,
      repeatCount: o.repeatCount,
      repeatUntil: o.repeatUntil,
      eventCategory: o.eventCategory,
      categories: o.categories,
      eventTasksEditorWrap: o.eventTasksEditorWrap
    });
    if (typeof o.clearPeopleChecks === "function") o.clearPeopleChecks();
    if (typeof o.setDraftEventTasks === "function") o.setDraftEventTasks([]);
    if (typeof o.renderEventDraftTaskList === "function") o.renderEventDraftTaskList();
    if (typeof o.updateRepeatVisibility === "function") o.updateRepeatVisibility();
    if (typeof o.renderAbsentOptionsForRange === "function") o.renderAbsentOptionsForRange();
    if (typeof o.applyTranslations === "function") o.applyTranslations();
  }

  function startEventEditMode(options) {
    const o = options || {};
    const findBaseEventById = typeof o.findBaseEventById === "function" ? o.findBaseEventById : null;
    if (!findBaseEventById) return false;
    const base = findBaseEventById(o.seriesId);
    if (!base) return false;
    if (typeof o.setEditingEventSeriesId === "function") o.setEditingEventSeriesId(base.id);
    const prepareEditForm = typeof o.prepareEditForm === "function" ? o.prepareEditForm : null;
    if (!prepareEditForm) return false;
    const prepared = prepareEditForm({
      baseEvent: base,
      eventForm: o.eventForm,
      eventStart: o.eventStart,
      eventEnd: o.eventEnd,
      eventAllDay: o.eventAllDay,
      eventTimeInput: o.eventTimeInput,
      eventTimeEndInput: o.eventTimeEndInput,
      eventDescription: o.eventDescription,
      eventCategory: o.eventCategory,
      categories: o.categories,
      repeatFreq: o.repeatFreq,
      repeatEndMode: o.repeatEndMode,
      repeatCount: o.repeatCount,
      repeatUntil: o.repeatUntil,
      eventPeopleChecklist: o.eventPeopleChecklist,
      eventAbsent: o.eventAbsent,
      eventTasksEditorWrap: o.eventTasksEditorWrap,
      eventTitleInput: o.eventTitleInput
    });
    if (!prepared) return false;
    if (typeof o.updateRepeatVisibility === "function") o.updateRepeatVisibility();
    if (typeof o.renderAbsentOptionsForRange === "function") o.renderAbsentOptionsForRange();
    if (typeof o.refreshEventPeopleAvailability === "function") o.refreshEventPeopleAvailability();
    const nextDraft = Array.isArray(base.tasks) ? base.tasks.map((task) => ({ ...task })) : [];
    if (typeof o.setDraftEventTasks === "function") o.setDraftEventTasks(nextDraft);
    if (typeof o.renderEventDraftTaskList === "function") o.renderEventDraftTaskList();
    if (typeof o.applyTranslations === "function") o.applyTranslations();
    return true;
  }

  function startAbsenceEditMode(options) {
    const o = options || {};
    if (!o.legacyAbsenceEditEnabled) return false;
    const absences = Array.isArray(o.absences) ? o.absences : [];
    const target = absences.find((item) => item && item.id === o.absenceId);
    if (!target) return false;
    if (typeof o.setEditingAbsenceId === "function") o.setEditingAbsenceId(target.id);
    if (o.absencePerson) o.absencePerson.value = target.personId;
    if (o.absenceStart) o.absenceStart.value = target.startDate;
    if (o.absenceEnd) o.absenceEnd.value = target.endDate;
    if (o.absenceNote) o.absenceNote.value = target.note || "";
    if (typeof o.applyTranslations === "function") o.applyTranslations();
    if (typeof o.openDayMenu === "function") o.openDayMenu(o.selectedDateKey || target.startDate);
    if (typeof o.hideDayActionChoices === "function") o.hideDayActionChoices();
    if (typeof o.setDayMenuSectionMode === "function") o.setDayMenuSectionMode("absence");
    return true;
  }

  function syncRepeatUntilMin(options) {
    const o = options || {};
    if (!o.repeatUntil) return;
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const eventStartValue = o.eventStart && typeof o.eventStart.value === "string" ? o.eventStart.value : "";
    const base = isDateKey(eventStartValue) ? eventStartValue : "";
    o.repeatUntil.min = base || "";
  }

  function updateRepeatVisibility(options) {
    const o = options || {};
    if (!o.repeatFreq || !o.repeatEndMode || !o.repeatCountWrap || !o.repeatUntilWrap) return;
    const freq = o.repeatFreq.value;
    if (freq === "none") {
      o.repeatCountWrap.classList.add("hidden-section");
      o.repeatUntilWrap.classList.add("hidden-section");
      o.repeatEndMode.disabled = true;
      return;
    }

    o.repeatEndMode.disabled = false;
    const mode = o.repeatEndMode.value;
    o.repeatCountWrap.classList.toggle("hidden-section", mode !== "count");
    o.repeatUntilWrap.classList.toggle("hidden-section", mode !== "until");
    if (mode === "until" && typeof o.syncRepeatUntilMin === "function") o.syncRepeatUntilMin();
  }

  function buildRecurrenceRule(options) {
    const o = options || {};
    const freq = o.freq;
    const endMode = o.endMode;
    const count = o.count;
    const untilDate = o.untilDate;
    const baseStartDate = o.baseStartDate;
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);

    if (freq === "none") return null;
    if (!["daily", "weekly", "monthly", "yearly"].includes(freq)) return null;

    if (endMode === "count") {
      if (!Number.isFinite(count) || count < 1) return null;
      return { freq, endMode, count, untilDate: null };
    }

    if (endMode === "until") {
      if (!isDateKey(untilDate) || untilDate < baseStartDate) return null;
      return { freq, endMode, count: null, untilDate };
    }

    return { freq, endMode: "forever", count: null, untilDate: null };
  }

  function renderAbsentOptionsForRange(options) {
    const o = options || {};
    if (!o.eventAbsent) return;
    const roster = Array.isArray(o.roster) ? o.roster : [];
    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const startDate = isDateKey(o.eventStart && o.eventStart.value) ? String(o.eventStart.value) : String(o.selectedDateKey || "");
    const endDate = isDateKey(o.eventEnd && o.eventEnd.value) ? String(o.eventEnd.value) : String(o.selectedDateKey || "");
    const prev = Array.from(o.eventAbsent.selectedOptions || []).map((opt) => String(opt.value || ""));
    o.eventAbsent.innerHTML = "";
    if (!isDateKey(startDate) || !isDateKey(endDate)) return;

    const absences = Array.isArray(o.absences) ? o.absences : [];
    const seen = new Set();
    const rangesOverlap = typeof o.rangesOverlap === "function" ? o.rangesOverlap : (() => false);
    const getPersonDisplayName = typeof o.getPersonDisplayName === "function" ? o.getPersonDisplayName : ((p) => String((p && p.name) || ""));
    const t = typeof o.t === "function" ? o.t : ((key) => key);

    absences.forEach((absence) => {
      if (!absence) return;
      if (!rangesOverlap(startDate, endDate, absence.startDate, absence.endDate)) return;
      if (seen.has(absence.personId)) return;
      seen.add(absence.personId);
      const person = roster.find((p) => p && p.id === absence.personId);
      if (!person) return;
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = `${getPersonDisplayName(person, roster)} (${absence.startDate} ${t("to")} ${absence.endDate})`;
      option.style.color = person.color;
      option.selected = prev.includes(person.id);
      o.eventAbsent.appendChild(option);
    });

    if (typeof o.refreshEventPeopleAvailability === "function") o.refreshEventPeopleAvailability();
    if (typeof o.refreshEventTaskChecklistAvailability === "function") o.refreshEventTaskChecklistAvailability();
  }

  root.ProCalModules.calendarDayMenuFlow = {
    updateEventTasksToggleLabel,
    startEventCreateMode,
    startEventEditMode,
    startAbsenceCreateMode,
    startAbsenceEditMode,
    syncRepeatUntilMin,
    updateRepeatVisibility,
    buildRecurrenceRule,
    renderAbsentOptionsForRange
  };
})(window);
