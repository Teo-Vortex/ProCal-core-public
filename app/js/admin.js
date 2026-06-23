"use strict";

function resolveRuntimePath(value) {
  const runtime = window.PROCAL_RUNTIME || {};
  return runtime && typeof runtime.resolvePath === "function"
    ? runtime.resolvePath(value)
    : value;
}

function getToken() {
  return localStorage.getItem("procal_access_token") || "";
}

async function refreshAccessToken() {
  const r = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
  if (!r.ok) return "";
  const body = await r.json().catch(() => ({}));
  const next = typeof body.accessToken === "string" ? body.accessToken : "";
  if (next) localStorage.setItem("procal_access_token", next);
  return next;
}

const authHeaders = () => ({ authorization: `Bearer ${getToken()}`, "content-type": "application/json" });

const forbiddenEl = document.getElementById("forbidden");
const contentEl = document.getElementById("content");
const meEl = document.getElementById("me");
const globalStatusEl = document.getElementById("globalStatus");
const usersMsgEl = document.getElementById("usersMsg");
const usersBodyEl = document.getElementById("usersBody");
const realmPromoCodeEl = document.getElementById("realmPromoCode");
const redeemRealmPromoBtn = document.getElementById("redeemRealmPromoBtn");
const reloadRealmPromoBtn = document.getElementById("reloadRealmPromoBtn");
const realmPromoMsgEl = document.getElementById("realmPromoMsg");
const realmPromoSummaryEl = document.getElementById("realmPromoSummary");
const realmPromoHistoryBodyEl = document.getElementById("realmPromoHistoryBody");
const realmJoinCodeValueEl = document.getElementById("realmJoinCodeValue");
const copyRealmJoinCodeBtn = document.getElementById("copyRealmJoinCodeBtn");
const realmJoinCodeHintEl = document.getElementById("realmJoinCodeHint");
const realmInviteSummaryEl = document.getElementById("realmInviteSummary");
const realmInviteEmailEl = document.getElementById("realmInviteEmail");
const sendRealmInviteBtn = document.getElementById("sendRealmInviteBtn");
const reloadRealmInvitesBtn = document.getElementById("reloadRealmInvitesBtn");
const realmInvitePendingSummaryEl = document.getElementById("realmInvitePendingSummary");
const realmInvitesBodyEl = document.getElementById("realmInvitesBody");
const rolesWrapEl = document.getElementById("rolesWrap");
const categoriesBodyEl = document.getElementById("categoriesBody");
const categoriesMsgEl = document.getElementById("categoriesMsg");
const reloadCategoriesBtn = document.getElementById("reloadCategories");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const newCategoryNameEl = document.getElementById("newCategoryName");
const newCategoryColorEl = document.getElementById("newCategoryColor");
const newRoleEl = document.getElementById("newRole");
const overrideUserLabelEl = document.getElementById("overrideUserLabel");
const userOverrideWrapEl = document.getElementById("userOverrideWrap");
const overrideMsgEl = document.getElementById("overrideMsg");
const saveUserOverridesBtn = document.getElementById("saveUserOverridesBtn");
const resetUserOverridesBtn = document.getElementById("resetUserOverridesBtn");
const overrideModalEl = document.getElementById("overrideModal");
const closeOverrideModalBtn = document.getElementById("closeOverrideModalBtn");
const auditFromEl = document.getElementById("auditFrom");
const auditToEl = document.getElementById("auditTo");
const auditActorUserIdEl = document.getElementById("auditActorUserId");
const auditActionEl = document.getElementById("auditAction");
const auditEntityTypeEl = document.getElementById("auditEntityType");
const auditSearchEl = document.getElementById("auditSearch");
const auditExcludeNoisyEl = document.getElementById("auditExcludeNoisy");
const auditApplyBtn = document.getElementById("auditApplyBtn");
const auditResetBtn = document.getElementById("auditResetBtn");
const auditExportBtn = document.getElementById("auditExportBtn");
const auditLoadMoreBtn = document.getElementById("auditLoadMoreBtn");
const auditBodyEl = document.getElementById("auditBody");
const auditMsgEl = document.getElementById("auditMsg");
const leaveTplFileEl = document.getElementById("leaveTplFile");
const leaveTplLoadBtn = document.getElementById("leaveTplLoadBtn");
const leaveTplSaveBtn = document.getElementById("leaveTplSaveBtn");
const leaveTplMsgEl = document.getElementById("leaveTplMsg");
const leaveTplEditorEl = document.getElementById("leaveTplEditor");
const leaveTplBgEl = document.getElementById("leaveTplBg");
const leaveTplAddNameBtn = document.getElementById("leaveTplAddNameBtn");
const leaveTplAddFullNameBtn = document.getElementById("leaveTplAddFullNameBtn");
const leaveTplAddRoleBtn = document.getElementById("leaveTplAddRoleBtn");
const leaveTplAddWorkplaceBtn = document.getElementById("leaveTplAddWorkplaceBtn");
const leaveTplAddJobTitleBtn = document.getElementById("leaveTplAddJobTitleBtn");
const leaveTplAddPeriodBtn = document.getElementById("leaveTplAddPeriodBtn");
const leaveTplAddFromDateBtn = document.getElementById("leaveTplAddFromDateBtn");
const leaveTplAddToDateBtn = document.getElementById("leaveTplAddToDateBtn");
const leaveTplAddWorkingDaysBtn = document.getElementById("leaveTplAddWorkingDaysBtn");
const leaveTplAddReturnToWorkDateBtn = document.getElementById("leaveTplAddReturnToWorkDateBtn");
const leaveTplAddTodayDateBtn = document.getElementById("leaveTplAddTodayDateBtn");
const leaveTplAddTypeBtn = document.getElementById("leaveTplAddTypeBtn");
const leaveTplAddCreatedBtn = document.getElementById("leaveTplAddCreatedBtn");
const leaveTplTargetUserEl = document.getElementById("leaveTplTargetUser");
const leaveTplResetOverrideBtn = document.getElementById("leaveTplResetOverrideBtn");
const leaveTplTargetHintEl = document.getElementById("leaveTplTargetHint");
const leaveTplFieldInfoEl = document.getElementById("leaveTplFieldInfo");
const leaveTplFieldFontSizeEl = document.getElementById("leaveTplFieldFontSize");
const leaveTplFieldFontSizeRangeEl = document.getElementById("leaveTplFieldFontSizeRange");
const leaveTplRemoveFieldBtn = document.getElementById("leaveTplRemoveFieldBtn");
const holidaysBodyEl = document.getElementById("holidaysBody");
const holidaysMsgEl = document.getElementById("holidaysMsg");
const addHolidayRuleBtn = document.getElementById("addHolidayRuleBtn");
const reloadHolidaysBtn = document.getElementById("reloadHolidaysBtn");
const saveHolidaysBtn = document.getElementById("saveHolidaysBtn");
const easterEnabledEl = document.getElementById("easterEnabled");
const easterCalendarEl = document.getElementById("easterCalendar");
const easterNameEl = document.getElementById("easterName");
const easterDayOffEl = document.getElementById("easterDayOff");
const easterOffsetsEl = document.getElementById("easterOffsets");
const easterStartYearEl = document.getElementById("easterStartYear");
const easterEndYearEl = document.getElementById("easterEndYear");
const notifSettingsWrapEl = document.getElementById("notifSettingsWrap");
const reloadNotifSettingsBtn = document.getElementById("reloadNotifSettingsBtn");
const saveNotifSettingsBtn = document.getElementById("saveNotifSettingsBtn");
const notifSettingsMsgEl = document.getElementById("notifSettingsMsg");
const notifFilterUserEl = document.getElementById("notifFilterUser");
const notifFilterTypeEl = document.getElementById("notifFilterType");
const notifFilterReadEl = document.getElementById("notifFilterRead");
const notifFilterQEl = document.getElementById("notifFilterQ");
const notifApplyBtn = document.getElementById("notifApplyBtn");
const notifResetBtn = document.getElementById("notifResetBtn");
const notifLoadMoreBtn = document.getElementById("notifLoadMoreBtn");
const notifMsgEl = document.getElementById("notifMsg");
const notifBodyEl = document.getElementById("notifBody");
const adminImportantNotifTitleEl = document.getElementById("adminImportantNotifTitle");
const adminImportantNotifBodyEl = document.getElementById("adminImportantNotifBody");
const sendAdminImportantNotifBtn = document.getElementById("sendAdminImportantNotifBtn");
const backupsCreateFullBtn = document.getElementById("backupsCreateFullBtn");
const backupsCreateWorkingBtn = document.getElementById("backupsCreateWorkingBtn");
const backupsRestoreFileEl = document.getElementById("backupsRestoreFile");
const backupsValidateUploadBtn = document.getElementById("backupsValidateUploadBtn");
const backupsRestoreUploadBtn = document.getElementById("backupsRestoreUploadBtn");
const backupsMsgEl = document.getElementById("backupsMsg");
const retentionLastCleanupRunEl = document.getElementById("retentionLastCleanupRun");
const retentionNotificationsDaysEl = document.getElementById("retentionNotificationsDays");
const retentionAuditDaysEl = document.getElementById("retentionAuditDays");
const retentionChatDaysEl = document.getElementById("retentionChatDays");
const retentionSaveBtn = document.getElementById("retentionSaveBtn");
const retentionChatFilesDaysEl = document.getElementById("retentionChatFilesDays");
const filesRetentionSaveBtn = document.getElementById("filesRetentionSaveBtn");
const adminFilesStorageLabelEl = document.getElementById("adminFilesStorageLabel");
const adminFilesReloadBtn = document.getElementById("adminFilesReloadBtn");
const filesRealmArchiveBtn = document.getElementById("filesRealmArchiveBtn");
const filesAdminMsgEl = document.getElementById("filesAdminMsg");

