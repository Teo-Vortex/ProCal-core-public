(function initCompFlow(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function tLocal(o, key, en, bg) {
    try {
      if (o && typeof o.t === "function") {
        const v = String(o.t(key) || "");
        if (v && v !== key) return v;
      }
    } catch {}
    const locale = String((o && o.locale) || "");
    return locale.toLowerCase().startsWith("bg") ? bg : en;
  }

  async function createEntry(options) {
    const o = options || {};
    if (!o.canManageCompensations) return false;
    const userId = String(o.userId || "");
    if (!userId || !o.compHours || !o.compMinutesPart || !o.compKind || typeof o.fetchCompJson !== "function") return false;

    const hours = Number(o.compHours.value || 0);
    const mins = Number(o.compMinutesPart.value || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(mins) || hours < 0 || mins < 0 || mins > 59) return false;
    const total = Math.trunc(hours) * 60 + Math.trunc(mins);
    if (total <= 0) return false;

    const kind = String(o.compKind.value || "overtime");
    const minutesDelta = kind === "absence" ? -total : total;

    try {
      await o.fetchCompJson("/api/compensations/entries", {
        method: "POST",
        body: JSON.stringify({
          userId,
          minutesDelta,
          kind,
          reason: String(o.compReason ? (o.compReason.value || "") : "").trim() || undefined,
          entryDate: String(o.compDate ? (o.compDate.value || "") : "") || undefined
        })
      });
      o.compHours.value = "0";
      o.compMinutesPart.value = "0";
      if (o.compReason) o.compReason.value = "";
      if (typeof o.loadCompOverview === "function") await o.loadCompOverview();
      if (typeof o.refreshCurrentCompBalance === "function") await o.refreshCurrentCompBalance();
      return true;
    } catch (err) {
      if (typeof o.onError === "function") o.onError(err);
      return false;
    }
  }

  async function adjustEntry(options) {
    const o = options || {};
    if (!o.canManageCompensations) return false;
    const userId = String(o.userId || "");
    if (!userId || !o.compAdjustHours || !o.compAdjustMinutesPart || !o.compAdjustSign || typeof o.fetchCompJson !== "function") return false;

    const hours = Number(o.compAdjustHours.value || 0);
    const mins = Number(o.compAdjustMinutesPart.value || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(mins) || hours < 0 || mins < 0 || mins > 59) return false;

    const total = Math.trunc(hours) * 60 + Math.trunc(mins);
    const sign = String(o.compAdjustSign.value || "positive") === "negative" ? -1 : 1;
    const target = sign * total;

    try {
      const bal = await o.fetchCompJson(`/api/compensations/balance?userId=${encodeURIComponent(String(userId))}`);
      const current = Number(bal && bal.minutes) || 0;
      const delta = target - current;
      if (delta === 0) {
        if (typeof o.refreshCurrentCompBalance === "function") await o.refreshCurrentCompBalance();
        if (typeof o.loadCompOverview === "function") await o.loadCompOverview();
        if (typeof o.closeCompAdjustModal === "function") o.closeCompAdjustModal();
        return true;
      }

      await o.fetchCompJson("/api/compensations/entries", {
        method: "POST",
        body: JSON.stringify({
          userId,
          minutesDelta: delta,
          kind: "adjustment",
          reason: String(o.compAdjustReason ? (o.compAdjustReason.value || "") : "").trim() || undefined,
          entryDate: String(o.compAdjustDate ? (o.compAdjustDate.value || "") : "") || undefined
        })
      });

      if (o.compAdjustReason) o.compAdjustReason.value = "";
      if (typeof o.loadCompOverview === "function") await o.loadCompOverview();
      if (typeof o.refreshCurrentCompBalance === "function") await o.refreshCurrentCompBalance();
      if (typeof o.closeCompAdjustModal === "function") o.closeCompAdjustModal();
      return true;
    } catch (err) {
      if (typeof o.onError === "function") o.onError(err);
      return false;
    }
  }

  async function loadOverview(options) {
    const o = options || {};
    if (!o.compOverviewList) return false;
    if (!o.canCompOverviewAccess) {
      if (o.compOverviewWrap) o.compOverviewWrap.classList.add("hidden-section");
      o.compOverviewList.innerHTML = "";
      return true;
    }
    if (o.compOverviewWrap) o.compOverviewWrap.classList.remove("hidden-section");
    o.compOverviewList.innerHTML = `<li class="empty">${tLocal(o, "loading", "Loading...", "Зареждане...")}</li>`;

    try {
      const allowed = Array.isArray(o.allowedPeople) ? o.allowedPeople : [];
      const balances = await Promise.all(
        allowed.map(async (person) => {
          try {
            const body = await o.fetchCompJson(`/api/compensations/balance?userId=${encodeURIComponent(String(person.id || ""))}`);
            return { person, minutes: Number(body && body.minutes) || 0 };
          } catch {
            return { person, minutes: 0 };
          }
        })
      );

      o.compOverviewList.innerHTML = "";
      balances.forEach((row) => {
        const li = document.createElement("li");
        li.className = "event-item comp-overview-item";
        li.style.borderLeft = `4px solid ${String((row.person && row.person.color) || "#64748b")}`;

        const main = document.createElement("div");
        main.className = "event-main comp-overview-main";

        const left = document.createElement("strong");
        left.className = "comp-overview-name";
        left.textContent = String((row.person && row.person.name) || "-");
        left.style.color = String((row.person && row.person.color) || "#334155");

        const right = document.createElement("span");
        right.className = "event-time comp-overview-balance";
        right.textContent = `${o.t("compBalance")}: ${o.formatCompMinutes(row.minutes)}`;
        main.append(left, right);

        const actions = document.createElement("div");
        actions.className = "comp-overview-actions";
        const logBtn = document.createElement("button");
        logBtn.className = "ghost-btn comp-overview-log-btn";
        logBtn.type = "button";
        logBtn.textContent = o.t("compViewLog");
        logBtn.title = o.t("compViewLog");
        logBtn.addEventListener("click", () => {
          if (typeof o.openCompLogModal === "function") {
            o.openCompLogModal(String((row.person && row.person.id) || ""), String((row.person && row.person.name) || "-"), String((row.person && row.person.color) || "#64748b"));
          }
        });
        actions.appendChild(logBtn);

        li.append(main, actions);
        o.compOverviewList.appendChild(li);
      });
      if (!balances.length) o.compOverviewList.innerHTML = '<li class="empty">-</li>';
      return true;
    } catch {
      o.compOverviewList.innerHTML = `<li class="empty">${tLocal(o, "error", "Error", "Грешка")}</li>`;
      return false;
    }
  }

  async function loadLogEntries(options) {
    const o = options || {};
    if (!o.compLogEntries || !o.compLogSummary || !o.currentCompLogPersonId) return false;
    try {
      const [balance, entries] = await Promise.all([
        o.fetchCompJson(`/api/compensations/balance?userId=${encodeURIComponent(o.currentCompLogPersonId)}`),
        o.fetchCompJson(`/api/compensations/entries?userId=${encodeURIComponent(o.currentCompLogPersonId)}&limit=1000`)
      ]);
      const minutes = Number(balance && balance.minutes) || 0;
      o.compLogSummary.textContent = `${o.currentCompLogPersonName} | ${o.t("compBalance")}: ${o.formatCompMinutes(minutes)}`;
      o.compLogEntries.innerHTML = "";
      const rows = Array.isArray(entries.items) ? entries.items : [];
      if (!rows.length) {
        o.compLogEntries.innerHTML = `<li class="empty">${o.escapeHtml(o.t("compNoEntries"))}</li>`;
        return true;
      }
      rows.forEach((row) => {
        const li = document.createElement("li");
        const kind = String(row.kind || "adjustment");
        const toneClass = kind === "overtime" ? "comp-log-add" : kind === "absence" ? "comp-log-remove" : "comp-log-adjust";
        li.className = `event-item ${toneClass}`;
        li.style.borderLeft = `4px solid ${o.currentCompLogPersonColor}`;
        const dateOnly = String(row.entryDate || "").trim();
        const when = !dateOnly && row.createdAt ? new Date(row.createdAt) : null;
        const ts = dateOnly || ((when && !Number.isNaN(when.getTime())) ? when.toLocaleDateString(o.locale) : "-");
        const reason = row.reason ? ` - ${row.reason}` : "";
        li.innerHTML = `<div class="event-main"><strong class="comp-log-delta ${toneClass}">${o.escapeHtml(o.formatCompMinutes(row.minutesDelta || 0))}</strong> <span class="event-time">${o.escapeHtml(kind)} | ${o.escapeHtml(ts)}${o.escapeHtml(reason)}</span></div>`;
        o.compLogEntries.appendChild(li);
      });
      return true;
    } catch (err) {
      o.compLogSummary.textContent = String((err && err.message) ? err.message : err || tLocal(o, "error", "Error", "Грешка"));
      o.compLogEntries.innerHTML = "";
      return false;
    }
  }

  function openMenu(options) {
    const o = options || {};
    if (!o.canCompOverviewAccess) return;
    if (typeof o.renderCompPeopleOptions === "function") o.renderCompPeopleOptions();
    if (o.prefDate && o.compDate) o.compDate.value = o.prefDate;
    if (o.compDate && !o.compDate.value && o.selectedDateKey) o.compDate.value = String(o.selectedDateKey);
    if (o.compManageWrap) o.compManageWrap.classList.toggle("hidden-section", !o.canManageCompensations);
    if (typeof o.loadCompOverview === "function") void o.loadCompOverview();
    if (o.compensationMenu) {
      o.compensationMenu.classList.remove("hidden");
      o.compensationMenu.setAttribute("aria-hidden", "false");
    }
  }

  function closeMenu(options) {
    const o = options || {};
    if (!o.compensationMenu) return;
    o.compensationMenu.classList.add("hidden");
    o.compensationMenu.setAttribute("aria-hidden", "true");
    if (typeof o.closeCompAdjustModal === "function") o.closeCompAdjustModal();
  }

  function openAdjustModal(options) {
    const o = options || {};
    if (!o.canManageCompensations || !o.compAdjustModal) return;
    if (o.compAdjustDate) {
      if (o.compDate && o.compDate.value) o.compAdjustDate.value = String(o.compDate.value);
      else if (o.selectedDateKey) o.compAdjustDate.value = o.selectedDateKey;
    }
    if (o.compAdjustHours) o.compAdjustHours.value = "0";
    if (o.compAdjustMinutesPart) o.compAdjustMinutesPart.value = "0";
    if (o.compAdjustReason) o.compAdjustReason.value = "";
    if (o.compAdjustSign) o.compAdjustSign.value = "positive";
    o.compAdjustModal.classList.remove("hidden");
    o.compAdjustModal.setAttribute("aria-hidden", "false");
  }

  function closeAdjustModal(options) {
    const modal = options && options.compAdjustModal;
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function openLogModal(options) {
    const o = options || {};
    if (!o.userId || !o.compLogModal) return null;
    if (o.setCurrentCompLogPersonId) o.setCurrentCompLogPersonId(String(o.userId));
    if (o.setCurrentCompLogPersonName) o.setCurrentCompLogPersonName(String(o.name || "-"));
    if (o.setCurrentCompLogPersonColor) o.setCurrentCompLogPersonColor(String(o.color || "#64748b"));
    if (o.compLogSummary) o.compLogSummary.textContent = "";
    if (o.compLogEntries) o.compLogEntries.innerHTML = "";
    o.compLogModal.classList.remove("hidden");
    o.compLogModal.setAttribute("aria-hidden", "false");
    if (typeof o.loadCompLogEntries === "function") void o.loadCompLogEntries();
    return true;
  }

  function closeLogModal(options) {
    const modal = options && options.compLogModal;
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  root.ProCalModules.compFlow = {
    createEntry,
    adjustEntry,
    loadOverview,
    loadLogEntries,
    openMenu,
    closeMenu,
    openAdjustModal,
    closeAdjustModal,
    openLogModal,
    closeLogModal
  };
})(window);
