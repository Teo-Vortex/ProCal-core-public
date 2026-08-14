(function initEventsPreviewFlowModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function closeEventPreview(options) {
    const o = options || {};
    if (typeof o.setPreviewState === "function") {
      o.setPreviewState({
        seriesId: null,
        dateKey: null,
        snapshot: null
      });
    }
    const mod = o.eventsFormPreviewModule;
    if (!mod || typeof mod.closePreview !== "function") return;
    mod.closePreview({ eventPreviewModal: o.eventPreviewModal });
  }

  function openEventEditModal(options) {
    const o = options || {};
    const targetId = String(o.seriesId || "").trim();
    if (!targetId) return false;
    if (o.personalMode) {
      const findBaseEventById = typeof o.findBaseEventById === "function" ? o.findBaseEventById : null;
      const isSharedEventReadOnlyInPersonalMode = typeof o.isSharedEventReadOnlyInPersonalMode === "function"
        ? o.isSharedEventReadOnlyInPersonalMode
        : null;
      const base = findBaseEventById ? findBaseEventById(targetId) : null;
      if (base && isSharedEventReadOnlyInPersonalMode && isSharedEventReadOnlyInPersonalMode(base)) return false;
    }

    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    if (isDateKey(o.dateKey) && typeof o.setSelectedDateKey === "function") {
      o.setSelectedDateKey(String(o.dateKey));
    }

    if (typeof o.closeEventPreview === "function") o.closeEventPreview();
    if (typeof o.openDayMenu === "function") o.openDayMenu(o.getSelectedDateKey ? o.getSelectedDateKey() : o.todayKey);
    if (typeof o.hideDayActionChoices === "function") o.hideDayActionChoices();

    const ok = typeof o.startEventEditMode === "function" ? o.startEventEditMode(targetId) : false;
    if (!ok) {
      if (typeof o.setDayMenuSectionMode === "function") o.setDayMenuSectionMode("list");
      if (typeof o.showDayActionChoices === "function") o.showDayActionChoices();
      return false;
    }

    if (typeof o.setDayMenuSectionMode === "function") o.setDayMenuSectionMode("event");
    if (o.eventTitleInput && typeof o.eventTitleInput.focus === "function") o.eventTitleInput.focus();
    return true;
  }

  function openEventPreview(options) {
    const o = options || {};
    const evt = o.event;
    if (!evt || !o.eventPreviewModal || !o.eventPreviewBody) return;

    const isDateKey = typeof o.isDateKey === "function" ? o.isDateKey : (() => false);
    const nextPreviewSeriesId = evt.seriesId || evt.id || null;
    const nextPreviewDateKey = isDateKey(o.dateKey)
      ? String(o.dateKey)
      : (isDateKey(evt.startDate) ? String(evt.startDate) : null);

    if (typeof o.setPreviewState === "function") {
      o.setPreviewState({
        seriesId: nextPreviewSeriesId,
        dateKey: nextPreviewDateKey,
        snapshot: evt
      });
    }

    const isSharedEventReadOnlyInPersonalMode = typeof o.isSharedEventReadOnlyInPersonalMode === "function"
      ? o.isSharedEventReadOnlyInPersonalMode
      : (() => false);
    const sharedReadOnlyEvent = Boolean(isSharedEventReadOnlyInPersonalMode(evt));

    const allowAddTask = Boolean(
      o.personalMode && sharedReadOnlyEvent && !o.readOnly && o.taskViewEnabled
    );
    const allowEdit = Boolean(o.canManageEventAndAbsenceChanges && !o.readOnly && !sharedReadOnlyEvent);
    const allowDelete = Boolean(o.canManageEventAndAbsenceChanges && !o.readOnly && !sharedReadOnlyEvent);

    const mod = o.eventsFormPreviewModule;
    if (!mod || typeof mod.renderPreview !== "function") return;
    mod.renderPreview({
      documentRef: o.documentRef || root.document,
      event: evt,
      dateKey: o.dateKey,
      previewDateKey: nextPreviewDateKey,
      eventPreviewModal: o.eventPreviewModal,
      eventPreviewBody: o.eventPreviewBody,
      eventPreviewAddTaskBtn: o.eventPreviewAddTaskBtn,
      eventPreviewEditBtn: o.eventPreviewEditBtn,
      eventPreviewDeleteBtn: o.eventPreviewDeleteBtn,
      sharedReadOnlyEvent,
      allowAddTask,
      allowEdit,
      allowDelete,
      t: o.t,
      getLocale: o.getLocale,
      people: o.people,
      getCategoryById: o.getCategoryById,
      describeEventPeople: o.describeEventPeople,
      getLinkedStandaloneTaskRowsForEvent: o.getLinkedStandaloneTaskRowsForEvent
    });

    if (o.dateKey && typeof o.setSelectedDateKey === "function") {
      o.setSelectedDateKey(String(o.dateKey));
    }
  }

  root.ProCalModules.eventsPreviewFlow = {
    closeEventPreview,
    openEventEditModal,
    openEventPreview
  };
})(window);
