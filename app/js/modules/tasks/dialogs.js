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
    if (nonOwnerCollab) categorySelect.disabled = true;

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
      onSave(payload);
      close();
    });

    actions.append(saveBtn, cancelBtn);
    if (allowCategory) form.append(titleLabel, titleInput, peopleLabel, peopleWrap, categoryLabel, categorySelect, actions);
    else form.append(titleLabel, titleInput, peopleLabel, peopleWrap, actions);

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
