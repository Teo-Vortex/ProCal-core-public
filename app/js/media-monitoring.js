(function initMediaMonitoringPage() {
  "use strict";

  const ACCESS_KEY = "procal_access_token";
  const resolveRuntimePath = (value) => {
    const runtime = window.PROCAL_RUNTIME || {};
    return runtime && typeof runtime.resolvePath === "function"
      ? runtime.resolvePath(value)
      : value;
  };
  const state = {
    lang: localStorage.getItem("procal_lang") === "bg" ? "bg" : "en",
    me: null,
    perms: new Set(),
    owned: [],
    mentions: [],
    monthDate: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
  };

  const el = {
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    status: document.getElementById("status"),
    monthLabel: document.getElementById("monthLabel"),
    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    kpiOwned: document.getElementById("kpiOwned"),
    kpiMentions: document.getElementById("kpiMentions"),
    kpiLinked: document.getElementById("kpiLinked"),
    kpiUnlinked: document.getElementById("kpiUnlinked"),
    heatmapGrid: document.getElementById("heatmapGrid"),
    ownedForm: document.getElementById("ownedForm"),
    ownedTitle: document.getElementById("ownedTitle"),
    ownedUrl: document.getElementById("ownedUrl"),
    ownedDate: document.getElementById("ownedDate"),
    ownedBody: document.getElementById("ownedBody"),
    mentionForm: document.getElementById("mentionForm"),
    mentionTitle: document.getElementById("mentionTitle"),
    mentionUrl: document.getElementById("mentionUrl"),
    mentionDate: document.getElementById("mentionDate"),
    mentionLinkedOwnedId: document.getElementById("mentionLinkedOwnedId"),
    mentionBody: document.getElementById("mentionBody"),
    backLink: document.getElementById("backLink"),
    kpiOwnedLabel: document.getElementById("kpiOwnedLabel"),
    kpiMentionsLabel: document.getElementById("kpiMentionsLabel"),
    kpiLinkedLabel: document.getElementById("kpiLinkedLabel"),
    kpiUnlinkedLabel: document.getElementById("kpiUnlinkedLabel"),
    ownedFormTitle: document.getElementById("ownedFormTitle"),
    ownedTitleLabel: document.getElementById("ownedTitleLabel"),
    ownedUrlLabel: document.getElementById("ownedUrlLabel"),
    ownedDateLabel: document.getElementById("ownedDateLabel"),
    ownedSubmitBtn: document.getElementById("ownedSubmitBtn"),
    ownedTableTitle: document.getElementById("ownedTableTitle"),
    ownedThDate: document.getElementById("ownedThDate"),
    ownedThTitle: document.getElementById("ownedThTitle"),
    ownedThUrl: document.getElementById("ownedThUrl"),
    ownedThMentions: document.getElementById("ownedThMentions"),
    ownedThBy: document.getElementById("ownedThBy"),
    ownedThActions: document.getElementById("ownedThActions"),
    mentionFormTitle: document.getElementById("mentionFormTitle"),
    mentionTitleLabel: document.getElementById("mentionTitleLabel"),
    mentionUrlLabel: document.getElementById("mentionUrlLabel"),
    mentionDateLabel: document.getElementById("mentionDateLabel"),
    mentionLinkedLabel: document.getElementById("mentionLinkedLabel"),
    mentionSubmitBtn: document.getElementById("mentionSubmitBtn"),
    mentionTableTitle: document.getElementById("mentionTableTitle"),
    mentionThDate: document.getElementById("mentionThDate"),
    mentionThTitle: document.getElementById("mentionThTitle"),
    mentionThUrl: document.getElementById("mentionThUrl"),
    mentionThLinked: document.getElementById("mentionThLinked"),
    mentionThBy: document.getElementById("mentionThBy"),
    mentionThActions: document.getElementById("mentionThActions")
  };

  const I18N = {
    en: {
      pageTitle: "ProCal Media Monitoring",
      title: "Media Monitoring",
      subtitle: "Track owned publications and internet mentions",
      back: "Back",
      kpiOwned: "Our publications",
      kpiMentions: "Found mentions",
      kpiLinked: "Triggered mentions",
      kpiUnlinked: "Unlinked mentions",
      prev: "Prev",
      next: "Next",
      exportCsv: "Export CSV",
      exportJson: "Export JSON",
      ownedFormTitle: "Add our publication",
      mentionFormTitle: "Add found internet mention",
      ownedTableTitle: "Our publications",
      mentionTableTitle: "Found mentions",
      fieldTitle: "Title",
      fieldUrl: "URL",
      fieldPublishedAt: "Published at",
      fieldLinkedOwned: "Linked to our publication",
      add: "Add",
      thDate: "Date",
      thTitle: "Title",
      thUrl: "URL",
      thMentions: "Mentions",
      thLinked: "Linked",
      thBy: "By",
      thActions: "Actions",
      none: "- none -",
      noRecords: "No records.",
      open: "Open",
      delete: "Delete",
      saveLink: "Save link",
      confirmDeleteOwned: "Delete this owned publication?",
      confirmDeleteMention: "Delete this mention?",
      updated: "Updated.",
      exportFailed: "Export failed",
      profileLoadFailed: "Failed to load profile",
      forbiddenTitle: "Forbidden",
      forbiddenBody: "No access to Media Monitoring."
    },
    bg: {
      pageTitle: "ProCal Медии",
      title: "Медиен мониторинг",
      subtitle: "Проследяване на ваши публикации и намерени публикации в интернет",
      back: "Назад",
      kpiOwned: "Наши публикации",
      kpiMentions: "Намерени публикации",
      kpiLinked: "Предизвикани публикации",
      kpiUnlinked: "Необвързани публикации",
      prev: "Назад",
      next: "Напред",
      exportCsv: "Експорт CSV",
      exportJson: "Експорт JSON",
      ownedFormTitle: "Добави наша публикация",
      mentionFormTitle: "Добави намерена публикация",
      ownedTableTitle: "Наши публикации",
      mentionTableTitle: "Намерени публикации",
      fieldTitle: "Заглавие",
      fieldUrl: "Линк",
      fieldPublishedAt: "Публикувана на",
      fieldLinkedOwned: "Свързана с наша публикация",
      add: "Добави",
      thDate: "Дата",
      thTitle: "Заглавие",
      thUrl: "Линк",
      thMentions: "Публикации",
      thLinked: "Свързано",
      thBy: "От",
      thActions: "Действия",
      none: "- няма -",
      noRecords: "Няма записи.",
      open: "Отвори",
      delete: "Изтрий",
      saveLink: "Запази връзка",
      confirmDeleteOwned: "Да се изтрие ли тази наша публикация?",
      confirmDeleteMention: "Да се изтрие ли тази намерена публикация?",
      updated: "Обновено.",
      exportFailed: "Грешка при експортиране",
      profileLoadFailed: "Грешка при зареждане на профила",
      forbiddenTitle: "Забранено",
      forbiddenBody: "Нямаш достъп до Медиен мониторинг."
    }
  };

  function t(key) {
    const dict = I18N[state.lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function applyStaticText() {
    try { document.title = t("pageTitle"); } catch {}
    if (document.documentElement) document.documentElement.lang = state.lang === "bg" ? "bg" : "en";
    if (el.title) el.title.textContent = t("title");
    if (el.subtitle) el.subtitle.textContent = t("subtitle");
    if (el.backLink) el.backLink.textContent = t("back");
    if (el.kpiOwnedLabel) el.kpiOwnedLabel.textContent = t("kpiOwned");
    if (el.kpiMentionsLabel) el.kpiMentionsLabel.textContent = t("kpiMentions");
    if (el.kpiLinkedLabel) el.kpiLinkedLabel.textContent = t("kpiLinked");
    if (el.kpiUnlinkedLabel) el.kpiUnlinkedLabel.textContent = t("kpiUnlinked");
    if (el.prevMonthBtn) el.prevMonthBtn.textContent = t("prev");
    if (el.nextMonthBtn) el.nextMonthBtn.textContent = t("next");
    if (el.exportCsvBtn) el.exportCsvBtn.textContent = t("exportCsv");
    if (el.exportJsonBtn) el.exportJsonBtn.textContent = t("exportJson");
    if (el.ownedFormTitle) el.ownedFormTitle.textContent = t("ownedFormTitle");
    if (el.mentionFormTitle) el.mentionFormTitle.textContent = t("mentionFormTitle");
    if (el.ownedTableTitle) el.ownedTableTitle.textContent = t("ownedTableTitle");
    if (el.mentionTableTitle) el.mentionTableTitle.textContent = t("mentionTableTitle");
    if (el.ownedTitleLabel) el.ownedTitleLabel.textContent = t("fieldTitle");
    if (el.ownedUrlLabel) el.ownedUrlLabel.textContent = t("fieldUrl");
    if (el.ownedDateLabel) el.ownedDateLabel.textContent = t("fieldPublishedAt");
    if (el.mentionTitleLabel) el.mentionTitleLabel.textContent = t("fieldTitle");
    if (el.mentionUrlLabel) el.mentionUrlLabel.textContent = t("fieldUrl");
    if (el.mentionDateLabel) el.mentionDateLabel.textContent = t("fieldPublishedAt");
    if (el.mentionLinkedLabel) el.mentionLinkedLabel.textContent = t("fieldLinkedOwned");
    if (el.ownedSubmitBtn) el.ownedSubmitBtn.textContent = t("add");
    if (el.mentionSubmitBtn) el.mentionSubmitBtn.textContent = t("add");
    if (el.ownedThDate) el.ownedThDate.textContent = t("thDate");
    if (el.ownedThTitle) el.ownedThTitle.textContent = t("thTitle");
    if (el.ownedThUrl) el.ownedThUrl.textContent = t("thUrl");
    if (el.ownedThMentions) el.ownedThMentions.textContent = t("thMentions");
    if (el.ownedThBy) el.ownedThBy.textContent = t("thBy");
    if (el.ownedThActions) el.ownedThActions.textContent = t("thActions");
    if (el.mentionThDate) el.mentionThDate.textContent = t("thDate");
    if (el.mentionThTitle) el.mentionThTitle.textContent = t("thTitle");
    if (el.mentionThUrl) el.mentionThUrl.textContent = t("thUrl");
    if (el.mentionThLinked) el.mentionThLinked.textContent = t("thLinked");
    if (el.mentionThBy) el.mentionThBy.textContent = t("thBy");
    if (el.mentionThActions) el.mentionThActions.textContent = t("thActions");
  }

  function setStatus(message, danger) {
    if (!el.status) return;
    el.status.textContent = String(message || "");
    el.status.style.color = danger ? "#991b1b" : "#6b7280";
  }

  function toYmdUtc(date) {
    return date.toISOString().slice(0, 10);
  }

  function fmtDate(value) {
    const dt = new Date(String(value || ""));
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hasPerm(permission) {
    return state.perms.has("*") || state.perms.has(permission);
  }

  function monthRange() {
    const y = state.monthDate.getUTCFullYear();
    const m = state.monthDate.getUTCMonth();
    const from = new Date(Date.UTC(y, m, 1));
    const to = new Date(Date.UTC(y, m + 1, 0));
    return { from: toYmdUtc(from), to: toYmdUtc(to) };
  }

  async function refreshAccessToken() {
    const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!r.ok) return "";
    const body = await r.json().catch(() => ({}));
    const token = typeof body.accessToken === "string" ? body.accessToken : "";
    if (token) localStorage.setItem(ACCESS_KEY, token);
    return token;
  }

  async function api(path, init) {
    const opts = init || {};
    let token = localStorage.getItem(ACCESS_KEY) || "";
    if (!token) {
      window.location.href = resolveRuntimePath("/login");
      throw new Error("No session");
    }

    const execute = (bearerToken) => fetch(path, {
      ...opts,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(opts.headers || {}),
        authorization: `Bearer ${bearerToken}`
      }
    });

    let res = await execute(token);
    if (res.status === 401) {
      token = await refreshAccessToken();
      if (!token) {
        window.location.href = resolveRuntimePath("/login");
        throw new Error("Session expired");
      }
      res = await execute(token);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(String((body && (body.error || body.message)) || `HTTP ${res.status}`));
    }
    return res;
  }

  function renderOwnedOptions() {
    if (!el.mentionLinkedOwnedId) return;
    const current = String(el.mentionLinkedOwnedId.value || "");
    el.mentionLinkedOwnedId.innerHTML = `<option value="">${t("none")}</option>`;
    state.owned.forEach((row) => {
      const opt = document.createElement("option");
      opt.value = String(row.id || "");
      opt.textContent = `${fmtDate(row.publishedAt)} - ${row.title}`;
      if (opt.value === current) opt.selected = true;
      el.mentionLinkedOwnedId.appendChild(opt);
    });
  }

  function buildMentionLinkSelect(selectedId) {
    const sel = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = t("none");
    sel.appendChild(empty);
    state.owned.forEach((row) => {
      const opt = document.createElement("option");
      opt.value = String(row.id || "");
      opt.textContent = `${fmtDate(row.publishedAt)} - ${row.title}`;
      if (String(selectedId || "") === opt.value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.disabled = !hasPerm("media.update");
    return sel;
  }

  function renderOwnedTable() {
    if (!el.ownedBody) return;
    el.ownedBody.innerHTML = "";
    if (!state.owned.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="muted">${escapeHtml(t("noRecords"))}</td>`;
      el.ownedBody.appendChild(tr);
      return;
    }
    state.owned.forEach((row) => {
      const tr = document.createElement("tr");
      const safeUrl = String(row.url || "#");
      tr.innerHTML = `
        <td>${fmtDate(row.publishedAt)}</td>
        <td>${escapeHtml(String(row.title || ""))}</td>
        <td><a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("open"))}</a></td>
        <td>${Number(row.mentionsCount || 0)}</td>
        <td>${escapeHtml(String(row.createdByName || "-"))}</td>
        <td></td>
      `;
      const actionsTd = tr.querySelector("td:last-child");
      if (actionsTd && hasPerm("media.delete")) {
        const del = document.createElement("button");
        del.className = "btn danger";
        del.type = "button";
        del.textContent = t("delete");
        del.onclick = async () => {
          if (!confirm(t("confirmDeleteOwned"))) return;
          try {
            await api(`/api/media/owned/${encodeURIComponent(String(row.id || ""))}`, { method: "DELETE", headers: {} });
            await refreshAll();
          } catch (e) {
            setStatus(String(e.message || e), true);
          }
        };
        actionsTd.appendChild(del);
      }
      el.ownedBody.appendChild(tr);
    });
  }

  function renderMentionsTable() {
    if (!el.mentionBody) return;
    el.mentionBody.innerHTML = "";
    if (!state.mentions.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="muted">${escapeHtml(t("noRecords"))}</td>`;
      el.mentionBody.appendChild(tr);
      return;
    }
    state.mentions.forEach((row) => {
      const tr = document.createElement("tr");
      const safeUrl = String(row.url || "#");
      tr.innerHTML = `
        <td>${fmtDate(row.publishedAt)}</td>
        <td>${escapeHtml(String(row.title || ""))}</td>
        <td><a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("open"))}</a></td>
        <td></td>
        <td>${escapeHtml(String(row.createdByName || "-"))}</td>
        <td></td>
      `;
      const linkedTd = tr.children[3];
      const actionsTd = tr.children[5];
      if (linkedTd) {
        const sel = buildMentionLinkSelect(row.linkedOwnedId || "");
        linkedTd.appendChild(sel);
        if (hasPerm("media.update")) {
          const save = document.createElement("button");
          save.className = "btn";
          save.type = "button";
          save.textContent = t("saveLink");
          save.onclick = async () => {
            try {
              await api(`/api/media/mentions/${encodeURIComponent(String(row.id || ""))}`, {
                method: "PATCH",
                body: JSON.stringify({ linkedOwnedId: String(sel.value || "") || null })
              });
              await refreshAll();
            } catch (e) {
              setStatus(String(e.message || e), true);
            }
          };
          linkedTd.appendChild(save);
        }
      }
      if (actionsTd && hasPerm("media.delete")) {
        const del = document.createElement("button");
        del.className = "btn danger";
        del.type = "button";
        del.textContent = t("delete");
        del.onclick = async () => {
          if (!confirm(t("confirmDeleteMention"))) return;
          try {
            await api(`/api/media/mentions/${encodeURIComponent(String(row.id || ""))}`, { method: "DELETE", headers: {} });
            await refreshAll();
          } catch (e) {
            setStatus(String(e.message || e), true);
          }
        };
        actionsTd.appendChild(del);
      }
      el.mentionBody.appendChild(tr);
    });
  }

  function renderHeatmap(items) {
    if (!el.heatmapGrid) return;
    el.heatmapGrid.innerHTML = "";
    const map = new Map();
    (items || []).forEach((row) => {
      map.set(String(row.dateKey || ""), Number(row.mentions || 0));
    });
    const y = state.monthDate.getUTCFullYear();
    const m = state.monthDate.getUTCMonth();
    const first = new Date(Date.UTC(y, m, 1));
    const last = new Date(Date.UTC(y, m + 1, 0));
    const prefix = first.getUTCDay();
    const totalDays = last.getUTCDate();
    const cells = prefix + totalDays;
    const rows = Math.ceil(cells / 7);
    const totalSlots = rows * 7;
    for (let i = 0; i < totalSlots; i += 1) {
      const day = i - prefix + 1;
      const cell = document.createElement("div");
      cell.className = "day";
      if (day < 1 || day > totalDays) {
        cell.classList.add("off");
        el.heatmapGrid.appendChild(cell);
        continue;
      }
      const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = Number(map.get(dateKey) || 0);
      cell.classList.add(`hm-${Math.min(count, 4)}`);
      cell.innerHTML = `<div class="day-num">${day}</div><div class="day-count">${count}</div>`;
      el.heatmapGrid.appendChild(cell);
    }
  }

  async function loadOwned() {
    const res = await api("/api/media/owned", { headers: {} });
    const body = await res.json().catch(() => ({}));
    state.owned = Array.isArray(body && body.items) ? body.items : [];
    renderOwnedOptions();
    renderOwnedTable();
  }

  async function loadMentions() {
    const res = await api("/api/media/mentions", { headers: {} });
    const body = await res.json().catch(() => ({}));
    state.mentions = Array.isArray(body && body.items) ? body.items : [];
    renderMentionsTable();
  }

  async function loadStats() {
    const { from, to } = monthRange();
    const res = await api(`/api/media/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: {} });
    const body = await res.json().catch(() => ({}));
    const totals = body && body.totals ? body.totals : {};
    if (el.kpiOwned) el.kpiOwned.textContent = String(Number(totals.ownedCount || 0));
    if (el.kpiMentions) el.kpiMentions.textContent = String(Number(totals.mentionCount || 0));
    if (el.kpiLinked) el.kpiLinked.textContent = String(Number(totals.linkedCount || 0));
    if (el.kpiUnlinked) el.kpiUnlinked.textContent = String(Number(totals.unlinkedCount || 0));
    renderHeatmap(Array.isArray(body && body.heatmap) ? body.heatmap : []);
  }

  function updateMonthLabel() {
    if (!el.monthLabel) return;
    el.monthLabel.textContent = state.monthDate.toLocaleDateString(state.lang === "bg" ? "bg-BG" : "en-US", {
      year: "numeric",
      month: "long",
      timeZone: "UTC"
    });
  }

  async function refreshAll() {
    updateMonthLabel();
    await Promise.all([loadOwned(), loadMentions(), loadStats()]);
    setStatus(t("updated"), false);
  }

  async function exportData(format) {
    const { from, to } = monthRange();
    const token = localStorage.getItem(ACCESS_KEY) || "";
    if (!token) return;
    const res = await fetch(`/api/media/export?format=${encodeURIComponent(format)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      method: "GET",
      credentials: "include",
      headers: { authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(String((body && (body.error || body.message)) || t("exportFailed")));
    }
    if (format === "json") {
      const body = await res.json();
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `media-monitoring-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }
    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-monitoring-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    if (el.prevMonthBtn) {
      el.prevMonthBtn.onclick = async () => {
        state.monthDate = new Date(Date.UTC(state.monthDate.getUTCFullYear(), state.monthDate.getUTCMonth() - 1, 1));
        await loadStats();
        updateMonthLabel();
      };
    }
    if (el.nextMonthBtn) {
      el.nextMonthBtn.onclick = async () => {
        state.monthDate = new Date(Date.UTC(state.monthDate.getUTCFullYear(), state.monthDate.getUTCMonth() + 1, 1));
        await loadStats();
        updateMonthLabel();
      };
    }
    if (el.exportCsvBtn) {
      el.exportCsvBtn.onclick = async () => {
        try {
          await exportData("csv");
        } catch (e) {
          setStatus(String(e.message || e), true);
        }
      };
    }
    if (el.exportJsonBtn) {
      el.exportJsonBtn.onclick = async () => {
        try {
          await exportData("json");
        } catch (e) {
          setStatus(String(e.message || e), true);
        }
      };
    }
    if (el.ownedForm) {
      el.ownedForm.onsubmit = async (event) => {
        event.preventDefault();
        try {
          await api("/api/media/owned", {
            method: "POST",
            body: JSON.stringify({
              title: String((el.ownedTitle && el.ownedTitle.value) || "").trim(),
              url: String((el.ownedUrl && el.ownedUrl.value) || "").trim(),
              publishedAt: String((el.ownedDate && el.ownedDate.value) || "").trim()
            })
          });
          el.ownedForm.reset();
          await refreshAll();
        } catch (e) {
          setStatus(String(e.message || e), true);
        }
      };
    }
    if (el.mentionForm) {
      el.mentionForm.onsubmit = async (event) => {
        event.preventDefault();
        try {
          await api("/api/media/mentions", {
            method: "POST",
            body: JSON.stringify({
              title: String((el.mentionTitle && el.mentionTitle.value) || "").trim(),
              url: String((el.mentionUrl && el.mentionUrl.value) || "").trim(),
              publishedAt: String((el.mentionDate && el.mentionDate.value) || "").trim(),
              linkedOwnedId: String((el.mentionLinkedOwnedId && el.mentionLinkedOwnedId.value) || "").trim() || undefined
            })
          });
          el.mentionForm.reset();
          await refreshAll();
        } catch (e) {
          setStatus(String(e.message || e), true);
        }
      };
    }
  }

  async function bootstrap() {
    const token = localStorage.getItem(ACCESS_KEY) || "";
    if (!token) {
      window.location.href = resolveRuntimePath("/login");
      return;
    }
    try {
      const res = await api("/api/me", { headers: {} });
      const me = await res.json().catch(() => null);
      if (!me) throw new Error(t("profileLoadFailed"));
      state.me = me;
      state.perms = new Set(Array.isArray(me.permissions) ? me.permissions.map((x) => String(x || "")).filter(Boolean) : []);
      if (!hasPerm("media.read")) {
        setStatus(state.lang === "bg" ? "Нямаш права за модул Медиен мониторинг." : "No access to Media Monitoring.", true);
        document.body.innerHTML = `<div style="font-family:Segoe UI,sans-serif;padding:24px;"><h2>${escapeHtml(t("forbiddenTitle"))}</h2><p>${escapeHtml(t("forbiddenBody"))}</p><a href="/">${escapeHtml(t("back"))}</a></div>`;
        return;
      }
      if (!hasPerm("media.create")) {
        if (el.ownedForm) el.ownedForm.classList.add("hidden");
        if (el.mentionForm) el.mentionForm.classList.add("hidden");
      }
      if (!hasPerm("media.export")) {
        if (el.exportCsvBtn) el.exportCsvBtn.classList.add("hidden");
        if (el.exportJsonBtn) el.exportJsonBtn.classList.add("hidden");
      }
      applyStaticText();
      bindEvents();
      await refreshAll();
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  void bootstrap();
})();
