(function initAdminUsersPanel(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function applySettingsAccessControls(options) {
    const opts = options || {};
    const isAdmin = Boolean(opts.isAdmin);

    if (opts.settingsUserSection) {
      opts.settingsUserSection.style.display = isAdmin ? "none" : "";
    }
    if (opts.settingsAdminSection) {
      opts.settingsAdminSection.style.display = isAdmin ? "" : "none";
    }

    (Array.isArray(opts.userOnlyControls) ? opts.userOnlyControls : []).forEach((el) => {
      if (!el) return;
      el.style.display = isAdmin ? "none" : "";
      el.disabled = isAdmin;
    });

    if (opts.menuLogoutBtn) {
      opts.menuLogoutBtn.style.display = "";
      opts.menuLogoutBtn.disabled = false;
    }

    if (opts.menuAdminBtn) {
      opts.menuAdminBtn.style.display = isAdmin ? "" : "none";
      opts.menuAdminBtn.disabled = !isAdmin;
    }
  }

  function renderUsersPanel(options) {
    const opts = options || {};
    if (!opts.adminUsersWrap) return;
    opts.adminUsersWrap.classList.add("hidden-section");
  }

  function renderUsersList(options) {
    const opts = options || {};
    const doc = opts.documentRef || root.document;
    const listEl = opts.adminUsersList;
    if (!doc || !listEl) return;
    listEl.innerHTML = "";

    const users = Array.isArray(opts.adminUsersCache) ? opts.adminUsersCache : [];
    if (!users.length) {
      listEl.innerHTML = '<li class="empty">No users</li>';
      return;
    }

    const onApprove = typeof opts.onApprove === "function" ? opts.onApprove : null;
    const onSave = typeof opts.onSave === "function" ? opts.onSave : null;

    users.forEach((u) => {
      const li = doc.createElement("li");
      li.className = "person-item";

      const left = doc.createElement("span");
      left.textContent = `${u.username} (${u.role}, ${u.status}, ${u.viewMode})`;

      const actions = doc.createElement("div");
      actions.className = "person-actions";

      const roleSel = doc.createElement("select");
      ["system_admin", "admin", "boss", "hr", "pr", "user"].forEach((role) => {
        const opt = doc.createElement("option");
        opt.value = role;
        opt.textContent = role;
        if (u.role === role) opt.selected = true;
        roleSel.appendChild(opt);
      });

      const statusSel = doc.createElement("select");
      ["pending", "active", "suspended"].forEach((status) => {
        const opt = doc.createElement("option");
        opt.value = status;
        opt.textContent = status;
        if (u.status === status) opt.selected = true;
        statusSel.appendChild(opt);
      });

      const viewSel = doc.createElement("select");
      ["tasks"].forEach((mode) => {
        const opt = doc.createElement("option");
        opt.value = mode;
        opt.textContent = mode;
        opt.selected = true;
        viewSel.appendChild(opt);
      });

      const approveBtn = doc.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "delete-btn";
      approveBtn.textContent = "Approve";
      approveBtn.disabled = u.status !== "pending";
      approveBtn.addEventListener("click", async () => {
        if (onApprove) await onApprove(u.id);
      });

      const saveBtn = doc.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "delete-btn";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", async () => {
        if (!onSave) return;
        await onSave(u.id, {
          role: roleSel.value,
          status: statusSel.value,
          viewMode: viewSel.value
        });
      });

      actions.append(roleSel, statusSel, viewSel, approveBtn, saveBtn);
      li.append(left, actions);
      listEl.appendChild(li);
    });
  }

  async function loadUsers(options) {
    const opts = options || {};
    if (!opts.isAdmin) return;
    const ensureAccessToken = typeof opts.ensureAccessToken === "function" ? opts.ensureAccessToken : null;
    const setMsg = typeof opts.setMsg === "function" ? opts.setMsg : (() => {});
    const setCache = typeof opts.setCache === "function" ? opts.setCache : (() => {});
    const renderUsersList = typeof opts.renderUsersList === "function" ? opts.renderUsersList : (() => {});
    const fetchRef = opts.fetchRef || root.fetch;
    if (!ensureAccessToken || typeof fetchRef !== "function") return;

    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const res = await fetchRef("/api/admin/users", {
        headers: { authorization: `Bearer ${token}` },
        credentials: "include"
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(String((body && body.error) || "Failed to load users"));
        return;
      }
      const cache = Array.isArray(body) ? body : [];
      setCache(cache);
      renderUsersList();
      setMsg(`Users loaded: ${cache.length}`);
    } catch {
      setMsg("Failed to load users.");
    }
  }

  async function approveUser(options) {
    const opts = options || {};
    const userId = String(opts.userId || "");
    if (!userId) return;
    const ensureAccessToken = typeof opts.ensureAccessToken === "function" ? opts.ensureAccessToken : null;
    const setMsg = typeof opts.setMsg === "function" ? opts.setMsg : (() => {});
    const reloadUsers = typeof opts.reloadUsers === "function" ? opts.reloadUsers : (() => {});
    const fetchRef = opts.fetchRef || root.fetch;
    if (!ensureAccessToken || typeof fetchRef !== "function") return;

    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const res = await fetchRef(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMsg(String((body && body.error) || "Approve failed"));
        return;
      }
      setMsg("User approved.");
      await reloadUsers();
    } catch {
      setMsg("Approve failed.");
    }
  }

  async function patchUser(options) {
    const opts = options || {};
    const userId = String(opts.userId || "");
    if (!userId) return;
    const payload = opts.payload && typeof opts.payload === "object" ? opts.payload : {};
    const ensureAccessToken = typeof opts.ensureAccessToken === "function" ? opts.ensureAccessToken : null;
    const setMsg = typeof opts.setMsg === "function" ? opts.setMsg : (() => {});
    const reloadUsers = typeof opts.reloadUsers === "function" ? opts.reloadUsers : (() => {});
    const fetchRef = opts.fetchRef || root.fetch;
    if (!ensureAccessToken || typeof fetchRef !== "function") return;

    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const res = await fetchRef(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMsg(String((body && body.error) || "Save failed"));
        return;
      }
      setMsg("User updated.");
      await reloadUsers();
    } catch {
      setMsg("Save failed.");
    }
  }

  root.ProCalModules.adminUsersPanel = {
    applySettingsAccessControls,
    renderUsersPanel,
    renderUsersList,
    loadUsers,
    approveUser,
    patchUser
  };
})(window);
