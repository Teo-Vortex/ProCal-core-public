(function initTaskManager(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function render(options) {
    const o = options || {};
    const doc = o.documentRef || root.document;
    const listEl = o.listEl;
    const emptyEl = o.emptyEl;
    if (!doc || !listEl || !emptyEl) return;

    const rows = Array.isArray(o.rows) ? o.rows : [];
    const tab = ["complex", "working", "ordinary"].includes(o.tab) ? o.tab : "all";
    const statusFilter = ["active", "completed"].includes(o.statusFilter) ? o.statusFilter : "all";
    const locale = String(o.locale || "en");
    const copy = o.copy || {};
    const canManage = Boolean(o.canManage);
    const canToggleRow = typeof o.canToggleRow === "function" ? o.canToggleRow : (() => canManage);
    const canEditRow = typeof o.canEditRow === "function" ? o.canEditRow : (() => canManage);
    const onStart = typeof o.onStart === "function" ? o.onStart : null;
    const onFinish = typeof o.onFinish === "function" ? o.onFinish : null;
    const onResume = typeof o.onResume === "function" ? o.onResume : null;
    const onEdit = typeof o.onEdit === "function" ? o.onEdit : null;
    const onToggle = typeof o.onToggle === "function" ? o.onToggle : null;
    const onOpenDate = typeof o.onOpenDate === "function" ? o.onOpenDate : null;

    const visibleRows = rows
      .filter((row) => {
        if (tab === "complex") {
          if (!row.isLongRunning) return false;
          if (statusFilter === "active") return row.status !== "completed";
          if (statusFilter === "completed") return row.status === "completed";
          return true;
        }
        if (tab === "working") return row.status === "working";
        if (tab === "ordinary") {
          if (row.isLongRunning) return false;
          if (statusFilter === "active") return row.status !== "completed";
          if (statusFilter === "completed") return row.status === "completed";
          return true;
        }
        return true;
      })
      .sort((a, b) => {
        const aCompleted = a.status === "completed";
        const bCompleted = b.status === "completed";
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
        const aSortDate = String(a.workStartedOn || a.dateKey || "");
        const bSortDate = String(b.workStartedOn || b.dateKey || "");
        if (aSortDate !== bSortDate) return bSortDate.localeCompare(aSortDate);
        return String(a.title || "").localeCompare(String(b.title || ""), locale, { sensitivity: "base" });
      });

    listEl.innerHTML = "";
    visibleRows.forEach((row) => {
      const item = doc.createElement("article");
      const ordinaryTask = tab === "ordinary";
      item.className = `task-manager-row status-${row.status}${ordinaryTask ? " task-manager-row-ordinary" : ""}${ordinaryTask && row.status === "completed" ? " is-completed" : ""}`;

      const main = doc.createElement("div");
      main.className = "task-manager-row-main";
      const title = doc.createElement("strong");
      title.className = "task-manager-row-title";
      title.textContent = String(row.title || "");
      if (ordinaryTask) {
        const checkLabel = doc.createElement("label");
        checkLabel.className = "task-manager-check-label";
        const checkbox = doc.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = row.status === "completed";
        checkbox.disabled = !canToggleRow(row);
        checkbox.addEventListener("change", () => {
          if (onToggle) onToggle(row, checkbox.checked);
        });
        checkLabel.append(checkbox, title);
        main.appendChild(checkLabel);
      } else {
        main.appendChild(title);
      }
      const meta = doc.createElement("div");
      meta.className = "task-manager-row-meta";

      if (row.scopeLabel) {
        const scope = doc.createElement("span");
        scope.className = "task-manager-scope-label";
        scope.textContent = String(row.scopeLabel);
        meta.appendChild(scope);
      }

      const dateBtn = doc.createElement("button");
      dateBtn.type = "button";
      dateBtn.className = "task-manager-date-link";
      dateBtn.textContent = String(row.dateLabel || row.dateKey || "");
      dateBtn.addEventListener("click", () => {
        if (onOpenDate) onOpenDate(row);
      });
      meta.appendChild(dateBtn);

      if (row.contextLabel) {
        const context = doc.createElement("span");
        context.className = "task-manager-context-label";
        context.textContent = String(row.contextLabel);
        meta.appendChild(context);
      }

      if (row.assigneeLabel) {
        const assignees = doc.createElement("span");
        assignees.className = "task-manager-assignee-label";
        assignees.textContent = String(row.assigneeLabel);
        meta.appendChild(assignees);
      }

      if (row.workLabel) {
        const work = doc.createElement("span");
        work.className = "task-manager-work-dates";
        work.textContent = String(row.workLabel);
        meta.appendChild(work);
      }

      main.appendChild(meta);

      const side = doc.createElement("div");
      side.className = "task-manager-row-side";
      const status = doc.createElement("span");
      status.className = `task-manager-status status-${row.status}`;
      status.textContent = String(copy[row.status] || row.status);
      side.appendChild(status);

      if (canEditRow(row) || canToggleRow(row)) {
        if (canEditRow(row)) {
        const editAction = doc.createElement("button");
        editAction.type = "button";
        editAction.className = "ghost-btn task-manager-action";
        editAction.textContent = String(copy.edit || "Edit");
        editAction.addEventListener("click", () => { if (onEdit) onEdit(row); });
        side.appendChild(editAction);
        }

        if (canToggleRow(row)) {
        const action = doc.createElement("button");
        action.type = "button";
        if (ordinaryTask && row.status === "completed") {
          action.className = "ghost-btn task-manager-action";
          action.textContent = String(copy.resume || "Resume");
          action.addEventListener("click", () => { if (onToggle) onToggle(row, false); });
        } else if (ordinaryTask) {
          action.className = "accent-btn task-manager-action";
          action.textContent = String(copy.finish || "Finish");
          action.addEventListener("click", () => { if (onToggle) onToggle(row, true); });
        } else if (row.status === "working") {
          action.className = "accent-btn task-manager-action";
          action.textContent = String(copy.finish || "Finish");
          action.addEventListener("click", () => { if (onFinish) onFinish(row); });
        } else if (row.status === "completed" && row.isLongRunning) {
          action.className = "ghost-btn task-manager-action";
          action.textContent = String(copy.resume || "Resume");
          action.addEventListener("click", () => { if (onResume) onResume(row); });
        } else if (row.status !== "completed") {
          action.className = "ghost-btn task-manager-action";
          action.textContent = String(copy.start || "Start work");
          action.addEventListener("click", () => { if (onStart) onStart(row); });
        }
        if (action.textContent) side.appendChild(action);
        }
      }

      item.append(main, side);
      listEl.appendChild(item);
    });

    if (o.countEl) o.countEl.textContent = String(visibleRows.length);
    emptyEl.classList.toggle("hidden-section", visibleRows.length > 0);
  }

  root.ProCalModules.taskManager = { render };
})(window);
