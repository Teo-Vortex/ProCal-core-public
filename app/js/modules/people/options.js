(function initPeopleOptions(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function getAllowedCompPeople(options) {
    const opts = options || {};
    const canCompOverviewAccess = Boolean(opts.canCompOverviewAccess);
    const currentUserId = String(opts.currentUserId || "");
    const currentUserName = String(opts.currentUserName || "");
    const currentUserDisplayColor = String(opts.currentUserDisplayColor || "#64748b");
    const roster = Array.isArray(opts.roster) ? opts.roster : [];
    if (canCompOverviewAccess) return roster;
    if (!currentUserId) return [];
    const own = roster.find((p) => String((p && p.id) || "") === currentUserId || String((p && p.userId) || "") === currentUserId);
    if (own) return [own];
    return [{ id: currentUserId, name: currentUserName || currentUserId, color: currentUserDisplayColor }];
  }

  function getAllowedCompPersonId(options) {
    const opts = options || {};
    const selectEl = opts.selectEl;
    const currentUserId = String(opts.currentUserId || "");
    if (!selectEl) return currentUserId;
    if (Boolean(opts.canCompOverviewAccess)) return String(selectEl.value || "");
    return String(currentUserId || selectEl.value || "");
  }

  function getAllowedReportPeople(options) {
    const opts = options || {};
    const canReadAllReports = Boolean(opts.canReadAllReports);
    const currentUserId = String(opts.currentUserId || "");
    const currentUserName = String(opts.currentUserName || "");
    const currentUserDisplayColor = String(opts.currentUserDisplayColor || "#64748b");
    const roster = Array.isArray(opts.roster) ? opts.roster : [];
    if (canReadAllReports) return roster;
    if (!currentUserId) return [];
    const own = roster.find((p) => String((p && p.id) || "") === currentUserId || String((p && p.userId) || "") === currentUserId);
    if (own) return [own];
    return [{ id: currentUserId, name: currentUserName || currentUserId, color: currentUserDisplayColor }];
  }

  function renderReportPeopleOptions(options) {
    const opts = options || {};
    const selectEl = opts.selectEl;
    const allowed = Array.isArray(opts.allowed) ? opts.allowed : [];
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || "-"));
    const canReadAllReports = Boolean(opts.canReadAllReports);
    const currentUserId = String(opts.currentUserId || "");
    if (!selectEl) return;

    const prev = String(selectEl.value || "");
    selectEl.innerHTML = "";
    allowed.forEach((person) => {
      const option = document.createElement("option");
      option.value = String((person && person.id) || "");
      option.textContent = getPersonDisplayName(person, allowed);
      if (person && person.color) option.style.color = String(person.color);
      selectEl.appendChild(option);
    });
    if (!allowed.length) {
      selectEl.disabled = true;
      return;
    }
    selectEl.disabled = !canReadAllReports;
    if (allowed.some((p) => String((p && p.id) || "") === prev)) {
      selectEl.value = prev;
    } else if (canReadAllReports) {
      selectEl.value = String((allowed[0] && allowed[0].id) || "");
    } else {
      const own = allowed.find((p) => String((p && p.id) || "") === currentUserId || String((p && p.userId) || "") === currentUserId);
      selectEl.value = String((own && own.id) || currentUserId || (allowed[0] && allowed[0].id) || "");
    }
  }

  function renderPeopleSelect(options) {
    const opts = options || {};
    const selectEl = opts.selectEl;
    const includeAny = Boolean(opts.includeAny);
    const roster = Array.isArray(opts.roster) ? opts.roster : [];
    const getPersonDisplayName = typeof opts.getPersonDisplayName === "function"
      ? opts.getPersonDisplayName
      : ((person) => String((person && person.name) || "-"));
    if (!selectEl) return;
    const prevValues = selectEl.multiple
      ? Array.from(selectEl.selectedOptions || []).map((opt) => String(opt.value || ""))
      : [String(selectEl.value || "")];

    selectEl.innerHTML = "";
    if (includeAny && !selectEl.multiple) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "-";
      selectEl.appendChild(empty);
    }

    roster.forEach((person) => {
      const option = document.createElement("option");
      option.value = String((person && person.id) || "");
      option.textContent = getPersonDisplayName(person, roster);
      option.style.color = String((person && person.color) || "");
      if (prevValues.includes(option.value)) option.selected = true;
      selectEl.appendChild(option);
    });

    if (!selectEl.multiple && !selectEl.value && !includeAny && roster.length) {
      selectEl.value = String((roster[0] && roster[0].id) || "");
    }
  }

  function renderAbsencePersonOptions(options) {
    const opts = options || {};
    renderPeopleSelect({
      selectEl: opts.selectEl,
      includeAny: false,
      roster: opts.roster,
      getPersonDisplayName: opts.getPersonDisplayName
    });
    if (typeof opts.renderAbsentOptionsForRange === "function") {
      opts.renderAbsentOptionsForRange();
    }
  }

  function renderCompPeopleOptions(options) {
    const opts = options || {};
    const selectEl = opts.selectEl;
    const allowed = Array.isArray(opts.allowed) ? opts.allowed : [];
    const canCompOverviewAccess = Boolean(opts.canCompOverviewAccess);
    if (!selectEl) return;
    const prev = String(selectEl.value || "");
    selectEl.innerHTML = "";
    allowed.forEach((person) => {
      const option = document.createElement("option");
      option.value = String((person && person.id) || "");
      option.textContent = String((person && person.name) || "-");
      if (person && person.color) option.style.color = String(person.color);
      selectEl.appendChild(option);
    });
    if (!allowed.length) {
      selectEl.disabled = true;
      return;
    }
    selectEl.disabled = !canCompOverviewAccess;
    if (allowed.some((p) => String((p && p.id) || "") === prev)) selectEl.value = prev;
    else selectEl.value = String((allowed[0] && allowed[0].id) || "");
  }

  root.ProCalModules.peopleOptions = {
    getAllowedCompPeople,
    getAllowedCompPersonId,
    getAllowedReportPeople,
    renderReportPeopleOptions,
    renderPeopleSelect,
    renderAbsencePersonOptions,
    renderCompPeopleOptions
  };
})(window);
