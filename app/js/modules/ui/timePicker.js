(function initUiTimePickerModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  let timePickerTargetInput = null;
  let timePickerTargetLabel = "";

  function openModalElement(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModalElement(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function syncTimePickerColumnState(options) {
    const opts = options || {};
    const listSelect = opts.listSelect;
    if (!listSelect) return;
    const selectedOption = listSelect.selectedOptions && listSelect.selectedOptions[0];
    if (selectedOption && typeof selectedOption.scrollIntoView === "function") {
      try {
        selectedOption.scrollIntoView({ block: "center" });
      } catch {
        // ignore scroll errors
      }
    }
  }

  function clampMinuteStep(value) {
    const numeric = Number.parseInt(String(value || "1"), 10);
    if (!Number.isFinite(numeric) || numeric < 1) return 1;
    if (numeric > 60) return 60;
    return numeric;
  }

  function rebuildTimeOptions(listSelect, minuteStep, timeMeta) {
    if (!listSelect) return;
    listSelect.innerHTML = "";
    for (let minutes = 0; minutes < 24 * 60; minutes += minuteStep) {
      const option = root.document.createElement("option");
      const formatted = timeMeta && typeof timeMeta.minutesToTime === "function"
        ? timeMeta.minutesToTime(minutes)
        : "00:00";
      option.value = formatted;
      option.textContent = formatted;
      listSelect.appendChild(option);
    }
    const midnightOption = root.document.createElement("option");
    midnightOption.value = "24:00";
    midnightOption.textContent = "24:00";
    listSelect.appendChild(midnightOption);
    listSelect.dataset.minuteStep = String(minuteStep);
  }

  function applyTimePickerSelection(options) {
    const opts = options || {};
    const listSelect = opts.listSelect;
    const modal = opts.modal;
    const closeModal = typeof opts.closeModal === "function" ? opts.closeModal : closeModalElement;
    const EventCtor = opts.eventCtor || root.Event;
    if (!timePickerTargetInput || !listSelect) return;
    timePickerTargetInput.value = String(listSelect.value || "00:00");
    timePickerTargetInput.dispatchEvent(new EventCtor("input", { bubbles: true }));
    timePickerTargetInput.dispatchEvent(new EventCtor("change", { bubbles: true }));
    closeModal(modal);
    try {
      timePickerTargetInput.focus();
    } catch {
      // ignore focus errors
    }
  }

  function clearTimePickerSelection(options) {
    const opts = options || {};
    const modal = opts.modal;
    const closeModal = typeof opts.closeModal === "function" ? opts.closeModal : closeModalElement;
    const EventCtor = opts.eventCtor || root.Event;
    if (!timePickerTargetInput) return;
    timePickerTargetInput.value = "";
    timePickerTargetInput.dispatchEvent(new EventCtor("input", { bubbles: true }));
    timePickerTargetInput.dispatchEvent(new EventCtor("change", { bubbles: true }));
    closeModal(modal);
  }

  function openTimePickerForInput(options) {
    const opts = options || {};
    const input = opts.input;
    const modal = opts.modal;
    const titleEl = opts.titleEl;
    const listSelect = opts.listSelect;
    const openModal = typeof opts.openModal === "function" ? opts.openModal : openModalElement;
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    if (!input || !modal || !listSelect) return;

    timePickerTargetInput = input;
    timePickerTargetLabel = String(opts.label || "");
    const minuteStep = clampMinuteStep(opts.minuteStep);
    if (titleEl) titleEl.textContent = timePickerTargetLabel || t("time");

    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    if (!listSelect.options.length || String(listSelect.dataset.minuteStep || "") !== String(minuteStep)) {
      rebuildTimeOptions(listSelect, minuteStep, timeMeta);
    }

    const parsedMinutes = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
      ? timeMeta.parseTimeToMinutes(String(input.value || ""))
      : null;
    const defaultMinutes = Number.isFinite(Number(opts.defaultMinutes))
      ? Number(opts.defaultMinutes)
      : 0;
    const resolvedMinutes = parsedMinutes == null
      ? defaultMinutes
      : parsedMinutes;
    const snappedMinutes = resolvedMinutes >= 24 * 60
      ? 24 * 60
      : Math.floor(Math.max(0, resolvedMinutes) / minuteStep) * minuteStep;
    const resolvedTime = timeMeta && typeof timeMeta.minutesToTime === "function"
      ? timeMeta.minutesToTime(snappedMinutes)
      : "00:00";
    listSelect.value = resolvedTime;
    openModal(modal);
    syncTimePickerColumnState({ listSelect });
    try {
      listSelect.focus();
    } catch {
      // ignore focus errors
    }
  }

  root.ProCalModules.uiTimePicker = {
    syncTimePickerColumnState,
    applyTimePickerSelection,
    clearTimePickerSelection,
    openTimePickerForInput
  };
})(window);
