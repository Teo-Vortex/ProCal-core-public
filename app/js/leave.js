(function initLeavePage() {
  "use strict";

  const ACCESS_KEY = "procal_access_token";
  const MIN_YEAR = 2022;
  const resolveRuntimePath = (value) => {
    const runtime = window.PROCAL_RUNTIME || {};
    return runtime && typeof runtime.resolvePath === "function"
      ? runtime.resolvePath(value)
      : value;
  };

  const state = {
    lang: localStorage.getItem("procal_lang") === "bg" ? "bg" : "en",
    me: null,
    users: [],
    matrix: null,
    pendingSummary: null,
    selectedUserId: "",
    month: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
    canReadSelf: false,
    canReadAll: false,
    canManage: false,
    records: [],
    filters: {
      userId: "",
      leaveType: "",
      from: "",
      to: ""
    },
    approvingRecordId: "",
    selectedUserCompMinutes: 0
  };

  const el = {
    langBtn: document.getElementById("langBtn"),
    backBtn: document.getElementById("backBtn"),
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    panelTitle: document.getElementById("panelTitle"),
    detailsModalTitle: document.getElementById("detailsModalTitle"),
    detailsForUserLabel: document.getElementById("detailsForUserLabel"),
    addLeaveTitle: document.getElementById("addLeaveTitle"),
    allowanceTitle: document.getElementById("allowanceTitle"),
    recordsTitle: document.getElementById("recordsTitle"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    monthLabel: document.getElementById("monthLabel"),
    pendingRequestsIndicator: document.getElementById("pendingRequestsIndicator"),
    matrixTable: document.getElementById("matrixTable"),
    status: document.getElementById("status"),
    me: document.getElementById("me"),
    balances: document.getElementById("balances"),
    balancesSummary: document.getElementById("balancesSummary"),
    records: document.getElementById("records"),
    detailsModal: document.getElementById("detailsModal"),
    closeDetailsModalBtn: document.getElementById("closeDetailsModalBtn"),
    openAddAbsenceModalBtn: document.getElementById("openAddAbsenceModalBtn"),
    openAllowanceModalBtn: document.getElementById("openAllowanceModalBtn"),
    addAbsenceModal: document.getElementById("addAbsenceModal"),
    closeAddAbsenceModalBtn: document.getElementById("closeAddAbsenceModalBtn"),
    allowanceModal: document.getElementById("allowanceModal"),
    closeAllowanceModalBtn: document.getElementById("closeAllowanceModalBtn"),
    manageWrap: document.getElementById("manageWrap"),
    recordForm: document.getElementById("recordForm"),
    recordUserId: document.getElementById("recordUserId"),
    recordType: document.getElementById("recordType"),
    recordStart: document.getElementById("recordStart"),
    recordEnd: document.getElementById("recordEnd"),
    recordSourceYear: document.getElementById("recordSourceYear"),
    sourceYearWrap: document.getElementById("sourceYearWrap"),
    recordNote: document.getElementById("recordNote"),
    addRecordBtn: document.getElementById("addRecordBtn"),
    allowanceForm: document.getElementById("allowanceForm"),
    allowanceUserId: document.getElementById("allowanceUserId"),
    allowanceUserName: document.getElementById("allowanceUserName"),
    allowanceType: document.getElementById("allowanceType"),
    allowanceOperation: document.getElementById("allowanceOperation"),
    allowanceDaysWrap: document.getElementById("allowanceDaysWrap"),
    allowanceDays: document.getElementById("allowanceDays"),
    saveAllowanceBtn: document.getElementById("saveAllowanceBtn"),
    lblUser: document.getElementById("lblUser"),
    lblType: document.getElementById("lblType"),
    lblStart: document.getElementById("lblStart"),
    lblEnd: document.getElementById("lblEnd"),
    lblSourceYear: document.getElementById("lblSourceYear"),
    lblNote: document.getElementById("lblNote"),
    lblAllowanceUser: document.getElementById("lblAllowanceUser"),
    lblAllowanceType: document.getElementById("lblAllowanceType"),
    lblAllowanceOperation: document.getElementById("lblAllowanceOperation"),
    lblAllowanceDays: document.getElementById("lblAllowanceDays"),
    legendPaid: document.getElementById("legendPaid"),
    legendSick: document.getElementById("legendSick"),
    legendUnpaid: document.getElementById("legendUnpaid"),
    legendStudy: document.getElementById("legendStudy"),
    lblFilterUser: document.getElementById("lblFilterUser"),
    lblFilterType: document.getElementById("lblFilterType"),
    lblFilterFrom: document.getElementById("lblFilterFrom"),
    lblFilterTo: document.getElementById("lblFilterTo"),
    filterUserId: document.getElementById("filterUserId"),
    filterLeaveType: document.getElementById("filterLeaveType"),
    filterFrom: document.getElementById("filterFrom"),
    filterTo: document.getElementById("filterTo"),
    applyFiltersBtn: document.getElementById("applyFiltersBtn"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    approveSubstituteModal: document.getElementById("approveSubstituteModal"),
    approveSubstituteTitle: document.getElementById("approveSubstituteTitle"),
    approveSubstituteSummary: document.getElementById("approveSubstituteSummary"),
    approveSubstituteUserId: document.getElementById("approveSubstituteUserId"),
    lblApproveSubstitute: document.getElementById("lblApproveSubstitute"),
    closeApproveSubstituteModalBtn: document.getElementById("closeApproveSubstituteModalBtn"),
    cancelApproveSubstituteBtn: document.getElementById("cancelApproveSubstituteBtn"),
    confirmApproveSubstituteBtn: document.getElementById("confirmApproveSubstituteBtn")
  };

  const I18N = {
    en: {
      title: "Leave Planner",
      subtitle: "Monthly leave matrix and balances",
      back: "Back",
      prev: "Prev",
      next: "Next",
      details: "Details",
      close: "Close",
      openDetails: "Details & Add",
      detailsBtn: "Details",
      balancesFor: "Balances for",
      leaveCardsLeave: "Leave",
      leaveCardsStudy: "Study leave",
      leaveCardsSick: "Sick leave",
      leaveCardsUnpaid: "Unpaid leave",
      leaveCardsComp: "Compensation clock",
      addLeave: "Add leave",
      allowance: "Set allowance",
      records: "Records",
      filterUser: "Filter user",
      filterType: "Filter type",
      filterFrom: "From",
      filterTo: "To",
      filterApply: "Apply",
      filterReset: "Reset",
      all: "All",
      user: "User",
      type: "Type",
      start: "Start",
      end: "End",
      sourceYear: "Source year",
      note: "Note",
      add: "Add",
      saveAllowance: "Save allowance",
      allowanceApply: "Apply",
      allowanceAction: "Action",
      allowanceAdd: "Add",
      allowanceRemove: "Remove",
      allowanceReset: "Reset",
      allowanceDays: "Days",
      paid: "Leave",
      sick: "Sick",
      unpaid: "Unpaid",
      study: "Study",
      abbrPaid: "L",
      abbrSick: "S",
      abbrUnpaid: "U",
      abbrStudy: "ST",
      loading: "Loading...",
      forbidden: "No permission for leave page.",
      loadedUsers: "Loaded users:",
      owner: "Owner",
      totalAvailable: "Total available",
      totalUsed: "Total used",
      monthlySick: "Sick by month",
      workingDaysMonth: "Working days",
      workingDaysShort: "WD",
      noRecords: "No records.",
      pendingRequests: "Pending requests",
      noPendingRequests: "No pending requests",
      delete: "Delete",
      approve: "Approve",
      approveLeave: "Approve leave",
      cancel: "Cancel",
      substitute: "Substitute",
      chooseSubstitute: "Choose who will substitute the absent user for this period.",
      substituteRequired: "Choose a substitute before approving.",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      days: "days",
      from: "from",
      to: "to",
      clock: "Clock",
      language: "BG",
      me: "User"
    },
    bg: {
      title: "\u041E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u044F",
      subtitle: "\u041C\u0435\u0441\u0435\u0447\u043D\u0430 \u043C\u0430\u0442\u0440\u0438\u0446\u0430 \u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u043E\u0441\u0442\u0438",
      back: "\u041D\u0430\u0437\u0430\u0434",
      prev: "\u041D\u0430\u0437\u0430\u0434",
      next: "\u041D\u0430\u043F\u0440\u0435\u0434",
      details: "\u0414\u0435\u0442\u0430\u0439\u043B\u0438",
      close: "\u0417\u0430\u0442\u0432\u043E\u0440\u0438",
      openDetails: "\u0414\u0435\u0442\u0430\u0439\u043B\u0438 \u0438 \u0434\u043E\u0431\u0430\u0432\u044F\u043D\u0435",
      detailsBtn: "\u0414\u0435\u0442\u0430\u0439\u043B\u0438",
      balancesFor: "\u041D\u0430\u043B\u0438\u0447\u043D\u043E\u0441\u0442\u0438 \u0437\u0430",
      leaveCardsLeave: "\u041E\u0442\u043F\u0443\u0441\u043A\u0430",
      leaveCardsStudy: "\u0423\u0447\u0435\u0431\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A",
      leaveCardsSick: "\u0411\u043E\u043B\u043D\u0438\u0447\u0435\u043D",
      leaveCardsUnpaid: "\u041D\u0435\u043F\u043B\u0430\u0442\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A",
      leaveCardsComp: "\u041A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0442\u043E\u0440\u0435\u043D \u0447\u0430\u0441\u043E\u0432\u043D\u0438\u043A",
      addLeave: "\u0414\u043E\u0431\u0430\u0432\u0438 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u0435",
      allowance: "\u0417\u0430\u0434\u0430\u0439 \u043B\u0438\u043C\u0438\u0442",
      records: "\u0417\u0430\u043F\u0438\u0441\u0438",
      filterUser: "\u0424\u0438\u043B\u0442\u044A\u0440 \u0445\u043E\u0440\u0430",
      filterType: "\u0424\u0438\u043B\u0442\u044A\u0440 \u0442\u0438\u043F",
      filterFrom: "\u041E\u0442",
      filterTo: "\u0414\u043E",
      filterApply: "\u041F\u0440\u0438\u043B\u043E\u0436\u0438",
      filterReset: "\u041D\u0443\u043B\u0438\u0440\u0430\u0439",
      all: "\u0412\u0441\u0438\u0447\u043A\u0438",
      user: "\u0421\u043B\u0443\u0436\u0438\u0442\u0435\u043B",
      type: "\u0422\u0438\u043F",
      start: "\u041E\u0442",
      end: "\u0414\u043E",
      sourceYear: "\u0413\u043E\u0434\u0438\u043D\u0430 \u0437\u0430 \u043F\u043E\u043B\u0437\u0432\u0430\u043D\u0435",
      note: "\u0411\u0435\u043B\u0435\u0436\u043A\u0430",
      add: "\u0414\u043E\u0431\u0430\u0432\u0438",
      saveAllowance: "\u0417\u0430\u043F\u0430\u0437\u0438 \u043B\u0438\u043C\u0438\u0442",
      allowanceApply: "\u041F\u0440\u0438\u043B\u043E\u0436\u0438",
      allowanceAction: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
      allowanceAdd: "\u0414\u043E\u0431\u0430\u0432\u0438",
      allowanceRemove: "\u041F\u0440\u0435\u043C\u0430\u0445\u043D\u0438",
      allowanceReset: "\u041D\u0443\u043B\u0438\u0440\u0430\u0439",
      allowanceDays: "\u0414\u043D\u0438",
      paid: "\u041E\u0442\u043F\u0443\u0441\u043A\u0430",
      sick: "\u0411\u043E\u043B\u043D\u0438\u0447\u0435\u043D",
      unpaid: "\u041D\u0435\u043F\u043B\u0430\u0442\u0435\u043D",
      study: "\u0423\u0447\u0435\u0431\u0435\u043D",
      abbrPaid: "\u041E",
      abbrSick: "\u0411",
      abbrUnpaid: "\u041D",
      abbrStudy: "\u0423",
      loading: "\u0417\u0430\u0440\u0435\u0436\u0434\u0430\u043D\u0435...",
      forbidden: "\u041D\u044F\u043C\u0430\u0448 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430 \u043C\u043E\u0434\u0443\u043B\u0430 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u044F.",
      loadedUsers: "\u0417\u0430\u0440\u0435\u0434\u0435\u043D\u0438 \u0445\u043E\u0440\u0430:",
      owner: "\u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u0438\u043A",
      totalAvailable: "\u041E\u0431\u0449\u043E \u043D\u0430\u043B\u0438\u0447\u043D\u0438",
      totalUsed: "\u041E\u0431\u0449\u043E \u043F\u043E\u043B\u0437\u0432\u0430\u043D\u0438",
      monthlySick: "\u0411\u043E\u043B\u043D\u0438\u0447\u043D\u0438 \u043F\u043E \u043C\u0435\u0441\u0435\u0446\u0438",
      workingDaysMonth: "\u0420\u0430\u0431\u043E\u0442\u043D\u0438 \u0434\u043D\u0438",
      workingDaysShort: "\u0420\u0414",
      noRecords: "\u041D\u044F\u043C\u0430 \u0437\u0430\u043F\u0438\u0441\u0438.",
      pendingRequests: "\u0427\u0430\u043A\u0430\u0449\u0438 \u0437\u0430\u044F\u0432\u043A\u0438",
      noPendingRequests: "\u041D\u044F\u043C\u0430 \u0447\u0430\u043A\u0430\u0449\u0438 \u0437\u0430\u044F\u0432\u043A\u0438",
      delete: "\u0418\u0437\u0442\u0440\u0438\u0439",
      approve: "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438",
      approveLeave: "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u0435",
      cancel: "\u041E\u0442\u043A\u0430\u0437",
      substitute: "\u0417\u0430\u043C\u0435\u0441\u0442\u043D\u0438\u043A",
      chooseSubstitute: "\u0418\u0437\u0431\u0435\u0440\u0438 \u043A\u043E\u0439 \u0449\u0435 \u0437\u0430\u043C\u0435\u0441\u0442\u0432\u0430 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0430\u0449\u0438\u044F \u0437\u0430 \u0442\u043E\u0437\u0438 \u043F\u0435\u0440\u0438\u043E\u0434.",
      substituteRequired: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0437\u0430\u043C\u0435\u0441\u0442\u043D\u0438\u043A \u043F\u0440\u0435\u0434\u0438 \u043F\u043E\u0442\u0432\u044A\u0440\u0436\u0434\u0430\u0432\u0430\u043D\u0435.",
      pending: "\u041D\u0435\u043F\u043E\u0442\u0432\u044A\u0440\u0434\u0435\u043D\u043E",
      approved: "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0435\u043D\u043E",
      rejected: "\u041E\u0442\u043A\u0430\u0437\u0430\u043D\u043E",
      days: "\u0434\u043D\u0438",
      from: "\u043E\u0442",
      to: "\u0434\u043E",
      clock: "\u0427\u0430\u0441\u043E\u0432\u043D\u0438\u043A",
      language: "EN",
      me: "\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B"
    }
  };

  function t(key) {
    const dict = I18N[state.lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function setStatus(message, isError) {
    el.status.textContent = String(message || "");
    el.status.style.color = isError ? "#991b1b" : "";
  }

  async function refreshAccessToken() {
    const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!r.ok) return null;
    const body = await r.json().catch(() => ({}));
    if (body.accessToken) {
      localStorage.setItem(ACCESS_KEY, body.accessToken);
      return body.accessToken;
    }
    return null;
  }

  async function api(path, options) {
    const opts = options || {};
    let token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      window.location.href = resolveRuntimePath("/login");
      throw new Error("Not logged in");
    }

    const run = async (bearer) => fetch(path, {
      ...opts,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(opts.headers || {}),
        authorization: `Bearer ${bearer}`
      }
    });

    let res = await run(token);
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        window.location.href = resolveRuntimePath("/login");
        throw new Error("Session expired");
      }
      res = await run(refreshed);
    }
    return res;
  }

  function parseTypeClass(type) {
    return `t-${String(type || "").toLowerCase()}`;
  }

  function formatMonthLabel() {
    el.monthLabel.textContent = state.month.toLocaleDateString(state.lang === "bg" ? "bg-BG" : "en-US", {
      year: "numeric",
      month: "long"
    });
  }

  function toYmdLocal(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getMonthRangeYmd() {
    const y = state.month.getUTCFullYear();
    const m = state.month.getUTCMonth();
    const from = new Date(Date.UTC(y, m, 1));
    const to = new Date(Date.UTC(y, m + 1, 0));
    return { from: toYmdLocal(from), to: toYmdLocal(to) };
  }

  function syncFiltersFromControls() {
    state.filters.userId = String(el.filterUserId.value || "").trim();
    state.filters.leaveType = String(el.filterLeaveType.value || "").trim();
    state.filters.from = String(el.filterFrom.value || "").trim();
    state.filters.to = String(el.filterTo.value || "").trim();
  }

  function syncControlsFromFilters() {
    if (el.filterUserId) el.filterUserId.value = state.filters.userId;
    if (el.filterLeaveType) el.filterLeaveType.value = state.filters.leaveType;
    if (el.filterFrom) el.filterFrom.value = state.filters.from;
    if (el.filterTo) el.filterTo.value = state.filters.to;
  }

  function openDetailsModal() {
    if (!el.detailsModal) return;
    el.detailsModal.classList.remove("hidden");
    el.detailsModal.setAttribute("aria-hidden", "false");
  }

  function closeDetailsModal() {
    if (!el.detailsModal) return;
    el.detailsModal.classList.add("hidden");
    el.detailsModal.setAttribute("aria-hidden", "true");
  }

  function openAddAbsenceModal() {
    if (!el.addAbsenceModal) return;
    el.addAbsenceModal.classList.remove("hidden");
    el.addAbsenceModal.setAttribute("aria-hidden", "false");
  }

  function closeAddAbsenceModal() {
    if (!el.addAbsenceModal) return;
    el.addAbsenceModal.classList.add("hidden");
    el.addAbsenceModal.setAttribute("aria-hidden", "true");
  }

  function openAllowanceModal() {
    if (!el.allowanceModal) return;
    el.allowanceModal.classList.remove("hidden");
    el.allowanceModal.setAttribute("aria-hidden", "false");
  }

  function closeAllowanceModal() {
    if (!el.allowanceModal) return;
    el.allowanceModal.classList.add("hidden");
    el.allowanceModal.setAttribute("aria-hidden", "true");
  }

  function findUser(userId) {
    return state.users.find((u) => u.id === userId)
      || ((state.matrix && Array.isArray(state.matrix.users) ? state.matrix.users : []).find((u) => u.id === userId));
  }

  function findRecord(recordId) {
    return state.records.find((row) => row.id === recordId)
      || (((state.matrix && Array.isArray(state.matrix.records)) ? state.matrix.records : []).find((row) => row.id === recordId));
  }

  function openApproveSubstituteModal(recordId) {
    const record = findRecord(recordId);
    if (!record || !el.approveSubstituteModal || !el.approveSubstituteUserId) return;
    state.approvingRecordId = recordId;
    const absentUser = findUser(record.userId);
    el.approveSubstituteSummary.textContent = `${t("chooseSubstitute")} ${formatUserName(absentUser)}: ${record.startDate} - ${record.endDate}`;
    el.approveSubstituteUserId.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = `- ${t("substitute")} -`;
    el.approveSubstituteUserId.appendChild(empty);
    state.users
      .filter((u) => u.id !== record.userId)
      .forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = formatUserName(u);
        el.approveSubstituteUserId.appendChild(opt);
      });
    el.approveSubstituteModal.classList.remove("hidden");
    el.approveSubstituteModal.setAttribute("aria-hidden", "false");
  }

  function closeApproveSubstituteModal() {
    if (!el.approveSubstituteModal) return;
    state.approvingRecordId = "";
    el.approveSubstituteModal.classList.add("hidden");
    el.approveSubstituteModal.setAttribute("aria-hidden", "true");
  }

  async function openDetailsForUser(userId) {
    if (!userId) return;
    state.selectedUserId = userId;
    if (el.recordUserId) el.recordUserId.value = userId;
    if (el.allowanceUserId) el.allowanceUserId.value = userId;
    if (el.allowanceUserName) {
      const u = state.users.find((x) => x.id === userId);
      el.allowanceUserName.value = formatUserName(u);
    }
    await loadBalancesAndRecords();
    openDetailsModal();
  }

  function formatUserName(u) {
    return (u && (u.nickname || u.username || "").trim()) || "-";
  }

  function formatCompMinutes(value) {
    const total = Math.trunc(Number(value || 0));
    const sign = total < 0 ? "-" : "";
    const abs = Math.abs(total);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
  }

  function hasPermission(permissionKey) {
    const perms = new Set((state.me && state.me.permissions) || []);
    return perms.has("*") || perms.has(permissionKey);
  }

  function ensurePermissionFlags() {
    state.canReadSelf = hasPermission("leave.read_self") || hasPermission("leave.read_all") || hasPermission("leave.manage");
    state.canReadAll = hasPermission("leave.read_all") || hasPermission("leave.manage");
    state.canManage = hasPermission("leave.manage");
  }

  function dayCellRecordMap(userId) {
    const out = new Map();
    const rows = (state.matrix && state.matrix.records) || [];
    for (const row of rows) {
      if (row.userId !== userId) continue;
      const from = Number(String(row.startDate || "").slice(8, 10));
      const to = Number(String(row.endDate || "").slice(8, 10));
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
      for (let d = from; d <= to; d += 1) {
        const key = String(d);
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(row);
      }
    }
    return out;
  }

  function renderMatrix() {
    const table = el.matrixTable;
    table.innerHTML = "";

    if (!state.matrix || !Array.isArray(state.matrix.users)) return;

    const days = Number(state.matrix.daysInMonth || 31);
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");

    const userHead = document.createElement("th");
    userHead.className = "sticky-left";
    userHead.textContent = t("user");
    hr.appendChild(userHead);

    for (let d = 1; d <= days; d += 1) {
      const th = document.createElement("th");
      th.textContent = String(d);
      hr.appendChild(th);
    }

    const summaryHead = document.createElement("th");
    summaryHead.textContent = state.lang === "bg" ? "Общо" : "Summary";
    hr.appendChild(summaryHead);

    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    state.matrix.users.forEach((u) => {
      const tr = document.createElement("tr");
      const left = document.createElement("td");
      left.className = "sticky-left";
      const wrap = document.createElement("div");
      wrap.className = "user-cell";
      const nameBox = document.createElement("div");
      const name = document.createElement("span");
      name.className = "user-name";
      name.textContent = formatUserName(u);
      name.style.color = u.color || "";
      const s = (u.summary || {});
      const workDaysMonth = Math.max(0, Number(u.workingDaysMonth ?? state.matrix.workingDaysInMonth ?? 0));
      const meta = document.createElement("div");
      meta.className = "user-meta";
      meta.textContent = `${t("abbrPaid")}:${s.leave || s.paid || 0} ${t("abbrSick")}:${s.sick || 0} ${t("abbrUnpaid")}:${s.unpaid || 0} ${t("abbrStudy")}:${s.study || 0} | ${t("workingDaysShort")}:${workDaysMonth}`;
      const comp = document.createElement("div");
      const compMinutes = Number(u.compMinutes || 0);
      comp.className = `user-comp ${compMinutes > 0 ? "pos" : (compMinutes < 0 ? "neg" : "neu")}`;
      comp.textContent = `${t("clock")}: ${formatCompMinutes(compMinutes)}`;
      nameBox.append(name, meta, comp);
      const detailsBtn = document.createElement("button");
      detailsBtn.type = "button";
      detailsBtn.className = "btn user-details-btn";
      detailsBtn.textContent = t("detailsBtn");
      detailsBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await openDetailsForUser(u.id);
      });
      wrap.append(nameBox, detailsBtn);
      left.appendChild(wrap);
      tr.appendChild(left);

      const recordMap = dayCellRecordMap(u.id);
      for (let d = 1; d <= days; d += 1) {
        const td = document.createElement("td");
        const rows = recordMap.get(String(d)) || [];
        if (rows.length) {
          const row = rows[rows.length - 1];
          const badge = document.createElement("div");
          badge.className = `cell ${parseTypeClass(row.leaveType)}`;
          if (String(row.status || "") === "pending") badge.classList.add("pending");
          const labelMap = {
            paid: t("abbrPaid"),
            sick: t("abbrSick"),
            unpaid: t("abbrUnpaid"),
            study: t("abbrStudy")
          };
          badge.textContent = rows.length > 1 ? `${labelMap[row.leaveType] || "?"}+` : (labelMap[row.leaveType] || "?");
          badge.title = rows.map((x) => `${x.leaveType === "paid" ? t("paid") : t(x.leaveType)} (${x.status === "pending" ? t("pending") : t("approved")}): ${x.startDate} - ${x.endDate}${x.note ? ` | ${x.note}` : ""}`).join("\n");
          td.appendChild(badge);
        }
        tr.appendChild(td);
      }

      const sum = document.createElement("td");
      sum.className = "summary-cell";
      const workBadge = document.createElement("span");
      workBadge.className = "summary-badge t-work";
      workBadge.textContent = `${t("workingDaysMonth")}: ${workDaysMonth}`;
      const leaveBadge = document.createElement("span");
      leaveBadge.className = "summary-badge t-paid";
      leaveBadge.textContent = `${t("paid")}: ${Number(s.leave || s.paid || 0)}`;
      const sickBadge = document.createElement("span");
      sickBadge.className = "summary-badge t-sick";
      sickBadge.textContent = `${t("sick")}: ${Number(s.sick || 0)}`;
      const unpaidBadge = document.createElement("span");
      unpaidBadge.className = "summary-badge t-unpaid";
      unpaidBadge.textContent = `${t("unpaid")}: ${Number(s.unpaid || 0)}`;
      const studyBadge = document.createElement("span");
      studyBadge.className = "summary-badge t-study";
      studyBadge.textContent = `${t("study")}: ${Number(s.study || 0)}`;
      sum.append(workBadge, leaveBadge, sickBadge, unpaidBadge, studyBadge);
      tr.appendChild(sum);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  }

  function fillUserSelects() {
    const selects = [el.recordUserId];
    selects.forEach((select) => {
      if (!select) return;
      select.innerHTML = "";
      state.users.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = formatUserName(u);
        select.appendChild(opt);
      });
      if (state.selectedUserId) select.value = state.selectedUserId;
    });

    if (el.allowanceUserId && state.selectedUserId) {
      el.allowanceUserId.value = state.selectedUserId;
      const u = state.users.find((x) => x.id === state.selectedUserId);
      if (el.allowanceUserName) el.allowanceUserName.value = formatUserName(u);
    }

    if (el.filterUserId) {
      const current = state.filters.userId;
      el.filterUserId.innerHTML = "";
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = t("all");
      el.filterUserId.appendChild(allOpt);
      state.users.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = formatUserName(u);
        el.filterUserId.appendChild(opt);
      });
      state.filters.userId = current && state.users.some((u) => u.id === current) ? current : "";
      if (!state.canReadAll && state.users.length) {
        state.filters.userId = state.users[0].id;
      }
      el.filterUserId.value = state.filters.userId;
      el.filterUserId.disabled = !state.canReadAll;
    }
  }

  async function loadMe() {
    const res = await api("/api/me", { method: "GET" });
    if (!res.ok) throw new Error("Failed to load profile");
    const body = await res.json();
    state.me = body;
    ensurePermissionFlags();

    if (!state.canReadSelf) {
      setStatus(t("forbidden"), true);
      el.manageWrap.classList.add("hidden");
      return false;
    }

    const userLabel = `${t("me")}: ${(body.nickname || body.username)} (${body.role})`;
    el.me.textContent = userLabel;
    el.manageWrap.classList.toggle("hidden", !state.canManage);
    if (!state.canReadAll) {
      state.selectedUserId = String(body.id || "");
      state.filters.userId = state.selectedUserId;
      syncControlsFromFilters();
    }
    return true;
  }

  async function loadUsers() {
    const res = await api("/api/leave/users", { method: "GET" });
    const body = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error((body && body.error) || "Failed to load users");
    state.users = Array.isArray(body) ? body : [];

    if (!state.selectedUserId && state.users.length) {
      state.selectedUserId = state.users[0].id;
    }

    fillUserSelects();
    setStatus(`${t("loadedUsers")} ${state.users.length}`, false);
  }

  async function loadMatrix() {
    const y = state.month.getUTCFullYear();
    const m = state.month.getUTCMonth() + 1;
    const params = new URLSearchParams({ year: String(y), month: String(m) });
    if (state.filters.userId) params.set("userId", state.filters.userId);
    if (state.filters.leaveType) params.set("leaveType", state.filters.leaveType);
    const res = await api(`/api/leave/matrix?${params.toString()}`, { method: "GET" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body && body.error) || "Failed to load matrix");
    state.matrix = body;
    renderMatrix();
  }

  function renderPendingSummary() {
    if (!el.pendingRequestsIndicator) return;
    if (!state.canManage) {
      el.pendingRequestsIndicator.classList.add("hidden");
      return;
    }
    const count = Number((state.pendingSummary && state.pendingSummary.count) || 0);
    el.pendingRequestsIndicator.classList.remove("hidden");
    el.pendingRequestsIndicator.classList.toggle("has-pending", count > 0);
    el.pendingRequestsIndicator.textContent = count > 0
      ? `${t("pendingRequests")}: ${count}`
      : t("noPendingRequests");
  }

  async function loadPendingSummary() {
    if (!state.canManage) {
      state.pendingSummary = { count: 0, oldest: null };
      renderPendingSummary();
      return;
    }
    const res = await api("/api/leave/pending-summary", { method: "GET" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body && body.error) || "Failed to load pending leave requests");
    state.pendingSummary = body || { count: 0, oldest: null };
    renderPendingSummary();
  }

  async function focusOldestPendingRequest() {
    const oldest = state.pendingSummary && state.pendingSummary.oldest;
    if (!oldest || !oldest.userId || !oldest.startDate) return;
    const targetMonth = new Date(`${oldest.startDate}T00:00:00.000Z`);
    if (!Number.isNaN(targetMonth.getTime())) {
      state.month = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1));
      const range = getMonthRangeYmd();
      state.filters.from = range.from;
      state.filters.to = range.to;
    }
    state.selectedUserId = oldest.userId;
    state.filters.userId = oldest.userId;
    syncControlsFromFilters();
    await reloadAll();
    await openDetailsForUser(oldest.userId);
  }

  function renderBalancesPanel(body) {
    if (!body || !body.balances) {
      el.balances.textContent = "-";
      if (el.balancesSummary) el.balancesSummary.textContent = "-";
      return;
    }
    const leave = body.balances.leave || body.balances.paid || {};
    const study = body.balances.study || {};
    const sick = body.balances.sick || {};
    const unpaid = body.balances.unpaid || {};

    const studyYears = Object.keys(study.allowancesByYear || {})
      .sort((a, b) => Number(a) - Number(b))
      .map((y) => `<div class="detail-line"><span>${y}</span><span>${(study.allowancesByYear[y] || 0)} / ${(study.usedByYear && study.usedByYear[y]) || 0}</span></div>`)
      .join("");

    const sickMonths = Object.keys(body.sickByMonth || {})
      .sort((a, b) => Number(a) - Number(b))
      .map((m) => `${m}: ${body.sickByMonth[m] || 0}`)
      .join(" | ");

    const ownerName = (body.user && (body.user.nickname || body.user.username)) || "-";
    if (el.detailsForUserLabel) {
      el.detailsForUserLabel.textContent = `${t("balancesFor")}: ${ownerName}`;
    }
    const compMinutes = Number(state.selectedUserCompMinutes || 0);
    const compTone = compMinutes > 0 ? "#166534" : (compMinutes < 0 ? "#991b1b" : "#475569");
    el.balances.innerHTML = `
      <section class="detail-box">
        <h4>${t("leaveCardsLeave")}</h4>
        <div class="detail-line"><strong>${t("totalAvailable")}</strong><strong>${leave.totalAvailable || 0} ${t("days")}</strong></div>
        <div class="detail-line"><span>${t("totalUsed")}</span><span>${leave.totalUsed || 0} ${t("days")}</span></div>
      </section>
      <section class="detail-box">
        <h4>${t("leaveCardsStudy")}</h4>
        <div class="detail-line"><strong>${t("totalAvailable")}</strong><strong>${study.totalAvailable || 0} ${t("days")}</strong></div>
        <div class="detail-line"><span>${t("totalUsed")}</span><span>${study.totalUsed || 0} ${t("days")}</span></div>
        <div class="muted">${studyYears || "-"}</div>
      </section>
      <section class="detail-box">
        <h4>${t("leaveCardsSick")}</h4>
        <div class="detail-line"><strong>${t("totalUsed")}</strong><strong>${sick.totalUsed || 0} ${t("days")}</strong></div>
        <div class="muted">${t("monthlySick")}: ${sickMonths || "-"}</div>
      </section>
      <section class="detail-box">
        <h4>${t("leaveCardsUnpaid")}</h4>
        <div class="detail-line"><strong>${t("totalUsed")}</strong><strong>${unpaid.totalUsed || 0} ${t("days")}</strong></div>
      </section>
      <section class="detail-box">
        <h4>${t("leaveCardsComp")}</h4>
        <div class="detail-line"><strong>${t("clock")}</strong><strong style="color:${compTone};">${formatCompMinutes(compMinutes)}</strong></div>
      </section>
    `;
    if (el.balancesSummary) {
      el.balancesSummary.innerHTML = `<strong>${t("owner")}:</strong> ${ownerName}<br><strong>${t("totalAvailable")}:</strong> ${(leave.totalAvailable || 0)} ${t("days")}<br><strong>${t("clock")}:</strong> <span style="color:${compTone};">${formatCompMinutes(compMinutes)}</span>`;
    }

    refreshSourceYearOptions();
  }

  function renderRecords() {
    el.records.innerHTML = "";
    if (!state.records.length) {
      el.records.innerHTML = `<div class="record"><span class="muted">${t("noRecords")}</span></div>`;
      return;
    }

    state.records.forEach((row) => {
      const item = document.createElement("div");
      item.className = "record";
      const main = document.createElement("div");
      const typeLabel = row.leaveType === "paid" ? t("paid") : t(row.leaveType);
      const statusLabel = row.status === "pending" ? t("pending") : (row.status === "rejected" ? t("rejected") : t("approved"));
      const substitute = row.substituteUserId ? findUser(row.substituteUserId) : null;
      const substituteLine = substitute ? `<br><span class=\"muted\">${t("substitute")}: ${formatUserName(substitute)}</span>` : "";
      main.innerHTML = `<strong>${typeLabel}</strong> [${statusLabel}] ${t("from")} ${row.startDate} ${t("to")} ${row.endDate} (${row.days} ${t("days")})${row.sourceYear ? ` [${row.sourceYear}]` : ""}${substituteLine}${row.note ? `<br><span class=\"muted\">${row.note}</span>` : ""}`;
      item.appendChild(main);

      if (state.canManage) {
        const actions = document.createElement("div");
        actions.className = "record-actions";
        if (String(row.status || "") === "pending") {
          const approve = document.createElement("button");
          approve.type = "button";
          approve.className = "btn primary";
          approve.textContent = t("approve");
          approve.addEventListener("click", () => {
            openApproveSubstituteModal(row.id);
          });
          actions.appendChild(approve);
        }
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn";
        del.textContent = t("delete");
        del.addEventListener("click", async () => {
          await deleteRecord(row.id);
        });
        actions.appendChild(del);
        item.appendChild(actions);
      }

      el.records.appendChild(item);
    });
  }

  async function loadBalancesAndRecords() {
    const targetUserId = state.filters.userId || state.selectedUserId;
    if (!targetUserId) return;
    state.selectedUserId = targetUserId;
    const selectedUser = ((state.matrix && Array.isArray(state.matrix.users) ? state.matrix.users : []).find((u) => u.id === targetUserId))
      || state.users.find((u) => u.id === targetUserId);
    state.selectedUserCompMinutes = Number((selectedUser && selectedUser.compMinutes) || 0);

    const y = state.month.getUTCFullYear();
    const balanceRes = await api(`/api/leave/balances?userId=${encodeURIComponent(targetUserId)}&year=${y}`, { method: "GET" });
    const balanceBody = await balanceRes.json().catch(() => ({}));
    if (!balanceRes.ok) throw new Error((balanceBody && balanceBody.error) || "Failed to load balances");
    try {
      const compRes = await api(`/api/compensations/balance?userId=${encodeURIComponent(targetUserId)}`, { method: "GET" });
      if (compRes.ok) {
        const compBody = await compRes.json().catch(() => ({}));
        state.selectedUserCompMinutes = Number((compBody && compBody.minutes) || 0);
      }
    } catch {
      // leave page should still work without compensation permission
    }
    renderBalancesPanel(balanceBody);

    const defaultRange = getMonthRangeYmd();
    const from = state.filters.from || defaultRange.from;
    const to = state.filters.to || defaultRange.to;
    const params = new URLSearchParams({
      userId: targetUserId,
      from,
      to
    });
    if (state.filters.leaveType) params.set("leaveType", state.filters.leaveType);
    const recordsRes = await api(`/api/leave/records?${params.toString()}`, { method: "GET" });
    const recordsBody = await recordsRes.json().catch(() => ([]));
    if (!recordsRes.ok) throw new Error((recordsBody && recordsBody.error) || "Failed to load records");
    state.records = Array.isArray(recordsBody) ? recordsBody : [];
    renderRecords();
  }

  async function refreshSourceYearOptions() {
    // Year source is removed; leave is managed as pooled balance.
    if (!el.sourceYearWrap || !el.recordSourceYear) return;
    el.recordSourceYear.innerHTML = "";
    el.sourceYearWrap.classList.add("hidden");
  }

  async function addRecord(e) {
    e.preventDefault();
    const payload = {
      userId: el.recordUserId.value,
      leaveType: el.recordType.value,
      startDate: el.recordStart.value,
      endDate: el.recordEnd.value,
      note: el.recordNote.value.trim() || undefined
    };

    const res = await api("/api/leave/records", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body && body.error) || "Failed to add leave");

    state.selectedUserId = payload.userId;
    await reloadAll();
  }

  async function saveAllowance(e) {
    e.preventDefault();
    const operation = String((el.allowanceOperation && el.allowanceOperation.value) || "add");
    const payload = {
      userId: el.allowanceUserId.value,
      leaveType: el.allowanceType.value,
      operation,
      days: operation === "reset" ? 0 : Number(el.allowanceDays.value || 0)
    };

    const res = await api("/api/leave/allowances", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body && body.error) || "Failed to save allowance");

    state.selectedUserId = payload.userId;
    await reloadAll();
  }

  async function deleteRecord(id) {
    const res = await api(`/api/leave/records/${encodeURIComponent(id)}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body && body.error) || "Failed to delete record");
    await reloadAll();
  }

  async function approveRecord(id, substituteUserId) {
    const res = await api(`/api/leave/records/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({ substituteUserId })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body && body.error) || "Failed to approve record");
    await reloadAll();
  }

  async function confirmApproveWithSubstitute() {
    const recordId = String(state.approvingRecordId || "").trim();
    const substituteUserId = String((el.approveSubstituteUserId && el.approveSubstituteUserId.value) || "").trim();
    if (!recordId || !substituteUserId) {
      setStatus(t("substituteRequired"), true);
      return;
    }
    await approveRecord(recordId, substituteUserId);
    closeApproveSubstituteModal();
  }

  function applyTexts() {
    document.documentElement.lang = state.lang;
    el.title.textContent = t("title");
    el.subtitle.textContent = t("subtitle");
    el.backBtn.textContent = t("back");
    el.prevBtn.textContent = t("prev");
    el.nextBtn.textContent = t("next");
    el.panelTitle.textContent = t("details");
    el.detailsModalTitle.textContent = t("details");
    el.closeDetailsModalBtn.textContent = t("close");
    if (el.openAddAbsenceModalBtn) el.openAddAbsenceModalBtn.textContent = t("addLeave");
    if (el.closeAddAbsenceModalBtn) el.closeAddAbsenceModalBtn.textContent = t("close");
    if (el.openAllowanceModalBtn) el.openAllowanceModalBtn.textContent = t("allowance");
    if (el.closeAllowanceModalBtn) el.closeAllowanceModalBtn.textContent = t("close");
    if (el.approveSubstituteTitle) el.approveSubstituteTitle.textContent = t("approveLeave");
    if (el.lblApproveSubstitute) el.lblApproveSubstitute.textContent = t("substitute");
    if (el.closeApproveSubstituteModalBtn) el.closeApproveSubstituteModalBtn.textContent = t("close");
    if (el.cancelApproveSubstituteBtn) el.cancelApproveSubstituteBtn.textContent = t("cancel");
    if (el.confirmApproveSubstituteBtn) el.confirmApproveSubstituteBtn.textContent = t("approve");
    el.addLeaveTitle.textContent = t("addLeave");
    el.allowanceTitle.textContent = t("allowance");
    el.recordsTitle.textContent = t("records");

    el.lblUser.textContent = t("user");
    el.lblType.textContent = t("type");
    el.lblStart.textContent = t("start");
    el.lblEnd.textContent = t("end");
    el.lblSourceYear.textContent = t("sourceYear");
    el.lblNote.textContent = t("note");
    el.addRecordBtn.textContent = t("add");

    el.lblAllowanceUser.textContent = t("user");
    el.lblAllowanceType.textContent = t("type");
    if (el.lblAllowanceOperation) el.lblAllowanceOperation.textContent = t("allowanceAction");
    el.lblAllowanceDays.textContent = t("allowanceDays");
    el.saveAllowanceBtn.textContent = t("allowanceApply");

    el.legendPaid.textContent = t("paid");
    el.legendSick.textContent = t("sick");
    el.legendUnpaid.textContent = t("unpaid");
    el.legendStudy.textContent = t("study");
    el.lblFilterUser.textContent = t("filterUser");
    el.lblFilterType.textContent = t("filterType");
    el.lblFilterFrom.textContent = t("filterFrom");
    el.lblFilterTo.textContent = t("filterTo");
    el.applyFiltersBtn.textContent = t("filterApply");
    el.resetFiltersBtn.textContent = t("filterReset");
    const allTypeOpt = el.filterLeaveType.querySelector("option[value='']");
    if (allTypeOpt) allTypeOpt.textContent = t("all");
    const paidOpt = el.filterLeaveType.querySelector("option[value='paid']");
    if (paidOpt) paidOpt.textContent = t("paid");
    const sickOpt = el.filterLeaveType.querySelector("option[value='sick']");
    if (sickOpt) sickOpt.textContent = t("sick");
    const unpaidOpt = el.filterLeaveType.querySelector("option[value='unpaid']");
    if (unpaidOpt) unpaidOpt.textContent = t("unpaid");
    const studyOpt = el.filterLeaveType.querySelector("option[value='study']");
    if (studyOpt) studyOpt.textContent = t("study");
    const recordPaidOpt = el.recordType.querySelector("option[value='paid']");
    if (recordPaidOpt) recordPaidOpt.textContent = t("paid");
    const recordSickOpt = el.recordType.querySelector("option[value='sick']");
    if (recordSickOpt) recordSickOpt.textContent = t("sick");
    const recordUnpaidOpt = el.recordType.querySelector("option[value='unpaid']");
    if (recordUnpaidOpt) recordUnpaidOpt.textContent = t("unpaid");
    const recordStudyOpt = el.recordType.querySelector("option[value='study']");
    if (recordStudyOpt) recordStudyOpt.textContent = t("study");
    const allowancePaidOpt = el.allowanceType.querySelector("option[value='paid']");
    if (allowancePaidOpt) allowancePaidOpt.textContent = t("paid");
    const allowanceStudyOpt = el.allowanceType.querySelector("option[value='study']");
    if (allowanceStudyOpt) allowanceStudyOpt.textContent = t("study");
    if (el.allowanceOperation) {
      const addOpt = el.allowanceOperation.querySelector("option[value='add']");
      if (addOpt) addOpt.textContent = t("allowanceAdd");
      const removeOpt = el.allowanceOperation.querySelector("option[value='remove']");
      if (removeOpt) removeOpt.textContent = t("allowanceRemove");
      const resetOpt = el.allowanceOperation.querySelector("option[value='reset']");
      if (resetOpt) resetOpt.textContent = t("allowanceReset");
    }

    el.langBtn.textContent = t("language");
    renderPendingSummary();
  }

  async function reloadAll() {
    setStatus(t("loading"), false);
    formatMonthLabel();
    await loadUsers();
    await loadMatrix();
    await loadPendingSummary();
    await loadBalancesAndRecords();
    setStatus(`${t("loadedUsers")} ${state.users.length}`, false);
  }

  async function init() {
    try {
      applyTexts();
      formatMonthLabel();
      if (el.allowanceOperation) {
        el.allowanceOperation.value = "add";
      }
      if (el.allowanceDays) {
        el.allowanceDays.value = "";
      }
      const initialRange = getMonthRangeYmd();
      state.filters.from = initialRange.from;
      state.filters.to = initialRange.to;
      syncControlsFromFilters();

      const ok = await loadMe();
      if (!ok) return;

      await reloadAll();

      el.prevBtn.addEventListener("click", async () => {
        const oldRange = getMonthRangeYmd();
        state.month = new Date(Date.UTC(state.month.getUTCFullYear(), state.month.getUTCMonth() - 1, 1));
        const newRange = getMonthRangeYmd();
        if (state.filters.from === oldRange.from && state.filters.to === oldRange.to) {
          state.filters.from = newRange.from;
          state.filters.to = newRange.to;
          syncControlsFromFilters();
        }
        await reloadAll();
      });

      el.nextBtn.addEventListener("click", async () => {
        const oldRange = getMonthRangeYmd();
        state.month = new Date(Date.UTC(state.month.getUTCFullYear(), state.month.getUTCMonth() + 1, 1));
        const newRange = getMonthRangeYmd();
        if (state.filters.from === oldRange.from && state.filters.to === oldRange.to) {
          state.filters.from = newRange.from;
          state.filters.to = newRange.to;
          syncControlsFromFilters();
        }
        await reloadAll();
      });
      if (el.pendingRequestsIndicator) {
        el.pendingRequestsIndicator.addEventListener("click", async () => {
          try {
            await focusOldestPendingRequest();
          } catch (err) {
            setStatus(err && err.message ? err.message : String(err), true);
          }
        });
      }

      el.langBtn.addEventListener("click", async () => {
        state.lang = state.lang === "bg" ? "en" : "bg";
        localStorage.setItem("procal_lang", state.lang);
        applyTexts();
        formatMonthLabel();
        renderMatrix();
        renderRecords();
        await loadBalancesAndRecords();
      });

      el.closeDetailsModalBtn.addEventListener("click", () => {
        closeDetailsModal();
      });
      el.openAddAbsenceModalBtn.addEventListener("click", () => {
        if (el.recordUserId) el.recordUserId.value = state.selectedUserId || "";
        refreshSourceYearOptions();
        openAddAbsenceModal();
      });
      el.closeAddAbsenceModalBtn.addEventListener("click", () => {
        closeAddAbsenceModal();
      });
      if (el.openAllowanceModalBtn) {
        el.openAllowanceModalBtn.addEventListener("click", () => {
          if (el.allowanceUserId) el.allowanceUserId.value = state.selectedUserId || "";
          if (el.allowanceUserName) {
            const u = state.users.find((x) => x.id === state.selectedUserId);
            el.allowanceUserName.value = formatUserName(u);
          }
          openAllowanceModal();
        });
      }
      if (el.closeAllowanceModalBtn) {
        el.closeAllowanceModalBtn.addEventListener("click", () => {
          closeAllowanceModal();
        });
      }
      if (el.closeApproveSubstituteModalBtn) {
        el.closeApproveSubstituteModalBtn.addEventListener("click", () => {
          closeApproveSubstituteModal();
        });
      }
      if (el.cancelApproveSubstituteBtn) {
        el.cancelApproveSubstituteBtn.addEventListener("click", () => {
          closeApproveSubstituteModal();
        });
      }
      if (el.confirmApproveSubstituteBtn) {
        el.confirmApproveSubstituteBtn.addEventListener("click", async () => {
          try {
            await confirmApproveWithSubstitute();
          } catch (err) {
            setStatus(err && err.message ? err.message : String(err), true);
          }
        });
      }
      el.detailsModal.addEventListener("click", (event) => {
        if (event.target === el.detailsModal) closeDetailsModal();
      });
      el.addAbsenceModal.addEventListener("click", (event) => {
        if (event.target === el.addAbsenceModal) closeAddAbsenceModal();
      });
      if (el.allowanceModal) {
        el.allowanceModal.addEventListener("click", (event) => {
          if (event.target === el.allowanceModal) closeAllowanceModal();
        });
      }
      if (el.approveSubstituteModal) {
        el.approveSubstituteModal.addEventListener("click", (event) => {
          if (event.target === el.approveSubstituteModal) closeApproveSubstituteModal();
        });
      }

      el.recordType.addEventListener("change", () => {
        refreshSourceYearOptions();
      });
      if (el.allowanceOperation) {
        el.allowanceOperation.addEventListener("change", () => {
          const op = String(el.allowanceOperation.value || "add");
          const needDays = op !== "reset";
          if (el.allowanceDaysWrap) el.allowanceDaysWrap.classList.toggle("hidden", !needDays);
          if (el.allowanceDays) el.allowanceDays.required = needDays;
        });
      }

      el.applyFiltersBtn.addEventListener("click", async () => {
        syncFiltersFromControls();
        if (state.filters.userId) state.selectedUserId = state.filters.userId;
        await reloadAll();
      });

      el.resetFiltersBtn.addEventListener("click", async () => {
        state.filters.userId = "";
        state.filters.leaveType = "";
        const r = getMonthRangeYmd();
        state.filters.from = r.from;
        state.filters.to = r.to;
        syncControlsFromFilters();
        await reloadAll();
      });

      el.recordUserId.addEventListener("change", () => {
        state.selectedUserId = el.recordUserId.value;
        refreshSourceYearOptions();
      });

      if (state.canManage) {
        el.recordForm.addEventListener("submit", async (e) => {
          try {
            await addRecord(e);
            closeAddAbsenceModal();
          } catch (err) {
            setStatus(err && err.message ? err.message : String(err), true);
          }
        });

        el.allowanceForm.addEventListener("submit", async (e) => {
          try {
            await saveAllowance(e);
            closeAllowanceModal();
          } catch (err) {
            setStatus(err && err.message ? err.message : String(err), true);
          }
        });
      }
    } catch (error) {
      setStatus(error && error.message ? error.message : String(error), true);
    }
  }

  init();
})();
