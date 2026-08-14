(function initAttendancePage() {
  "use strict";

  const ACCESS_KEY = "procal_access_token";
  const state = {
    lang: localStorage.getItem("procal_lang") === "bg" ? "bg" : "en",
    me: null,
    status: null,
    entries: [],
    users: [],
    stations: [],
    selectedEntryId: "",
    selectedStationId: ""
  };

  const el = Object.fromEntries([
    "pageTitle", "pageSubtitle", "langBtn", "backBtn", "statusDot", "attendanceState", "statusTime", "statusStation",
    "nfcBtn", "qrBtn", "punchBtn", "userFilterWrap", "userLabel", "userFilter", "fromLabel", "fromInput", "toLabel", "toInput",
    "applyBtn", "logTitle", "entryCount", "entries", "adminSection", "stationsTitle", "stationForm", "stationNameLabel",
    "stationName", "stationLocationLabel", "stationLocation", "createStationBtn", "stations", "pageStatus", "correctionModal",
    "correctionTitle", "closeCorrectionBtn", "correctionForm", "actionLabel", "correctionAction", "timeLabel", "correctionTime",
    "reasonLabel", "correctionReason", "saveCorrectionBtn", "payloadModal", "payloadTitle", "closePayloadBtn", "payloadValue",
    "copyPayloadBtn", "downloadQrBtn", "newPayloadBtn", "qrImage", "voidModal", "voidTitle", "closeVoidBtn", "voidForm", "voidReasonLabel", "voidReason", "confirmVoidBtn"
  ].map((id) => [id, document.getElementById(id)]));

  const I18N = {
    en: {
      title: "Attendance", subtitle: "Workday log", back: "Back", checkedIn: "Checked in", checkedOut: "Not checked in",
      since: "Since", lastAction: "Last action", at: "at", checkIn: "Check in", checkOut: "Check out", scanNfc: "Scan NFC", scanQr: "Scan QR",
      employee: "Employee", from: "From", to: "To", apply: "Apply", log: "Attendance log", noEntries: "No entries for this period.",
      stations: "NFC / QR stations", name: "Name", location: "Location", createStation: "Create station", active: "Active",
      inactive: "Inactive", disable: "Disable", enable: "Enable", viewCode: "QR code", rotate: "Create new code", correct: "Correct", voidEntry: "Void",
      correction: "Correct entry", action: "Action", dateTime: "Date and time", reason: "Reason", saveCorrection: "Save correction",
      close: "Close", payload: "Station code", copy: "Copy", downloadQr: "Download QR", copied: "Copied.", source: "Source", station: "Station",
      corrected: "Corrected", voided: "Voided", web: "Web", nfc: "NFC", admin: "Admin", allEmployees: "All employees",
      loading: "Loading...", saved: "Saved.", failed: "Operation failed.", nfcWaiting: "Hold the phone near the NFC tag.",
      nfcUnsupported: "NFC scanning is available in the Android app.", voidTitle: "Void entry", confirmVoid: "Void entry", count: "entries",
      rotateConfirm: "Creating a new station code invalidates the previous one. Continue?",
      legacyCode: "This older station code cannot be shown again. Create a new reusable code now?"
    },
    bg: {
      title: "Присъствия", subtitle: "Дневник на работното време", back: "Назад", checkedIn: "На работа", checkedOut: "Не е на работа",
      since: "От", lastAction: "Последно действие", at: "в", checkIn: "Пристигане", checkOut: "Тръгване", scanNfc: "Сканирай NFC", scanQr: "Сканирай QR",
      employee: "Служител", from: "От", to: "До", apply: "Приложи", log: "Дневник на присъствията", noEntries: "Няма записи за този период.",
      stations: "NFC / QR станции", name: "Име", location: "Местоположение", createStation: "Създай станция", active: "Активна",
      inactive: "Неактивна", disable: "Изключи", enable: "Включи", viewCode: "QR код", rotate: "Създай нов код", correct: "Коригирай", voidEntry: "Анулирай",
      correction: "Корекция на запис", action: "Действие", dateTime: "Дата и час", reason: "Причина", saveCorrection: "Запази корекцията",
      close: "Затвори", payload: "Код на станцията", copy: "Копирай", downloadQr: "Изтегли QR", copied: "Копирано.", source: "Източник", station: "Станция",
      corrected: "Коригиран", voided: "Анулиран", web: "Уеб", nfc: "NFC", admin: "Админ", allEmployees: "Всички служители",
      loading: "Зареждане...", saved: "Запазено.", failed: "Операцията не бе успешна.", nfcWaiting: "Доближете телефона до NFC тага.",
      nfcUnsupported: "NFC сканирането е достъпно в Android приложението.", voidTitle: "Анулиране на запис", confirmVoid: "Анулирай записа", count: "записа",
      rotateConfirm: "Създаването на нов код ще направи предишния невалиден. Да продължа ли?",
      legacyCode: "Този по-стар код не може да бъде показан отново. Да създам ли нов постоянен код сега?"
    }
  };

  const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
  const hasPermission = (key) => Boolean(state.me && Array.isArray(state.me.permissions) && (state.me.permissions.includes("*") || state.me.permissions.includes(key)));
  const canManage = () => hasPermission("attendance.manage");
  const canReadAll = () => hasPermission("attendance.read_all") || canManage();
  const locale = () => state.lang === "bg" ? "bg-BG" : "en-GB";
  const displayName = (user) => String((user && (user.nickname || user.name || user.username)) || "-");

  function setPageStatus(message, error) {
    el.pageStatus.textContent = String(message || "");
    el.pageStatus.style.color = error ? "var(--danger)" : "";
  }

  async function refreshAccessToken() {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!response.ok) return null;
    const body = await response.json().catch(() => ({}));
    if (!body.accessToken) return null;
    localStorage.setItem(ACCESS_KEY, body.accessToken);
    return body.accessToken;
  }

  async function api(path, options) {
    const opts = options || {};
    let token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      window.location.href = "/login";
      throw new Error("Not logged in");
    }
    const run = (bearer) => fetch(path, {
      ...opts,
      credentials: "include",
      headers: { "content-type": "application/json", ...(opts.headers || {}), authorization: `Bearer ${bearer}` }
    });
    let response = await run(token);
    if (response.status === 401) {
      token = await refreshAccessToken();
      if (!token) {
        window.location.href = "/login";
        throw new Error("Session expired");
      }
      response = await run(token);
    }
    return response;
  }

  async function bodyOrError(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : t("failed"));
    return body;
  }

  function setDefaultRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const toYmd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    el.fromInput.value = toYmd(from);
    el.toInput.value = toYmd(now);
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" });
  }

  function toDateTimeLocal(value) {
    const date = new Date(value);
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function applyTranslations() {
    const map = {
      pageTitle:"title", pageSubtitle:"subtitle", backBtn:"back", userLabel:"employee", fromLabel:"from", toLabel:"to", applyBtn:"apply",
      logTitle:"log", stationsTitle:"stations", stationNameLabel:"name", stationLocationLabel:"location", createStationBtn:"createStation",
      correctionTitle:"correction", closeCorrectionBtn:"close", actionLabel:"action", timeLabel:"dateTime", reasonLabel:"reason",
      saveCorrectionBtn:"saveCorrection", payloadTitle:"payload", closePayloadBtn:"close", copyPayloadBtn:"copy", downloadQrBtn:"downloadQr", newPayloadBtn:"rotate",
      voidTitle:"voidTitle", closeVoidBtn:"close", voidReasonLabel:"reason", confirmVoidBtn:"confirmVoid"
    };
    Object.entries(map).forEach(([id, key]) => { if (el[id]) el[id].textContent = t(key); });
    el.langBtn.textContent = state.lang === "bg" ? "EN" : "BG";
    el.nfcBtn.textContent = t("scanNfc");
    el.qrBtn.textContent = t("scanQr");
    const actionOptions = el.correctionAction.options;
    actionOptions[0].textContent = t("checkIn");
    actionOptions[1].textContent = t("checkOut");
    renderStatus();
    renderEntries();
    renderStations();
    renderUserFilter();
  }

  function renderStatus() {
    if (!state.status) return;
    const checkedIn = state.status.state === "checked_in";
    el.statusDot.className = `status-dot ${checkedIn ? "in" : "out"}`;
    el.attendanceState.textContent = checkedIn ? t("checkedIn") : t("checkedOut");
    el.punchBtn.textContent = state.status.nextAction === "check_out" ? t("checkOut") : t("checkIn");
    el.punchBtn.dataset.action = state.status.nextAction || "check_in";
    if (state.status.latest) {
      el.statusTime.textContent = `${checkedIn ? t("since") : t("lastAction")}: ${formatDateTime(state.status.latest.occurredAt)}`;
      const station = state.status.latest.station;
      el.statusStation.textContent = station ? `${t("station")}: ${station.name}${station.location ? `, ${station.location}` : ""}` : "";
    } else {
      el.statusTime.textContent = "-";
      el.statusStation.textContent = "";
    }
  }

  function renderUserFilter() {
    if (!canReadAll()) return;
    const current = el.userFilter.value;
    el.userFilter.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = t("allEmployees");
    el.userFilter.append(all);
    state.users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id || user.userId;
      option.textContent = displayName(user);
      el.userFilter.append(option);
    });
    el.userFilter.value = current;
  }

  function renderEntries() {
    el.entries.replaceChildren();
    el.entryCount.textContent = `${state.entries.length} ${t("count")}`;
    if (!state.entries.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = t("noEntries");
      el.entries.append(empty);
      return;
    }
    state.entries.forEach((entry) => {
      const row = document.createElement("article");
      row.className = `entry${entry.effective ? "" : " superseded"}`;
      const main = document.createElement("div");
      main.className = "entry-main";
      const icon = document.createElement("span");
      icon.className = `entry-icon ${entry.kind === "check_out" ? "out" : entry.kind === "void" ? "void" : ""}`;
      icon.textContent = entry.kind === "check_in" ? "IN" : entry.kind === "check_out" ? "OUT" : "X";
      const text = document.createElement("div");
      const title = document.createElement("div");
      title.className = "entry-title";
      const person = canReadAll() ? `${displayName(entry.user)} - ` : "";
      title.textContent = `${person}${entry.kind === "check_in" ? t("checkIn") : entry.kind === "check_out" ? t("checkOut") : t("voided")}`;
      const meta = document.createElement("div");
      meta.className = "entry-meta";
      const parts = [formatDateTime(entry.occurredAt), `${t("source")}: ${t(entry.source || "web")}`];
      if (entry.station) parts.push(`${t("station")}: ${entry.station.name}`);
      if (!entry.effective) parts.push(entry.kind === "void" ? t("voided") : t("corrected"));
      if (entry.reason) parts.push(entry.reason);
      meta.textContent = parts.join(" | ");
      text.append(title, meta);
      main.append(icon, text);
      row.append(main);
      if (canManage() && entry.effective) {
        const actions = document.createElement("div");
        actions.className = "entry-actions";
        const correct = document.createElement("button");
        correct.className = "btn";
        correct.type = "button";
        correct.textContent = t("correct");
        correct.addEventListener("click", () => openCorrection(entry));
        const voidButton = document.createElement("button");
        voidButton.className = "btn danger";
        voidButton.type = "button";
        voidButton.textContent = t("voidEntry");
        voidButton.addEventListener("click", () => openVoid(entry));
        actions.append(correct, voidButton);
        row.append(actions);
      }
      el.entries.append(row);
    });
  }

  function renderStations() {
    if (!canManage()) return;
    el.stations.replaceChildren();
    state.stations.forEach((station) => {
      const row = document.createElement("article");
      row.className = "station";
      const main = document.createElement("div");
      main.className = "station-main";
      const text = document.createElement("div");
      const title = document.createElement("div");
      title.className = "entry-title";
      title.textContent = station.name;
      const meta = document.createElement("div");
      meta.className = "entry-meta";
      meta.textContent = [station.location, station.active ? t("active") : t("inactive")].filter(Boolean).join(" | ");
      text.append(title, meta);
      main.append(text);
      const actions = document.createElement("div");
      actions.className = "entry-actions";
      const toggle = document.createElement("button");
      toggle.className = "btn";
      toggle.type = "button";
      toggle.textContent = station.active ? t("disable") : t("enable");
      toggle.addEventListener("click", () => updateStation(station.id, { active: !station.active }));
      const viewCode = document.createElement("button");
      viewCode.className = "btn";
      viewCode.type = "button";
      viewCode.textContent = t("viewCode");
      viewCode.addEventListener("click", () => openStationCode(station.id));
      actions.append(toggle, viewCode);
      row.append(main, actions);
      el.stations.append(row);
    });
  }

  async function loadStatus() {
    state.status = await bodyOrError(await api("/api/attendance/status"));
    renderStatus();
  }

  async function loadEntries() {
    const from = new Date(`${el.fromInput.value}T00:00:00.000`).toISOString();
    const to = new Date(`${el.toInput.value}T23:59:59.999`).toISOString();
    const params = new URLSearchParams({ from, to, limit: "1000" });
    if (canReadAll() && el.userFilter.value) params.set("userId", el.userFilter.value);
    const body = await bodyOrError(await api(`/api/attendance/entries?${params}`));
    state.entries = body.items || [];
    renderEntries();
  }

  async function loadStations() {
    const body = await bodyOrError(await api("/api/attendance/stations"));
    state.stations = body.items || [];
    renderStations();
  }

  async function loadUsers() {
    if (!canReadAll()) return;
    const response = await api("/api/people/directory");
    state.users = await bodyOrError(response);
    renderUserFilter();
  }

  async function punch(payload, isNfc) {
    el.punchBtn.disabled = true;
    setPageStatus(t("loading"), false);
    try {
      const endpoint = isNfc ? "/api/attendance/nfc-punch" : "/api/attendance/punch";
      await bodyOrError(await api(endpoint, { method: "POST", body: JSON.stringify(payload || {}) }));
      await Promise.all([loadStatus(), loadEntries()]);
      setPageStatus(t("saved"), false);
    } catch (error) {
      setPageStatus(error.message || t("failed"), true);
    } finally {
      el.punchBtn.disabled = false;
    }
  }

  function parseNfcPayload(raw) {
    const url = new URL(String(raw || ""));
    if (url.protocol !== "procal:" || url.hostname !== "attendance") throw new Error("Invalid NFC tag");
    const stationId = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const token = url.searchParams.get("token") || "";
    if (!stationId || !token) throw new Error("Invalid NFC tag");
    return { stationId, token };
  }

  function openCorrection(entry) {
    state.selectedEntryId = entry.id;
    el.correctionAction.value = entry.kind;
    el.correctionTime.value = toDateTimeLocal(entry.occurredAt);
    el.correctionReason.value = "";
    el.correctionModal.classList.remove("hidden");
    el.correctionModal.setAttribute("aria-hidden", "false");
  }

  function closeCorrection() {
    state.selectedEntryId = "";
    el.correctionModal.classList.add("hidden");
    el.correctionModal.setAttribute("aria-hidden", "true");
  }

  function openVoid(entry) {
    state.selectedEntryId = entry.id;
    el.voidReason.value = "";
    el.voidModal.classList.remove("hidden");
    el.voidModal.setAttribute("aria-hidden", "false");
  }

  function closeVoid() {
    state.selectedEntryId = "";
    el.voidModal.classList.add("hidden");
    el.voidModal.setAttribute("aria-hidden", "true");
  }

  async function voidEntry(reason) {
    if (!state.selectedEntryId || !reason || reason.trim().length < 3) return;
    try {
      await bodyOrError(await api(`/api/attendance/entries/${encodeURIComponent(state.selectedEntryId)}/void`, { method:"POST", body:JSON.stringify({ reason:reason.trim() }) }));
      closeVoid();
      await Promise.all([loadStatus(), loadEntries()]);
      setPageStatus(t("saved"), false);
    } catch (error) { setPageStatus(error.message || t("failed"), true); }
  }

  async function updateStation(id, data) {
    try {
      await bodyOrError(await api(`/api/attendance/stations/${encodeURIComponent(id)}`, { method:"PATCH", body:JSON.stringify(data) }));
      await loadStations();
      setPageStatus(t("saved"), false);
    } catch (error) { setPageStatus(error.message || t("failed"), true); }
  }

  function showPayload(payload, qrDataUrl, stationName, stationId) {
    state.selectedStationId = stationId || "";
    el.payloadValue.value = payload || "";
    el.qrImage.src = qrDataUrl || "";
    el.qrImage.classList.toggle("hidden", !qrDataUrl);
    el.downloadQrBtn.disabled = !qrDataUrl;
    el.downloadQrBtn.dataset.fileName = `procal-${String(stationName || "station").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "station"}-qr.png`;
    el.payloadModal.classList.remove("hidden");
    el.payloadModal.setAttribute("aria-hidden", "false");
  }

  async function openStationCode(id) {
    try {
      const response = await api(`/api/attendance/stations/${encodeURIComponent(id)}/code`);
      if (response.status === 409) {
        if (window.confirm(t("legacyCode"))) await rotateStation(id, true);
        return;
      }
      const body = await bodyOrError(response);
      const station = body.station || state.stations.find((item) => item.id === id);
      showPayload(body.nfcPayload, body.qrDataUrl, station && station.name, id);
    } catch (error) { setPageStatus(error.message || t("failed"), true); }
  }

  async function rotateStation(id, confirmed) {
    if (!id || (!confirmed && !window.confirm(t("rotateConfirm")))) return;
    try {
      const body = await bodyOrError(await api(`/api/attendance/stations/${encodeURIComponent(id)}/rotate-token`, { method:"POST", body:"{}" }));
      const station = state.stations.find((item) => item.id === id);
      showPayload(body.nfcPayload, body.qrDataUrl, station && station.name, id);
    } catch (error) { setPageStatus(error.message || t("failed"), true); }
  }

  function bindEvents() {
    el.langBtn.addEventListener("click", () => {
      state.lang = state.lang === "bg" ? "en" : "bg";
      localStorage.setItem("procal_lang", state.lang);
      applyTranslations();
    });
    el.applyBtn.addEventListener("click", () => loadEntries().catch((error) => setPageStatus(error.message, true)));
    el.userFilter.addEventListener("change", () => loadEntries().catch((error) => setPageStatus(error.message, true)));
    el.punchBtn.addEventListener("click", () => punch({ action:el.punchBtn.dataset.action }, false));
    el.nfcBtn.addEventListener("click", () => {
      try {
        window.ProCalAndroidShell.startAttendanceNfcScan();
        setPageStatus(t("nfcWaiting"), false);
      } catch (_) { setPageStatus(t("nfcUnsupported"), true); }
    });
    el.qrBtn.addEventListener("click", () => {
      try {
        window.ProCalAndroidShell.startAttendanceQrScan();
        setPageStatus(t("loading"), false);
      } catch (_) { setPageStatus(t("nfcUnsupported"), true); }
    });
    window.addEventListener("procal-nfc-scan", (event) => {
      try { punch(parseNfcPayload(event.detail && event.detail.payload), true); }
      catch (error) { setPageStatus(error.message || t("failed"), true); }
    });
    window.addEventListener("procal-nfc-error", (event) => {
      setPageStatus((event.detail && event.detail.message) || t("failed"), true);
    });
    window.addEventListener("procal-qr-scan", (event) => {
      try { punch(parseNfcPayload(event.detail && event.detail.payload), true); }
      catch (error) { setPageStatus(error.message || t("failed"), true); }
    });
    el.stationForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const body = await bodyOrError(await api("/api/attendance/stations", {
          method:"POST",
          body:JSON.stringify({ name:el.stationName.value.trim(), location:el.stationLocation.value.trim() })
        }));
        el.stationForm.reset();
        await loadStations();
        showPayload(body.nfcPayload, body.qrDataUrl, body.station && body.station.name, body.station && body.station.id);
      } catch (error) { setPageStatus(error.message || t("failed"), true); }
    });
    el.closeCorrectionBtn.addEventListener("click", closeCorrection);
    el.correctionModal.addEventListener("click", (event) => { if (event.target === el.correctionModal) closeCorrection(); });
    el.correctionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.selectedEntryId) return;
      try {
        await bodyOrError(await api(`/api/attendance/entries/${encodeURIComponent(state.selectedEntryId)}/correct`, {
          method:"POST",
          body:JSON.stringify({ action:el.correctionAction.value, occurredAt:new Date(el.correctionTime.value).toISOString(), reason:el.correctionReason.value.trim() })
        }));
        closeCorrection();
        await Promise.all([loadStatus(), loadEntries()]);
        setPageStatus(t("saved"), false);
      } catch (error) { setPageStatus(error.message || t("failed"), true); }
    });
    el.closePayloadBtn.addEventListener("click", () => el.payloadModal.classList.add("hidden"));
    el.payloadModal.addEventListener("click", (event) => { if (event.target === el.payloadModal) el.payloadModal.classList.add("hidden"); });
    el.newPayloadBtn.addEventListener("click", () => rotateStation(state.selectedStationId));
    el.closeVoidBtn.addEventListener("click", closeVoid);
    el.voidModal.addEventListener("click", (event) => { if (event.target === el.voidModal) closeVoid(); });
    el.voidForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await voidEntry(el.voidReason.value);
    });
    el.copyPayloadBtn.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(el.payloadValue.value);
        } else {
          el.payloadValue.focus();
          el.payloadValue.select();
          if (!document.execCommand("copy")) throw new Error("Copy failed");
        }
        setPageStatus(t("copied"), false);
      } catch (_) {
        setPageStatus(t("failed"), true);
      }
    });
    el.downloadQrBtn.addEventListener("click", () => {
      if (!el.qrImage.src) return;
      const link = document.createElement("a");
      link.href = el.qrImage.src;
      link.download = el.downloadQrBtn.dataset.fileName || "procal-station-qr.png";
      document.body.append(link);
      link.click();
      link.remove();
    });
  }

  async function init() {
    setDefaultRange();
    bindEvents();
    applyTranslations();
    setPageStatus(t("loading"), false);
    try {
      state.me = await bodyOrError(await api("/api/me"));
      if (!hasPermission("attendance.read_self")) throw new Error("Forbidden");
      el.userFilterWrap.classList.toggle("hidden", !canReadAll());
      el.adminSection.classList.toggle("hidden", !canManage());
      const bridge = window.ProCalAndroidShell;
      const nfcAvailable = bridge
        && typeof bridge.startAttendanceNfcScan === "function"
        && (typeof bridge.isNfcAvailable !== "function" || bridge.isNfcAvailable());
      el.nfcBtn.classList.toggle("hidden", !nfcAvailable);
      const qrAvailable = bridge
        && typeof bridge.startAttendanceQrScan === "function"
        && (typeof bridge.isQrScannerAvailable !== "function" || bridge.isQrScannerAvailable());
      el.qrBtn.classList.toggle("hidden", !qrAvailable);
      await Promise.all([loadStatus(), loadEntries(), loadUsers(), loadStations()]);
      setPageStatus("", false);
    } catch (error) {
      setPageStatus(error.message || t("failed"), true);
    }
  }

  init();
})();
