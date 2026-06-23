(function initLeaveDocumentTemplateModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function escapeHtmlText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatBgDocumentDate(value) {
    const raw = String(value || "").trim();
    let d = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) d = new Date(`${raw}T12:00:00`);
    else d = new Date(raw);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return raw;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}.${mm}.${yyyy} г.`;
  }

  function getLeaveTypeLabelForPrint(type, options) {
    const key = String(type || "");
    const t = options && typeof options.t === "function" ? options.t : ((x) => x);
    if (key === "paid") return t("leaveTypePaid");
    if (key === "sick") return t("leaveTypeSick");
    if (key === "unpaid") return t("leaveTypeUnpaid");
    if (key === "study") return t("leaveTypeStudy");
    return key;
  }

  function isWeekendDateKeyForLeaveDoc(dateKey, options) {
    const opts = options || {};
    const isDateKey = typeof opts.isDateKey === "function" ? opts.isDateKey : () => false;
    if (!isDateKey(String(dateKey || ""))) return false;
    const raw = String(dateKey || "");
    const d = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  async function computeReturnToWorkDateText(record, token, options) {
    const opts = options || {};
    const isDateKey = typeof opts.isDateKey === "function" ? opts.isDateKey : () => false;
    const addDaysToKey = typeof opts.addDaysToKey === "function" ? opts.addDaysToKey : ((v) => String(v || ""));
    const isDayOffHoliday = typeof opts.isDayOffHoliday === "function" ? opts.isDayOffHoliday : () => false;
    const fetchRef = typeof opts.fetchRef === "function" ? opts.fetchRef : fetch;

    const endKey = String((record && record.endDate) || "");
    if (!isDateKey(endKey)) return "";

    const startLookahead = addDaysToKey(endKey, 1);
    const endLookahead = addDaysToKey(endKey, 45);
    const dayOffHolidaySet = new Set();

    try {
      const res = await fetchRef(`/api/holidays?from=${encodeURIComponent(startLookahead)}&to=${encodeURIComponent(endLookahead)}`, {
        headers: { authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        const items = Array.isArray(body && body.items) ? body.items : [];
        items.forEach((row) => {
          const key = String((row && row.dateKey) || "");
          if (!isDateKey(key)) return;
          if (Boolean(row && row.dayOff)) dayOffHolidaySet.add(key);
        });
      }
    } catch {
      // fallback to loaded holiday cache via isDayOffHoliday
    }

    let cursor = startLookahead;
    for (let i = 0; i < 90; i += 1) {
      if (!isWeekendDateKeyForLeaveDoc(cursor, { isDateKey }) && !dayOffHolidaySet.has(cursor) && !isDayOffHoliday(cursor)) {
        return formatBgDocumentDate(cursor);
      }
      cursor = addDaysToKey(cursor, 1);
    }
    return formatBgDocumentDate(startLookahead);
  }

  async function buildLeaveRequestDocumentHtml(record, token, options) {
    if (!record) return "";
    const opts = options || {};
    const fetchRef = typeof opts.fetchRef === "function" ? opts.fetchRef : fetch;
    const t = typeof opts.t === "function" ? opts.t : ((x) => x);
    const currentUserName = String(opts.currentUserName || "");
    const currentUserFullName = String(opts.currentUserFullName || "");
    const currentUserRole = String(opts.currentUserRole || "");
    const currentUserJobTitle = String(opts.currentUserJobTitle || "");
    const currentUserWorkplace = String(opts.currentUserWorkplace || "");
    const isDateKey = typeof opts.isDateKey === "function" ? opts.isDateKey : () => false;
    const addDaysToKey = typeof opts.addDaysToKey === "function" ? opts.addDaysToKey : ((v) => String(v || ""));
    const isDayOffHoliday = typeof opts.isDayOffHoliday === "function" ? opts.isDayOffHoliday : () => false;

    try {
      let template = null;
      try {
        const tplRes = await fetchRef("/api/leave/template", {
          headers: { authorization: `Bearer ${token}` },
          credentials: "include"
        });
        const tplBody = await tplRes.json().catch(() => ({}));
        template = tplRes.ok ? tplBody : null;
      } catch {
        template = null;
      }

      const fields = Array.isArray(template && template.fields) ? template.fields : [];
      const backgroundDataUrl = String((template && template.backgroundDataUrl) || "");
      const sourceYearText = record && record.sourceYear ? String(record.sourceYear) : "";
      const nowText = formatBgDocumentDate(new Date());
      const fromDateText = formatBgDocumentDate(record && record.startDate ? record.startDate : "");
      const toDateText = formatBgDocumentDate(record && record.endDate ? record.endDate : "");
      const daysText = String(Number(record && record.days ? record.days : 0) || 0);
      const returnToWorkDateText = await computeReturnToWorkDateText(record, token, {
        fetchRef,
        isDateKey,
        addDaysToKey,
        isDayOffHoliday
      });
      const currentUserDocFullName = String(currentUserFullName || currentUserName || "");
      const mapping = {
        employee_name: currentUserName,
        employee_full_name: currentUserDocFullName,
        employee_role: currentUserRole,
        employee_job_title: currentUserJobTitle,
        employee_workplace: currentUserWorkplace,
        period: `${fromDateText} ${t("to")} ${toDateText}`,
        from_date: fromDateText,
        to_date: toDateText,
        working_days: daysText,
        return_to_work_date: returnToWorkDateText,
        today_date: nowText,
        sick_from_date: fromDateText,
        sick_to_date: toDateText,
        sick_working_days: daysText,
        leave_type: getLeaveTypeLabelForPrint(record.leaveType, { t }),
        source_year: sourceYearText,
        note: String(record.note || ""),
        created_at: nowText
      };

      const resolvedFields = fields.length ? fields : [
        { key: "employee_name", label: "Employee Name", x: 0.08, y: 0.18, w: 0.38, h: 0.05 },
        { key: "employee_full_name", label: "Full Name", x: 0.08, y: 0.24, w: 0.5, h: 0.05 },
        { key: "employee_job_title", label: "Job Title", x: 0.08, y: 0.30, w: 0.50, h: 0.05 },
        { key: "employee_workplace", label: "Workplace", x: 0.08, y: 0.36, w: 0.50, h: 0.05 },
        { key: "employee_role", label: "Role", x: 0.60, y: 0.24, w: 0.22, h: 0.05 },
        { key: "from_date", label: "From Date", x: 0.08, y: 0.42, w: 0.26, h: 0.05 },
        { key: "to_date", label: "To Date", x: 0.36, y: 0.42, w: 0.26, h: 0.05 },
        { key: "working_days", label: "Working Days", x: 0.64, y: 0.42, w: 0.16, h: 0.05 },
        { key: "today_date", label: "Today Date", x: 0.08, y: 0.48, w: 0.30, h: 0.05 },
        { key: "leave_type", label: "Leave Type", x: 0.40, y: 0.48, w: 0.26, h: 0.05 },
        { key: "source_year", label: "Source Year", x: 0.68, y: 0.48, w: 0.12, h: 0.05 },
        { key: "return_to_work_date", label: "Return To Work Date", x: 0.52, y: 0.71, w: 0.34, h: 0.05 },
        { key: "note", label: "Note", x: 0.08, y: 0.55, w: 0.78, h: 0.14 },
        { key: "created_at", label: "Created At", x: 0.08, y: 0.71, w: 0.42, h: 0.05 }
      ];

      const fieldHtml = resolvedFields.map((f) => {
        const val = escapeHtmlText(mapping[String(f.key || "")] || "");
        const x = Math.max(0, Math.min(1, Number(f.x || 0))) * 100;
        const y = Math.max(0, Math.min(1, Number(f.y || 0))) * 100;
        const w = Math.max(0.005, Math.min(1, Number(f.w || 0.2))) * 100;
        const h = Math.max(0.005, Math.min(1, Number(f.h || 0.05))) * 100;
        const fontSizePt = Math.max(6, Math.min(72, Number(f.fontSizePt || 12)));
        return `<div class="fld" contenteditable="true" spellcheck="false" data-font-size="${fontSizePt}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;font-size:${fontSizePt}pt;" title="${escapeHtmlText(String(f.label || f.key || ""))}">${val}</div>`;
      }).join("");

      const bg = backgroundDataUrl ? `<img class="bg" src="${backgroundDataUrl}" alt="">` : "";
      return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtmlText(t("requestAbsence"))}</title>
<style>
body{font-family:Segoe UI,Tahoma,sans-serif;margin:0;padding:12px;background:#f1f5f9}
.page{position:relative;width:210mm;height:297mm;margin:0 auto;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.16);overflow:hidden}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.fld{position:absolute;padding:1mm 1.2mm;white-space:pre-wrap;word-break:break-word;line-height:1.15;display:flex;align-items:center;justify-content:flex-start;font-size:12pt;outline:none}
.fld:focus{box-shadow:inset 0 0 0 1px rgba(15,118,110,.45);background:rgba(15,118,110,.04)}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;margin:0}.print-actions{display:none}}
</style></head><body>
<div class="print-actions" style="max-width:210mm;margin:0 auto 8px;display:flex;gap:8px;">
<button onclick="window.print()">${escapeHtmlText(t("savePdf"))}</button>
<button onclick="window.close()">${escapeHtmlText(t("close"))}</button>
</div>
<div class="page">${bg}${fieldHtml}</div>
<script>
(function(){
  const minSize = 7;
  const nodes = Array.from(document.querySelectorAll('.fld'));
  nodes.forEach((el) => {
    let size = Number(el.getAttribute('data-font-size') || 12);
    if(!Number.isFinite(size) || size <= 0) size = 12;
    el.style.fontSize = size + 'pt';
    while (size > minSize && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)) {
      size -= 0.5;
      el.style.fontSize = size + 'pt';
    }
  });
})();
</script>
</body></html>`;
    } catch {
      return "";
    }
  }

  async function downloadLeaveRequestDocument(record, token, options) {
    const opts = options || {};
    const documentRef = opts.documentRef || document;
    const URLRef = opts.URLRef || URL;
    const BlobRef = opts.BlobRef || Blob;
    const htmlBuilder = typeof opts.buildHtml === "function" ? opts.buildHtml : buildLeaveRequestDocumentHtml;
    const html = await htmlBuilder(record, token);
    if (!html) return false;
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `leave-request-${stamp}.html`;
    const blob = new BlobRef([html], { type: "text/html;charset=utf-8" });
    const url = URLRef.createObjectURL(blob);
    const a = documentRef.createElement("a");
    a.href = url;
    a.download = fileName;
    documentRef.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URLRef.revokeObjectURL(url), 3000);
    return true;
  }

  root.ProCalModules.leaveDocumentTemplate = {
    escapeHtmlText,
    formatBgDocumentDate,
    getLeaveTypeLabelForPrint,
    computeReturnToWorkDateText,
    buildLeaveRequestDocumentHtml,
    downloadLeaveRequestDocument
  };
})(window);

