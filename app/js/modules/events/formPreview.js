(function initEventsFormPreview(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function prepareCreateForm(options) {
    const opts = options || {};
    const form = opts.eventForm;
    if (form && typeof form.reset === "function") form.reset();
    const base = String(opts.baseDateKey || "");
    if (opts.eventStart) opts.eventStart.value = base;
    if (opts.eventEnd) opts.eventEnd.value = base;
    if (opts.repeatFreq) opts.repeatFreq.value = "none";
    if (opts.repeatEndMode) opts.repeatEndMode.value = "forever";
    if (opts.repeatCount) opts.repeatCount.value = "1";
    if (opts.repeatUntil) opts.repeatUntil.value = "";
    const categories = Array.isArray(opts.categories) ? opts.categories : [];
    if (opts.eventCategory && !opts.eventCategory.value && categories.length) {
      opts.eventCategory.value = String(categories[0].id || "");
    }
    if (opts.eventAllDay) opts.eventAllDay.checked = false;
    if (opts.eventTimeInput) opts.eventTimeInput.value = "";
    if (opts.eventTimeEndInput) opts.eventTimeEndInput.value = "";
    if (opts.eventTasksEditorWrap) opts.eventTasksEditorWrap.classList.add("hidden-section");
  }

  function prepareEditForm(options) {
    const opts = options || {};
    const base = opts.baseEvent;
    if (!base || typeof base !== "object") return false;
    const form = opts.eventForm;
    if (form && typeof form.reset === "function") form.reset();
    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    const timing = timeMeta && typeof timeMeta.resolveEventTimeMeta === "function"
      ? timeMeta.resolveEventTimeMeta(base)
      : { isAllDay: !String(base.time || "").trim(), startTime: String(base.time || "").trim(), endTime: "" };

    if (opts.eventStart) opts.eventStart.value = String(base.startDate || "");
    if (opts.eventEnd) opts.eventEnd.value = String(base.endDate || "");
    if (opts.eventDescription) opts.eventDescription.value = String(base.description || "");
    if (opts.eventAllDay) opts.eventAllDay.checked = Boolean(timing.isAllDay);
    if (opts.eventTimeInput) opts.eventTimeInput.value = String(timing.startTime || "");
    if (opts.eventTimeEndInput) opts.eventTimeEndInput.value = String(timing.endTime || "");
    const categories = Array.isArray(opts.categories) ? opts.categories : [];
    if (opts.eventCategory) opts.eventCategory.value = String(base.categoryId || (categories[0] && categories[0].id) || "");
    if (opts.repeatFreq) opts.repeatFreq.value = base.recurrence ? String(base.recurrence.freq || "none") : "none";
    if (opts.repeatEndMode) opts.repeatEndMode.value = base.recurrence ? String(base.recurrence.endMode || "forever") : "forever";
    if (opts.repeatCount) opts.repeatCount.value = base.recurrence && base.recurrence.count ? String(base.recurrence.count) : "1";
    if (opts.repeatUntil) opts.repeatUntil.value = base.recurrence && base.recurrence.untilDate ? String(base.recurrence.untilDate) : "";

    if (opts.eventPeopleChecklist) {
      const checks = opts.eventPeopleChecklist.querySelectorAll('input[type="checkbox"]');
      checks.forEach((el) => {
        el.checked = Array.isArray(base.peopleIds) && base.peopleIds.includes(el.value);
      });
    }

    if (opts.eventAbsent) {
      const absentSet = new Set(Array.isArray(base.absentIds) ? base.absentIds : []);
      Array.from(opts.eventAbsent.options || []).forEach((opt) => {
        opt.selected = absentSet.has(opt.value);
      });
    }

    if (opts.eventTasksEditorWrap) opts.eventTasksEditorWrap.classList.add("hidden-section");
    if (opts.eventTitleInput) opts.eventTitleInput.value = String(base.title || "");
    return true;
  }

  function closePreview(options) {
    const opts = options || {};
    const modal = opts.eventPreviewModal;
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function createSection(doc, titleText) {
    const section = doc.createElement("section");
    section.className = "event-preview-section";

    const title = doc.createElement("h5");
    title.className = "event-preview-section-title";
    title.textContent = String(titleText || "");
    section.appendChild(title);

    return section;
  }

  function createDetailRow(doc, labelText, valueText) {
    const row = doc.createElement("div");
    row.className = "event-preview-row";

    const key = doc.createElement("span");
    key.className = "event-preview-key";
    key.textContent = String(labelText || "");

    const value = doc.createElement("span");
    value.className = "event-preview-value";
    value.textContent = String(valueText || "");

    row.append(key, value);
    return row;
  }

  function createTokenGroup(doc, labelText, values) {
    const list = Array.isArray(values) ? values.filter(Boolean) : [];
    if (!list.length) return null;

    const group = doc.createElement("div");
    group.className = "event-preview-token-group";

    const label = doc.createElement("span");
    label.className = "event-preview-token-label";
    label.textContent = String(labelText || "");
    group.appendChild(label);

    const wrap = doc.createElement("div");
    wrap.className = "event-preview-token-list";
    list.forEach((item) => {
      const chip = doc.createElement("span");
      chip.className = "event-preview-token";
      chip.textContent = String(item || "");
      wrap.appendChild(chip);
    });

    group.appendChild(wrap);
    return group;
  }

  function renderPreview(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const evt = opts.event;
    if (!evt || !doc || !opts.eventPreviewModal || !opts.eventPreviewBody) return;

    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const people = Array.isArray(opts.people) ? opts.people : [];
    const getCategoryById = typeof opts.getCategoryById === "function" ? opts.getCategoryById : (() => null);
    const describeEventPeople = typeof opts.describeEventPeople === "function" ? opts.describeEventPeople : (() => "");
    const getLinkedStandaloneTaskRowsForEvent = typeof opts.getLinkedStandaloneTaskRowsForEvent === "function"
      ? opts.getLinkedStandaloneTaskRowsForEvent
      : (() => []);

    opts.eventPreviewBody.innerHTML = "";

    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    const whenText = timeMeta && typeof timeMeta.getEventTimeRangeLabel === "function"
      ? timeMeta.getEventTimeRangeLabel(evt, { t })
      : (evt.startDate && evt.endDate
        ? (evt.startDate === evt.endDate
          ? `${evt.startDate}${evt.time ? ` ${evt.time}` : ""}`
          : `${evt.startDate} ${t("to")} ${evt.endDate}${evt.time ? ` ${evt.time}` : ""}`)
        : "");

    const cat = getCategoryById(evt.categoryId);
    const participantsText = describeEventPeople(evt);
    const participantNames = participantsText
      ? participantsText.split(/\s*,\s*/).map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const absentIds = Array.isArray(evt.absent)
      ? evt.absent
      : (Array.isArray(evt.absentIds) ? evt.absentIds : []);
    const absentNames = absentIds
      .map((id) => people.find((p) => String((p && p.id) || "") === String(id)))
      .filter(Boolean)
      .map((p) => String(p.name || "").trim())
      .filter(Boolean);

    const previewDateKey = String(opts.previewDateKey || opts.dateKey || "");
    const previewLinkedTaskRows = getLinkedStandaloneTaskRowsForEvent(evt, previewDateKey);
    const previewTaskTitles = Array.from(new Set(
      []
        .concat(Array.isArray(evt.tasks) ? evt.tasks.map((x) => String((x && x.title) || "").trim()).filter(Boolean) : [])
        .concat(previewLinkedTaskRows.map((row) => String((row && row.task && row.task.title) || "").trim()).filter(Boolean))
    ));

    const hero = doc.createElement("div");
    hero.className = "event-preview-hero";

    const heroMain = doc.createElement("div");
    heroMain.className = "event-preview-hero-main";
    const titleEl = doc.createElement("h4");
    titleEl.className = "event-preview-event-title";
    titleEl.textContent = evt.title || t("eventOverview");
    heroMain.appendChild(titleEl);

    if (whenText) {
      const subtitle = doc.createElement("p");
      subtitle.className = "event-preview-subtitle";
      subtitle.textContent = whenText;
      heroMain.appendChild(subtitle);
    }

    const badgeRow = doc.createElement("div");
    badgeRow.className = "event-preview-badges";

    if (cat && cat.name) {
      const categoryBadge = doc.createElement("span");
      categoryBadge.className = "event-preview-badge event-preview-badge-category";
      categoryBadge.textContent = cat.name;
      if (cat.color) {
        categoryBadge.style.borderColor = String(cat.color);
        categoryBadge.style.background = `color-mix(in srgb, ${String(cat.color)} 12%, white)`;
      }
      badgeRow.appendChild(categoryBadge);
    }

    if (!String(evt.time || "").trim()) {
      const allDayBadge = doc.createElement("span");
      allDayBadge.className = "event-preview-badge";
      allDayBadge.textContent = t("allDay");
      badgeRow.appendChild(allDayBadge);
    }

    const sharedReadOnlyEvent = Boolean(opts.sharedReadOnlyEvent);
    if (sharedReadOnlyEvent) {
      const readonlyBadge = doc.createElement("span");
      readonlyBadge.className = "event-preview-badge event-preview-badge-readonly";
      readonlyBadge.textContent = t("modeViewOnly");
      badgeRow.appendChild(readonlyBadge);
    }

    hero.append(heroMain, badgeRow);
    opts.eventPreviewBody.appendChild(hero);

    const layout = doc.createElement("div");
    layout.className = "event-preview-layout";

    const detailsSection = createSection(doc, t("previewDetails"));
    const detailsList = doc.createElement("div");
    detailsList.className = "event-preview-list";

    if (whenText) detailsList.appendChild(createDetailRow(doc, t("time"), whenText));
    if (cat && cat.name) detailsList.appendChild(createDetailRow(doc, t("category"), cat.name));
    if (evt.description) detailsList.appendChild(createDetailRow(doc, t("description"), String(evt.description)));

    if (!detailsList.children.length) {
      const empty = doc.createElement("div");
      empty.className = "event-preview-empty";
      empty.textContent = t("noDetailsToShow");
      detailsSection.appendChild(empty);
    } else {
      detailsSection.appendChild(detailsList);
    }
    layout.appendChild(detailsSection);

    if (participantNames.length || absentNames.length || previewTaskTitles.length) {
      const side = doc.createElement("div");
      side.className = "event-preview-side";

      if (participantNames.length || absentNames.length) {
        const peopleSection = createSection(doc, t("peopleTitle"));
        const participantsGroup = createTokenGroup(doc, t("peopleParticipants"), participantNames);
        const absentGroup = createTokenGroup(doc, t("absentPeople"), absentNames);
        if (participantsGroup) peopleSection.appendChild(participantsGroup);
        if (absentGroup) peopleSection.appendChild(absentGroup);
        side.appendChild(peopleSection);
      }

      if (previewTaskTitles.length) {
        const tasksSection = createSection(doc, t("eventTasks"));
        const taskGroup = createTokenGroup(doc, t("task"), previewTaskTitles);
        if (taskGroup) tasksSection.appendChild(taskGroup);
        side.appendChild(tasksSection);
      }

      layout.appendChild(side);
    }

    opts.eventPreviewBody.appendChild(layout);

    const allowAddTask = Boolean(opts.allowAddTask);
    const allowEdit = Boolean(opts.allowEdit);
    const allowDelete = Boolean(opts.allowDelete);

    if (opts.eventPreviewAddTaskBtn) {
      opts.eventPreviewAddTaskBtn.style.display = allowAddTask ? "" : "none";
      opts.eventPreviewAddTaskBtn.disabled = !allowAddTask;
    }
    if (opts.eventPreviewEditBtn) {
      opts.eventPreviewEditBtn.style.display = allowEdit ? "" : "none";
      opts.eventPreviewEditBtn.disabled = !allowEdit;
    }
    if (opts.eventPreviewDeleteBtn) {
      opts.eventPreviewDeleteBtn.style.display = allowDelete ? "" : "none";
      opts.eventPreviewDeleteBtn.disabled = !allowDelete;
    }

    if (sharedReadOnlyEvent && opts.eventPreviewModal) {
      opts.eventPreviewModal.dataset.sharedReadonly = "1";
    } else if (opts.eventPreviewModal) {
      delete opts.eventPreviewModal.dataset.sharedReadonly;
    }

    opts.eventPreviewModal.classList.remove("hidden");
    opts.eventPreviewModal.setAttribute("aria-hidden", "false");
  }

  root.ProCalModules.eventsFormPreview = {
    prepareCreateForm,
    prepareEditForm,
    closePreview,
    renderPreview
  };
})(window);