let knownPermissions = [];
let categoriesCache = [];
let rolesCache = [];
let usersCache = [];
let selectedUser = null;
let selectedUserPerms = null;
let currentFeatureFlags = {};
let auditRows = [];
let auditNextCursor = null;
let auditLoading = false;
let auditLoadedOnce = false;
let leaveTemplateState = { backgroundDataUrl: "", fields: [], userOverrides: [] };
let leaveTemplateDrag = null;
let leaveTemplateSelectedFieldIdx = -1;
let holidayRulesCache = [];
let notifUsersCache = [];
let notifTypesCache = [];
let notifDisabledSet = new Set();
let notifSelfDisabledUserIds = new Set();
let notifRows = [];
let notifNextCursor = null;
let notifLoading = false;
let notifLoadedOnce = false;
let retentionSettingsLoadedOnce = false;
let filesAdminLoadedOnce = false;
let easterConfigCache = {
  enabled: false,
  calendar: "orthodox",
  name: "Easter",
  dayOff: true,
  offsets: [-2, -1, 0, 1],
  startYear: null,
  endYear: null
};
const LEAVE_TPL_MIN_SIZE = 0.01;
let adminRealtimeAbortController = null;
let adminRealtimeReloadTimer = null;
let adminRealtimeBackoffMs = 1000;
const DEFAULT_CATEGORIES = [
  { id: "cat_work", name: "Work", color: "#0ea5e9" },
  { id: "cat_personal", name: "Personal", color: "#22c55e" },
  { id: "cat_health", name: "Health", color: "#f97316" },
  { id: "cat_family", name: "Family", color: "#ec4899" },
  { id: "cat_travel", name: "Travel", color: "#8b5cf6" },
  { id: "cat_admin", name: "Admin", color: "#64748b" },
  { id: "cat_learning", name: "Learning", color: "#eab308" },
  { id: "cat_other", name: "Other", color: "#14b8a6" }
];
const ADMIN_TAB_FEATURES = {
  roles: "admin_roles",
  categories: "admin_categories",
  holidays: "admin_holidays",
  "leave-template": "admin_leave_template",
  notifications: "admin_notifications",
  files: "admin_files",
  backups: "admin_backups",
  audit: "admin_audit"
};
const PERMISSION_TEXTS = {
  "*": { bg: "Пълен достъп", desc: "Всички действия без ограничение." },
  "reports.read_self": { bg: "Отчети (само мои)", desc: "Вижда отчетите само за себе си." },
  "reports.read_all": { bg: "Отчети (всички)", desc: "Вижда отчети за всички потребители." },
  "comp.read_self": { bg: "Компенсации (само мои)", desc: "Вижда само личния баланс и лог." },
  "comp.read_all": { bg: "Компенсации (всички)", desc: "Вижда компенсациите на всички." },
  "comp.manage": { bg: "Управление компенсации", desc: "Добавя/махa/коригира компенсации." },
  "sync.read": { bg: "Realtime синхронизация", desc: "Получава live обновявания." },
  "events.read": { bg: "Чете събития", desc: "Вижда календарни събития." },
  "events.read_all": { bg: "Чете всички събития", desc: "Вижда всички общи събития." },
  "events.create": { bg: "Създава събития", desc: "Добавя нови събития." },
  "events.update": { bg: "Редактира събития", desc: "Променя съществуващи събития." },
  "events.delete": { bg: "Трие събития", desc: "Изтрива събития." },
  "tasks.read": { bg: "Чете задачи", desc: "Вижда задачите." },
  "tasks.read_all": { bg: "Чете всички задачи", desc: "Вижда задачите на всички." },
  "tasks.create": { bg: "Създава задачи", desc: "Добавя нови задачи." },
  "tasks.assign": { bg: "Назначава задачи", desc: "Задава задачи на други хора." },
  "tasks.update_own": { bg: "Редактира свои задачи", desc: "Променя само собствените задачи." },
  "tasks.update_any": { bg: "Редактира всички задачи", desc: "Променя задачи на всички." },
  "tasks.delete_own": { bg: "Трие свои задачи", desc: "Трие само собствените задачи." },
  "tasks.delete_any": { bg: "Трие всички задачи", desc: "Трие задачи на всички." },
  "users.read": { bg: "Вижда потребители", desc: "Има достъп до списъка с потребители." },
  "users.create": { bg: "Създава потребители", desc: "Добавя нови акаунти." },
  "users.update": { bg: "Редактира потребители", desc: "Променя роля, статус, име, цвят и др." },
  "users.delete": { bg: "Изтрива потребители", desc: "Премахва потребители (вкл. hard delete)." },
  "users.approve": { bg: "Одобрява регистрации", desc: "Одобрява чакащи потребители." },
  "roles.read": { bg: "Вижда роли", desc: "Преглежда ролите и правата." },
  "roles.update": { bg: "Редактира роли", desc: "Променя права и имена на роли." },
  "permissions.manage": { bg: "Управлява override права", desc: "Задава индивидуални права на потребител." },
  "notes.read": { bg: "Чете бележки", desc: "Вижда бележките в системата." },
  "notes.create": { bg: "Създава бележки", desc: "Добавя нови бележки." },
  "notes.update": { bg: "Редактира бележки", desc: "Променя бележки." },
  "notes.delete": { bg: "Трие бележки", desc: "Изтрива бележки." },
  "media.read": { bg: "Медиен мониторинг: преглед", desc: "Вижда модула за медиен мониторинг." },
  "media.create": { bg: "Медиен мониторинг: създаване", desc: "Добавя публикации и споменавания." },
  "media.update": { bg: "Медиен мониторинг: редакция", desc: "Редактира записи в модула." },
  "media.delete": { bg: "Медиен мониторинг: изтриване", desc: "Изтрива записи в модула." },
  "media.export": { bg: "Медиен мониторинг: експорт", desc: "Експортира данни (CSV/JSON)." }
  ,
  "backups.manage": { bg: "Бекъпи", desc: "Експортира криптирани бекъпи и възстановява от предоставен файл." }
};

function getPermissionMeta(permission) {
  return PERMISSION_TEXTS[permission] || {
    bg: permission,
    desc: "Техническо право (без допълнително описание)."
  };
}

function buildPermissionCell(permission) {
  const meta = getPermissionMeta(permission);
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gap = "2px";

  const title = document.createElement("strong");
  title.textContent = meta.bg;
  title.style.fontSize = "12px";

  const desc = document.createElement("span");
  desc.textContent = meta.desc;
  desc.className = "muted";
  desc.style.fontSize = "11px";

  const code = document.createElement("span");
  code.textContent = permission;
  code.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  code.style.fontSize = "10px";
  code.style.color = "#64748b";

  wrap.append(title, desc, code);
  return wrap;
}

function scheduleAdminRealtimeReload() {
  if (adminRealtimeReloadTimer) return;
  adminRealtimeReloadTimer = setTimeout(async () => {
    adminRealtimeReloadTimer = null;
    const reloadJobs = [loadUsers()];
    if (isFeatureEnabled("admin_roles")) reloadJobs.push(loadRoles());
    if (isFeatureEnabled("admin_categories")) reloadJobs.push(loadCategories());
    if (isFeatureEnabled("admin_holidays")) reloadJobs.push(loadHolidayRules());
    if (isFeatureEnabled("admin_notifications")) reloadJobs.push(loadNotifSettings());
    await Promise.allSettled(reloadJobs);
    const activeNotificationsTab = document.getElementById("tab-notifications");
    if (isFeatureEnabled("admin_notifications") && activeNotificationsTab && activeNotificationsTab.classList.contains("active") && notifLoadedOnce) {
      await loadNotifRows(false);
    }
  }, 700);
}

function parseSseChunk(buffer, onEvent) {
  let sep = buffer.indexOf("\n\n");
  while (sep !== -1) {
    const rawEvent = buffer.slice(0, sep);
    buffer = buffer.slice(sep + 2);
    const lines = rawEvent.split("\n");
    let eventName = "message";
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) {
      try {
        const payload = JSON.parse(dataLines.join("\n"));
        onEvent(eventName, payload);
      } catch {}
    }
    sep = buffer.indexOf("\n\n");
  }
  return buffer;
}

function scheduleAdminRealtimeReconnect() {
  const delay = Math.min(adminRealtimeBackoffMs, 10000);
  setTimeout(() => {
    void initRealtimeAutoReload();
  }, delay);
  adminRealtimeBackoffMs = Math.min(adminRealtimeBackoffMs * 2, 10000);
}

async function initRealtimeAutoReload() {
  if (!getToken()) return;
  if (adminRealtimeAbortController) {
    adminRealtimeAbortController.abort();
    adminRealtimeAbortController = null;
  }

  adminRealtimeAbortController = new AbortController();

  try {
    let res = await fetch('/api/sync/stream?mode=shared', {
      method: 'GET',
      credentials: 'include',
      headers: {
        authorization: `Bearer ${getToken()}`,
        accept: 'text/event-stream'
      },
      signal: adminRealtimeAbortController.signal
    });

    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        location.href = resolveRuntimePath("/login");
        return;
      }
      res = await fetch('/api/sync/stream?mode=shared', {
        method: 'GET',
        credentials: 'include',
        headers: {
          authorization: `Bearer ${refreshed}`,
          accept: 'text/event-stream'
        },
        signal: adminRealtimeAbortController.signal
      });
    }

    if (!res.ok || !res.body) {
      scheduleAdminRealtimeReconnect();
      return;
    }

    adminRealtimeBackoffMs = 1000;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      buffer = parseSseChunk(buffer, (eventName) => {
        if (eventName === 'legacy_state_changed') {
          scheduleAdminRealtimeReload();
        }
      });
    }
  } catch {
    // reconnect below
  } finally {
    if (adminRealtimeAbortController && adminRealtimeAbortController.signal.aborted) {
      return;
    }
    adminRealtimeAbortController = null;
    scheduleAdminRealtimeReconnect();
  }
}


function openOverrideModal() {
  if (!overrideModalEl) return;
  overrideModalEl.classList.add("show");
}

function closeOverrideModal() {
  if (!overrideModalEl) return;
  overrideModalEl.classList.remove("show");
}

function bindOverrideModal() {
  if (closeOverrideModalBtn) closeOverrideModalBtn.onclick = closeOverrideModal;
  if (overrideModalEl) {
    overrideModalEl.addEventListener("click", (e) => {
      if (e.target === overrideModalEl) closeOverrideModal();
    });
  }
}
let globalStatusTimer = null;

function setGlobalStatus(text, danger) {
  if (!globalStatusEl) return;
  globalStatusEl.classList.remove("ok", "err");
  globalStatusEl.textContent = text || "";
  if (!text) return;
  globalStatusEl.classList.add(danger ? "err" : "ok");
  if (globalStatusTimer) clearTimeout(globalStatusTimer);
  globalStatusTimer = setTimeout(() => {
    if (!globalStatusEl) return;
    globalStatusEl.classList.remove("ok", "err");
    globalStatusEl.textContent = "";
  }, 2200);
}

document.addEventListener("pointerdown", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest(".btn") : null;
  if (!btn) return;
  btn.classList.add("btn-pressed");
  setTimeout(() => btn.classList.remove("btn-pressed"), 130);
});
function msg(text, danger) {
  if (!usersMsgEl) return;
  usersMsgEl.textContent = text || "";
  usersMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  setGlobalStatus(text, danger);
}

function overrideMsg(text, danger) {
  if (!overrideMsgEl) return;
  overrideMsgEl.textContent = text || "";
  overrideMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  setGlobalStatus(text, danger);
}

function isRoleEditable(role) {
  return role !== "system_admin";
}

function roleMatrixCheckbox(role, perm, checked) {
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.dataset.role = role;
  cb.dataset.perm = perm;
  cb.checked = !!checked;
  cb.disabled = !isRoleEditable(role);
  return cb;
}

async function saveRoleDisplayNames(nameMap) {
  const entries = Array.from(nameMap.entries());
  for (const [role, displayName] of entries) {
    await api(`/api/admin/roles/${role}/meta`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ displayName })
    });
  }
}

