(function initTaskDialogs(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function createTaskId() {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function openTaskEditDialog(options) {
    const o = options || {};
    const doc = o.documentRef || root.document;
    if (o.readOnly || !doc) return false;
    const task = o.task;
    const onSave = typeof o.onSave === "function" ? o.onSave : null;
    if (!task || !onSave) return false;

    const t = typeof o.t === "function" ? o.t : ((key) => key);
    const allowCategory = Boolean(o.allowCategory);
    const allowWorkFields = Boolean(o.allowWorkFields);
    const hidePeople = Boolean(o.hidePeople);
    const lockDefinition = Boolean(o.lockDefinition);
    const todayKey = String(o.todayKey || "");
    const currentUserId = String(o.currentUserId || "");
    const renderPeopleChecklist = typeof o.renderPeopleChecklist === "function" ? o.renderPeopleChecklist : null;
    const getTaskAssigneeIds = typeof o.getTaskAssigneeIds === "function" ? o.getTaskAssigneeIds : (() => []);
    const getSelectedPersonIds = typeof o.getSelectedPersonIds === "function" ? o.getSelectedPersonIds : (() => []);
    const isCollaborativePersonalTask = typeof o.isCollaborativePersonalTask === "function" ? o.isCollaborativePersonalTask : (() => false);
    const isCollaborativePersonalTaskOwner = typeof o.isCollaborativePersonalTaskOwner === "function"
      ? o.isCollaborativePersonalTaskOwner
      : (() => false);

    const modal = doc.createElement("div");
    modal.className = "modal";
    modal.setAttribute("aria-hidden", "false");
    const card = doc.createElement("div");
    card.className = "modal-card";
    const head = doc.createElement("div");
    head.className = "modal-head";
    const titleEl = doc.createElement("h3");
    titleEl.textContent = String(o.dialogTitleText || "").trim() || t("edit");
    const closeBtn = doc.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "ghost-btn";
    closeBtn.textContent = t("close");

    const form = doc.createElement("form");
    form.className = "event-form";

    const titleLabel = doc.createElement("label");
    titleLabel.textContent = t("task");
    const titleInput = doc.createElement("input");
    titleInput.type = "text";
    titleInput.maxLength = 140;
    titleInput.value = String(task.title || "");
    titleInput.required = true;
    titleInput.disabled = lockDefinition;

    const peopleLabel = doc.createElement("label");
    peopleLabel.textContent = t("person");
    const peopleWrap = doc.createElement("div");
    peopleWrap.className = "people-checklist task-people-list";
    if (renderPeopleChecklist) renderPeopleChecklist(peopleWrap, getTaskAssigneeIds(task));

    const nonOwnerCollab = isCollaborativePersonalTask(task) && !isCollaborativePersonalTaskOwner(task);
    if (nonOwnerCollab) {
      peopleWrap.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        const isSelf = String((el && el.value) || "") === currentUserId;
        el.disabled = !isSelf;
      });
      titleInput.disabled = true;
    }

    const categoryLabel = doc.createElement("label");
    categoryLabel.textContent = t("category");
    const categorySelect = doc.createElement("select");
    categorySelect.innerHTML = `<option value="">${t("noCategory")}</option>`;
    const categories = Array.isArray(o.categories) ? o.categories : [];
    categories.forEach((cat) => {
      const option = doc.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      option.style.color = cat.color;
      categorySelect.appendChild(option);
    });
    categorySelect.value = String(task.categoryId || "");
    if (nonOwnerCollab || lockDefinition) categorySelect.disabled = true;

    const workFields = doc.createElement("div");
    workFields.className = "task-work-edit-fields";
    const startDateLabel = doc.createElement("label");
    startDateLabel.textContent = t("taskManagerStartDate");
    const startDateInput = doc.createElement("input");
    startDateInput.type = "date";
    startDateInput.required = true;
    startDateInput.value = String(task.workStartedOn || todayKey);
    if (todayKey) startDateInput.max = todayKey;
    startDateLabel.appendChild(startDateInput);

    const completedToggleLabel = doc.createElement("label");
    completedToggleLabel.className = "task-work-completed-toggle";
    const completedToggle = doc.createElement("input");
    completedToggle.type = "checkbox";
    completedToggle.checked = Boolean(task.done || task.workCompletedOn);
    const completedToggleText = doc.createElement("span");
    completedToggleText.textContent = t("taskManagerCompleted");
    completedToggleLabel.append(completedToggle, completedToggleText);

    const completedDateLabel = doc.createElement("label");
    completedDateLabel.textContent = t("taskManagerCompletionDate");
    const completedDateInput = doc.createElement("input");
    completedDateInput.type = "date";
    completedDateInput.value = String(task.workCompletedOn || todayKey);
    if (todayKey) completedDateInput.max = todayKey;
    completedDateLabel.appendChild(completedDateInput);

    const syncWorkFields = () => {
      const startedOn = String(startDateInput.value || "");
      completedDateInput.min = startedOn;
      completedDateInput.required = completedToggle.checked;
      completedDateLabel.classList.toggle("hidden-section", !completedToggle.checked);
      if (completedToggle.checked && !completedDateInput.value) completedDateInput.value = todayKey;
    };
    completedToggle.addEventListener("change", syncWorkFields);
    startDateInput.addEventListener("change", syncWorkFields);
    syncWorkFields();
    workFields.append(startDateLabel, completedToggleLabel, completedDateLabel);

    const actions = doc.createElement("div");
    actions.className = "day-actions";
    const saveBtn = doc.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "accent-btn";
    saveBtn.textContent = t("save");
    const cancelBtn = doc.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ghost-btn";
    cancelBtn.textContent = t("cancel");

    const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
    closeBtn.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextTitle = String(titleInput.value || "").trim();
      if (!nextTitle) return;
      const nextIds = getSelectedPersonIds(peopleWrap);
      const payload = { title: nextTitle, personIds: nextIds };
      if (allowCategory) payload.categoryId = String(categorySelect.value || "");
      if (allowWorkFields) {
        const workStartedOn = String(startDateInput.value || "");
        const workCompletedOn = completedToggle.checked ? String(completedDateInput.value || "") : "";
        if (!workStartedOn || (todayKey && workStartedOn > todayKey)) return;
        if (completedToggle.checked && (!workCompletedOn || workCompletedOn < workStartedOn || (todayKey && workCompletedOn > todayKey))) return;
        payload.workStartedOn = workStartedOn;
        payload.workCompletedOn = workCompletedOn;
        payload.done = completedToggle.checked;
      }
      onSave(payload);
      close();
    });

    actions.append(saveBtn, cancelBtn);
    form.append(titleLabel, titleInput);
    if (!hidePeople) form.append(peopleLabel, peopleWrap);
    if (allowCategory) form.append(categoryLabel, categorySelect);
    if (allowWorkFields) form.append(workFields);
    form.append(actions);

    head.append(titleEl, closeBtn);
    card.append(head, form);
    modal.appendChild(card);
    doc.body.appendChild(modal);
    if (typeof titleInput.focus === "function") titleInput.focus();
    return true;
  }

  root.ProCalModules.taskDialogs = {
    createTaskId,
    openTaskEditDialog
  };
})(window);
