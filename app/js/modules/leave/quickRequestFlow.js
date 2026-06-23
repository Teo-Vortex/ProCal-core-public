(function initLeaveQuickRequestFlowModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function setModalVisible(modalEl, visible) {
    if (!modalEl) return;
    modalEl.classList.toggle("hidden", !visible);
    modalEl.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function toYmdLocalDate(date, options) {
    const opts = options || {};
    const toDateKey = typeof opts.toDateKey === "function" ? opts.toDateKey : (() => "");
    return toDateKey(date);
  }

  function formatLeaveQuickMonthLabel(date, options) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const opts = options || {};
    const locale = typeof opts.getLocale === "function" ? opts.getLocale() : "en-US";
    return date.toLocaleDateString(locale, { year: "numeric", month: "long" });
  }

  function getLeaveTagText(type) {
    if (type === "paid") return "L";
    if (type === "sick") return "S";
    if (type === "unpaid") return "U";
    if (type === "study") return "ST";
    return "?";
  }

  function closeLeaveQuickModal(options) {
    const o = options || {};
    setModalVisible(o.leaveQuickModal, false);
  }

  function closeLeaveRequestModal(options) {
    const o = options || {};
    setModalVisible(o.leaveRequestModal, false);
  }

  async function refreshLeaveQuickModalData(options) {
    const o = options || {};
    const currentUserId = o.currentUserId;
    if (!currentUserId) return;

    const getLeaveQuickMonth = typeof o.getLeaveQuickMonth === "function" ? o.getLeaveQuickMonth : (() => null);
    const leaveQuickMonth = getLeaveQuickMonth();
    if (!(leaveQuickMonth instanceof Date) || Number.isNaN(leaveQuickMonth.getTime())) return;

    if (o.leaveQuickMonthLabel) {
      o.leaveQuickMonthLabel.textContent = formatLeaveQuickMonthLabel(leaveQuickMonth, { getLocale: o.getLocale });
    }

    const monthStart = new Date(leaveQuickMonth.getFullYear(), leaveQuickMonth.getMonth(), 1);
    const monthEnd = new Date(leaveQuickMonth.getFullYear(), leaveQuickMonth.getMonth() + 1, 0);
    const from = toYmdLocalDate(monthStart, { toDateKey: o.toDateKey });
    const to = toYmdLocalDate(monthEnd, { toDateKey: o.toDateKey });
    const ensureAccessToken = typeof o.ensureAccessToken === "function" ? o.ensureAccessToken : (async () => "");
    const token = await ensureAccessToken();
    if (!token) return;

    const fetchRef = typeof o.fetchRef === "function" ? o.fetchRef : fetch;
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    try {
      const [balancesRes, recordsRes] = await Promise.all([
        fetchRef(`/api/leave/balances?userId=${encodeURIComponent(String(currentUserId))}&year=${leaveQuickMonth.getFullYear()}`, {
          headers: { authorization: `Bearer ${token}` },
          credentials: "include"
        }),
        fetchRef(`/api/leave/records?userId=${encodeURIComponent(String(currentUserId))}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          headers: { authorization: `Bearer ${token}` },
          credentials: "include"
        })
      ]);
      const balancesBody = await balancesRes.json().catch(() => ({}));
      const recordsBody = await recordsRes.json().catch(() => ([]));
      const balances = (balancesBody && balancesBody.balances) || {};
      const leave = balances.leave || balances.paid || {};
      const study = balances.study || {};
      const unpaid = balances.unpaid || {};
      const sick = balances.sick || {};

      if (o.leaveQuickPaidValue) o.leaveQuickPaidValue.textContent = `${Number(leave.totalAvailable || 0)} ${t("leaveAvailableDays")}`;
      if (o.leaveQuickStudyValue) o.leaveQuickStudyValue.textContent = `${Number(study.totalAvailable || 0)} ${t("leaveAvailableDays")}`;
      if (o.leaveQuickUnpaidValue) o.leaveQuickUnpaidValue.textContent = `${Number(unpaid.totalUsed || 0)} ${t("leaveAvailableDays")}`;
      if (o.leaveQuickSickValue) o.leaveQuickSickValue.textContent = `${Number(sick.totalUsed || 0)} ${t("leaveAvailableDays")}`;

      if (typeof o.renderLeaveQuickCalendar === "function") {
        o.renderLeaveQuickCalendar(Array.isArray(recordsBody) ? recordsBody : [], monthStart, monthEnd);
      }
    } catch {
      if (o.leaveQuickPaidValue) o.leaveQuickPaidValue.textContent = "-";
      if (o.leaveQuickStudyValue) o.leaveQuickStudyValue.textContent = "-";
      if (o.leaveQuickUnpaidValue) o.leaveQuickUnpaidValue.textContent = "-";
      if (o.leaveQuickSickValue) o.leaveQuickSickValue.textContent = "-";
      if (o.leaveQuickCalendar) o.leaveQuickCalendar.innerHTML = "";
    }
  }

  async function refreshLeaveRequestSourceYearOptions(options) {
    const o = options || {};
    if (!o.leaveRequestSourceYearWrap || !o.leaveRequestSourceYear) return;
    o.leaveRequestSourceYearWrap.classList.add("hidden-section");
    o.leaveRequestSourceYear.innerHTML = "";
  }

  async function openLeaveRequestModal(options) {
    const o = options || {};
    if (!o.leaveRequestModal || !o.leaveRequestType || !o.leaveRequestStart || !o.leaveRequestEnd) return;
    const toDateKeyFn = typeof o.toDateKey === "function" ? o.toDateKey : (() => "");
    const today = toDateKeyFn(new Date());
    o.leaveRequestType.value = "paid";
    o.leaveRequestStart.value = today;
    o.leaveRequestEnd.value = today;
    if (o.leaveRequestNote) o.leaveRequestNote.value = "";
    if (o.leaveRequestStatus) o.leaveRequestStatus.textContent = "";
    if (typeof o.refreshLeaveRequestSourceYearOptions === "function") {
      await o.refreshLeaveRequestSourceYearOptions();
    }
    setModalVisible(o.leaveRequestModal, true);
  }

  async function submitLeaveRequest(options) {
    const o = options || {};
    if (!o.leaveRequestType || !o.leaveRequestStart || !o.leaveRequestEnd || !o.currentUserId) return;
    const ensureAccessToken = typeof o.ensureAccessToken === "function" ? o.ensureAccessToken : (async () => "");
    const token = await ensureAccessToken();
    if (!token) return;
    const payload = {
      userId: String(o.currentUserId),
      leaveType: String(o.leaveRequestType.value || "paid"),
      startDate: String(o.leaveRequestStart.value || ""),
      endDate: String(o.leaveRequestEnd.value || ""),
      note: o.leaveRequestNote ? String(o.leaveRequestNote.value || "").trim() : undefined
    };
    const fetchRef = typeof o.fetchRef === "function" ? o.fetchRef : fetch;
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    const currentLang = String(o.currentLang || "en");
    try {
      const res = await fetchRef("/api/leave/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof (body && body.error) === "string" ? body.error : "Error";
        if (o.leaveRequestStatus) o.leaveRequestStatus.textContent = msg;
        return;
      }
      let downloaded = false;
      if (typeof o.downloadLeaveRequestDocument === "function") {
        downloaded = await o.downloadLeaveRequestDocument(body, token);
      }
      if (o.leaveRequestStatus) {
        o.leaveRequestStatus.textContent = downloaded
          ? `${t("leaveRequestSubmitted")} (${currentLang === "bg" ? "Файлът е изтеглен." : "File downloaded."})`
          : `${t("leaveRequestSubmitted")} (${currentLang === "bg" ? "Файлът не се генерира." : "File was not generated."})`;
      }
      if (typeof o.refreshLeaveQuickModalData === "function") await o.refreshLeaveQuickModalData();
      if (typeof o.queueLeaveAbsenceSync === "function") o.queueLeaveAbsenceSync(true);
    } catch {
      if (o.leaveRequestStatus) o.leaveRequestStatus.textContent = "Error";
    }
  }

  async function openLeaveQuickModal(options) {
    const o = options || {};
    const canLeaveSelfAccess = typeof o.canLeaveSelfAccess === "function" ? o.canLeaveSelfAccess : () => false;
    if (!o.leaveQuickModal || !canLeaveSelfAccess() || !o.currentUserId) return;
    if (typeof o.setLeaveQuickMonth === "function") {
      o.setLeaveQuickMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    }
    setModalVisible(o.leaveQuickModal, true);
    if (typeof o.refreshLeaveQuickModalData === "function") await o.refreshLeaveQuickModalData();
  }

  root.ProCalModules.leaveQuickRequestFlow = {
    closeLeaveQuickModal,
    toYmdLocalDate,
    formatLeaveQuickMonthLabel,
    getLeaveTagText,
    closeLeaveRequestModal,
    refreshLeaveQuickModalData,
    refreshLeaveRequestSourceYearOptions,
    openLeaveRequestModal,
    submitLeaveRequest,
    openLeaveQuickModal
  };
})(window);