function buildRolesMatrix() {
  if (!rolesWrapEl) return;
  rolesWrapEl.innerHTML = "";

  const roles = (rolesCache || []).slice();
  
  const nameCard = document.createElement("div");
  nameCard.className = "card";
  const nameTitle = document.createElement("h3");
  nameTitle.textContent = "Role display names";
  nameTitle.style.marginTop = "0";

  const nameRow = document.createElement("div");
  nameRow.className = "row";
  const nameInputs = new Map();

  roles.forEach((roleItem) => {
    const wrap = document.createElement("label");
    wrap.className = "row";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";

    const tag = document.createElement("span");
    tag.className = "pill";
    tag.textContent = roleItem.role;

    const inp = document.createElement("input");
    inp.value = roleItem.displayName || roleItem.role;
    inp.placeholder = "Display name";
    inp.style.minWidth = "140px";
    nameInputs.set(roleItem.role, inp);

    wrap.append(tag, inp);
    nameRow.appendChild(wrap);
  });

  const saveNamesBtn = document.createElement("button");
  saveNamesBtn.className = "btn";
  saveNamesBtn.textContent = "Save role names";
  saveNamesBtn.onclick = async () => {
    try {
      const payload = new Map();
      nameInputs.forEach((inp, role) => payload.set(role, inp.value.trim() || role));
      await saveRoleDisplayNames(payload);
      msg("Role names saved.");
      await loadRoles();
      await loadUsers();
      fillRoleSelect(newRoleEl, "user");
    } catch (e) {
      msg(String(e.message || e), true);
    }
  };

  nameCard.append(nameTitle, nameRow, saveNamesBtn);

  const matrixCard = document.createElement("div");
  matrixCard.className = "card";
  const matrixTitle = document.createElement("h3");
  matrixTitle.textContent = "Permissions matrix";
  matrixTitle.style.marginTop = "0";

  const matrixHint = document.createElement("p");
  matrixHint.className = "muted";
  matrixHint.textContent = "System/Admin are always full access and are shown as locked.";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.style.fontSize = "13px";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const permTh = document.createElement("th");
  permTh.textContent = "Permission";
  headRow.appendChild(permTh);

  roles.forEach((roleItem) => {
    const th = document.createElement("th");
    th.textContent = `${roleItem.displayName || roleItem.role}`;
    th.title = roleItem.role;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  (knownPermissions || []).forEach((perm) => {
    const tr = document.createElement("tr");

    const permTd = document.createElement("td");
    permTd.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    permTd.textContent = perm;
    tr.appendChild(permTd);

    roles.forEach((roleItem) => {
      const td = document.createElement("td");
      const selected = new Set(roleItem.current || []);
      const checked = roleItem.role === "system_admin" ? true : selected.has(perm);
      td.appendChild(roleMatrixCheckbox(roleItem.role, perm, checked));
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  tableWrap.appendChild(table);

  const actions = document.createElement("div");
  actions.className = "row";
  actions.style.marginTop = "10px";

  const saveAllBtn = document.createElement("button");
  saveAllBtn.className = "btn primary";
  saveAllBtn.textContent = "Save permissions matrix";
  saveAllBtn.onclick = async () => {
    try {
      for (const roleItem of roles) {
        if (!isRoleEditable(roleItem.role)) continue;
        const permissions = Array.from(table.querySelectorAll(`input[data-role='${roleItem.role}'][data-perm]`))
          .filter((el) => el.checked)
          .map((el) => String(el.dataset.perm || ""))
          .filter(Boolean);

        await api(`/api/admin/roles/${roleItem.role}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ permissions })
        });
      }

      msg("Role permissions saved.");
      await loadRoles();
    } catch (e) {
      msg(String(e.message || e), true);
    }
  };

  const resetRow = document.createElement("div");
  resetRow.className = "row";
  roles.forEach((roleItem) => {
    if (!isRoleEditable(roleItem.role)) return;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = `Reset ${roleItem.role}`;
    btn.onclick = async () => {
      try {
        await api(`/api/admin/roles/${roleItem.role}/reset`, {
          method: "POST",
          headers: { authorization: `Bearer ${getToken()}` }
        });
        msg(`Reset role ${roleItem.role}`);
        await loadRoles();
      } catch (e) {
        msg(String(e.message || e), true);
      }
    };
    resetRow.appendChild(btn);
  });

  actions.append(saveAllBtn);

  matrixCard.append(matrixTitle, matrixHint, tableWrap, actions, resetRow);

  rolesWrapEl.append(nameCard, matrixCard);
}

async function loadRoles() {
  try {
    const body = await api("/api/admin/roles", { headers: { authorization: `Bearer ${getToken()}` } });
    knownPermissions = Array.isArray(body.knownPermissions) ? body.knownPermissions.slice() : [];
    rolesCache = Array.isArray(body.items) ? body.items.slice() : [];
    buildRolesMatrix();
    fillRoleSelect(newRoleEl, newRoleEl.value || "user");
  } catch (e) {
    msg(String(e.message || e), true);
  }
}

function categoriesMsg(text, danger) {
  if (!categoriesMsgEl) return;
  categoriesMsgEl.textContent = text || "";
  categoriesMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  setGlobalStatus(text, danger);
}

function auditMsg(text, danger) {
  if (!auditMsgEl) return;
  auditMsgEl.textContent = text || "";
  auditMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  if (text) setGlobalStatus(text, danger);
}

function toLocalDatetimeValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function readAuditFilters() {
  const from = String((auditFromEl && auditFromEl.value) || "").trim();
  const to = String((auditToEl && auditToEl.value) || "").trim();
  const actorUserId = String((auditActorUserIdEl && auditActorUserIdEl.value) || "").trim();
  const action = String((auditActionEl && auditActionEl.value) || "").trim();
  const entityType = String((auditEntityTypeEl && auditEntityTypeEl.value) || "").trim();
  const q = String((auditSearchEl && auditSearchEl.value) || "").trim();
  const excludeNoisy = Boolean(auditExcludeNoisyEl && auditExcludeNoisyEl.checked);
  return { from, to, actorUserId, action, entityType, q, excludeNoisy };
}

function buildAuditQuery(cursor) {
  const f = readAuditFilters();
  const params = new URLSearchParams();
  if (f.from) {
    const d = new Date(f.from);
    if (!Number.isNaN(d.getTime())) params.set("from", d.toISOString());
  }
  if (f.to) {
    const d = new Date(f.to);
    if (!Number.isNaN(d.getTime())) params.set("to", d.toISOString());
  }
  if (f.actorUserId) params.set("actorUserId", f.actorUserId);
  if (f.action) params.set("action", f.action);
  if (f.entityType) params.set("entityType", f.entityType);
  if (f.q) params.set("q", f.q);
  if (f.excludeNoisy) params.set("excludeNoisy", "1");
  params.set("limit", "100");
  if (cursor) params.set("cursor", String(cursor));
  return params.toString();
}

function formatAuditWhen(value) {
  const dt = new Date(String(value || ""));
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function formatAuditActor(row) {
  if (!row) return "-";
  const actor = row.actorUser;
  if (actor && (actor.nickname || actor.username)) {
    return `${actor.nickname || actor.username} (${actor.username || actor.id || "-"})`;
  }
  return row.actorUserId || "-";
}

function renderAuditRows() {
  if (!auditBodyEl) return;
  auditBodyEl.innerHTML = "";
  if (!auditRows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="6" class="muted">No audit entries.</td>';
    auditBodyEl.appendChild(tr);
  } else {
    auditRows.forEach((row) => {
      const tr = document.createElement("tr");
      const meta = row && row.metaJson ? JSON.stringify(row.metaJson) : "";
      tr.innerHTML = `
        <td>${formatAuditWhen(row && row.createdAt)}</td>
        <td>${escapeHtml(formatAuditActor(row))}</td>
        <td>${escapeHtml(String((row && row.action) || "-"))}</td>
        <td>${escapeHtml(String((row && row.entityType) || "-"))}</td>
        <td>${escapeHtml(String((row && row.entityId) || "-"))}</td>
        <td><code>${escapeHtml(meta || "-")}</code></td>
      `;
      auditBodyEl.appendChild(tr);
    });
  }
  if (auditLoadMoreBtn) {
    auditLoadMoreBtn.disabled = auditLoading || !auditNextCursor;
  }
}

async function loadAudit(loadMore) {
  if (auditLoading) return;
  auditLoading = true;
  if (auditApplyBtn) auditApplyBtn.disabled = true;
  if (auditResetBtn) auditResetBtn.disabled = true;
  if (auditLoadMoreBtn) auditLoadMoreBtn.disabled = true;
  try {
    const query = buildAuditQuery(loadMore ? auditNextCursor : "");
    const body = await api(`/api/admin/audit?${query}`, { headers: { authorization: `Bearer ${getToken()}` } });
    const items = Array.isArray(body && body.items) ? body.items : [];
    auditNextCursor = body && body.nextCursor ? String(body.nextCursor) : null;
    if (loadMore) auditRows = auditRows.concat(items);
    else auditRows = items;
    renderAuditRows();
    auditLoadedOnce = true;
    auditMsg(`Loaded audit rows: ${auditRows.length}${auditNextCursor ? " (more available)" : ""}`);
  } catch (e) {
    auditMsg(String(e.message || e), true);
  } finally {
    auditLoading = false;
    if (auditApplyBtn) auditApplyBtn.disabled = false;
    if (auditResetBtn) auditResetBtn.disabled = false;
    if (auditLoadMoreBtn) auditLoadMoreBtn.disabled = !auditNextCursor;
  }
}

function exportAuditCsv() {
  const rows = Array.isArray(auditRows) ? auditRows : [];
  if (!rows.length) {
    auditMsg("No audit data to export.", true);
    return;
  }
  const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const header = ["id", "createdAt", "actorUserId", "actorName", "action", "entityType", "entityId", "metaJson"];
  const lines = [header.map(esc).join(",")];
  rows.forEach((row) => {
    const actor = row && row.actorUser ? (row.actorUser.nickname || row.actorUser.username || row.actorUser.id || "") : "";
    lines.push([
      row && row.id,
      row && row.createdAt,
      row && row.actorUserId,
      actor,
      row && row.action,
      row && row.entityType,
      row && row.entityId,
      row && row.metaJson ? JSON.stringify(row.metaJson) : ""
    ].map(esc).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `procal-audit-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resetAuditFilters() {
  const now = new Date();
  const from = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  if (auditFromEl) auditFromEl.value = toLocalDatetimeValue(from);
  if (auditToEl) auditToEl.value = toLocalDatetimeValue(now);
  if (auditActorUserIdEl) auditActorUserIdEl.value = "";
  if (auditActionEl) auditActionEl.value = "";
  if (auditEntityTypeEl) auditEntityTypeEl.value = "";
  if (auditSearchEl) auditSearchEl.value = "";
  if (auditExcludeNoisyEl) auditExcludeNoisyEl.checked = true;
}

function bindAudit() {
  resetAuditFilters();
  if (auditApplyBtn) auditApplyBtn.onclick = () => { void loadAudit(false); };
  if (auditResetBtn) auditResetBtn.onclick = () => { resetAuditFilters(); void loadAudit(false); };
  if (auditLoadMoreBtn) auditLoadMoreBtn.onclick = () => { void loadAudit(true); };
  if (auditExportBtn) auditExportBtn.onclick = exportAuditCsv;
}

function notifMsg(text, danger) {
  if (!notifMsgEl) return;
  notifMsgEl.textContent = text || "";
  notifMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  if (text) setGlobalStatus(text, danger);
}

function notifSettingsMsg(text, danger) {
  if (!notifSettingsMsgEl) return;
  notifSettingsMsgEl.textContent = text || "";
  notifSettingsMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  if (text) setGlobalStatus(text, danger);
}

function notifPrefKey(userId, type) {
  return `${String(userId || "").trim()}::${String(type || "").trim().toLowerCase()}`;
}

function clearNotifFiltersUi() {
  if (notifFilterReadEl) notifFilterReadEl.value = "all";
  if (notifFilterQEl) notifFilterQEl.value = "";
  if (notifFilterUserEl) notifFilterUserEl.value = "";
  if (notifFilterTypeEl) notifFilterTypeEl.value = "";
}

function renderNotifFilterOptions() {
  if (notifFilterUserEl) {
    const current = String(notifFilterUserEl.value || "");
    notifFilterUserEl.innerHTML = "";
    const any = document.createElement("option");
    any.value = "";
    any.textContent = "All";
    notifFilterUserEl.appendChild(any);
    (notifUsersCache || []).forEach((u) => {
      const opt = document.createElement("option");
      opt.value = String(u.id || "");
      opt.textContent = `${u.nickname || u.username || u.id} (${u.username || u.id})`;
      if (opt.value === current) opt.selected = true;
      notifFilterUserEl.appendChild(opt);
    });
  }
  if (notifFilterTypeEl) {
    const current = String(notifFilterTypeEl.value || "");
    notifFilterTypeEl.innerHTML = "";
    const any = document.createElement("option");
    any.value = "";
    any.textContent = "All";
    notifFilterTypeEl.appendChild(any);
    (notifTypesCache || []).forEach((type) => {
      const opt = document.createElement("option");
      opt.value = String(type || "");
      opt.textContent = String(type || "");
      if (opt.value === current) opt.selected = true;
      notifFilterTypeEl.appendChild(opt);
    });
  }
}

function renderNotifSettingsMatrix() {
  if (!notifSettingsWrapEl) return;
  notifSettingsWrapEl.innerHTML = "";
  const users = Array.isArray(notifUsersCache) ? notifUsersCache.slice() : [];
  const types = Array.isArray(notifTypesCache) ? notifTypesCache.slice() : [];
  if (!users.length || !types.length) {
    notifSettingsWrapEl.innerHTML = '<div class="muted">No users/types available.</div>';
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const userTh = document.createElement("th");
  userTh.textContent = "User";
  headRow.appendChild(userTh);
  const selfNotifyTh = document.createElement("th");
  selfNotifyTh.textContent = "Self notify";
  headRow.appendChild(selfNotifyTh);
  types.forEach((type) => {
    const th = document.createElement("th");
    th.textContent = type;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  users.forEach((user) => {
    const tr = document.createElement("tr");
    const userTd = document.createElement("td");
    userTd.innerHTML = `<strong>${escapeHtml(user.nickname || user.username || user.id)}</strong><br><span class="muted">${escapeHtml(user.username || user.id)}</span>`;
    tr.appendChild(userTd);
    const selfNotifyTd = document.createElement("td");
    const selfCb = document.createElement("input");
    selfCb.type = "checkbox";
    selfCb.dataset.selfNotifyUserId = String(user.id || "");
    selfCb.checked = !notifSelfDisabledUserIds.has(String(user.id || ""));
    selfNotifyTd.appendChild(selfCb);
    tr.appendChild(selfNotifyTd);
    types.forEach((type) => {
      const td = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.userId = String(user.id || "");
      cb.dataset.type = String(type || "");
      cb.checked = !notifDisabledSet.has(notifPrefKey(user.id, type));
      td.appendChild(cb);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  notifSettingsWrapEl.appendChild(table);
}

async function loadNotifSettings() {
  try {
    const body = await api("/api/admin/notifications/settings", { headers: { authorization: `Bearer ${getToken()}` } });
    notifUsersCache = Array.isArray(body && body.users) ? body.users.slice() : [];
    notifTypesCache = Array.isArray(body && body.types) ? body.types.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean) : [];
    const disabled = Array.isArray(body && body.disabled) ? body.disabled : [];
    notifDisabledSet = new Set(disabled.map((row) => notifPrefKey(row && row.userId, row && row.type)));
    notifSelfDisabledUserIds = new Set(Array.isArray(body && body.selfNotifyDisabledUserIds) ? body.selfNotifyDisabledUserIds.map((id) => String(id || "")).filter(Boolean) : []);
    renderNotifSettingsMatrix();
    renderNotifFilterOptions();
    notifSettingsMsg(`Loaded matrix: ${notifUsersCache.length} users, ${notifTypesCache.length} types.`);
  } catch (e) {
    notifSettingsMsg(String(e.message || e), true);
  }
}

async function saveNotifSettings() {
  if (!notifSettingsWrapEl) return;
  const rows = Array.from(notifSettingsWrapEl.querySelectorAll("input[type='checkbox'][data-user-id][data-type]"));
  const scopeUserIds = Array.from(new Set(rows.map((el) => String(el.dataset.userId || "")).filter(Boolean)));
  const scopeTypes = Array.from(new Set(rows.map((el) => String(el.dataset.type || "").trim().toLowerCase()).filter(Boolean)));
  const selfRows = Array.from(notifSettingsWrapEl.querySelectorAll("input[type='checkbox'][data-self-notify-user-id]"));
  const selfNotifyDisabledUserIds = selfRows
    .filter((el) => !el.checked)
    .map((el) => String(el.dataset.selfNotifyUserId || ""))
    .filter(Boolean);
  const disabled = rows
    .filter((el) => !el.checked)
    .map((el) => ({
      userId: String(el.dataset.userId || ""),
      type: String(el.dataset.type || "").trim().toLowerCase()
    }))
    .filter((x) => x.userId && x.type);
  try {
    await api("/api/admin/notifications/settings", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ scopeUserIds, scopeTypes, disabled, selfNotifyDisabledUserIds })
    });
    notifDisabledSet = new Set(disabled.map((row) => notifPrefKey(row.userId, row.type)));
    notifSelfDisabledUserIds = new Set(selfNotifyDisabledUserIds);
    notifSettingsMsg("Notification matrix saved.");
  } catch (e) {
    notifSettingsMsg(String(e.message || e), true);
  }
}

function readNotifFilters() {
  return {
    userId: String((notifFilterUserEl && notifFilterUserEl.value) || "").trim(),
    type: String((notifFilterTypeEl && notifFilterTypeEl.value) || "").trim().toLowerCase(),
    read: String((notifFilterReadEl && notifFilterReadEl.value) || "all").trim(),
    q: String((notifFilterQEl && notifFilterQEl.value) || "").trim()
  };
}

function buildNotifQuery(cursor) {
  const f = readNotifFilters();
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (f.userId) params.set("userId", f.userId);
  if (f.type) params.set("type", f.type);
  if (f.read && f.read !== "all") params.set("read", f.read);
  if (f.q) params.set("q", f.q);
  if (cursor) params.set("cursor", String(cursor));
  return params.toString();
}

function renderNotifRows() {
  if (!notifBodyEl) return;
  notifBodyEl.innerHTML = "";
  if (!Array.isArray(notifRows) || !notifRows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="7" class="muted">No notification records.</td>';
    notifBodyEl.appendChild(tr);
  } else {
    notifRows.forEach((row) => {
      const tr = document.createElement("tr");
      const when = row && row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : "-";
      const status = row && row.readAt ? "read" : "unread";
      tr.innerHTML = `
        <td>${escapeHtml(when)}</td>
        <td>${escapeHtml(String((row && row.userName) || (row && row.userId) || "-"))}</td>
        <td><code>${escapeHtml(String((row && row.type) || "-"))}</code></td>
        <td>${escapeHtml(String((row && row.title) || "-"))}</td>
        <td>${escapeHtml(String((row && row.body) || ""))}</td>
        <td>${escapeHtml(status)}</td>
        <td></td>
      `;
      const actionTd = tr.querySelector("td:last-child");
      if (actionTd) {
        if (!row.readAt) {
          const readBtn = document.createElement("button");
          readBtn.className = "btn";
          readBtn.type = "button";
          readBtn.textContent = "Mark read";
          readBtn.onclick = async () => {
            try {
              await api(`/api/admin/notifications/${encodeURIComponent(String(row.id || ""))}/read`, {
                method: "POST",
                headers: authHeaders()
              });
              await loadNotifRows(false);
            } catch (e) {
              notifMsg(String(e.message || e), true);
            }
          };
          actionTd.appendChild(readBtn);
        }
        const delBtn = document.createElement("button");
        delBtn.className = "btn danger";
        delBtn.type = "button";
        delBtn.textContent = "Delete";
        delBtn.onclick = async () => {
          if (!confirm("Delete this notification?")) return;
          try {
            await api(`/api/admin/notifications/${encodeURIComponent(String(row.id || ""))}`, {
              method: "DELETE",
              headers: { authorization: `Bearer ${getToken()}` }
            });
            await loadNotifRows(false);
          } catch (e) {
            notifMsg(String(e.message || e), true);
          }
        };
        actionTd.appendChild(delBtn);
      }
      notifBodyEl.appendChild(tr);
    });
  }
  if (notifLoadMoreBtn) notifLoadMoreBtn.disabled = notifLoading || !notifNextCursor;
}

async function loadNotifRows(loadMore) {
  if (notifLoading) return;
  notifLoading = true;
  if (notifApplyBtn) notifApplyBtn.disabled = true;
  if (notifResetBtn) notifResetBtn.disabled = true;
  if (notifLoadMoreBtn) notifLoadMoreBtn.disabled = true;
  try {
    const body = await api(`/api/admin/notifications?${buildNotifQuery(loadMore ? notifNextCursor : "")}`, {
      headers: { authorization: `Bearer ${getToken()}` }
    });
    const items = Array.isArray(body && body.items) ? body.items : [];
    notifNextCursor = body && body.nextCursor ? String(body.nextCursor) : null;
    notifRows = loadMore ? notifRows.concat(items) : items;
    renderNotifRows();
    notifLoadedOnce = true;
    notifMsg(`Loaded notifications: ${notifRows.length}${notifNextCursor ? " (more available)" : ""}`);
  } catch (e) {
    notifMsg(String(e.message || e), true);
  } finally {
    notifLoading = false;
    if (notifApplyBtn) notifApplyBtn.disabled = false;
    if (notifResetBtn) notifResetBtn.disabled = false;
    if (notifLoadMoreBtn) notifLoadMoreBtn.disabled = !notifNextCursor;
  }
}

async function sendAdminImportantNotification() {
  const title = String((adminImportantNotifTitleEl && adminImportantNotifTitleEl.value) || "").trim();
  const body = String((adminImportantNotifBodyEl && adminImportantNotifBodyEl.value) || "").trim();
  if (!title) {
    notifMsg("Title is required for important notification.", true);
    return;
  }
  if (sendAdminImportantNotifBtn) sendAdminImportantNotifBtn.disabled = true;
  try {
    const result = await api("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "admin.important",
        title,
        body,
        includeSelf: true
      })
    });
    if (adminImportantNotifTitleEl) adminImportantNotifTitleEl.value = "";
    if (adminImportantNotifBodyEl) adminImportantNotifBodyEl.value = "";
    notifMsg(`Important notification sent to ${Number((result && result.count) || 0)} users.`);
    await loadNotifRows(false);
  } catch (e) {
    notifMsg(String(e.message || e), true);
  } finally {
    if (sendAdminImportantNotifBtn) sendAdminImportantNotifBtn.disabled = false;
  }
}

function bindNotificationsAdmin() {
  if (reloadNotifSettingsBtn) reloadNotifSettingsBtn.onclick = () => { void loadNotifSettings(); };
  if (saveNotifSettingsBtn) saveNotifSettingsBtn.onclick = () => { void saveNotifSettings(); };
  if (notifApplyBtn) notifApplyBtn.onclick = () => { void loadNotifRows(false); };
  if (notifResetBtn) {
    notifResetBtn.onclick = () => {
      clearNotifFiltersUi();
      void loadNotifRows(false);
    };
  }
  if (notifLoadMoreBtn) notifLoadMoreBtn.onclick = () => { void loadNotifRows(true); };
  if (sendAdminImportantNotifBtn) sendAdminImportantNotifBtn.onclick = () => { void sendAdminImportantNotification(); };
}

function backupsMsg(text, danger) {
  if (!backupsMsgEl) return;
  backupsMsgEl.textContent = text || "";
  backupsMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
}

function filesAdminMsg(text, danger) {
  if (!filesAdminMsgEl) return;
  filesAdminMsgEl.textContent = text || "";
  filesAdminMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const rounded = value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${rounded} ${units[idx]}`;
}

function formatMaybeDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function generateRealmBackupKey() {
  const bytes = new Uint8Array(24);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizePdfText(value) {
  return String(value || "")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createBackupKeyPdfBlob(details) {
  const lines = [
    "ProCal encrypted realm backup key",
    "",
    `Backup file: ${details.fileName || "-"}`,
    `Backup type: ${details.backupKind || "-"}`,
    `Created at: ${details.createdAt || new Date().toISOString()}`,
    "",
    "Backup key:",
    details.encryptionKey || "-",
    "",
    "Important:",
    "Validate and restore will require exactly this same key.",
    "Each new backup can have a different key.",
    "If this key is lost, the platform operator cannot recover this backup."
  ];
  const contentLines = ["BT", "/F1 16 Tf", "72 742 Td"];
  lines.forEach((line, index) => {
    if (index > 0) {
      contentLines.push("0 -22 Td");
    }
    contentLines.push(`(${sanitizePdfText(line)}) Tj`);
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBackupKeyPdf(details) {
  const safeBackupName = String(details.fileName || `backup-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const pdfName = `${safeBackupName.replace(/\.(json|procalbak)$/i, "")}-KEY.pdf`;
  downloadBlob(createBackupKeyPdfBlob(details), pdfName);
}

function promptRealmBackupKeyForCreate(kind) {
  const generated = generateRealmBackupKey();
  const key = window.prompt(
    `This ${kind} backup will be encrypted with this key.\n\nValidate and restore will ask for the same key for this exact backup file.\nEach new backup may have a different key.\n\nThe server will not keep a copy. Save the key PDF that will download before the backup file.`,
    generated
  );
  if (key == null) return "";
  const normalized = String(key || "").trim();
  if (normalized.length < 16) {
    window.alert("Backup key must be at least 16 characters.");
    return "";
  }
  const saved = window.confirm("Confirm that you understand: the key PDF will download before the backup file, this backup can be validated/restored only with the same key, and the server will not keep a copy.");
  return saved ? normalized : "";
}

function promptRealmBackupKeyForUse(action, fileName) {
  const key = window.prompt(`${action} requires the backup key for:\n${fileName}`, "");
  if (key == null) return "";
  const normalized = String(key || "").trim();
  if (normalized.length < 16) {
    window.alert("Backup key must be at least 16 characters.");
    return "";
  }
  return normalized;
}

function isEncryptedBackupContent(content) {
  try {
    const parsed = JSON.parse(String(content || ""));
    return Boolean(parsed && parsed.format === "procal-encrypted-backup-v1" && parsed.encrypted);
  } catch {
    return false;
  }
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function readSelectedBackupUpload(action) {
  const file = backupsRestoreFileEl && backupsRestoreFileEl.files && backupsRestoreFileEl.files[0];
  if (!file) {
    backupsMsg("Select a backup file from your computer first.", true);
    return null;
  }
  const content = await file.text();
  const encrypted = isEncryptedBackupContent(content);
  const encryptionKey = encrypted ? promptRealmBackupKeyForUse(action, file.name) : "";
  if (encrypted && !encryptionKey) return null;
  return { file, content, encrypted, encryptionKey };
}

async function postUploadedBackup(endpoint, upload) {
  const headers = {
    authorization: `Bearer ${getToken()}`,
    "content-type": "text/plain;charset=utf-8",
    "x-procal-backup-file-name": encodeURIComponent(upload.file.name || `backup-${Date.now()}.procalbak`)
  };
  if (upload.encryptionKey) {
    headers["x-procal-backup-key-base64"] = encodeBase64Utf8(upload.encryptionKey);
  }
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers,
    body: upload.content
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String((body && (body.error || body.message)) || `HTTP ${res.status}`));
  }
  return body;
}

async function validateSelectedBackupFile() {
  if (backupsValidateUploadBtn) backupsValidateUploadBtn.disabled = true;
  if (backupsRestoreUploadBtn) backupsRestoreUploadBtn.disabled = true;
  try {
    const upload = await readSelectedBackupUpload("Validate");
    if (!upload) return;
    const result = await postUploadedBackup("/api/admin/backups/validate-upload", upload);
    backupsMsg(
      `Valid ${upload.encrypted ? "encrypted " : ""}backup: ${upload.file.name} | realm=${String(result.realmId || "-")} | type=${result.backupKind} | ` +
      `tables=${Number(result.tableCount || 0)} | rows=${Number(result.rowCount || 0)} | config=${Number(result.configFileCount || 0)}. Temporary server copy deleted.`
    );
  } catch (e) {
    backupsMsg(String(e.message || e), true);
  } finally {
    if (backupsValidateUploadBtn) backupsValidateUploadBtn.disabled = false;
    if (backupsRestoreUploadBtn) backupsRestoreUploadBtn.disabled = false;
  }
}

async function restoreSelectedBackupFile() {
  if (backupsValidateUploadBtn) backupsValidateUploadBtn.disabled = true;
  if (backupsRestoreUploadBtn) backupsRestoreUploadBtn.disabled = true;
  try {
    const upload = await readSelectedBackupUpload("Restore");
    if (!upload) return;
    const ok = confirm(
      `Restore backup file "${upload.file.name}"?\n\n` +
      "This will replace this realm database content and, for full backups, config/files snapshot.\n" +
      "The uploaded server copy will be deleted after the restore attempt."
    );
    if (!ok) return;
    const typed = window.prompt("Type RESTORE to confirm", "");
    if (typed !== "RESTORE") return;
    const result = await postUploadedBackup("/api/admin/backups/restore-upload", upload);
    backupsMsg(`Restore complete: ${result.insertedRows || 0} rows, ${result.insertedTables || 0} tables. Temporary server copy deleted. Reloading...`);
    if (backupsRestoreFileEl) backupsRestoreFileEl.value = "";
    setTimeout(() => location.reload(), 1200);
  } catch (e) {
    backupsMsg(String(e.message || e), true);
  } finally {
    if (backupsValidateUploadBtn) backupsValidateUploadBtn.disabled = false;
    if (backupsRestoreUploadBtn) backupsRestoreUploadBtn.disabled = false;
  }
}

async function loadRetentionSettings() {
  try {
    const body = await api("/api/admin/retention-settings", { headers: { authorization: `Bearer ${getToken()}` } });
    if (retentionNotificationsDaysEl) retentionNotificationsDaysEl.value = String(Number(body && body.notificationsRetentionDays || 0));
    if (retentionAuditDaysEl) retentionAuditDaysEl.value = String(Number(body && body.auditRetentionDays || 0));
    if (retentionChatDaysEl) retentionChatDaysEl.value = String(Number(body && body.chatRetentionDays || 0));
    if (retentionChatFilesDaysEl) retentionChatFilesDaysEl.value = String(Number(body && body.chatFilesRetentionDays || 0));
    if (retentionLastCleanupRunEl) retentionLastCleanupRunEl.textContent = formatMaybeDateTime(body && body.lastCleanupRunAt);
    retentionSettingsLoadedOnce = true;
  } catch (e) {
    backupsMsg(String(e.message || e), true);
  }
}

function buildRetentionPayload() {
  return {
    notificationsRetentionDays: Math.max(0, Number((retentionNotificationsDaysEl && retentionNotificationsDaysEl.value) || 0) || 0),
    auditRetentionDays: Math.max(0, Number((retentionAuditDaysEl && retentionAuditDaysEl.value) || 0) || 0),
    chatRetentionDays: Math.max(0, Number((retentionChatDaysEl && retentionChatDaysEl.value) || 0) || 0),
    chatFilesRetentionDays: Math.max(0, Number((retentionChatFilesDaysEl && retentionChatFilesDaysEl.value) || 0) || 0)
  };
}

async function saveRetentionSettings() {
  if (retentionSaveBtn) retentionSaveBtn.disabled = true;
  if (filesRetentionSaveBtn) filesRetentionSaveBtn.disabled = true;
  try {
    const payload = buildRetentionPayload();
    const result = await api("/api/admin/retention-settings", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const deleted = result && result.deletedNow ? result.deletedNow : {};
    const msg = `Retention saved. Deleted now: notifications ${Number(deleted.notificationsDeleted || 0)}, audit ${Number(deleted.auditDeleted || 0)}, chat ${Number(deleted.chatMessagesDeleted || 0)} msgs / ${Number(deleted.chatReadsDeleted || 0)} reads, chat files ${Number(deleted.chatFilesDeleted || 0)}.`;
    backupsMsg(msg);
    filesAdminMsg(msg, false);
    const settings = result && result.settings ? result.settings : null;
    if (retentionLastCleanupRunEl) retentionLastCleanupRunEl.textContent = formatMaybeDateTime(settings && settings.lastCleanupRunAt);
    if (retentionChatFilesDaysEl && settings) retentionChatFilesDaysEl.value = String(Number(settings.chatFilesRetentionDays || 0));
    if (notifLoadedOnce) void loadNotifRows(false);
    if (auditLoadedOnce) void loadAudit(false);
  } catch (e) {
    backupsMsg(String(e.message || e), true);
    filesAdminMsg(String(e.message || e), true);
  } finally {
    if (retentionSaveBtn) retentionSaveBtn.disabled = false;
    if (filesRetentionSaveBtn) filesRetentionSaveBtn.disabled = false;
  }
}

async function loadFilesAdmin() {
  try {
    const usage = await api("/api/files/storage", { headers: { authorization: `Bearer ${getToken()}` } });
    const used = formatBytes(Number(usage && usage.usedBytes || 0));
    const limit = formatBytes(Number(usage && usage.limitBytes || 0));
    const percent = Math.max(0, Number(usage && usage.percent || 0) || 0);
    if (adminFilesStorageLabelEl) {
      adminFilesStorageLabelEl.textContent = `${used} / ${limit} (${percent}%)`;
    }
    if (!retentionSettingsLoadedOnce) {
      await loadRetentionSettings();
    }
    filesAdminLoadedOnce = true;
    filesAdminMsg("Files panel loaded.", false);
  } catch (e) {
    filesAdminMsg(String(e.message || e), true);
  }
}

async function downloadRealmFilesArchive() {
  if (filesRealmArchiveBtn) filesRealmArchiveBtn.disabled = true;
  try {
    const blob = await apiBlob("/api/admin/files/archive/download", {
      headers: { authorization: `Bearer ${getToken()}` }
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `procal-realm-files-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    filesAdminMsg("Realm files archive downloaded.", false);
  } catch (e) {
    filesAdminMsg(String(e.message || e), true);
  } finally {
    if (filesRealmArchiveBtn) filesRealmArchiveBtn.disabled = false;
  }
}

async function createBackupNow(type) {
  const btn = type === "working" ? backupsCreateWorkingBtn : backupsCreateFullBtn;
  const kind = type === "working" ? "working" : "full";
  const encryptionKey = promptRealmBackupKeyForCreate(kind);
  if (!encryptionKey) return;
  if (btn) btn.disabled = true;
  try {
    const result = await apiDownload("/api/admin/backups/export", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: kind,
        encryptionKey,
        encryptionWarningAccepted: true
      })
    });
    const fileName = String(
      parseDownloadFileName(result.headers.get("content-disposition")) ||
      result.headers.get("x-procal-backup-file-name") ||
      `procal-${kind}-backup-${Date.now()}.procalbak`
    );
    const backupKind = String(result.headers.get("x-procal-backup-kind") || kind);
    const createdAt = String(result.headers.get("x-procal-backup-created-at") || new Date().toISOString());
    const sizeBytes = Number(result.headers.get("x-procal-backup-size-bytes") || result.blob.size || 0);
    if (fileName) {
      downloadBackupKeyPdf({
        fileName,
        backupKind,
        createdAt,
        encryptionKey
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
      downloadBlob(result.blob, fileName);
    }
    backupsMsg(`${backupKind} encrypted backup exported: ${fileName} (${formatBytes(sizeBytes)}). Key PDF downloaded first, then the backup file. No server copy was retained.`);
  } catch (e) {
    backupsMsg(String(e.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function bindBackupsAdmin() {
  if (backupsCreateFullBtn) backupsCreateFullBtn.onclick = () => { void createBackupNow("full"); };
  if (backupsCreateWorkingBtn) backupsCreateWorkingBtn.onclick = () => { void createBackupNow("working"); };
  if (backupsValidateUploadBtn) backupsValidateUploadBtn.onclick = () => { void validateSelectedBackupFile(); };
  if (backupsRestoreUploadBtn) backupsRestoreUploadBtn.onclick = () => { void restoreSelectedBackupFile(); };
  if (retentionSaveBtn) retentionSaveBtn.onclick = () => { void saveRetentionSettings(); };
}

function bindFilesAdmin() {
  if (adminFilesReloadBtn) adminFilesReloadBtn.onclick = () => { void loadFilesAdmin(); };
  if (filesRetentionSaveBtn) filesRetentionSaveBtn.onclick = () => { void saveRetentionSettings(); };
  if (filesRealmArchiveBtn) filesRealmArchiveBtn.onclick = () => { void downloadRealmFilesArchive(); };
}

function normalizeCategory(raw) {
  const id = String((raw && raw.id) || "").trim();
  const name = String((raw && raw.name) || "").trim();
  const color = /^#[0-9a-fA-F]{6}$/.test(String(raw && raw.color)) ? String(raw.color) : "#64748b";
  if (!id || !name) return null;
  return { id, name, color };
}

function renderCategories() {
  if (!categoriesBodyEl) return;
  categoriesBodyEl.innerHTML = "";
  if (!categoriesCache.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "muted";
    td.textContent = "No categories yet.";
    tr.appendChild(td);
    categoriesBodyEl.appendChild(tr);
    return;
  }
  categoriesCache.forEach((cat, idx) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.value = cat.name;
    nameTd.appendChild(nameInput);

    const colorTd = document.createElement("td");
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = /^#[0-9a-fA-F]{6}$/.test(cat.color) ? cat.color : "#64748b";
    colorTd.appendChild(colorInput);

    const actionsTd = document.createElement("td");
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn";
    saveBtn.textContent = "Save";
    saveBtn.onclick = async () => {
      categoriesCache[idx] = { ...cat, name: nameInput.value.trim(), color: colorInput.value };
      await saveCategories();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      categoriesCache.splice(idx, 1);
      await saveCategories();
    };

    actionsTd.append(saveBtn, delBtn);
    tr.append(nameTd, colorTd, actionsTd);
    categoriesBodyEl.appendChild(tr);
  });
}

async function loadCategories() {
  if (!categoriesBodyEl) return;
  try {
    const body = await api("/api/legacy/state?mode=shared", { headers: { authorization: `Bearer ${getToken()}` } });
    const state = (body && body.state && typeof body.state === "object") ? body.state : {};
    const savedCategories = Array.isArray(state.categories) ? state.categories.map(normalizeCategory).filter(Boolean) : [];
    categoriesCache = savedCategories.length
      ? savedCategories
      : DEFAULT_CATEGORIES.map((cat) => ({ ...cat }));
    renderCategories();
    categoriesMsg(savedCategories.length
      ? `Loaded categories: ${categoriesCache.length}`
      : `Loaded default categories: ${categoriesCache.length}`);
  } catch (e) {
    categoriesMsg(String(e.message || e), true);
  }
}

async function saveCategories() {
  try {
    const current = await api("/api/legacy/state?mode=shared", { headers: { authorization: `Bearer ${getToken()}` } });
    const state = (current && current.state && typeof current.state === "object") ? current.state : {};
    const cleanCategories = categoriesCache.map(normalizeCategory).filter(Boolean);
    categoriesCache = cleanCategories;
    const nextState = { ...state, categories: cleanCategories };

    await api("/api/legacy/state?mode=shared", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ state: nextState, version: current && current.version ? current.version : undefined })
    });

    renderCategories();
    categoriesMsg("Categories saved.");
  } catch (e) {
    categoriesMsg(String(e.message || e), true);
  }
}

function bindCategories() {
  if (reloadCategoriesBtn) {
    reloadCategoriesBtn.onclick = async () => {
      await loadCategories();
    };
  }
  if (addCategoryBtn) {
    addCategoryBtn.onclick = async () => {
      const name = String((newCategoryNameEl && newCategoryNameEl.value) || "").trim();
      const color = String((newCategoryColorEl && newCategoryColorEl.value) || "#64748b");
      if (!name) {
        categoriesMsg("Category name is required.", true);
        return;
      }
      categoriesCache.push({ id: `cat_${Date.now()}`, name, color });
      if (newCategoryNameEl) newCategoryNameEl.value = "";
      await saveCategories();
    };
  }
}

function holidaysMsg(text, danger) {
  if (!holidaysMsgEl) return;
  holidaysMsgEl.textContent = text || "";
  holidaysMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
  if (text) setGlobalStatus(text, danger);
}

function createHolidayRuleId() {
  return `hr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEasterConfig(raw) {
  const offsetsRaw = Array.isArray(raw && raw.offsets) ? raw.offsets : [-2, -1, 0, 1];
  const offsets = Array.from(new Set(offsetsRaw
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.trunc(v))
    .filter((v) => v >= -20 && v <= 20)))
    .sort((a, b) => a - b);
  return {
    enabled: Boolean(raw && raw.enabled),
    calendar: String((raw && raw.calendar) || "orthodox") === "western" ? "western" : "orthodox",
    name: String((raw && raw.name) || "Easter").trim() || "Easter",
    dayOff: raw && typeof raw.dayOff === "boolean" ? raw.dayOff : true,
    offsets: offsets.length ? offsets : [-2, -1, 0, 1],
    startYear: raw && raw.startYear != null && raw.startYear !== "" ? Math.trunc(Number(raw.startYear)) : null,
    endYear: raw && raw.endYear != null && raw.endYear !== "" ? Math.trunc(Number(raw.endYear)) : null
  };
}

function writeEasterConfigToUi(config) {
  const c = normalizeEasterConfig(config);
  if (easterEnabledEl) easterEnabledEl.checked = c.enabled;
  if (easterCalendarEl) easterCalendarEl.value = c.calendar;
  if (easterNameEl) easterNameEl.value = c.name;
  if (easterDayOffEl) easterDayOffEl.checked = c.dayOff;
  if (easterOffsetsEl) easterOffsetsEl.value = c.offsets.join(",");
  if (easterStartYearEl) easterStartYearEl.value = c.startYear ? String(c.startYear) : "";
  if (easterEndYearEl) easterEndYearEl.value = c.endYear ? String(c.endYear) : "";
}

function readEasterConfigFromUi() {
  const offsetsText = String((easterOffsetsEl && easterOffsetsEl.value) || "").trim();
  const offsets = offsetsText
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.trunc(v));
  return normalizeEasterConfig({
    enabled: Boolean(easterEnabledEl && easterEnabledEl.checked),
    calendar: String((easterCalendarEl && easterCalendarEl.value) || "orthodox"),
    name: String((easterNameEl && easterNameEl.value) || "").trim() || "Easter",
    dayOff: Boolean(easterDayOffEl && easterDayOffEl.checked),
    offsets,
    startYear: String((easterStartYearEl && easterStartYearEl.value) || "").trim() ? Number(easterStartYearEl.value) : null,
    endYear: String((easterEndYearEl && easterEndYearEl.value) || "").trim() ? Number(easterEndYearEl.value) : null
  });
}

function normalizeHolidayRule(raw) {
  const id = String((raw && raw.id) || "").trim() || createHolidayRuleId();
  const name = String((raw && raw.name) || "").trim() || "Holiday";
  const type = String((raw && raw.type) || "fixed");
  const dayOff = raw && typeof raw.dayOff === "boolean" ? raw.dayOff : true;
  const startYear = raw && raw.startYear != null && raw.startYear !== "" ? Number(raw.startYear) : null;
  const endYear = raw && raw.endYear != null && raw.endYear !== "" ? Number(raw.endYear) : null;
  const durationDays = Math.max(1, Math.min(31, Number((raw && raw.durationDays) || 1) || 1));
  if (type === "nth_weekday") {
    return {
      id,
      name,
      dayOff,
      type,
      nthMonth: Math.min(12, Math.max(1, Number((raw && raw.nthMonth) || 1))),
      nthWeekday: Math.min(6, Math.max(0, Number((raw && raw.nthWeekday) || 0))),
      nthOccurrence: Number((raw && raw.nthOccurrence) || 1) || 1,
      startYear: Number.isFinite(startYear) ? Math.trunc(startYear) : null,
      endYear: Number.isFinite(endYear) ? Math.trunc(endYear) : null,
      durationDays
    };
  }
  if (type === "relative") {
    return {
      id,
      name,
      dayOff,
      type,
      baseRuleId: String((raw && raw.baseRuleId) || "").trim(),
      offsetDays: Math.max(-366, Math.min(366, Number((raw && raw.offsetDays) || 0) || 0)),
      startYear: Number.isFinite(startYear) ? Math.trunc(startYear) : null,
      endYear: Number.isFinite(endYear) ? Math.trunc(endYear) : null,
      durationDays
    };
  }
  return {
    id,
    name,
    dayOff,
    type: "fixed",
    fixedMonth: Math.min(12, Math.max(1, Number((raw && raw.fixedMonth) || 1))),
    fixedDay: Math.min(31, Math.max(1, Number((raw && raw.fixedDay) || 1))),
    startYear: Number.isFinite(startYear) ? Math.trunc(startYear) : null,
    endYear: Number.isFinite(endYear) ? Math.trunc(endYear) : null,
    durationDays
  };
}

function buildHolidayTypeSelect(selected) {
  const select = document.createElement("select");
  [
    { value: "fixed", label: "Fixed date" },
    { value: "nth_weekday", label: "Nth weekday" },
    { value: "relative", label: "Offset from rule" }
  ].forEach((row) => {
    const opt = document.createElement("option");
    opt.value = row.value;
    opt.textContent = row.label;
    if (selected === row.value) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

function renderHolidayConfigEditor(container, rule, allRules) {
  container.innerHTML = "";
  const row = document.createElement("div");
  row.className = "row";
  row.style.flexWrap = "wrap";
  if (rule.type === "fixed") {
    const month = document.createElement("input");
    month.type = "number";
    month.min = "1";
    month.max = "12";
    month.value = String(rule.fixedMonth || 1);
    month.style.width = "90px";
    month.dataset.cfg = "fixedMonth";
    const day = document.createElement("input");
    day.type = "number";
    day.min = "1";
    day.max = "31";
    day.value = String(rule.fixedDay || 1);
    day.style.width = "90px";
    day.dataset.cfg = "fixedDay";
    row.append("Month", month, "Day", day);
  } else if (rule.type === "nth_weekday") {
    const month = document.createElement("input");
    month.type = "number";
    month.min = "1";
    month.max = "12";
    month.value = String(rule.nthMonth || 1);
    month.style.width = "90px";
    month.dataset.cfg = "nthMonth";

    const weekday = document.createElement("select");
    weekday.dataset.cfg = "nthWeekday";
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = d;
      if (Number(rule.nthWeekday || 0) === idx) opt.selected = true;
      weekday.appendChild(opt);
    });

    const occ = document.createElement("select");
    occ.dataset.cfg = "nthOccurrence";
    [
      { v: 1, t: "1st" }, { v: 2, t: "2nd" }, { v: 3, t: "3rd" }, { v: 4, t: "4th" }, { v: 5, t: "5th" },
      { v: -1, t: "Last" }, { v: -2, t: "2nd last" }, { v: -3, t: "3rd last" }
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = String(o.v);
      opt.textContent = o.t;
      if (Number(rule.nthOccurrence || 1) === o.v) opt.selected = true;
      occ.appendChild(opt);
    });
    row.append("Month", month, "Weekday", weekday, "Occurrence", occ);
  } else {
    const base = document.createElement("select");
    base.dataset.cfg = "baseRuleId";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "- select base rule -";
    base.appendChild(empty);
    (allRules || [])
      .filter((r) => String(r.id || "") !== String(rule.id || ""))
      .forEach((r) => {
        const opt = document.createElement("option");
        opt.value = String(r.id || "");
        opt.textContent = `${r.name} (${r.id})`;
        if (String(rule.baseRuleId || "") === String(r.id || "")) opt.selected = true;
        base.appendChild(opt);
      });

    const offset = document.createElement("input");
    offset.type = "number";
    offset.min = "-366";
    offset.max = "366";
    offset.value = String(rule.offsetDays || 0);
    offset.style.width = "120px";
    offset.dataset.cfg = "offsetDays";
    row.append("Base", base, "Offset days", offset);
  }
  container.appendChild(row);
}

function readHolidayRuleRow(tr) {
  const id = String(tr.dataset.ruleId || "").trim();
  const nameEl = tr.querySelector('input[data-field="name"]');
  const typeEl = tr.querySelector('select[data-field="type"]');
  const startYearEl = tr.querySelector('input[data-field="startYear"]');
  const endYearEl = tr.querySelector('input[data-field="endYear"]');
  const durationEl = tr.querySelector('input[data-field="durationDays"]');
  const dayOffEl = tr.querySelector('input[data-field="dayOff"]');
  const base = {
    id,
    name: String(nameEl && nameEl.value || "").trim(),
    dayOff: Boolean(dayOffEl && dayOffEl.checked),
    type: String(typeEl && typeEl.value || "fixed"),
    startYear: String(startYearEl && startYearEl.value || "").trim() ? Number(startYearEl.value) : null,
    endYear: String(endYearEl && endYearEl.value || "").trim() ? Number(endYearEl.value) : null,
    durationDays: Number(durationEl && durationEl.value || 1)
  };

  const cfg = {};
  tr.querySelectorAll("[data-cfg]").forEach((el) => {
    const key = String(el.dataset.cfg || "");
    if (!key) return;
    cfg[key] = el.value;
  });
  return normalizeHolidayRule({ ...base, ...cfg });
}

function renderHolidayRules() {
  if (!holidaysBodyEl) return;
  holidaysBodyEl.innerHTML = "";
  holidayRulesCache.forEach((rule, idx) => {
    const r = normalizeHolidayRule(rule);
    const tr = document.createElement("tr");
    tr.dataset.ruleId = r.id;

    const nameTd = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.dataset.field = "name";
    nameInput.value = r.name;
    nameTd.appendChild(nameInput);

    const dayOffTd = document.createElement("td");
    const dayOffInput = document.createElement("input");
    dayOffInput.type = "checkbox";
    dayOffInput.dataset.field = "dayOff";
    dayOffInput.checked = Boolean(r.dayOff);
    dayOffTd.appendChild(dayOffInput);

    const typeTd = document.createElement("td");
    const typeSel = buildHolidayTypeSelect(r.type);
    typeSel.dataset.field = "type";
    typeTd.appendChild(typeSel);

    const cfgTd = document.createElement("td");
    cfgTd.style.minWidth = "320px";
    renderHolidayConfigEditor(cfgTd, r, holidayRulesCache);

    const startTd = document.createElement("td");
    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.min = "1900";
    startInput.max = "2300";
    startInput.placeholder = "any";
    startInput.dataset.field = "startYear";
    startInput.value = r.startYear ? String(r.startYear) : "";
    startInput.style.width = "95px";
    startTd.appendChild(startInput);

    const endTd = document.createElement("td");
    const endInput = document.createElement("input");
    endInput.type = "number";
    endInput.min = "1900";
    endInput.max = "2300";
    endInput.placeholder = "any";
    endInput.dataset.field = "endYear";
    endInput.value = r.endYear ? String(r.endYear) : "";
    endInput.style.width = "95px";
    endTd.appendChild(endInput);

    const durationTd = document.createElement("td");
    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "1";
    durationInput.max = "31";
    durationInput.dataset.field = "durationDays";
    durationInput.value = String(r.durationDays || 1);
    durationInput.style.width = "75px";
    durationTd.appendChild(durationInput);

    const actionsTd = document.createElement("td");
    actionsTd.className = "actions-col";
    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      holidayRulesCache.splice(idx, 1);
      renderHolidayRules();
    };
    actionsTd.appendChild(delBtn);

    typeSel.addEventListener("change", () => {
      const updated = readHolidayRuleRow(tr);
      updated.type = typeSel.value;
      if (updated.type === "fixed") {
        updated.fixedMonth = 1;
        updated.fixedDay = 1;
      } else if (updated.type === "nth_weekday") {
        updated.nthMonth = 1;
        updated.nthWeekday = 1;
        updated.nthOccurrence = 1;
      } else {
        updated.baseRuleId = "";
        updated.offsetDays = 0;
      }
      holidayRulesCache[idx] = normalizeHolidayRule(updated);
      renderHolidayRules();
    });

    tr.append(nameTd, dayOffTd, typeTd, cfgTd, startTd, endTd, durationTd, actionsTd);
    holidaysBodyEl.appendChild(tr);
  });
}

function collectHolidayRulesFromUi() {
  if (!holidaysBodyEl) return [];
  const rows = Array.from(holidaysBodyEl.querySelectorAll("tr"));
  return rows.map((tr) => readHolidayRuleRow(tr)).filter((x) => Boolean(x));
}

async function loadHolidayRules() {
  try {
    const body = await api("/api/admin/holidays", { headers: { authorization: `Bearer ${getToken()}` } });
    const items = Array.isArray(body && body.rules) ? body.rules : [];
    holidayRulesCache = items.map((row) => normalizeHolidayRule(row));
    easterConfigCache = normalizeEasterConfig(body && body.easter);
    renderHolidayRules();
    writeEasterConfigToUi(easterConfigCache);
    holidaysMsg(`Loaded holiday rules: ${holidayRulesCache.length}`);
  } catch (e) {
    holidaysMsg(String(e.message || e), true);
  }
}

async function saveHolidayRules() {
  try {
    const rules = collectHolidayRulesFromUi();
    holidayRulesCache = rules.map((r) => normalizeHolidayRule(r));
    easterConfigCache = readEasterConfigFromUi();
    await api("/api/admin/holidays", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ rules: holidayRulesCache, easter: easterConfigCache })
    });
    renderHolidayRules();
    holidaysMsg("Holiday rules saved.");
  } catch (e) {
    holidaysMsg(String(e.message || e), true);
  }
}

function bindHolidayRules() {
  writeEasterConfigToUi(easterConfigCache);
  if (addHolidayRuleBtn) {
    addHolidayRuleBtn.onclick = () => {
      holidayRulesCache.push(normalizeHolidayRule({
        id: createHolidayRuleId(),
        name: "New holiday",
        dayOff: true,
        type: "fixed",
        fixedMonth: 1,
        fixedDay: 1,
        durationDays: 1
      }));
      renderHolidayRules();
    };
  }
  if (reloadHolidaysBtn) reloadHolidaysBtn.onclick = () => { void loadHolidayRules(); };
  if (saveHolidaysBtn) saveHolidaysBtn.onclick = () => { void saveHolidayRules(); };
}

function leaveTplMsg(text, danger) {
  if (!leaveTplMsgEl) return;
  leaveTplMsgEl.textContent = text || "";
  leaveTplMsgEl.style.color = danger ? "#b91c1c" : "#6b7280";
}

function normalizeLeaveTplField(row) {
  if (!row || typeof row !== "object") return null;
  const key = String(row.key || "").trim();
  const label = String(row.label || "").trim();
  if (!key || !label) return null;
  const x = Math.max(0, Math.min(1, Number(row.x || 0)));
  const y = Math.max(0, Math.min(1, Number(row.y || 0)));
  const w = Math.max(LEAVE_TPL_MIN_SIZE, Math.min(1, Number(row.w || 0.2)));
  const h = Math.max(LEAVE_TPL_MIN_SIZE, Math.min(1, Number(row.h || 0.05)));
  const page = Math.max(1, Math.min(20, Number(row.page || 1))) || 1;
  const fontSizePtRaw = Number(row.fontSizePt);
  const fontSizePt = Number.isFinite(fontSizePtRaw) ? Math.max(6, Math.min(72, fontSizePtRaw)) : 12;
  return { key, label, x, y, w, h, page, fontSizePt };
}

function normalizeLeaveTemplateState(input) {
  const baseFields = Array.isArray(input && input.fields) ? input.fields.map(normalizeLeaveTplField).filter(Boolean) : [];
  const userOverrides = Array.isArray(input && input.userOverrides)
    ? input.userOverrides.map((row) => {
        if (!row || typeof row !== "object") return null;
        const userId = String(row.userId || "").trim();
        if (!userId) return null;
        return {
          userId,
          backgroundDataUrl: String(row.backgroundDataUrl || ""),
          fields: Array.isArray(row.fields) ? row.fields.map(normalizeLeaveTplField).filter(Boolean) : []
        };
      }).filter(Boolean)
    : [];
  return {
    backgroundDataUrl: String((input && input.backgroundDataUrl) || ""),
    fields: baseFields,
    userOverrides
  };
}

function getLeaveTplTargetUserId() {
  return String((leaveTplTargetUserEl && leaveTplTargetUserEl.value) || "").trim();
}

function findLeaveTemplateOverride(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  return (leaveTemplateState.userOverrides || []).find((row) => String(row.userId || "") === uid) || null;
}

function cloneLeaveTemplateField(field) {
  return {
    key: String(field.key || ""),
    label: String(field.label || ""),
    x: Number(field.x || 0),
    y: Number(field.y || 0),
    w: Number(field.w || 0.2),
    h: Number(field.h || 0.05),
    page: Number(field.page || 1),
    fontSizePt: Number(field.fontSizePt || 12)
  };
}

function ensureLeaveTemplateOverride(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  let row = findLeaveTemplateOverride(uid);
  if (row) return row;
  row = {
    userId: uid,
    backgroundDataUrl: "",
    fields: (leaveTemplateState.fields || []).map(cloneLeaveTemplateField)
  };
  leaveTemplateState.userOverrides.push(row);
  return row;
}

function getLeaveTemplateDisplayProfile() {
  const uid = getLeaveTplTargetUserId();
  if (!uid) return { backgroundDataUrl: leaveTemplateState.backgroundDataUrl || "", fields: leaveTemplateState.fields || [], isOverride: false, overrideExists: false };
  const override = findLeaveTemplateOverride(uid);
  if (!override) {
    return {
      backgroundDataUrl: leaveTemplateState.backgroundDataUrl || "",
      fields: leaveTemplateState.fields || [],
      isOverride: true,
      overrideExists: false
    };
  }
  return {
    backgroundDataUrl: String(override.backgroundDataUrl || leaveTemplateState.backgroundDataUrl || ""),
    fields: Array.isArray(override.fields) && override.fields.length ? override.fields : (leaveTemplateState.fields || []),
    isOverride: true,
    overrideExists: true
  };
}

function getLeaveTemplateEditableProfile() {
  const uid = getLeaveTplTargetUserId();
  if (!uid) return leaveTemplateState;
  return ensureLeaveTemplateOverride(uid);
}

function getLeaveTemplateEditableFields() {
  const profile = getLeaveTemplateEditableProfile();
  if (!profile) return leaveTemplateState.fields || [];
  if (!Array.isArray(profile.fields)) profile.fields = [];
  return profile.fields;
}

function getLeaveTemplateTargetUser() {
  const uid = getLeaveTplTargetUserId();
  if (!uid) return null;
  return (usersCache || []).find((u) => String(u.id || "") === uid) || null;
}

function formatBgDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy} г.`;
}

function getLeaveTemplatePreviewText(field) {
  const key = String((field && field.key) || "").trim();
  const target = getLeaveTemplateTargetUser();
  const nickname = String((target && (target.nickname || target.username)) || "Прякор");
  const fullName = String((target && target.fullName) || "Иван Иванов Иванов");
  const workplace = String((target && target.workplace) || "Работно място");
  const jobTitle = String((target && target.jobTitle) || "Длъжност");
  const role = String((target && target.role) || "user");
  const today = formatBgDate(new Date()) || "23.02.2026 г.";
  const fromDate = "01.03.2026 г.";
  const toDate = "05.03.2026 г.";
  if (key === "employee_name") return nickname;
  if (key === "employee_full_name") return fullName;
  if (key === "employee_role") return role;
  if (key === "employee_job_title") return jobTitle;
  if (key === "employee_workplace") return workplace;
  if (key === "period") return `${fromDate} - ${toDate}`;
  if (key === "from_date" || key === "sick_from_date") return fromDate;
  if (key === "to_date" || key === "sick_to_date") return toDate;
  if (key === "working_days" || key === "sick_working_days") return "4";
  if (key === "return_to_work_date") return "09.03.2026 г.";
  if (key === "today_date" || key === "created_at" || key === "request_today_date") return today;
  if (key === "leave_type") return "Болничен";
  if (key === "source_year") return "2026";
  if (key === "note") return "Примерен текст";
  return String((field && field.label) || key || "Field");
}

function renderLeaveTemplateTargetUsers() {
  if (!leaveTplTargetUserEl) return;
  const prev = String(leaveTplTargetUserEl.value || "");
  leaveTplTargetUserEl.innerHTML = "";
  const baseOpt = document.createElement("option");
  baseOpt.value = "";
  baseOpt.textContent = "Global template (default)";
  leaveTplTargetUserEl.appendChild(baseOpt);
  (usersCache || []).forEach((u) => {
    const opt = document.createElement("option");
    opt.value = String(u.id || "");
    const name = String(u.nickname || u.username || u.id || "");
    const extra = [u.fullName, u.jobTitle].map((x) => String(x || "").trim()).filter(Boolean).join(" | ");
    opt.textContent = extra ? `${name} (${extra})` : name;
    leaveTplTargetUserEl.appendChild(opt);
  });
  if (Array.from(leaveTplTargetUserEl.options).some((o) => o.value === prev)) leaveTplTargetUserEl.value = prev;
}

function renderLeaveTemplateTargetHint() {
  if (!leaveTplTargetHintEl) return;
  const uid = getLeaveTplTargetUserId();
  if (!uid) {
    leaveTplTargetHintEl.textContent = "Editing global template (default for all users).";
    return;
  }
  const target = getLeaveTemplateTargetUser();
  const override = findLeaveTemplateOverride(uid);
  const targetName = String((target && (target.nickname || target.username)) || uid);
  leaveTplTargetHintEl.textContent = override
    ? `Editing personal override for ${targetName}.`
    : `Previewing global template for ${targetName}. Changes will create personal override.`;
}

function syncLeaveTemplateSelectedFieldControls() {
  const display = getLeaveTemplateDisplayProfile();
  const fields = Array.isArray(display.fields) ? display.fields : [];
  if (leaveTemplateSelectedFieldIdx >= fields.length) leaveTemplateSelectedFieldIdx = fields.length - 1;
  if (leaveTemplateSelectedFieldIdx < 0 || !fields.length) {
    leaveTemplateSelectedFieldIdx = -1;
    if (leaveTplFieldInfoEl) leaveTplFieldInfoEl.value = "";
    if (leaveTplFieldFontSizeEl) leaveTplFieldFontSizeEl.value = "12";
    if (leaveTplFieldFontSizeRangeEl) leaveTplFieldFontSizeRangeEl.value = "12";
    if (leaveTplRemoveFieldBtn) leaveTplRemoveFieldBtn.disabled = true;
    return;
  }
  const field = fields[leaveTemplateSelectedFieldIdx];
  const fontSizePt = Number(field.fontSizePt || 12);
  if (leaveTplFieldInfoEl) leaveTplFieldInfoEl.value = `${field.label} [${field.key}]`;
  if (leaveTplFieldFontSizeEl) leaveTplFieldFontSizeEl.value = String(fontSizePt);
  if (leaveTplFieldFontSizeRangeEl) leaveTplFieldFontSizeRangeEl.value = String(fontSizePt);
  if (leaveTplRemoveFieldBtn) leaveTplRemoveFieldBtn.disabled = false;
}

function renderLeaveTemplateEditor() {
  if (!leaveTplEditorEl || !leaveTplBgEl) return;
  const displayProfile = getLeaveTemplateDisplayProfile();
  leaveTplBgEl.src = String(displayProfile.backgroundDataUrl || "");
  leaveTplEditorEl.querySelectorAll(".leave-tpl-field").forEach((el) => el.remove());
  (displayProfile.fields || []).forEach((field, idx) => {
    const box = document.createElement("div");
    box.className = "leave-tpl-field";
    box.dataset.idx = String(idx);
    if (idx === leaveTemplateSelectedFieldIdx) box.classList.add("active");
    box.textContent = getLeaveTemplatePreviewText(field);
    box.style.position = "absolute";
    box.style.left = `${Math.max(0, Math.min(1, Number(field.x || 0))) * 100}%`;
    box.style.top = `${Math.max(0, Math.min(1, Number(field.y || 0))) * 100}%`;
    box.style.width = `${Math.max(0.005, Math.min(1, Number(field.w || 0.2))) * 100}%`;
    box.style.height = `${Math.max(0.005, Math.min(1, Number(field.h || 0.05))) * 100}%`;
    box.style.border = idx === leaveTemplateSelectedFieldIdx ? "2px solid #0f766e" : "1px dashed #0f766e";
    box.style.background = idx === leaveTemplateSelectedFieldIdx ? "rgba(15,118,110,.16)" : "rgba(15,118,110,.08)";
    box.style.color = "#0f172a";
    box.style.fontSize = `${Math.max(6, Math.min(72, Number(field.fontSizePt || 12)))}pt`;
    box.style.lineHeight = "1.1";
    box.style.padding = "2px";
    box.style.cursor = "move";
    box.style.userSelect = "none";
    box.style.whiteSpace = "pre-wrap";
    box.style.wordBreak = "break-word";
    box.addEventListener("pointerdown", (event) => {
      if (event.target && event.target.classList && event.target.classList.contains("leave-tpl-handle")) return;
      leaveTemplateSelectedFieldIdx = idx;
      const editableFields = getLeaveTemplateEditableFields();
      const editableField = editableFields[idx];
      if (!editableField) return;
      const rect = leaveTplEditorEl.getBoundingClientRect();
      leaveTemplateDrag = {
        mode: "move",
        idx,
        startX: event.clientX,
        startY: event.clientY,
        x: Number(editableField.x || 0),
        y: Number(editableField.y || 0),
        w: Number(editableField.w || 0),
        h: Number(editableField.h || 0),
        rect
      };
      syncLeaveTemplateSelectedFieldControls();
      renderLeaveTemplateTargetHint();
      box.setPointerCapture(event.pointerId);
    });
    const handle = document.createElement("div");
    handle.className = "leave-tpl-handle";
    handle.style.position = "absolute";
    handle.style.right = "0";
    handle.style.bottom = "0";
    handle.style.width = "10px";
    handle.style.height = "10px";
    handle.style.background = "#0f766e";
    handle.style.border = "1px solid #ffffff";
    handle.style.borderRadius = "2px";
    handle.style.cursor = "nwse-resize";
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      leaveTemplateSelectedFieldIdx = idx;
      const editableFields = getLeaveTemplateEditableFields();
      const editableField = editableFields[idx];
      if (!editableField) return;
      const rect = leaveTplEditorEl.getBoundingClientRect();
      leaveTemplateDrag = {
        mode: "resize",
        idx,
        startX: event.clientX,
        startY: event.clientY,
        x: Number(editableField.x || 0),
        y: Number(editableField.y || 0),
        w: Number(editableField.w || 0),
        h: Number(editableField.h || 0),
        rect
      };
      syncLeaveTemplateSelectedFieldControls();
      renderLeaveTemplateTargetHint();
      handle.setPointerCapture(event.pointerId);
    });
    box.addEventListener("dblclick", () => {
      const editableFields = getLeaveTemplateEditableFields();
      editableFields.splice(idx, 1);
      if (leaveTemplateSelectedFieldIdx >= editableFields.length) leaveTemplateSelectedFieldIdx = editableFields.length - 1;
      renderLeaveTemplateEditor();
    });
    box.appendChild(handle);
    leaveTplEditorEl.appendChild(box);
  });
  renderLeaveTemplateTargetHint();
  syncLeaveTemplateSelectedFieldControls();
}

function bindLeaveTemplateEditorDrag() {
  if (!leaveTplEditorEl) return;
  leaveTplEditorEl.addEventListener("pointermove", (event) => {
    if (!leaveTemplateDrag) return;
    const drag = leaveTemplateDrag;
    const dx = (event.clientX - drag.startX) / drag.rect.width;
    const dy = (event.clientY - drag.startY) / drag.rect.height;
    const fields = getLeaveTemplateEditableFields();
    const field = fields[drag.idx];
    if (!field) return;
    if (drag.mode === "resize") {
      field.w = Math.max(LEAVE_TPL_MIN_SIZE, Math.min(1 - drag.x, drag.w + dx));
      field.h = Math.max(LEAVE_TPL_MIN_SIZE, Math.min(1 - drag.y, drag.h + dy));
    } else {
      field.x = Math.max(0, Math.min(1 - Number(field.w || 0), drag.x + dx));
      field.y = Math.max(0, Math.min(1 - Number(field.h || 0), drag.y + dy));
    }
    renderLeaveTemplateEditor();
  });
  leaveTplEditorEl.addEventListener("pointerup", () => {
    leaveTemplateDrag = null;
  });
  leaveTplEditorEl.addEventListener("pointerleave", () => {
    leaveTemplateDrag = null;
  });
}

function addLeaveTemplateField(key, label) {
  const fields = getLeaveTemplateEditableFields();
  fields.push({
    key,
    label,
    x: 0.05,
    y: 0.05 + (fields.length * 0.06),
    w: 0.35,
    h: 0.05,
    page: 1,
    fontSizePt: 12
  });
  leaveTemplateSelectedFieldIdx = fields.length - 1;
  renderLeaveTemplateEditor();
}

async function loadLeaveTemplate() {
  try {
    const body = await api("/api/admin/leave-template", { headers: { authorization: `Bearer ${getToken()}` } });
    leaveTemplateState = normalizeLeaveTemplateState(body);
    if (!Array.isArray(leaveTemplateState.userOverrides)) leaveTemplateState.userOverrides = [];
    leaveTemplateSelectedFieldIdx = -1;
    renderLeaveTemplateTargetUsers();
    renderLeaveTemplateEditor();
    leaveTplMsg("Template loaded.", false);
  } catch (e) {
    leaveTplMsg(String(e.message || e), true);
  }
}

async function saveLeaveTemplate() {
  try {
    const body = await api("/api/admin/leave-template", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(leaveTemplateState)
    });
    leaveTemplateState = normalizeLeaveTemplateState(body);
    renderLeaveTemplateEditor();
    leaveTplMsg("Template saved.", false);
  } catch (e) {
    leaveTplMsg(String(e.message || e), true);
  }
}

function bindLeaveTemplate() {
  bindLeaveTemplateEditorDrag();
  if (leaveTplLoadBtn) leaveTplLoadBtn.onclick = () => { void loadLeaveTemplate(); };
  if (leaveTplSaveBtn) leaveTplSaveBtn.onclick = () => { void saveLeaveTemplate(); };
  if (leaveTplTargetUserEl) {
    leaveTplTargetUserEl.addEventListener("change", () => {
      leaveTemplateSelectedFieldIdx = -1;
      renderLeaveTemplateEditor();
    });
  }
  if (leaveTplResetOverrideBtn) {
    leaveTplResetOverrideBtn.onclick = () => {
      const uid = getLeaveTplTargetUserId();
      if (!uid) {
        leaveTplMsg("Select user override first.", true);
        return;
      }
      leaveTemplateState.userOverrides = (leaveTemplateState.userOverrides || []).filter((row) => String(row.userId || "") !== uid);
      leaveTemplateSelectedFieldIdx = -1;
      renderLeaveTemplateEditor();
      leaveTplMsg("User override removed (not saved yet).", false);
    };
  }
  if (leaveTplFileEl) {
    leaveTplFileEl.addEventListener("change", () => {
      const file = leaveTplFileEl.files && leaveTplFileEl.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const profile = getLeaveTemplateEditableProfile();
        if (profile) profile.backgroundDataUrl = String(reader.result || "");
        renderLeaveTemplateEditor();
      };
      reader.readAsDataURL(file);
    });
  }
  const applyFontSize = (rawValue) => {
    const size = Number(rawValue);
    if (!Number.isFinite(size)) return;
    if (leaveTemplateSelectedFieldIdx < 0) return;
    const fields = getLeaveTemplateEditableFields();
    const field = fields[leaveTemplateSelectedFieldIdx];
    if (!field) return;
    field.fontSizePt = Math.max(6, Math.min(72, size));
    renderLeaveTemplateEditor();
  };
  if (leaveTplFieldFontSizeEl) {
    leaveTplFieldFontSizeEl.addEventListener("input", () => applyFontSize(leaveTplFieldFontSizeEl.value));
    leaveTplFieldFontSizeEl.addEventListener("change", () => applyFontSize(leaveTplFieldFontSizeEl.value));
  }
  if (leaveTplFieldFontSizeRangeEl) {
    leaveTplFieldFontSizeRangeEl.addEventListener("input", () => applyFontSize(leaveTplFieldFontSizeRangeEl.value));
    leaveTplFieldFontSizeRangeEl.addEventListener("change", () => applyFontSize(leaveTplFieldFontSizeRangeEl.value));
  }
  if (leaveTplRemoveFieldBtn) {
    leaveTplRemoveFieldBtn.onclick = () => {
      if (leaveTemplateSelectedFieldIdx < 0) return;
      const fields = getLeaveTemplateEditableFields();
      if (!fields[leaveTemplateSelectedFieldIdx]) return;
      fields.splice(leaveTemplateSelectedFieldIdx, 1);
      if (leaveTemplateSelectedFieldIdx >= fields.length) leaveTemplateSelectedFieldIdx = fields.length - 1;
      renderLeaveTemplateEditor();
    };
  }
  if (leaveTplAddNameBtn) leaveTplAddNameBtn.onclick = () => addLeaveTemplateField("employee_name", "Employee Name");
  if (leaveTplAddFullNameBtn) leaveTplAddFullNameBtn.onclick = () => addLeaveTemplateField("employee_full_name", "Full Name");
  if (leaveTplAddRoleBtn) leaveTplAddRoleBtn.onclick = () => addLeaveTemplateField("employee_role", "Role");
  if (leaveTplAddWorkplaceBtn) leaveTplAddWorkplaceBtn.onclick = () => addLeaveTemplateField("employee_workplace", "Workplace");
  if (leaveTplAddJobTitleBtn) leaveTplAddJobTitleBtn.onclick = () => addLeaveTemplateField("employee_job_title", "Job Title");
  if (leaveTplAddPeriodBtn) leaveTplAddPeriodBtn.onclick = () => addLeaveTemplateField("period", "Period");
  if (leaveTplAddFromDateBtn) leaveTplAddFromDateBtn.onclick = () => addLeaveTemplateField("from_date", "From Date");
  if (leaveTplAddToDateBtn) leaveTplAddToDateBtn.onclick = () => addLeaveTemplateField("to_date", "To Date");
  if (leaveTplAddWorkingDaysBtn) leaveTplAddWorkingDaysBtn.onclick = () => addLeaveTemplateField("working_days", "Working Days");
  if (leaveTplAddReturnToWorkDateBtn) leaveTplAddReturnToWorkDateBtn.onclick = () => addLeaveTemplateField("return_to_work_date", "Return To Work Date");
  if (leaveTplAddTodayDateBtn) leaveTplAddTodayDateBtn.onclick = () => addLeaveTemplateField("today_date", "Today Date");
  if (leaveTplAddTypeBtn) leaveTplAddTypeBtn.onclick = () => addLeaveTemplateField("leave_type", "Leave Type");
  if (leaveTplAddCreatedBtn) leaveTplAddCreatedBtn.onclick = () => addLeaveTemplateField("created_at", "Created At");
}

function bindTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-btn"));
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.style.display === "none" || btn.disabled) {
        return;
      }
      const tab = btn.dataset.tab;
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));
      const pane = document.getElementById(`tab-${tab}`);
      if (pane) pane.classList.add("active");
      if (tab === "audit" && isFeatureEnabled("admin_audit") && !auditLoadedOnce) {
        void loadAudit(false);
      }
      if (tab === "notifications" && isFeatureEnabled("admin_notifications")) {
        if (!notifUsersCache.length || !notifTypesCache.length) void loadNotifSettings();
        if (!notifLoadedOnce) void loadNotifRows(false);
      }
      if (tab === "backups" && isFeatureEnabled("admin_backups") && !retentionSettingsLoadedOnce) {
        void loadRetentionSettings();
      }
      if (tab === "files" && isFeatureEnabled("admin_files") && !filesAdminLoadedOnce) {
        void loadFilesAdmin();
      }    });
  });
}

async function init() {
  const ok = await checkAccess();
  if (!ok) return;

  bindTabs();
  applyFeatureAccessToAdminTabs();
  bindAudit();
  bindOverrideModal();
  bindHolidayRules();
  bindLeaveTemplate();
  bindNotificationsAdmin();
  bindBackupsAdmin();
  bindFilesAdmin();
  document.getElementById("reloadUsers").onclick = loadUsers;
  bindCategories();

  if (saveUserOverridesBtn) saveUserOverridesBtn.onclick = saveSelectedUserOverrides;
  if (resetUserOverridesBtn) resetUserOverridesBtn.onclick = resetSelectedUserOverrides;

  await loadUsers();
  if (isFeatureEnabled("admin_roles")) await loadRoles();
  if (isFeatureEnabled("admin_categories")) await loadCategories();
  if (isFeatureEnabled("admin_holidays")) await loadHolidayRules();
  if (isFeatureEnabled("admin_leave_template")) await loadLeaveTemplate();
  if (isFeatureEnabled("admin_notifications")) await loadNotifSettings();
  void initRealtimeAutoReload();
}

window.addEventListener("online", () => {
  void initRealtimeAutoReload();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  void initRealtimeAutoReload();
});

window.addEventListener("beforeunload", () => {
  if (adminRealtimeAbortController) {
    adminRealtimeAbortController.abort();
    adminRealtimeAbortController = null;
  }
});

void init();










