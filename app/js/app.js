"use strict";

const STATE_KEY = "procal_visual_events_v1";
const CALENDAR_MODE_KEY = "procal_calendar_mode";
const UPCOMING_COLLAPSED_KEY = "procal_upcoming_collapsed";
const USER_UI_PREFS_KEY = "procal_ui_prefs_v1";
const MAIN_PANEL_KEY = "procal_main_panel";
const STICKY_LAYOUT_KEY = "procal_sticky_layout_v1";
const DAY_TIMELINE_PREFS_KEY = "procal_day_timeline_prefs_v1";
const READ_ONLY = Boolean(window.PROCAL_READ_ONLY);
const LEGACY_ABSENCE_EDIT_ENABLED = false;
const APP_VERSION = "0.9.9";

function normalizeReleaseChannel(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "dev" || raw === "development") return "dev";
  if (raw === "beta" || raw === "beta-test") return "beta";
  return "stable";
}

const RELEASE_CHANNEL = normalizeReleaseChannel(
  window.PROCAL_RELEASE_CHANNEL || (window.PROCAL_RUNTIME && window.PROCAL_RUNTIME.releaseChannel) || ""
);

function getAppBrandTitle() {
  if (RELEASE_CHANNEL === "dev") return "ProCal - Dev";
  if (RELEASE_CHANNEL === "beta") return "ProCal - Beta";
  return "ProCal";
}

function resolveRuntimePath(value) {
  const runtime = window.PROCAL_RUNTIME || {};
  return runtime && typeof runtime.resolvePath === "function"
    ? runtime.resolvePath(value)
    : value;
}
const PERSON_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#84cc16", "#f59e0b", "#fb7185", "#a855f7", "#0ea5e9", "#64748b", "#10b981"
];
const STICKY_NOTE_COLORS = [
  "#fde68a", "#fca5a5", "#fdba74", "#bef264", "#86efac",
  "#99f6e4", "#7dd3fc", "#c4b5fd", "#f9a8d4", "#d1d5db"
];
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

const monthLabel = document.getElementById("monthLabel");
const layoutEl = document.querySelector(".layout");
const appShellEl = document.querySelector(".app");
const dayPanelShell = document.querySelector(".day-panel");
const calendarPanelShell = document.querySelector(".calendar-panel");
const upcomingPanel = document.getElementById("upcomingPanel");
const sideDayHead = dayPanelShell ? dayPanelShell.querySelector(".side-day-head") : null;
const upcomingHead = upcomingPanel ? upcomingPanel.querySelector(".upcoming-head") : null;
const calendarGrid = document.getElementById("calendarGrid");
const weekdayRow = document.getElementById("weekdayRow");
const dashboardClockTime = document.getElementById("dashboardClockTime");
const dashboardClockDate = document.getElementById("dashboardClockDate");
const dashboardClockWeekday = document.getElementById("dashboardClockWeekday");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const eventForm = document.getElementById("eventForm");
const eventList = document.getElementById("eventList");
const eventListWrap = document.getElementById("eventListWrap");
const upcomingList = document.getElementById("upcomingList");
const toggleUpcomingBtn = document.getElementById("toggleUpcomingBtn");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescription = document.getElementById("eventDescription");
const eventFormDetailsTabBtn = document.getElementById("eventFormDetailsTabBtn");
const eventFormRemindersTabBtn = document.getElementById("eventFormRemindersTabBtn");
const eventFormFilesTabBtn = document.getElementById("eventFormFilesTabBtn");
const eventFormDetailsPanel = document.getElementById("eventFormDetailsPanel");
const eventFormRemindersPanel = document.getElementById("eventFormRemindersPanel");
const eventFormFilesPanel = document.getElementById("eventFormFilesPanel");
const openEventProgramModalBtn = document.getElementById("openEventProgramModalBtn");
const eventProgramModal = document.getElementById("eventProgramModal");
const closeEventProgramModalBtn = document.getElementById("closeEventProgramModalBtn");
const eventProgramInput = document.getElementById("eventProgramInput");
const eventProgramPreviewBtn = document.getElementById("eventProgramPreviewBtn");
const eventProgramClearBtn = document.getElementById("eventProgramClearBtn");
const eventProgramSummary = document.getElementById("eventProgramSummary");
const eventProgramModalSummary = document.getElementById("eventProgramModalSummary");
const eventProgramStatus = document.getElementById("eventProgramStatus");
const eventFilesFolderEnabled = document.getElementById("eventFilesFolderEnabled");
const eventFilesDetached = document.getElementById("eventFilesDetached");
const eventFilesSettingsSummary = document.getElementById("eventFilesSettingsSummary");
const eventFilesSettingsHelp = document.getElementById("eventFilesSettingsHelp");
const eventAllDay = document.getElementById("eventAllDay");
const eventTime = document.getElementById("eventTime");
const eventTimePickerBtn = document.getElementById("eventTimePickerBtn");
const eventTimeEnd = document.getElementById("eventTimeEnd");
const eventTimeEndPickerBtn = document.getElementById("eventTimeEndPickerBtn");
const eventStartTimeField = document.getElementById("eventStartTimeField");
const eventEndTimeField = document.getElementById("eventEndTimeField");
const eventStart = document.getElementById("eventStart");
const eventEnd = document.getElementById("eventEnd");
const repeatFreq = document.getElementById("repeatFreq");
const repeatEndMode = document.getElementById("repeatEndMode");
const repeatCount = document.getElementById("repeatCount");
const repeatUntil = document.getElementById("repeatUntil");
const repeatCountWrap = document.getElementById("repeatCountWrap");
const repeatUntilWrap = document.getElementById("repeatUntilWrap");
const eventReminderEnabled = document.getElementById("eventReminderEnabled");
const eventReminderSettings = document.getElementById("eventReminderSettings");
const eventReminderOffset = document.getElementById("eventReminderOffset");
const eventReminderAllDayTime = document.getElementById("eventReminderAllDayTime");
const eventReminderAllDayTimePickerBtn = document.getElementById("eventReminderAllDayTimePickerBtn");
const eventReminderRepeatWrap = document.getElementById("eventReminderRepeatWrap");
const eventReminderRepeat = document.getElementById("eventReminderRepeat");
const eventReminderRecipients = document.getElementById("eventReminderRecipients");
const eventReminderCustomPeopleWrap = document.getElementById("eventReminderCustomPeopleWrap");
const eventReminderCustomPeopleChecklist = document.getElementById("eventReminderCustomPeopleChecklist");
const eventCategory = document.getElementById("eventCategory");
const eventPeopleChecklist = document.getElementById("eventPeopleChecklist");
const eventAbsent = document.getElementById("eventAbsent");
const personForm = document.getElementById("personForm");
const personNameInput = document.getElementById("personName");
const personColorInput = document.getElementById("personColor");
const personSaveBtn = document.getElementById("personSaveBtn");
const personCancelBtn = document.getElementById("personCancelBtn");
const peopleList = document.getElementById("peopleList");
const absenceForm = document.getElementById("absenceForm");
const absencePerson = document.getElementById("absencePerson");
const absenceStart = document.getElementById("absenceStart");
const absenceEnd = document.getElementById("absenceEnd");
const dayMenu = document.getElementById("dayMenu");
const eventPreviewModal = document.getElementById("eventPreviewModal");
const eventPreviewTitle = document.getElementById("eventPreviewTitle");
const eventPreviewBody = document.getElementById("eventPreviewBody");
const eventPreviewFilesBtn = document.getElementById("eventPreviewFilesBtn");
const eventPreviewProgramBtn = document.getElementById("eventPreviewProgramBtn");
const eventPreviewAddTaskBtn = document.getElementById("eventPreviewAddTaskBtn");
const eventPreviewEditBtn = document.getElementById("eventPreviewEditBtn");
const eventPreviewDeleteBtn = document.getElementById("eventPreviewDeleteBtn");
const closeEventPreviewBtn = document.getElementById("closeEventPreviewBtn");
const notificationsBtn = document.getElementById("notificationsBtn");
const notificationsLabel = document.getElementById("notificationsLabel");
const notificationsBadge = document.getElementById("notificationsBadge");
const notificationsMenu = document.getElementById("notificationsMenu");
const notificationsTitle = document.getElementById("notificationsTitle");
const closeNotificationsBtn = document.getElementById("closeNotificationsBtn");
const notificationsUnreadFilterBtn = document.getElementById("notificationsUnreadFilterBtn");
const notificationsMarkAllBtn = document.getElementById("notificationsMarkAllBtn");
const notificationsClearBtn = document.getElementById("notificationsClearBtn");
const notificationsList = document.getElementById("notificationsList");
const chatBtn = document.getElementById("chatBtn");
const chatBtnLabel = document.getElementById("chatBtnLabel");
const chatUnreadBadge = document.getElementById("chatUnreadBadge");
const chatModal = document.getElementById("chatModal");
const chatTitle = document.getElementById("chatTitle");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatFilesBtn = document.getElementById("chatFilesBtn");
const chatSidebarTitle = document.getElementById("chatSidebarTitle");
const chatThreadList = document.getElementById("chatThreadList");
const chatThreadHeader = document.getElementById("chatThreadHeader");
const chatMessages = document.getElementById("chatMessages");
const chatScrollBottomBtn = document.getElementById("chatScrollBottomBtn");
const chatForm = document.getElementById("chatForm");
const chatFileInput = document.getElementById("chatFileInput");
const chatAttachBtn = document.getElementById("chatAttachBtn");
const chatAttachSummary = document.getElementById("chatAttachSummary");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const bugReportBtn = document.getElementById("bugReportBtn");
const mediaMonitoringBtn = document.getElementById("mediaMonitoringBtn");
const bugReportModal = document.getElementById("bugReportModal");
const bugReportTitle = document.getElementById("bugReportTitle");
const closeBugReportBtn = document.getElementById("closeBugReportBtn");
const bugReportForm = document.getElementById("bugReportForm");
const bugReportInputTitle = document.getElementById("bugReportInputTitle");
const bugReportInputDesc = document.getElementById("bugReportInputDesc");
const bugReportSubmitBtn = document.getElementById("bugReportSubmitBtn");
const bugReportMsg = document.getElementById("bugReportMsg");
const peopleMenu = document.getElementById("peopleMenu");
const settingsMenu = document.getElementById("settingsMenu");
const addEventBtn = document.getElementById("addEventBtn");
const sideAddEventBtn = document.getElementById("sideAddEventBtn");
const sideAddAbsenceBtn = document.getElementById("sideAddAbsenceBtn");
const sideAddCompBtn = document.getElementById("sideAddCompBtn");
const sideAddTaskBtn = document.getElementById("sideAddTaskBtn");
const sideDayQuickAdd = document.getElementById("sideDayQuickAdd");
const sideDayQuickAddTrigger = document.getElementById("sideDayQuickAddTrigger");
const closeMobileDayBtn = document.getElementById("closeMobileDayBtn");
const mobileDayBtn = document.getElementById("mobileDayBtn");
const mobileUpcomingBtn = document.getElementById("mobileUpcomingBtn");
const dayTimelinePanel = document.getElementById("dayTimelinePanel");
const dayTimelineDate = document.getElementById("dayTimelineDate");
const dayTimelinePrefsSummary = document.getElementById("dayTimelinePrefsSummary");
const dayTimelineContent = document.getElementById("dayTimelineContent");
const dayTimelinePrevBtn = document.getElementById("dayTimelinePrevBtn");
const dayTimelineNextBtn = document.getElementById("dayTimelineNextBtn");
const openDayTimelineSettingsBtn = document.getElementById("openDayTimelineSettingsBtn");
const dayTimelineSettingsModal = document.getElementById("dayTimelineSettingsModal");
const closeDayTimelineSettingsBtn = document.getElementById("closeDayTimelineSettingsBtn");
const timelineWorkingStart = document.getElementById("timelineWorkingStart");
const timelineWorkingStartPickerBtn = document.getElementById("timelineWorkingStartPickerBtn");
const timelineWorkingEnd = document.getElementById("timelineWorkingEnd");
const timelineWorkingEndPickerBtn = document.getElementById("timelineWorkingEndPickerBtn");
const timelineVisibleStart = document.getElementById("timelineVisibleStart");
const timelineVisibleStartPickerBtn = document.getElementById("timelineVisibleStartPickerBtn");
const timelineVisibleEnd = document.getElementById("timelineVisibleEnd");
const timelineVisibleEndPickerBtn = document.getElementById("timelineVisibleEndPickerBtn");
const timelineAutoFit = document.getElementById("timelineAutoFit");
const timePickerModal = document.getElementById("timePickerModal");
const timePickerTitle = document.getElementById("timePickerTitle");
const closeTimePickerBtn = document.getElementById("closeTimePickerBtn");
const clearTimePickerBtn = document.getElementById("clearTimePickerBtn");
const applyTimePickerBtn = document.getElementById("applyTimePickerBtn");
const timePickerListLabel = document.getElementById("timePickerListLabel");
const timePickerListSelect = document.getElementById("timePickerListSelect");
const settingsBtn = document.getElementById("settingsBtn");
const filtersBtn = document.getElementById("filtersBtn");
const calendarPanelTabBtn = document.getElementById("calendarPanelTabBtn");
const eventsPanelTabBtn = document.getElementById("eventsPanelTabBtn");
const notesToggleBtn = document.getElementById("notesToggleBtn");
const notesViewModeLabel = document.getElementById("notesViewModeLabel");
const notesViewToggle = document.getElementById("notesViewToggle");
const notesViewMonthBtn = document.getElementById("notesViewMonthBtn");
const notesViewYearBtn = document.getElementById("notesViewYearBtn");
const menuProfileBtn = document.getElementById("menuProfileBtn");
const menuGuideBtn = document.getElementById("menuGuideBtn");
const menuMobileAppBtn = document.getElementById("menuMobileAppBtn");
const themeToggle = document.getElementById("themeToggle");
const menuAdminBtn = document.getElementById("menuAdminBtn");
const menuLogoutBtn = document.getElementById("menuLogoutBtn");
const monthViewBtn = document.getElementById("monthViewBtn");
const yearViewBtn = document.getElementById("yearViewBtn");

const myViewModeSelect = document.getElementById("myViewModeSelect");
const myViewModeLabel = document.getElementById("myViewModeLabel");
const saveMyViewModeBtn = document.getElementById("saveMyViewModeBtn");
const settingsUserSection = document.getElementById("settingsUserSection");
const settingsAdminSection = document.getElementById("settingsAdminSection");
const manageHostedPasswordBtn = document.getElementById("manageHostedPasswordBtn");
const menuMsg = document.getElementById("menuMsg");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const profileMsg = document.getElementById("profileMsg");
const adminUsersWrap = document.getElementById("adminUsersWrap");
const refreshUsersBtn = document.getElementById("refreshUsersBtn");
const adminUsersList = document.getElementById("adminUsersList");
const adminUsersMsg = document.getElementById("adminUsersMsg");
const closeDayMenuBtn = document.getElementById("closeDayMenuBtn");
const closePeopleMenuBtn = document.getElementById("closePeopleMenuBtn");
const closeSettingsMenuBtn = document.getElementById("closeSettingsMenuBtn");
const profileNicknameValue = document.getElementById("profileNicknameValue");
const profileRoleValue = document.getElementById("profileRoleValue");
const profileStatusValue = document.getElementById("profileStatusValue");
const profileFullNameValue = document.getElementById("profileFullNameValue");
const profileWorkplaceValue = document.getElementById("profileWorkplaceValue");
const profileJobTitleValue = document.getElementById("profileJobTitleValue");
const profileNicknameInput = document.getElementById("profileNicknameInput");
const profileFullNameInput = document.getElementById("profileFullNameInput");
const profileWorkplaceInput = document.getElementById("profileWorkplaceInput");
const profileJobTitleInput = document.getElementById("profileJobTitleInput");
const saveMyProfileBtn = document.getElementById("saveMyProfileBtn");
const openEventFormBtn = document.getElementById("openEventFormBtn");
const openAbsenceFormBtn = document.getElementById("openAbsenceFormBtn");
const openTaskFormBtn = document.getElementById("openTaskFormBtn");
const dayActionButtons = document.getElementById("dayActionButtons");
const eventFormSection = document.getElementById("eventFormSection");
const absenceFormSection = document.getElementById("absenceFormSection");
const taskFormSection = document.getElementById("taskFormSection");
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskPersonChecklist = document.getElementById("taskPersonChecklist");
const taskCategorySelect = document.getElementById("taskCategory");
const eventTaskTitle = document.getElementById("eventTaskTitle");
const eventTaskPeopleChecklist = document.getElementById("eventTaskPeopleChecklist");
const eventTaskAddBtn = document.getElementById("eventTaskAddBtn");
const eventTaskList = document.getElementById("eventTaskList");
const toggleEventTasksBtn = document.getElementById("toggleEventTasksBtn");
const eventTasksEditorWrap = document.getElementById("eventTasksEditorWrap");
const categoriesMenu = document.getElementById("categoriesMenu");
const closeCategoriesMenuBtn = document.getElementById("closeCategoriesMenuBtn");
const categoryForm = document.getElementById("categoryForm");
const categoryNameInput = document.getElementById("categoryName");
const categoryColorInput = document.getElementById("categoryColor");
const categorySaveBtn = document.getElementById("categorySaveBtn");
const categoryCancelBtn = document.getElementById("categoryCancelBtn");
const categoriesList = document.getElementById("categoriesList");
const categoryFilterList = document.getElementById("categoryFilterList");
const peopleFilterList = document.getElementById("peopleFilterList");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const filtersMenu = document.getElementById("filtersMenu");
const closeFiltersMenuBtn = document.getElementById("closeFiltersMenuBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const langToggle = document.getElementById("langToggle");
const storageStartupMenu = document.getElementById("storageStartupMenu");
const openDataFileBtn = document.getElementById("openDataFileBtn");
const createDataFileBtn = document.getElementById("createDataFileBtn");
const useLocalOnlyBtn = document.getElementById("useLocalOnlyBtn");
const reportsBtn = document.getElementById("reportsBtn");
const leaveBtn = document.getElementById("leaveBtn");
const currentUserLeaveBtn = document.getElementById("currentUserLeaveBtn");
const filesBtn = document.getElementById("filesBtn");
const reportsMenu = document.getElementById("reportsMenu");
const closeReportsBtn = document.getElementById("closeReportsBtn");
const reportsForm = document.getElementById("reportsForm");
const reportPerson = document.getElementById("reportPerson");
const reportStart = document.getElementById("reportStart");
const reportEnd = document.getElementById("reportEnd");
const reportResults = document.getElementById("reportResults");
const saveReportPdfBtn = document.getElementById("saveReportPdfBtn");
const compensationBtn = document.getElementById("compensationBtn");
const compensationMenu = document.getElementById("compensationMenu");
const closeCompensationBtn = document.getElementById("closeCompensationBtn");
const compensationForm = document.getElementById("compensationForm");
const compPerson = document.getElementById("compPerson");
const compDate = document.getElementById("compDate");

const compKind = document.getElementById("compKind");
const compHours = document.getElementById("compHours");
const compMinutesPart = document.getElementById("compMinutesPart");
const compReason = document.getElementById("compReason");
const addCompEntryBtn = document.getElementById("addCompEntryBtn");
const compAdjustSign = document.getElementById("compAdjustSign");
const adjustCompEntryBtn = document.getElementById("adjustCompEntryBtn");
const openAdjustCompBtn = document.getElementById("openAdjustCompBtn");
const compAdjustModal = document.getElementById("compAdjustModal");
const closeCompAdjustBtn = document.getElementById("closeCompAdjustBtn");
const compAdjustForm = document.getElementById("compAdjustForm");
const compAdjustDate = document.getElementById("compAdjustDate");
const compAdjustHours = document.getElementById("compAdjustHours");
const compAdjustMinutesPart = document.getElementById("compAdjustMinutesPart");
const compAdjustReason = document.getElementById("compAdjustReason");
const compOverviewWrap = document.getElementById("compOverviewWrap");
const compOverviewList = document.getElementById("compOverviewList");
const compManageWrap = document.getElementById("compManageWrap");
const compLogModal = document.getElementById("compLogModal");
const closeCompLogBtn = document.getElementById("closeCompLogBtn");
const compLogSummary = document.getElementById("compLogSummary");
const compLogEntries = document.getElementById("compLogEntries");
const sideSelectedDateTitle = document.getElementById("sideSelectedDateTitle");
const sideDayList = document.getElementById("sideDayList");
const calendarModeSelect = document.getElementById("calendarModeSelect");
const calendarModeBadge = document.getElementById("calendarModeBadge");
const sideCalendarModeInfo = document.getElementById("sideCalendarModeInfo");
const sideCalendarModeLegend = document.getElementById("sideCalendarModeLegend");
const sideCalendarLegendShared = document.getElementById("sideCalendarLegendShared");
const sideCalendarLegendText = document.getElementById("sideCalendarLegendText");
const notesPanel = document.getElementById("notesPanel");
const eventsPanel = document.getElementById("eventsPanel");
const eventsSearchInput = document.getElementById("eventsSearchInput");
const eventsFromDate = document.getElementById("eventsFromDate");
const eventsToDate = document.getElementById("eventsToDate");
const eventsSearchClearBtn = document.getElementById("eventsSearchClearBtn");
const eventsExportOptionsBtn = document.getElementById("eventsExportOptionsBtn");
const eventsExportMenu = document.getElementById("eventsExportMenu");
const closeEventsExportBtn = document.getElementById("closeEventsExportBtn");
const eventsExportCsvBtn = document.getElementById("eventsExportCsvBtn");
const eventsExportPdfBtn = document.getElementById("eventsExportPdfBtn");
const eventsReportColumns = document.getElementById("eventsReportColumns");
const eventsRegistryHeadRow = document.getElementById("eventsRegistryHeadRow");
const eventsRegistryBody = document.getElementById("eventsRegistryBody");
const eventsRegistryCount = document.getElementById("eventsRegistryCount");
const eventsRegistryEmpty = document.getElementById("eventsRegistryEmpty");
const eventsStatsSummary = document.getElementById("eventsStatsSummary");
const eventsStatsList = document.getElementById("eventsStatsList");
const addStickyNoteBtn = document.getElementById("addStickyNoteBtn");
const stickyNoteModal = document.getElementById("stickyNoteModal");
const stickyNoteModalTitle = document.getElementById("stickyNoteModalTitle");
const closeStickyNoteBtn = document.getElementById("closeStickyNoteBtn");
const stickyNoteForm = document.getElementById("stickyNoteForm");
const stickyNoteTitleInput = document.getElementById("stickyNoteTitle");
const stickyNoteTextInput = document.getElementById("stickyNoteText");
const stickyNoteColorInput = document.getElementById("stickyNoteColor");
const stickyNotePalette = document.getElementById("stickyNotePalette");
const cancelStickyNoteBtn = document.getElementById("cancelStickyNoteBtn");
const saveStickyNoteBtn = document.getElementById("saveStickyNoteBtn");
const stickyNotesList = document.getElementById("stickyNotesList");
const notesLegendOwned = document.getElementById("notesLegendOwned");
const notesLegendShared = document.getElementById("notesLegendShared");
const stickyShareModal = document.getElementById("stickyShareModal");
const closeStickyShareBtn = document.getElementById("closeStickyShareBtn");
const stickyShareForm = document.getElementById("stickyShareForm");
const stickyShareMode = document.getElementById("stickyShareMode");
const stickySharePeopleChecklist = document.getElementById("stickySharePeopleChecklist");
const stickyShareSelectAllBtn = document.getElementById("stickyShareSelectAllBtn");
const stickyShareClearAllBtn = document.getElementById("stickyShareClearAllBtn");
const stickyShareCancelBtn = document.getElementById("stickyShareCancelBtn");
const filesModal = document.getElementById("filesModal");
const filesTitle = document.getElementById("filesTitle");
const closeFilesBtn = document.getElementById("closeFilesBtn");
const filesTreeTitle = document.getElementById("filesTreeTitle");
const filesTree = document.getElementById("filesTree");
const filesContextLabel = document.getElementById("filesContextLabel");
const filesCountLabel = document.getElementById("filesCountLabel");
const filesBreadcrumbs = document.getElementById("filesBreadcrumbs");
const filesStatus = document.getElementById("filesStatus");
const filesCapacityFill = document.getElementById("filesCapacityFill");
const filesCapacityLabel = document.getElementById("filesCapacityLabel");
const filesOperationOverlay = document.getElementById("filesOperationOverlay");
const filesBackBtn = document.getElementById("filesBackBtn");
const filesUpBtn = document.getElementById("filesUpBtn");
const filesNewFolderBtn = document.getElementById("filesNewFolderBtn");
const filesRenameFolderBtn = document.getElementById("filesRenameFolderBtn");
const filesMoveFolderBtn = document.getElementById("filesMoveFolderBtn");
const filesDeleteFolderBtn = document.getElementById("filesDeleteFolderBtn");
const filesUploadForm = document.getElementById("filesUploadForm");
const filesUploadLabel = document.getElementById("filesUploadLabel");
const filesUploadInput = document.getElementById("filesUploadInput");
const filesUploadFolderInput = document.getElementById("filesUploadFolderInput");
const filesUploadDropHint = document.getElementById("filesUploadDropHint");
const filesUploadSummary = document.getElementById("filesUploadSummary");
const filesUploadBtn = document.getElementById("filesUploadBtn");
const filesUploadFilesBtn = document.getElementById("filesUploadFilesBtn");
const filesUploadFolderBtn = document.getElementById("filesUploadFolderBtn");
const filesUploadPickerMenu = document.getElementById("filesUploadPickerMenu");
const filesUploadToggleBtn = document.getElementById("filesUploadToggleBtn");
const filesSearchInput = document.getElementById("filesSearchInput");
const filesSortSelect = document.getElementById("filesSortSelect");
const filesViewToggle = document.getElementById("filesViewToggle");
const filesViewListBtn = document.getElementById("filesViewListBtn");
const filesViewGridBtn = document.getElementById("filesViewGridBtn");
const filesViewSummary = document.getElementById("filesViewSummary");
const filesCurrentFolderLabel = document.getElementById("filesCurrentFolderLabel");
const filesCurrentFolderName = document.getElementById("filesCurrentFolderName");
const filesCurrentFolderPath = document.getElementById("filesCurrentFolderPath");
const filesCurrentFolderHint = document.getElementById("filesCurrentFolderHint");
const filesListPanel = document.getElementById("filesListPanel");
const filesList = document.getElementById("filesList");
const filesBatchActions = document.getElementById("filesBatchActions");
const filesBatchSummary = document.getElementById("filesBatchSummary");
const filesBatchDownloadBtn = document.getElementById("filesBatchDownloadBtn");
const filesBatchDeleteBtn = document.getElementById("filesBatchDeleteBtn");
const filesSelectionName = document.getElementById("filesSelectionName");
const filesSelectionMeta = document.getElementById("filesSelectionMeta");
const filesSelectionScope = document.getElementById("filesSelectionScope");
const filesSelectionPath = document.getElementById("filesSelectionPath");
const filesSelectionMime = document.getElementById("filesSelectionMime");
const filesSelectionPane = document.getElementById("filesSelectionPane");
const filesSelectionPreviewWrap = document.getElementById("filesSelectionPreviewWrap");
const filesSelectionPreviewTitle = document.getElementById("filesSelectionPreviewTitle");
const filesSelectionPreviewStatus = document.getElementById("filesSelectionPreviewStatus");
const filesSelectionPreviewImage = document.getElementById("filesSelectionPreviewImage");
const filesSelectionPreviewFrame = document.getElementById("filesSelectionPreviewFrame");
const filesSelectionPreviewText = document.getElementById("filesSelectionPreviewText");
const filesOpenEventBtn = document.getElementById("filesOpenEventBtn");
const filesOpenFolderBtn = document.getElementById("filesOpenFolderBtn");
const filesMoveFileBtn = document.getElementById("filesMoveFileBtn");
const filesPreviewBtn = document.getElementById("filesPreviewBtn");
const filesDownloadBtn = document.getElementById("filesDownloadBtn");
const filesDeleteBtn = document.getElementById("filesDeleteBtn");
const filesOperationPanel = document.getElementById("filesOperationPanel");
const filesOperationTitle = document.getElementById("filesOperationTitle");
const filesOperationCancelBtn = document.getElementById("filesOperationCancelBtn");
const filesOperationLabel = document.getElementById("filesOperationLabel");
const filesOperationInput = document.getElementById("filesOperationInput");
const filesOperationPickerWrap = document.getElementById("filesOperationPickerWrap");
const filesOperationPickerTree = document.getElementById("filesOperationPickerTree");
const filesOperationSourceLabel = document.getElementById("filesOperationSourceLabel");
const filesOperationSourceValue = document.getElementById("filesOperationSourceValue");
const filesOperationSelectionLabel = document.getElementById("filesOperationSelectionLabel");
const filesOperationSelection = document.getElementById("filesOperationSelection");
const filesOperationSelectionPath = document.getElementById("filesOperationSelectionPath");
const filesOperationHint = document.getElementById("filesOperationHint");
const filesOperationApplyBtn = document.getElementById("filesOperationApplyBtn");
const filesHeadSelect = document.getElementById("filesHeadSelect");
const filesHeadSelectLabel = document.getElementById("filesHeadSelectLabel");
const filesDownloadArchiveBtn = document.getElementById("filesDownloadArchiveBtn");
const filesContextMenu = document.getElementById("filesContextMenu");
const filesHeadSortButtons = Array.from(document.querySelectorAll("[data-files-sort-key]"));
const filePreviewModal = document.getElementById("filePreviewModal");
const filePreviewTitle = document.getElementById("filePreviewTitle");
const closeFilePreviewBtn = document.getElementById("closeFilePreviewBtn");
const filePreviewImage = document.getElementById("filePreviewImage");
const filePreviewFrame = document.getElementById("filePreviewFrame");
const filePreviewText = document.getElementById("filePreviewText");
const filePreviewFallbackText = document.getElementById("filePreviewFallbackText");
const filePreviewDownloadBtn = document.getElementById("filePreviewDownloadBtn");
const leaveQuickModal = document.getElementById("leaveQuickModal");
const leaveQuickTitle = document.getElementById("leaveQuickTitle");
const leaveQuickPaidLabel = document.getElementById("leaveQuickPaidLabel");
const leaveQuickPaidValue = document.getElementById("leaveQuickPaidValue");
const leaveQuickStudyLabel = document.getElementById("leaveQuickStudyLabel");
const leaveQuickStudyValue = document.getElementById("leaveQuickStudyValue");
const leaveQuickUnpaidLabel = document.getElementById("leaveQuickUnpaidLabel");
const leaveQuickUnpaidValue = document.getElementById("leaveQuickUnpaidValue");
const leaveQuickSickLabel = document.getElementById("leaveQuickSickLabel");
const leaveQuickSickValue = document.getElementById("leaveQuickSickValue");
const leaveQuickMonthLabel = document.getElementById("leaveQuickMonthLabel");
const leaveQuickCalendar = document.getElementById("leaveQuickCalendar");
const closeLeaveQuickBtn = document.getElementById("closeLeaveQuickBtn");
const leaveQuickPrevBtn = document.getElementById("leaveQuickPrevBtn");
const leaveQuickNextBtn = document.getElementById("leaveQuickNextBtn");
const leaveQuickRequestBtn = document.getElementById("leaveQuickRequestBtn");
const leaveRequestModal = document.getElementById("leaveRequestModal");
const leaveRequestForm = document.getElementById("leaveRequestForm");
const closeLeaveRequestBtn = document.getElementById("closeLeaveRequestBtn");
const leaveRequestTitle = document.getElementById("leaveRequestTitle");
const leaveRequestTypeLabel = document.getElementById("leaveRequestTypeLabel");
const leaveRequestType = document.getElementById("leaveRequestType");
const leaveRequestStartLabel = document.getElementById("leaveRequestStartLabel");
const leaveRequestStart = document.getElementById("leaveRequestStart");
const leaveRequestEndLabel = document.getElementById("leaveRequestEndLabel");
const leaveRequestEnd = document.getElementById("leaveRequestEnd");
const leaveRequestSourceYearWrap = document.getElementById("leaveRequestSourceYearWrap");
const leaveRequestSourceYearLabel = document.getElementById("leaveRequestSourceYearLabel");
const leaveRequestSourceYear = document.getElementById("leaveRequestSourceYear");
const leaveRequestNoteLabel = document.getElementById("leaveRequestNoteLabel");
const leaveRequestNote = document.getElementById("leaveRequestNote");
const leaveRequestSubmitBtn = document.getElementById("leaveRequestSubmitBtn");
const leaveRequestStatus = document.getElementById("leaveRequestStatus");
const connectionStatus = document.getElementById("connectionStatus");
const connectionStatusText = document.getElementById("connectionStatusText");
const syncToast = document.getElementById("syncToast");
const currentCompBalanceCard = document.getElementById("currentCompBalanceCard");
const currentCompBalanceValue = document.getElementById("currentCompBalanceValue");
const ownBalanceUser = document.getElementById("ownBalanceUser");


const now = new Date();
const todayKey = toDateKey(now);
let currentLang = readLang();
let currentTheme = readTheme();
let currentCalendarMode = normalizeCalendarMode(localStorage.getItem(CALENDAR_MODE_KEY));
let dayTimelinePrefs = readDayTimelinePrefs();
let storageMode = "local";
let activeFileHandle = null;
let fileSaveTimer = null;
let draftEventTasks = [];
let eventFormActiveTab = "details";
let remoteStateLoading = false;
let remoteStateBootstrapped = false;
let realtimeSyncTimer = null;
let realtimeUnsubscribe = null;
let realtimeConnectionStatus = "disconnected";
let realtimeSyncToastTimer = null;
let adminRealtimeRefreshTimer = null;
let stickyNotesPollTimer = null;
let peopleDirectorySyncTimer = null;
let peopleDirectorySyncInFlight = false;
let peopleDirectoryPollTimer = null;
let sharedOverlayPollTimer = null;
let lastRealtimeSignatureByMode = { personal: "", shared: "" };
let lastBootstrapSignatureByMode = { personal: "", shared: "" };
let currentUserName = "";
let currentUserId = "";
let currentUserViewMode = "tasks";
let currentUserRole = "";
let currentUserStatus = "";
let currentUserDisplayColor = "#64748b";
let currentUserCalendarTintOpacity = 10;
let currentUserFullName = "";
let currentUserWorkplace = "";
let currentUserJobTitle = "";
let currentUserHostedIdentity = false;
let currentUserPublicPortalUrl = "";
let currentUserProfileIncomplete = false;
let profileCompletionPromptShown = false;
let currentUserFeatureFlags = {};
let currentUserPermissions = new Set();
let notificationsUnreadOnly = false;
let notificationsUnreadCount = 0;
let notificationsLoadInFlight = false;
let notificationsRows = [];
let notificationsRefreshTimer = null;
let chatUnreadCount = 0;
let chatRows = [];
let chatOpen = false;
let chatActiveScope = "global";
let chatActivePeerUserId = "";
let chatMessageRows = [];
let chatOnlineUserIds = new Set();
let chatBadgePollTimer = null;
let chatOpenPollTimer = null;
let chatThreadsLoading = false;
let chatMessagesLoading = false;
let chatSending = false;
let chatMarkReadInFlight = false;
let chatAutoStickToBottom = true;
let chatRealtimeRefreshTimer = null;
let chatPendingFiles = [];

function getAndroidShellModule() {
  return window.ProCalModules && window.ProCalModules.appAndroidShell;
}

function getAndroidShellOptions() {
  return {
    windowObj: window,
    locationRef: window.location,
    historyRef: window.history,
    sessionStorageRef: sessionStorage,
    fetchImpl: fetch.bind(window),
    setTimeoutFn: window.setTimeout.bind(window),
    clearTimeoutFn: window.clearTimeout.bind(window),
    getCurrentUserId: () => currentUserId,
    ensureAccessToken,
    openNotificationsMenu,
    canChatAccess,
    openChatModal,
    selectChatThread
  };
}

function getAndroidShellBridge() {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.getAndroidShellBridge !== "function") return null;
  return mod.getAndroidShellBridge(getAndroidShellOptions());
}

function normalizeAndroidShellState(input) {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.normalizeAndroidShellState !== "function") {
    const row = input && typeof input === "object" ? input : {};
    return {
      platform: String(row.platform || "").trim().toLowerCase(),
      installationId: String(row.installationId || "").trim(),
      pushToken: String(row.pushToken || "").trim(),
      notificationPermission: String(row.notificationPermission || "").trim().toLowerCase(),
      appVersion: String(row.appVersion || "").trim()
    };
  }
  return mod.normalizeAndroidShellState(input);
}

function applyAndroidShellState(nextState) {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.applyAndroidShellState !== "function") return null;
  return mod.applyAndroidShellState(nextState, getAndroidShellOptions());
}

function clearAndroidPushRetryTimer() {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.clearAndroidPushRetryTimer !== "function") return;
  mod.clearAndroidPushRetryTimer(getAndroidShellOptions());
}

function scheduleAndroidPushRetry(delayMs = 10000) {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.scheduleAndroidPushRetry !== "function") return;
  mod.scheduleAndroidPushRetry(getAndroidShellOptions(), delayMs);
}

function refreshAndroidShellState() {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.refreshAndroidShellState !== "function") return null;
  return mod.refreshAndroidShellState(getAndroidShellOptions());
}

function maybeRequestAndroidPushPermission() {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.maybeRequestAndroidPushPermission !== "function") return;
  mod.maybeRequestAndroidPushPermission(getAndroidShellOptions());
}

async function unregisterAndroidPushDevice() {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.unregisterAndroidPushDevice !== "function") return;
  return mod.unregisterAndroidPushDevice(getAndroidShellOptions());
}

async function syncAndroidPushRegistration(force) {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.syncAndroidPushRegistration !== "function") return;
  return mod.syncAndroidPushRegistration(getAndroidShellOptions(), force);
}

function handlePushIntentFromUrl() {
  const mod = getAndroidShellModule();
  if (!mod || typeof mod.handlePushIntentFromUrl !== "function") return;
  mod.handlePushIntentFromUrl(getAndroidShellOptions());
}

const androidShellModule = getAndroidShellModule();
if (androidShellModule && typeof androidShellModule.attachShellStateListener === "function") {
  androidShellModule.attachShellStateListener(getAndroidShellOptions());
}

function getEventProgramModule() {
  return window.ProCalModules && window.ProCalModules.eventsEventProgram;
}

function getEventProgramOptions() {
  return {
    t,
    formatBytes,
    openModalElement,
    closeModalElement,
    alertFn: window.alert.bind(window),
    fetchFilesJson,
    readFileAsDataUrl,
    openFilePreviewForLocalFile,
    openFilePreviewForRemoteFile,
    fetchProtectedFileBlob,
    openBlobInNewTab,
    getEventFolderNameHintForFiles,
    getEventFilesSettingsForEvent,
    getCurrentEventKey: getCurrentEventFileKey,
    openEventProgramModalBtn,
    closeEventProgramModalBtn,
    eventProgramModal,
    eventProgramInput,
    eventProgramPreviewBtn,
    eventProgramClearBtn,
    eventProgramSummary,
    eventProgramModalSummary,
    eventProgramStatus
  };
}

function setEventProgramStatus(text, danger) {
  const mod = getEventProgramModule();
  if (!mod || typeof mod.setEventProgramStatus !== "function") return;
  mod.setEventProgramStatus(getEventProgramOptions(), text, danger);
}

function updateEventProgramSummaryUI() {
  const mod = getEventProgramModule();
  if (!mod || typeof mod.updateEventProgramSummaryUI !== "function") return;
  mod.updateEventProgramSummaryUI(getEventProgramOptions());
}

function resetEventProgramState(config) {
  const mod = getEventProgramModule();
  if (!mod || typeof mod.resetEventProgramState !== "function") return;
  mod.resetEventProgramState(getEventProgramOptions(), config);
}

async function loadEventProgramForEvent(eventKey, options) {
  const mod = getEventProgramModule();
  if (!mod || typeof mod.loadEventProgramForEvent !== "function") return;
  return mod.loadEventProgramForEvent(getEventProgramOptions(), eventKey, options);
}

async function syncEventProgramForEvent(eventKey) {
  const mod = getEventProgramModule();
  if (!mod || typeof mod.syncEventProgramForEvent !== "function") return true;
  return mod.syncEventProgramForEvent(getEventProgramOptions(), eventKey);
}

async function previewCurrentEventProgram() {
  const mod = getEventProgramModule();
  if (!mod || typeof mod.previewCurrentEventProgram !== "function") return;
  return mod.previewCurrentEventProgram(getEventProgramOptions());
}

const eventProgramModule = getEventProgramModule();
if (eventProgramModule && typeof eventProgramModule.attachEventProgramHandlers === "function") {
  eventProgramModule.attachEventProgramHandlers(getEventProgramOptions());
}

function getFilesPreviewModule() {
  return window.ProCalModules && window.ProCalModules.filesPreview;
}

function getFilesPreviewOptions() {
  return {
    windowObj: window,
    documentRef: document,
    fetchImpl: fetch.bind(window),
    ensureAccessToken,
    t,
    setFilesStatus,
    filePreviewModal,
    closeFilePreviewBtn,
    filePreviewTitle,
    filePreviewImage,
    filePreviewFrame,
    filePreviewText,
    filePreviewFallbackText,
    filePreviewDownloadBtn
  };
}

function closeFilePreviewModal() {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.closeFilePreviewModal !== "function") return;
  mod.closeFilePreviewModal(getFilesPreviewOptions());
}

async function downloadProtectedFile(fileId, suggestedName) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.downloadProtectedFile !== "function") throw new Error("preview-module");
  return mod.downloadProtectedFile(getFilesPreviewOptions(), fileId, suggestedName);
}

async function downloadBackupFile(fileName) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.downloadBackupFile !== "function") throw new Error("preview-module");
  return mod.downloadBackupFile(getFilesPreviewOptions(), fileName);
}

async function fetchProtectedFileBlob(fileId) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.fetchProtectedFileBlob !== "function") throw new Error("preview-module");
  return mod.fetchProtectedFileBlob(getFilesPreviewOptions(), fileId);
}

async function fetchBackupFileBlob(fileName) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.fetchBackupFileBlob !== "function") throw new Error("preview-module");
  return mod.fetchBackupFileBlob(getFilesPreviewOptions(), fileName);
}

async function openFilePreviewForRemoteFile(row) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.openFilePreviewForRemoteFile !== "function") return;
  return mod.openFilePreviewForRemoteFile(getFilesPreviewOptions(), row);
}

async function openFilePreviewForBackupFile(fileName) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.openFilePreviewForBackupFile !== "function") return;
  return mod.openFilePreviewForBackupFile(getFilesPreviewOptions(), fileName);
}

async function openFilePreviewForLocalFile(file) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.openFilePreviewForLocalFile !== "function") return;
  return mod.openFilePreviewForLocalFile(getFilesPreviewOptions(), file);
}

function openBlobInNewTab(blob, fallbackFileName) {
  const mod = getFilesPreviewModule();
  if (!mod || typeof mod.openBlobInNewTab !== "function") return false;
  return mod.openBlobInNewTab(getFilesPreviewOptions(), blob, fallbackFileName);
}

const filesPreviewModule = getFilesPreviewModule();
if (filesPreviewModule && typeof filesPreviewModule.attachFilePreviewHandlers === "function") {
  filesPreviewModule.attachFilePreviewHandlers(getFilesPreviewOptions());
}

const FILES_VIEW_STORAGE_KEY = "procal.files.view";

function loadFilesExplorerViewMode() {
  try {
    const raw = String(window.localStorage.getItem(FILES_VIEW_STORAGE_KEY) || "").trim().toLowerCase();
    return raw === "grid" ? "grid" : "list";
  } catch (_) {
    return "list";
  }
}

function saveFilesExplorerViewMode(view) {
  try {
    window.localStorage.setItem(FILES_VIEW_STORAGE_KEY, view === "grid" ? "grid" : "list");
  } catch (_) {
    // no-op
  }
}

let filesModalContext = {
  mode: "chat",
  eventKey: "",
  chatScope: "global",
  chatPeerUserId: "",
  canUpload: false,
  canCreateFolder: false,
  currentPath: "",
  breadcrumbs: []
};
let filesRows = [];
let filesVisibleRows = [];
let filesSelectedId = "";
let filesBatchSelection = new Set();
let filesOperationState = null;
let filesOperationSubmitting = false;
let filesOperationTreeExpanded = new Set();
let filesBatchBusy = false;
let filesInlineRenameState = null;
let filesExplorerState = {
  search: "",
  sort: "modified_desc",
  dragDepth: 0,
  view: loadFilesExplorerViewMode()
};
let filesSelectionPreviewObjectUrl = "";
let filesSelectionPreviewKey = "";
let filesSelectionPreviewPendingKey = "";
let filesSelectionPreviewRequestId = 0;
let filesContextMenuOpen = false;
let filesUploadExpanded = false;
let filesUploadPickerMenuOpen = false;
let filesHistoryStack = [];
let filesHistoryIndex = -1;
let filesLastActivatedRowId = "";
let filesLastActivatedAt = 0;
let filesDragState = null;
let filesDropTargetKey = "";
const FILES_TREE_ROOTS = ["events", "chat", "shared"];
let filesTreeHomeExpanded = true;
let filesTreeExpanded = new Set();
let filesTreeCache = new Map();
let filesTreeLoadingKeys = new Set();
let currentCompBalanceMinutes = null;
let compEntriesShowAll = false;
let currentCompLogPersonId = "";
let currentCompLogPersonName = "";
let currentCompLogPersonColor = "#64748b";
let adminUsersCache = [];
let peopleDirectoryUsers = [];
let dayTimelineRefreshTimer = null;
if (window.dataProvider && typeof window.dataProvider.getCalendarMode === "function") {
  currentCalendarMode = normalizeCalendarMode(window.dataProvider.getCalendarMode());
  if (typeof window.dataProvider.setCalendarMode === "function") {
    window.dataProvider.setCalendarMode(currentCalendarMode);
  }
}

const I18N = {
  en: {
    subtitle: "Shared calendar and task planner",
    addEvent: "Add Event",
    monthView: "Month",
    yearView: "Year",
    manageCategories: "Manage Categories",
    managePeople: "Manage People",
    prev: "Prev",
    next: "Next",
    today: "Today",
    upcomingTitle: "Next 10 Items",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    selectDay: "Select a day",
    close: "Close",
    cancel: "Cancel",
    title: "Title",
    description: "Description",
    titlePlaceholder: "Design review",
    descriptionPlaceholder: "Details...",
    time: "Time",
    eventStartBlock: "Start",
    eventEndBlock: "End",
    startTime: "Start time",
    endTime: "End time",
    allDay: "All day",
    startDate: "Start date",
    endDate: "End date",
    dayTimeline: "Day timeline",
    dayTimelineSettings: "Settings",
    dayTimelineSettingsTitle: "Timeline settings",
    timePickerTitle: "Choose time",
    timePickerHours: "Hours",
    timePickerMinutes: "Minutes",
    timePickerClear: "Clear",
    timePickerApply: "Apply",
    timelineSelectDay: "Select a day to see the timeline.",
    timelineNoEvents: "No events for this day.",
    timelineWorkingStart: "Working day from",
    timelineWorkingEnd: "Working day to",
    timelineVisibleStart: "Visible from",
    timelineVisibleEnd: "Visible to",
    timelineAutoFit: "Auto-fit events",
    timelineVisibleRange: "Visible window",
    timelineWorkingRange: "Working hours",
    timelineUnavailable: "Timeline is unavailable.",
    timelinePrevDay: "Previous day",
    timelineNextDay: "Next day",
    repeat: "Repeat",
    repeatEnds: "Repeat ends",
    repeatNone: "No repeat",
    repeatDaily: "Daily",
    repeatWeekly: "Weekly",
    repeatMonthly: "Monthly",
    repeatYearly: "Yearly",
    repeatForever: "Never",
    repeatCount: "After X times",
    repeatUntil: "On date",
    repeatCountLabel: "Count",
    repeatUntilLabel: "Until date",
    eventFormRemindersTab: "Reminders",
    eventReminderEnabled: "Enable reminders",
    eventReminderOffset: "Remind before start",
    eventReminderAtStart: "At start time",
    eventReminder5Min: "5 minutes before",
    eventReminder10Min: "10 minutes before",
    eventReminder15Min: "15 minutes before",
    eventReminder30Min: "30 minutes before",
    eventReminder1Hour: "1 hour before",
    eventReminder1Day: "1 day before",
    eventReminder1Week: "1 week before",
    eventReminder1Month: "1 month before",
    eventReminderAllDayTime: "All-day reminder time",
    eventReminderRepeat: "For repeating events",
    eventReminderEveryOccurrence: "Every occurrence",
    eventReminderFirstOnly: "Only first occurrence",
    eventReminderRecipients: "Notify",
    eventReminderParticipantsTasks: "Participants and task assignees",
    eventReminderParticipants: "Participants only",
    eventReminderTaskAssignees: "Task assignees only",
    eventReminderAll: "Everyone",
    eventReminderCustom: "Choose now",
    eventReminderCustomPeople: "Recipients",
    color: "Color",
    category: "Category",
    colorSun: "Sun",
    colorSea: "Sea",
    colorForest: "Forest",
    colorRose: "Rose",
    peopleParticipants: "People (participants)",
    absentPeople: "Absent people",
    addEventSubmit: "Add event",
    saveEvent: "Save event",
    addAbsenceTitle: "Add Absence",
    openAbsence: "Add Absence",
    person: "Person",
    note: "Note",
    absencePlaceholder: "Vacation / Sick leave",
    addAbsenceSubmit: "Add absence",
    categoriesTitle: "Categories",
    addCategory: "Add category",
    categoryPlaceholder: "Category name",
    filtersTitle: "Filters",
    filterCategories: "Categories",
    filterPeople: "People",
    clearFilters: "Clear Filters",
    noCategories: "No categories.",
    eventsTitle: "Events",
    eventsRegistrySubtitle: "Search and review every event in this calendar.",
    eventsSearchLabel: "Search events",
    eventsSearchPlaceholder: "Search by title, person, category or description",
    eventsFromLabel: "From",
    eventsToLabel: "To",
    eventsExportTitle: "Report / export",
    eventsExportOptions: "Report / export",
    eventsReportColumnsTitle: "Report columns",
    eventsReportColumnsHint: "Choose what to include in the report table, CSV and PDF.",
    eventsRegistryCount: "{count} of {total} events",
    eventsRegistryNoResults: "No events match this search.",
    eventsStatsTitle: "Statistics",
    eventsStatsSummary: "{count} events in {categories} categories",
    eventsStatsEmpty: "No statistics for this filter.",
    eventsCategoryStat: "{count} events in {category}",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    openEvent: "Open event",
    untitledEvent: "Untitled event",
    clear: "Clear",
    date: "Date",
    actions: "Actions",
    peopleTitle: "People",
    noUpcoming: "No upcoming items.",
    noUpcomingHint: "New events, absences and tasks will show up here.",
    noDaySelected: "No day selected.",
    noEvents: "No events yet.",
    noEventsForDay: "Nothing planned for this day.",
    noEventsForDayHint: "Use Add event, Add task or Compensations to plan the day.",
    unknown: "Unknown",
    absentVerb: "absent",
    anyTime: "Any time",
    to: "to",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    addPerson: "Add person",
    personPlaceholder: "Add person name",
    noPeopleAdded: "No people added.",
    noPeopleYet: "No people yet",
    personAbsentInRange: "Absent in selected period",
    absentCount: "absent",
    peoplePrefix: "People",
    absentPrefix: "Absent",
    noAbsentInRange: "No absences in selected period",
    importFailed: "Import failed. Please select a valid ProCal JSON backup.",
    modeViewOnly: "Mode: View only",
    modeEdit: "Mode: Edit",
    lastChange: "Last change",
    never: "never",
    addTask: "Add Task",
    task: "Task",
    eventTasks: "Event tasks",
    sectionEvents: "Events",
    sectionAbsences: "Absences",
    sectionTasks: "Tasks",
    completedTasks: "Completed tasks",
    manageEventTasks: "Manage Event Tasks",
    reports: "Reports",
    mediaMonitoring: "Media",
    leave: "Leave",
    leaveAvailableTitle: "My leave",
    leaveAvailablePaid: "Paid leave left",
    leaveAvailableStudy: "Study leave left",
    leaveUsedUnpaid: "Unpaid used",
    leaveUsedSick: "Sick used",
    leaveAvailableDays: "days",
    requestAbsence: "Request absence",
    sourceYear: "Source year",
    submit: "Submit",
    leaveTypePaid: "Paid leave",
    leaveTypeSick: "Sick leave",
    leaveTypeUnpaid: "Unpaid leave",
    leaveTypeStudy: "Study leave",
    leaveRequestSubmitted: "Absence request submitted.",
    from: "From",
    toLabel: "To",
    generateReport: "Generate report",
    savePdf: "Save PDF",
    taskTitlePlaceholder: "Task title",
    noCategory: "No category",
    periodAbsent: "Period - absent",
    tasksWithoutEvent: "Tasks without event",
    logout: "Logout",
    versionLabel: "Version",
    userLabel: "User",
    nicknameLabel: "Nickname",
    roleLabel: "Role",
    selectedDay: "Selected day",
    eventOverview: "Event overview",
    previewDetails: "Details",
    noDetailsToShow: "No details to show.",
    quickEventShort: "Event",
    quickTaskShort: "Task",
    quickAbsenceShort: "A",
    menuLabel: "Menu",
    profile: "Profile",
    userGuide: "User guide",
    mobileApp: "Mobile app",
    quickActions: "Quick actions",
    openAdminPanel: "Open admin panel",
    darkMode: "Dark mode",
    switchToMonthView: "Switch to month view",
    switchToYearView: "Switch to year view",
    language: "Language",
    myViewMode: "My view mode",
    saveMyViewMode: "Save my view mode",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    changePassword: "Change password",    statusLabel: "Status",
    fullNameLabel: "Full name",
    workplaceLabel: "Workplace",
    jobTitleLabel: "Job title",
    calendarLabel: "Calendar",
    personalCalendar: "Personal",
    sharedCalendar: "Shared",
    online: "Online",
    offline: "Offline",
    externalUpdateNotice: "Data updated by another user.",
    sessionChangedNotice: "Session updated. New permissions/profile applied.",
    compensations: "Compensations",
    compType: "Type",
    compMinutes: "Duration (h/min)",
    compReason: "Reason",
    compAddEntry: "Add entry",
    compAdjustSignLabel: "Adjust target sign",
    compAdjustPositive: "Positive (+)",
    compAdjustNegative: "Negative (-)",
    compAdjustBtn: "Adjust",
    compAdjustOpen: "Adjust...",
    compAdjustTitle: "Adjust compensation",
    compLoad: "Load",
    compDate: "Date",
    compBalance: "Balance",
    compNoEntries: "No compensation entries for selected day.",
    compOverviewTitle: "Team compensations",
    compViewLog: "Log",
    compLogTitle: "Compensation log",
    ownBalanceCaption: "My compensation balance",
    quickCompShort: "Compensation",
    compManageMissing: "You do not have permission to add entries.",
    compBalanceShort: "Balance",
    notesToggle: "Notes",
    calendarToggle: "Calendar",
    forDay: "For day",
    notesTitle: "Notes",
    addNote: "New note",
    saveNote: "Save note",
    shareWithStaff: "Share with staff",
    noteTitle: "Title",
    noteDescription: "Description",
    noteColor: "Color",
    noNotes: "No notes yet.",
    noteMenu: "Actions",
    noteShare: "Share",
    noteShareTitle: "Share note",
    noteShareMode: "Mode",
    noteShareRecipients: "Recipients",
    noteShareCopy: "Share copy",
    noteShareSyncReadonly: "Share synchronized (read-only)",
    noteShareSyncEdit: "Share synchronized (editable)",
    noteShareSend: "Send note",
    noteShareSubmit: "Apply",
    noteSelectAll: "All",
    noteClearAll: "Clear",
    noteSharedReadonly: "Shared: read-only",
    noteSharedEditable: "Shared: editable",
    myNotes: "My notes",
    sharedWithMe: "Shared with me",
    noteOwnerLabel: "Owner",
    noteSharedWith: "Shared with",
    noteSharedReadonlyWith: "Shared (read-only) with",
    noteSharedEditableWith: "Shared (editable) with",
    notesLegendOwned: "Owned",
    notesLegendShared: "Shared with me",
    noteShareOwnerOnly: "Only owner can share",
    notifications: "Notifications",
    notificationsUnreadOnly: "Unread only",
    notificationsAll: "All",
    notificationsMarkAll: "Mark all read",
    notificationsClear: "Clear list",
    notificationsActor: "By",
    notificationsActorMe: "you",
    notificationsEmpty: "No notifications.",
    notificationsNow: "now",
    notificationsRead: "Read",
    chat: "Chat",
    chatTitle: "Chat",
    chatConversations: "Conversations",
    chatGlobal: "All chat",
    chatTypeMessage: "Type a message...",
    chatAttach: "Attach files",
    chatNoFiles: "No files selected.",
    chatFilesSelected: "files selected",
    chatSend: "Send",
    chatScrollLatest: "Scroll to latest",
    chatNoMessages: "No messages yet.",
    chatSelectThread: "Select a conversation",
    chatYou: "you",
    files: "Files",
    program: "Program",
    filesEventFiles: "Event files",
    filesProgram: "Program",
    filesChat: "Chat files",
    filesBackups: "Backups",
    filesShared: "Shared",
    filesTreeTitle: "Realm files",
    filesRootHome: "Home",
    filesRootEvents: "Events",
    filesRootChat: "Chat",
    filesRootBackups: "Backups",
    filesRootShared: "Shared",
    filesChatThread: "Chat thread files",
    filesChoose: "Choose files",
    filesChooseProgram: "Choose program file",
    filesUpload: "Upload",
    filesUploadFolder: "Upload folder",
    filesChooseFiles: "Choose files",
    filesChooseFolder: "Choose folder",
    filesUploadDropHint: "Drop files or folders here, or choose files to upload.",
    filesUploadSelectionEmpty: "No files selected.",
    filesUploadSelectionSingle: "Selected: {name} ({size})",
    filesUploadSelectionMultiple: "{count} files selected ({size}).",
    filesFolderUploadUnavailable: "Folder upload is available only where subfolders are allowed.",
    filesUploadingProgress: "Uploading {current} of {total}: {name}",
    filesFolderUploaded: "Folder uploaded: {count} files.",
    filesFolderLabel: "Folder",
    filesSearchLabel: "Search",
    filesSearchPlaceholder: "Search current folder",
    filesSortLabel: "Sort",
    filesSortModifiedDesc: "Newest first",
    filesSortModifiedAsc: "Oldest first",
    filesSortNameAsc: "Name A-Z",
    filesSortNameDesc: "Name Z-A",
    filesSortTypeAsc: "Type A-Z",
    filesSortTypeDesc: "Type Z-A",
    filesSortSizeAsc: "Smallest first",
    filesSortSizeDesc: "Largest first",
    filesViewSummaryAll: "Showing {count} items.",
    filesViewSummaryFiltered: "Showing {visible} of {total} items.",
    filesCurrentFolderLabel: "Current folder",
    filesCurrentFolderHint: "Double-click opens. Drag to move. Right-click for actions.",
    filesViewAria: "Explorer view",
    filesViewList: "List",
    filesViewGrid: "Tiles",
    filesBack: "Back",
    filesShowUpload: "Show upload",
    filesHideUpload: "Hide upload",
    filesSearchEmpty: "No items match this search.",
    filesSearchEmptyTitle: "No items match this search.",
    filesSearchEmptyHint: "Clear the search or try a different term.",
    filesSelectionScopeLabel: "Type",
    filesSelectionPathLabel: "Path",
    filesSelectionMimeLabel: "Format",
    filesSelectionPreviewTitle: "Quick preview",
    filesSelectionPreviewIdle: "Select a file to preview.",
    filesSelectionPreviewLoading: "Loading preview...",
    filesSelectionPreviewFolder: "Folders do not have inline preview.",
    filesSelectionPreviewUnavailable: "Inline preview is not available for this file type.",
    filesSelectionPreviewTextLarge: "Text preview is too large to render inline. Use Preview or Download.",
    filesSelectionPreviewError: "Failed to load inline preview.",
    filesMoreActions: "More actions",
    filesCopyPath: "Copy path",
    filesPathCopied: "Path copied.",
    filesPathCopyFailed: "Failed to copy path.",
    filesUp: "Up",
    filesNewFolder: "New folder",
    filesRenameFolder: "Rename folder",
    filesMoveFolder: "Move folder",
    filesDeleteFolder: "Delete folder",
    filesOpenEvent: "Open event",
    filesOpenEventUnavailable: "This folder is not linked to an active event.",
    filesMoveFile: "Move",
    filesDownloadArchive: "Download my archive",
    filesUploadProgram: "Upload program",
    filesUploaded: "Files uploaded.",
    filesLoading: "Loading files...",
    filesUploading: "Uploading files...",
    filesArchivePreparing: "Preparing archive...",
    filesArchiveReady: "Archive downloaded.",
    filesArchiveFailed: "Failed to download archive.",
    filesCapacityFormat: "{used} of {limit} used",
    filesEmpty: "No files.",
    filesEmptyTitle: "This folder is empty.",
    filesEmptyHint: "Upload files or create a folder to get started.",
    filesEmptyHintReadOnly: "There is nothing in this folder yet.",
    filesClearSearch: "Clear search",
    filesDownload: "Download",
    filesLoadFailed: "Failed to load files.",
    filesUploadFailed: "File upload failed.",
    filesDownloadFailed: "File download failed.",
    filesDeleteFailed: "File delete failed.",
    filesFolderCreateFailed: "Folder create failed.",
    filesFolderUpdateFailed: "Folder update failed.",
    filesFolderDeleteFailed: "Folder delete failed.",
    filesFileMoveFailed: "File move failed.",
    filesFileMoved: "File moved.",
    filesFolderCreated: "Folder created.",
    filesFolderUpdated: "Folder updated.",
    filesFolderDeleted: "Folder deleted.",
    filesRefresh: "Refresh",
    filesFolderNamePrompt: "Enter folder name:",
    filesFolderRenamePrompt: "Enter new folder name:",
    filesFolderMovePrompt: "Enter destination folder path (relative):",
    filesFileMovePrompt: "Enter destination folder path (relative):",
    filesFolderLocked: "This folder is locked.",
    filesDeleteFolderConfirmEmpty: "Delete folder \"{name}\"?",
    filesDeleteFolderConfirmWithFiles: "Folder \"{name}\" contains {count} file(s). Delete it anyway?",
    filesDeleteFolderConfirmFallback: "Delete folder \"{name}\"? (Unable to verify file count.)",
    filesEventDeletedSuffix: "deleted from calendar",
    filesFolderNotSelected: "Select a folder first.",
    filesOpenFolder: "Open folder",
    filesOperationCancel: "Cancel",
    filesOperationApply: "Apply",
    filesOperationMoveHere: "Move here",
    filesOperationValue: "Value",
    filesOperationDestination: "Destination folder",
    filesOperationSourceLabel: "Moving",
    filesOperationSelectionLabel: "Destination",
    filesOperationCreateTitle: "Create folder",
    filesOperationRenameTitle: "Rename folder",
    filesOperationMoveFolderTitle: "Move folder",
    filesOperationMoveFileTitle: "Move file",
    filesOperationCreateHint: "Type the new folder name.",
    filesOperationRenameHint: "Type the new folder name.",
    filesOperationMoveFolderHint: "Choose destination folder from the list below.",
    filesOperationMoveFileHint: "Choose destination folder from the list below.",
    filesOperationApplying: "Working...",
    filesOperationMissingValue: "Enter a value first.",
    filesOperationMissingDestination: "Choose destination folder first.",
    filesOperationInvalidDestination: "Choose a different destination folder.",
    filesOperationPickerRoot: "Root folder (/)",
    filesOperationPickerEmpty: "No destination folders are available here yet.",
    filesOperationSelectionEmpty: "No destination selected.",
    filesOperationSelectionValue: "Destination: {path}",
    filesEventMissing: "Select an event first.",
    filesCountLabel: "items",
    filesHeadName: "Name",
    filesHeadType: "Type",
    filesHeadModified: "Modified",
    filesHeadSize: "Size",
    filesHeadSelect: "Select",
    filesSelectHint: "Select a file to preview or download.",
    filesNoSelection: "No file selected.",
    filesBatchDownload: "Download selected",
    filesBatchDelete: "Delete selected",
    filesBatchEmpty: "No items selected for batch actions.",
    filesBatchSelected: "{count} selected item(s).",
    filesBatchDeleteConfirm: "Delete selected items?",
    filesBatchDownloadDone: "Downloaded {done} of {total} selected items.",
    filesBatchDownloadPartial: "Downloaded {done} of {total} selected items. Some downloads failed.",
    filesBatchDownloadFailed: "Selected items could not be downloaded.",
    filesBatchDeleteDone: "Deleted {done} of {total} selected items.",
    filesBatchDeletePartial: "Deleted {done} of {total} selected items. Some deletes failed.",
    filesBatchDeleteFailed: "Selected items could not be deleted.",
    filesPreviewPopupBlocked: "Popup blocked. Allow popups to open preview in a new tab.",
    filesPreview: "Preview",
    filePreviewTitle: "File preview",
    filePreviewUnavailable: "Preview is not available for this file type.",
    eventProgramLabel: "Program file (PDF)",
    eventProgramManage: "Manage program",
    eventProgramInlineLabel: "Program (PDF)",
    eventProgramModalTitle: "Program for this event",
    eventProgramHelp: "Attach one PDF file. It will open from the event preview.",
    eventProgramPreview: "Preview program",
    eventProgramClear: "Clear program",
    eventProgramNone: "No program selected.",
    eventProgramCurrent: "Current program",
    eventProgramPending: "Pending program",
    eventProgramWillRemove: "Program will be removed on save.",
    eventProgramLoaded: "Program loaded.",
    eventProgramSaved: "Program saved.",
    eventProgramRemoved: "Program removed.",
    eventProgramLoadFailed: "Failed to load program.",
    eventProgramSaveFailed: "Failed to save program.",
    eventProgramUnsupported: "Use a PDF file for program.",
    eventProgramMissing: "No program file found for this event.",
    eventFormDetailsTab: "Details",
    eventFormFilesTab: "Files",
    eventFilesFolderEnabledLabel: "Create files folder for this event",
    eventFilesDetachedLabel: "Detach event from files",
    eventFilesSettingsLinkedSummary: "Files folder stays linked to the event.",
    eventFilesSettingsDetachedSummary: "Files folder is detached. You can remove it without deleting the event.",
    eventFilesSettingsDisabledSummary: "No managed files folder will be created for this event.",
    eventFilesSettingsHelp: "Program stays system-managed. User files live in Other.",
    bugReport: "Report bug",
    bugReportTitle: "Report bug",
    bugReportFieldTitle: "Title",
    bugReportFieldDescription: "Description",
    bugReportSubmit: "Send report",
    bugReportSent: "Bug report sent.",
    bugReportFailed: "Failed to send bug report.",
    bugReportTitlePlaceholder: "Short bug title",
    bugReportDescPlaceholder: "What happened and steps to reproduce...",
    confirmDeleteEvent: "Delete this event?"
  },
  bg: {
    subtitle: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440 \u0438 \u043F\u043B\u0430\u043D\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0438",
    addEvent: "\u0414\u043E\u0431\u0430\u0432\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    monthView: "\u041C\u0435\u0441\u0435\u0446",
    yearView: "\u0413\u043E\u0434\u0438\u043D\u0430",
    manageCategories: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438",
    managePeople: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 \u0445\u043E\u0440\u0430",
    prev: "\u041D\u0430\u0437\u0430\u0434",
    next: "\u041D\u0430\u043F\u0440\u0435\u0434",
    today: "\u0414\u043D\u0435\u0441",
    upcomingTitle: "\u0421\u043B\u0435\u0434\u0432\u0430\u0449\u0438 10 \u0437\u0430\u043F\u0438\u0441\u0430",
    exportJson: "\u0415\u043A\u0441\u043F\u043E\u0440\u0442 JSON",
    importJson: "\u0418\u043C\u043F\u043E\u0440\u0442 JSON",
    selectDay: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0434\u0435\u043D",
    close: "\u0417\u0430\u0442\u0432\u043E\u0440\u0438",
    cancel: "\u041E\u0442\u043A\u0430\u0437",
    title: "\u0417\u0430\u0433\u043B\u0430\u0432\u0438\u0435",
    description: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
    titlePlaceholder: "\u0414\u0438\u0437\u0430\u0439\u043D \u0441\u0440\u0435\u0449\u0430",
    descriptionPlaceholder: "\u0414\u0435\u0442\u0430\u0439\u043B\u0438...",
    time: "\u0427\u0430\u0441",
    eventStartBlock: "\u041D\u0430\u0447\u0430\u043B\u043E",
    eventEndBlock: "\u041A\u0440\u0430\u0439",
    startTime: "\u041D\u0430\u0447\u0430\u043B\u0435\u043D \u0447\u0430\u0441",
    endTime: "\u041A\u0440\u0430\u0435\u043D \u0447\u0430\u0441",
    allDay: "\u0426\u044F\u043B \u0434\u0435\u043D",
    startDate: "\u041D\u0430\u0447\u0430\u043B\u043D\u0430 \u0434\u0430\u0442\u0430",
    endDate: "\u041A\u0440\u0430\u0439\u043D\u0430 \u0434\u0430\u0442\u0430",
    dayTimeline: "\u0414\u043D\u0435\u0432\u043D\u0430 \u0432\u0440\u0435\u043C\u0435\u0432\u0430 \u043B\u0438\u043D\u0438\u044F",
    dayTimelineSettings: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    dayTimelineSettingsTitle: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0430 \u0432\u0440\u0435\u043C\u0435\u0432\u0430\u0442\u0430 \u043B\u0438\u043D\u0438\u044F",
    timePickerTitle: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0447\u0430\u0441",
    timePickerHours: "\u0427\u0430\u0441\u043E\u0432\u0435",
    timePickerMinutes: "\u041C\u0438\u043D\u0443\u0442\u0438",
    timePickerClear: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438",
    timePickerApply: "\u041F\u0440\u0438\u043B\u043E\u0436\u0438",
    timelineSelectDay: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0434\u0435\u043D, \u0437\u0430 \u0434\u0430 \u0432\u0438\u0434\u0438\u0448 \u0432\u0440\u0435\u043C\u0435\u0432\u0430\u0442\u0430 \u043B\u0438\u043D\u0438\u044F.",
    timelineNoEvents: "\u041D\u044F\u043C\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u044F \u0437\u0430 \u0442\u043E\u0437\u0438 \u0434\u0435\u043D.",
    timelineWorkingStart: "\u0420\u0430\u0431\u043E\u0442\u0435\u043D \u0434\u0435\u043D \u043E\u0442",
    timelineWorkingEnd: "\u0420\u0430\u0431\u043E\u0442\u0435\u043D \u0434\u0435\u043D \u0434\u043E",
    timelineVisibleStart: "\u0412\u0438\u0434\u0438\u043C\u043E \u043E\u0442",
    timelineVisibleEnd: "\u0412\u0438\u0434\u0438\u043C\u043E \u0434\u043E",
    timelineAutoFit: "\u0410\u0432\u0442\u043E\u043D\u0430\u043F\u0430\u0441\u0432\u0430\u043D\u0435 \u043F\u043E \u0441\u044A\u0431\u0438\u0442\u0438\u044F",
    timelineVisibleRange: "\u0412\u0438\u0434\u0438\u043C \u043F\u0440\u043E\u0437\u043E\u0440\u0435\u0446",
    timelineWorkingRange: "\u0420\u0430\u0431\u043E\u0442\u043D\u0438 \u0447\u0430\u0441\u043E\u0432\u0435",
    timelineUnavailable: "\u0412\u0440\u0435\u043C\u0435\u0432\u0430\u0442\u0430 \u043B\u0438\u043D\u0438\u044F \u043D\u0435 \u0435 \u043D\u0430\u043B\u0438\u0447\u043D\u0430.",
    timelinePrevDay: "\u041F\u0440\u0435\u0434\u0438\u0448\u0435\u043D \u0434\u0435\u043D",
    timelineNextDay: "\u0421\u043B\u0435\u0434\u0432\u0430\u0449 \u0434\u0435\u043D",
    repeat: "\u041F\u043E\u0432\u0442\u0430\u0440\u044F\u043D\u0435",
    repeatEnds: "\u041A\u0440\u0430\u0439 \u043D\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435\u0442\u043E",
    repeatNone: "\u0411\u0435\u0437 \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435",
    repeatDaily: "\u0412\u0441\u0435\u043A\u0438 \u0434\u0435\u043D",
    repeatWeekly: "\u0412\u0441\u044F\u043A\u0430 \u0441\u0435\u0434\u043C\u0438\u0446\u0430",
    repeatMonthly: "\u0412\u0441\u0435\u043A\u0438 \u043C\u0435\u0441\u0435\u0446",
    repeatYearly: "\u0412\u0441\u044F\u043A\u0430 \u0433\u043E\u0434\u0438\u043D\u0430",
    repeatForever: "\u0411\u0435\u0437 \u043A\u0440\u0430\u0439",
    repeatCount: "\u0421\u043B\u0435\u0434 X \u043F\u044A\u0442\u0438",
    repeatUntil: "\u0414\u043E \u0434\u0430\u0442\u0430",
    repeatCountLabel: "\u0411\u0440\u043E\u0439",
    repeatUntilLabel: "\u0414\u043E \u0434\u0430\u0442\u0430",
    eventFormRemindersTab: "\u0420\u0435\u043C\u0430\u0439\u043D\u0434\u0435\u0440\u0438",
    eventReminderEnabled: "\u0412\u043A\u043B\u044E\u0447\u0438 \u0440\u0435\u043C\u0430\u0439\u043D\u0434\u0435\u0440\u0438",
    eventReminderOffset: "\u0418\u0437\u0432\u0435\u0441\u0442\u0438 \u043F\u0440\u0435\u0434\u0438 \u043D\u0430\u0447\u0430\u043B\u043E",
    eventReminderAtStart: "\u0412 \u0447\u0430\u0441\u0430 \u043D\u0430 \u043D\u0430\u0447\u0430\u043B\u043E",
    eventReminder5Min: "5 \u043C\u0438\u043D\u0443\u0442\u0438 \u043F\u0440\u0435\u0434\u0438",
    eventReminder10Min: "10 \u043C\u0438\u043D\u0443\u0442\u0438 \u043F\u0440\u0435\u0434\u0438",
    eventReminder15Min: "15 \u043C\u0438\u043D\u0443\u0442\u0438 \u043F\u0440\u0435\u0434\u0438",
    eventReminder30Min: "30 \u043C\u0438\u043D\u0443\u0442\u0438 \u043F\u0440\u0435\u0434\u0438",
    eventReminder1Hour: "1 \u0447\u0430\u0441 \u043F\u0440\u0435\u0434\u0438",
    eventReminder1Day: "1 \u0434\u0435\u043D \u043F\u0440\u0435\u0434\u0438",
    eventReminder1Week: "1 \u0441\u0435\u0434\u043C\u0438\u0446\u0430 \u043F\u0440\u0435\u0434\u0438",
    eventReminder1Month: "1 \u043C\u0435\u0441\u0435\u0446 \u043F\u0440\u0435\u0434\u0438",
    eventReminderAllDayTime: "\u0427\u0430\u0441 \u0437\u0430 \u0446\u0435\u043B\u043E\u0434\u043D\u0435\u0432\u043D\u0438",
    eventReminderRepeat: "\u041F\u0440\u0438 \u043F\u043E\u0432\u0442\u0430\u0440\u044F\u0449\u0438 \u0441\u0435 \u0441\u044A\u0431\u0438\u0442\u0438\u044F",
    eventReminderEveryOccurrence: "\u041F\u0440\u0438 \u0432\u0441\u044F\u043A\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435",
    eventReminderFirstOnly: "\u0421\u0430\u043C\u043E \u043F\u044A\u0440\u0432\u0438\u044F \u043F\u044A\u0442",
    eventReminderRecipients: "\u041A\u043E\u0439 \u0434\u0430 \u043F\u043E\u043B\u0443\u0447\u0438",
    eventReminderParticipantsTasks: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u0446\u0438 \u0438 \u0445\u043E\u0440\u0430 \u0441\u044A\u0441 \u0437\u0430\u0434\u0430\u0447\u0438",
    eventReminderParticipants: "\u0421\u0430\u043C\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u0446\u0438",
    eventReminderTaskAssignees: "\u0421\u0430\u043C\u043E \u0445\u043E\u0440\u0430 \u0441\u044A\u0441 \u0437\u0430\u0434\u0430\u0447\u0438",
    eventReminderAll: "\u0412\u0441\u0438\u0447\u043A\u0438",
    eventReminderCustom: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0441\u0435\u0433\u0430",
    eventReminderCustomPeople: "\u041F\u043E\u043B\u0443\u0447\u0430\u0442\u0435\u043B\u0438",
    color: "\u0426\u0432\u044F\u0442",
    category: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F",
    colorSun: "\u0421\u043B\u044A\u043D\u0446\u0435",
    colorSea: "\u041C\u043E\u0440\u0435",
    colorForest: "\u0413\u043E\u0440\u0430",
    colorRose: "\u0420\u043E\u0437\u0430",
    peopleParticipants: "\u0425\u043E\u0440\u0430 (\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u0446\u0438)",
    absentPeople: "\u041E\u0442\u0441\u044A\u0441\u0442\u0432\u0430\u0449\u0438 \u0445\u043E\u0440\u0430",
    addEventSubmit: "\u0414\u043E\u0431\u0430\u0432\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    saveEvent: "\u0417\u0430\u043F\u0430\u0437\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    addAbsenceTitle: "\u0414\u043E\u0431\u0430\u0432\u0438 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u0435",
    openAbsence: "\u0414\u043E\u0431\u0430\u0432\u0438 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u0435",
    person: "\u0427\u043E\u0432\u0435\u043A",
    note: "\u0411\u0435\u043B\u0435\u0436\u043A\u0430",
    absencePlaceholder: "\u041E\u0442\u043F\u0443\u0441\u043A\u0430 / \u0411\u043E\u043B\u043D\u0438\u0447\u0435\u043D",
    addAbsenceSubmit: "\u0414\u043E\u0431\u0430\u0432\u0438 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u0435",
    categoriesTitle: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438",
    addCategory: "\u0414\u043E\u0431\u0430\u0432\u0438 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F",
    categoryPlaceholder: "\u0418\u043C\u0435 \u043D\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F",
    filtersTitle: "\u0424\u0438\u043B\u0442\u0440\u0438",
    filterCategories: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438",
    filterPeople: "\u0425\u043E\u0440\u0430",
    clearFilters: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438 \u0444\u0438\u043B\u0442\u0440\u0438\u0442\u0435",
    noCategories: "\u041D\u044F\u043C\u0430 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438.",
    eventsTitle: "\u0421\u044A\u0431\u0438\u0442\u0438\u044F",
    eventsRegistrySubtitle: "Търсене и преглед на всички събития в този календар.",
    eventsSearchLabel: "Търсене на събития",
    eventsSearchPlaceholder: "Търси по заглавие, човек, категория или описание",
    eventsFromLabel: "От",
    eventsToLabel: "До",
    eventsExportTitle: "Справка / експорт",
    eventsExportOptions: "Справка / експорт",
    eventsReportColumnsTitle: "Колони в справката",
    eventsReportColumnsHint: "Избери какво да се включи в таблицата, CSV и PDF файла.",
    eventsRegistryCount: "{count} от {total} събития",
    eventsRegistryNoResults: "Няма събития по това търсене.",
    eventsStatsTitle: "Статистика",
    eventsStatsSummary: "{count} събития в {categories} категории",
    eventsStatsEmpty: "Няма статистика за този филтър.",
    eventsCategoryStat: "{count} събития в {category}",
    exportCsv: "Експорт CSV",
    exportPdf: "Експорт PDF",
    openEvent: "Отвори събитие",
    untitledEvent: "Събитие без заглавие",
    clear: "Изчисти",
    date: "Дата",
    actions: "Действия",
    peopleTitle: "\u0425\u043E\u0440\u0430",
    noUpcoming: "\u041D\u044F\u043C\u0430 \u043F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438 \u0437\u0430\u043F\u0438\u0441\u0438.",
    noUpcomingHint: "\u041D\u043E\u0432\u0438\u0442\u0435 \u0441\u044A\u0431\u0438\u0442\u0438\u044F, \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u044F \u0438 \u0437\u0430\u0434\u0430\u0447\u0438 \u0449\u0435 \u0441\u0435 \u043F\u043E\u044F\u0432\u044F\u0442 \u0442\u0443\u043A.",
    noDaySelected: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0431\u0440\u0430\u043D \u0434\u0435\u043D.",
    noEvents: "\u041D\u044F\u043C\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u044F.",
    noEventsForDay: "\u041D\u044F\u043C\u0430 \u043F\u043B\u0430\u043D\u0438\u0440\u0430\u043D\u043E \u0437\u0430 \u0442\u043E\u0437\u0438 \u0434\u0435\u043D.",
    noEventsForDayHint: "\u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 \u0431\u0443\u0442\u043E\u043D\u0438\u0442\u0435 \u0437\u0430 \u0434\u043E\u0431\u0430\u0432\u044F\u043D\u0435 \u043D\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u0435, \u0437\u0430\u0434\u0430\u0447\u0430 \u0438\u043B\u0438 \u043A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u044F.",
    unknown: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D",
    absentVerb: "\u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0430",
    anyTime: "\u0411\u0435\u0437 \u0447\u0430\u0441",
    to: "\u0434\u043E",
    delete: "\u0418\u0437\u0442\u0440\u0438\u0439",
    edit: "\u0420\u0435\u0434\u0430\u043A\u0446\u0438\u044F",
    save: "\u0417\u0430\u043F\u0430\u0437\u0438",
    addPerson: "\u0414\u043E\u0431\u0430\u0432\u0438 \u0447\u043E\u0432\u0435\u043A",
    personPlaceholder: "\u0414\u043E\u0431\u0430\u0432\u0438 \u0438\u043C\u0435",
    noPeopleAdded: "\u041D\u044F\u043C\u0430 \u0434\u043E\u0431\u0430\u0432\u0435\u043D\u0438 \u0445\u043E\u0440\u0430.",
    noPeopleYet: "\u0412\u0441\u0435 \u043E\u0449\u0435 \u043D\u044F\u043C\u0430 \u0445\u043E\u0440\u0430",
    personAbsentInRange: "\u041E\u0442\u0441\u044A\u0441\u0442\u0432\u0430 \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u044F \u043F\u0435\u0440\u0438\u043E\u0434",
    absentCount: "\u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0430\u0449\u0438",
    peoplePrefix: "\u0425\u043E\u0440\u0430",
    absentPrefix: "\u041E\u0442\u0441\u044A\u0441\u0442\u0432\u0430\u0442",
    noAbsentInRange: "\u041D\u044F\u043C\u0430 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0430\u0449\u0438 \u0437\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u044F \u043F\u0435\u0440\u0438\u043E\u0434",
    importFailed: "\u0418\u043C\u043F\u043E\u0440\u0442\u044A\u0442 \u043D\u0435 \u0431\u0435 \u0443\u0441\u043F\u0435\u0448\u0435\u043D. \u0418\u0437\u0431\u0435\u0440\u0435\u0442\u0435 \u0432\u0430\u043B\u0438\u0434\u0435\u043D JSON \u0430\u0440\u0445\u0438\u0432.",
    modeViewOnly: "\u0420\u0435\u0436\u0438\u043C: \u0421\u0430\u043C\u043E \u043F\u0440\u0435\u0433\u043B\u0435\u0434",
    modeEdit: "\u0420\u0435\u0436\u0438\u043C: \u0420\u0435\u0434\u0430\u043A\u0446\u0438\u044F",
    lastChange: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0430 \u043F\u0440\u043E\u043C\u044F\u043D\u0430",
    never: "\u043D\u0438\u043A\u043E\u0433\u0430",
    addTask: "\u0414\u043E\u0431\u0430\u0432\u0438 \u0437\u0430\u0434\u0430\u0447\u0430",
    task: "\u0417\u0430\u0434\u0430\u0447\u0430",
    eventTasks: "\u0417\u0430\u0434\u0430\u0447\u0438 \u043A\u044A\u043C \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    sectionEvents: "\u0421\u044A\u0431\u0438\u0442\u0438\u044F",
    sectionAbsences: "\u041E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u044F",
    sectionTasks: "\u0417\u0430\u0434\u0430\u0447\u0438",
    completedTasks: "\u0418\u0437\u043F\u044A\u043B\u043D\u0435\u043D\u0438 \u0437\u0430\u0434\u0430\u0447\u0438",
    manageEventTasks: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0438",
    reports: "\u041E\u0442\u0447\u0435\u0442\u0438",
    mediaMonitoring: "\u041C\u0435\u0434\u0438\u0438",
    leave: "\u041E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u044F",
    leaveAvailableTitle: "\u041C\u043E\u044F\u0442\u0430 \u043E\u0442\u043F\u0443\u0441\u043A\u0430",
    leaveAvailablePaid: "\u041E\u0441\u0442\u0430\u0432\u0430\u0449\u0430 \u043E\u0442\u043F\u0443\u0441\u043A\u0430",
    leaveAvailableStudy: "\u041E\u0441\u0442\u0430\u0432\u0430\u0449 \u0443\u0447\u0435\u0431\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A",
    leaveUsedUnpaid: "\u041F\u043E\u043B\u0437\u0432\u0430\u043D \u043D\u0435\u043F\u043B\u0430\u0442\u0435\u043D",
    leaveUsedSick: "\u041F\u043E\u043B\u0437\u0432\u0430\u043D \u0431\u043E\u043B\u043D\u0438\u0447\u0435\u043D",
    leaveAvailableDays: "\u0434\u043D\u0438",
    requestAbsence: "\u0417\u0430\u044F\u0432\u0438 \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0438\u0435",
    sourceYear: "\u0413\u043E\u0434\u0438\u043D\u0430 \u0438\u0437\u0442\u043E\u0447\u043D\u0438\u043A",
    submit: "\u0418\u0437\u043F\u0440\u0430\u0442\u0438",
    leaveTypePaid: "\u041E\u0442\u043F\u0443\u0441\u043A\u0430",
    leaveTypeSick: "\u0411\u043E\u043B\u043D\u0438\u0447\u0435\u043D",
    leaveTypeUnpaid: "\u041D\u0435\u043F\u043B\u0430\u0442\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A",
    leaveTypeStudy: "\u0423\u0447\u0435\u0431\u0435\u043D \u043E\u0442\u043F\u0443\u0441\u043A",
    leaveRequestSubmitted: "\u0417\u0430\u044F\u0432\u043A\u0430\u0442\u0430 \u0435 \u0438\u0437\u043F\u0440\u0430\u0442\u0435\u043D\u0430.",
    from: "\u041E\u0442",
    toLabel: "\u0414\u043E",
    generateReport: "\u0413\u0435\u043d\u0435\u0440\u0438\u0440\u0430\u0439 \u043e\u0442\u0447\u0435\u0442",
    savePdf: "\u0417\u0430\u043f\u0430\u0437\u0438 PDF",
    taskTitlePlaceholder: "\u0417\u0430\u0433\u043B\u0430\u0432\u0438\u0435 \u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0430",
    noCategory: "\u0411\u0435\u0437 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F",
    periodAbsent: "\u041F\u0435\u0440\u0438\u043E\u0434 - \u043E\u0442\u0441\u044A\u0441\u0442\u0432\u0430",
    tasksWithoutEvent: "\u0417\u0430\u0434\u0430\u0447\u0438 \u0431\u0435\u0437 \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    logout: "\u0418\u0437\u0445\u043E\u0434",
    versionLabel: "\u0412\u0435\u0440\u0441\u0438\u044F",
    userLabel: "\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B",
    nicknameLabel: "\u041F\u0441\u0435\u0432\u0434\u043E\u043D\u0438\u043C",
    roleLabel: "\u0420\u043E\u043B\u044F",
    selectedDay: "\u0418\u0437\u0431\u0440\u0430\u043D \u0434\u0435\u043D",
    eventOverview: "\u041F\u0440\u0435\u0433\u043B\u0435\u0434 \u043D\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    previewDetails: "\u0414\u0435\u0442\u0430\u0439\u043B\u0438",
    noDetailsToShow: "\u041D\u044F\u043C\u0430 \u0434\u0435\u0442\u0430\u0439\u043B\u0438 \u0437\u0430 \u043F\u043E\u043A\u0430\u0437\u0432\u0430\u043D\u0435.",
    quickEventShort: "\u0421\u044A\u0431\u0438\u0442\u0438\u0435",
    quickTaskShort: "\u0417\u0430\u0434\u0430\u0447\u0430",
    quickAbsenceShort: "\u041E",
    menuLabel: "\u041C\u0435\u043D\u044E",
    profile: "\u041F\u0440\u043E\u0444\u0438\u043B",
    userGuide: "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F",
    mobileApp: "\u041C\u043E\u0431\u0438\u043B\u043D\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435",
    quickActions: "\u0411\u044A\u0440\u0437\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
    openAdminPanel: "\u041E\u0442\u0432\u043E\u0440\u0438 \u0430\u0434\u043C\u0438\u043D \u043F\u0430\u043D\u0435\u043B",
    darkMode: "\u0422\u044A\u043C\u0435\u043D \u0440\u0435\u0436\u0438\u043C",
    switchToMonthView: "\u041F\u0440\u0435\u0432\u043A\u043B\u044E\u0447\u0438 \u043A\u044A\u043C \u043C\u0435\u0441\u0435\u0447\u0435\u043D \u0438\u0437\u0433\u043B\u0435\u0434",
    switchToYearView: "\u041F\u0440\u0435\u0432\u043A\u043B\u044E\u0447\u0438 \u043A\u044A\u043C \u0433\u043E\u0434\u0438\u0448\u0435\u043D \u0438\u0437\u0433\u043B\u0435\u0434",
    language: "\u0415\u0437\u0438\u043A",
    myViewMode: "\u041C\u043E\u044F\u0442 \u0438\u0437\u0433\u043B\u0435\u0434",
    saveMyViewMode: "\u0417\u0430\u043F\u0430\u0437\u0438 \u0438\u0437\u0433\u043B\u0435\u0434\u0430",
    currentPassword: "\u0422\u0435\u043A\u0443\u0449\u0430 \u043F\u0430\u0440\u043E\u043B\u0430",
    newPassword: "\u041D\u043E\u0432\u0430 \u043F\u0430\u0440\u043E\u043B\u0430",
    confirmNewPassword: "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438 \u043D\u043E\u0432\u0430 \u043F\u0430\u0440\u043E\u043B\u0430",
    changePassword: "\u0421\u043C\u0435\u043D\u0438 \u043F\u0430\u0440\u043E\u043B\u0430\u0442\u0430",    statusLabel: "\u0421\u0442\u0430\u0442\u0443\u0441",
    fullNameLabel: "\u041F\u044A\u043B\u043D\u0438 \u0438\u043C\u0435\u043D\u0430",
    workplaceLabel: "\u0420\u0430\u0431\u043E\u0442\u043D\u043E \u043C\u044F\u0441\u0442\u043E",
    jobTitleLabel: "\u0414\u043B\u044A\u0436\u043D\u043E\u0441\u0442",
    calendarLabel: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440",
    personalCalendar: "\u041B\u0438\u0447\u0435\u043D",
    sharedCalendar: "\u041E\u0431\u0449",
    online: "\u041E\u043D\u043B\u0430\u0439\u043D",
    offline: "\u041E\u0444\u043B\u0430\u0439\u043D",
    externalUpdateNotice: "\u0414\u0430\u043D\u043D\u0438\u0442\u0435 \u0441\u0430 \u043E\u0431\u043D\u043E\u0432\u0435\u043D\u0438 \u043E\u0442 \u0434\u0440\u0443\u0433 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B.",
    sessionChangedNotice: "\u0421\u0435\u0441\u0438\u044F\u0442\u0430 \u0431\u0435\u0448\u0435 \u043E\u0431\u043D\u043E\u0432\u0435\u043D\u0430. \u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438 \u0441\u0430 \u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u0440\u0430\u0432\u0430/\u043F\u0440\u043E\u0444\u0438\u043B.",
    compensations: "\u041A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u0438",
    compType: "\u0422\u0438\u043F",
    compMinutes: "\u041F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442 (\u0447/\u043C\u0438\u043D)",
    compReason: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430",
    compAddEntry: "\u0414\u043E\u0431\u0430\u0432\u0438 \u0437\u0430\u043F\u0438\u0441",
    compAdjustSignLabel: "\u0417\u043D\u0430\u043A \u043D\u0430 \u043A\u0440\u0430\u0439\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442",
    compAdjustPositive: "\u041F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u0435\u043D (+)",
    compAdjustNegative: "\u041E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u0435\u043D (-)",
    compAdjustBtn: "\u041A\u043E\u0440\u0438\u0433\u0438\u0440\u0430\u0439",
    compAdjustOpen: "\u041A\u043E\u0440\u0435\u043A\u0446\u0438\u044F...",
    compAdjustTitle: "\u041A\u043E\u0440\u0435\u043A\u0446\u0438\u044F \u043D\u0430 \u043A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u044F",
    compLoad: "\u0417\u0430\u0440\u0435\u0434\u0438",
    compDate: "\u0414\u0430\u0442\u0430",
    compBalance: "\u0411\u0430\u043B\u0430\u043D\u0441",
    compNoEntries: "\u041D\u044F\u043C\u0430 \u0437\u0430\u043F\u0438\u0441\u0438 \u0437\u0430 \u043A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u0438 \u0437\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u044F \u0434\u0435\u043D.",
    compOverviewTitle: "\u041A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u0438 \u043F\u043E \u0445\u043E\u0440\u0430",
    compViewLog: "\u041B\u043E\u0433",
    compLogTitle: "\u041B\u043E\u0433 \u043D\u0430 \u043A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u0438",
    ownBalanceCaption: "\u041C\u043E\u0439 \u0431\u0430\u043B\u0430\u043D\u0441 \u043A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u0438",
    quickCompShort: "\u041A\u043E\u043C\u043F\u0435\u043D\u0441\u0430\u0446\u0438\u044F",
    compManageMissing: "\u041D\u044F\u043C\u0430\u0448 \u043F\u0440\u0430\u0432\u0430 \u0434\u0430 \u0434\u043E\u0431\u0430\u0432\u044F\u0448 \u0437\u0430\u043F\u0438\u0441\u0438.",
    compBalanceShort: "\u0411\u0430\u043B\u0430\u043D\u0441",
    notesToggle: "\u0411\u0435\u043B\u0435\u0436\u043A\u0438",
    calendarToggle: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440",
    forDay: "\u0417\u0430 \u0434\u0435\u043D\u044F",
    notesTitle: "\u0411\u0435\u043B\u0435\u0436\u043A\u0438",
    addNote: "\u041D\u043E\u0432\u0430 \u0431\u0435\u043B\u0435\u0436\u043A\u0430",
    saveNote: "\u0417\u0430\u043F\u0430\u0437\u0438 \u0431\u0435\u043B\u0435\u0436\u043A\u0430",
    shareWithStaff: "\u0421\u043F\u043E\u0434\u0435\u043B\u0438 \u0441 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0430",
    noteTitle: "\u0417\u0430\u0433\u043B\u0430\u0432\u0438\u0435",
    noteDescription: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
    noteColor: "\u0426\u0432\u044F\u0442",
    noNotes: "\u041D\u044F\u043C\u0430 \u0431\u0435\u043B\u0435\u0436\u043A\u0438.",
    noteMenu: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
    noteShare: "\u0421\u043F\u043E\u0434\u0435\u043B\u0438",
    noteShareTitle: "\u0421\u043F\u043E\u0434\u0435\u043B\u044F\u043D\u0435 \u043D\u0430 \u0431\u0435\u043B\u0435\u0436\u043A\u0430",
    noteShareMode: "\u0420\u0435\u0436\u0438\u043C",
    noteShareRecipients: "\u041F\u043E\u043B\u0443\u0447\u0430\u0442\u0435\u043B\u0438",
    noteShareCopy: "\u0421\u043F\u043E\u0434\u0435\u043B\u0438 \u043A\u043E\u043F\u0438\u0435",
    noteShareSyncReadonly: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u0430\u043D\u043E (\u0441\u0430\u043C\u043E \u0447\u0435\u0442\u0435\u043D\u0435)",
    noteShareSyncEdit: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u0430\u043D\u043E (\u0441 \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u044F)",
    noteShareSend: "\u0418\u0437\u043F\u0440\u0430\u0442\u0438 \u0431\u0435\u043B\u0435\u0436\u043A\u0430",
    noteShareSubmit: "\u041F\u0440\u0438\u043B\u043E\u0436\u0438",
    noteSelectAll: "\u0412\u0441\u0438\u0447\u043A\u0438",
    noteClearAll: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438",
    noteSharedReadonly: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0430: \u0441\u0430\u043C\u043E \u0447\u0435\u0442\u0435\u043D\u0435",
    noteSharedEditable: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0430: \u0441 \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u044F",
    myNotes: "\u041C\u043E\u0438 \u0431\u0435\u043B\u0435\u0436\u043A\u0438",
    sharedWithMe: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0438 \u0441 \u043C\u0435\u043D",
    noteOwnerLabel: "\u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u0438\u043A",
    noteSharedWith: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0430 \u0441",
    noteSharedReadonlyWith: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0430 (\u0441\u0430\u043C\u043E \u0447\u0435\u0442\u0435\u043D\u0435) \u0441",
    noteSharedEditableWith: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0430 (\u0441 \u0440\u0435\u0434\u0430\u043A\u0446\u0438\u044F) \u0441",
    notesLegendOwned: "\u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u0438",
    notesLegendShared: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0438 \u0441 \u043C\u0435\u043D",
    noteShareOwnerOnly: "\u0421\u0430\u043C\u043E \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u0438\u043A\u044A\u0442 \u043C\u043E\u0436\u0435 \u0434\u0430 \u0441\u043F\u043E\u0434\u0435\u043B\u044F",
    notifications: "\u0418\u0437\u0432\u0435\u0441\u0442\u0438\u044F",
    notificationsUnreadOnly: "\u0421\u0430\u043C\u043E \u043D\u0435\u043F\u0440\u043E\u0447\u0435\u0442\u0435\u043D\u0438",
    notificationsAll: "\u0412\u0441\u0438\u0447\u043A\u0438",
    notificationsMarkAll: "\u041C\u0430\u0440\u043A\u0438\u0440\u0430\u0439 \u0432\u0441\u0438\u0447\u043A\u0438 \u043A\u0430\u0442\u043E \u043F\u0440\u043E\u0447\u0435\u0442\u0435\u043D\u0438",
    notificationsClear: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438 \u0441\u043F\u0438\u0441\u044A\u043A\u0430",
    notificationsActor: "\u041E\u0442",
    notificationsActorMe: "\u0432\u0438\u0435",
    notificationsEmpty: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0432\u0435\u0441\u0442\u0438\u044F.",
    notificationsNow: "\u0441\u0435\u0433\u0430",
    notificationsRead: "\u041F\u0440\u043E\u0447\u0435\u0442\u0435\u043D\u043E",
    chat: "\u0427\u0430\u0442",
    chatTitle: "\u0427\u0430\u0442",
    chatConversations: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0438",
    chatGlobal: "\u041E\u0431\u0449 \u0447\u0430\u0442",
    chatTypeMessage: "\u041D\u0430\u043F\u0438\u0448\u0438 \u0441\u044A\u043E\u0431\u0449\u0435\u043D\u0438\u0435...",
    chatAttach: "\u041F\u0440\u0438\u043A\u0430\u0447\u0438 \u0444\u0430\u0439\u043B\u0438",
    chatNoFiles: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0444\u0430\u0439\u043B\u0438.",
    chatFilesSelected: "\u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0444\u0430\u0439\u043B\u0430",
    chatSend: "\u0418\u0437\u043F\u0440\u0430\u0442\u0438",
    chatScrollLatest: "\u041A\u044A\u043C \u043D\u0430\u0439-\u043D\u043E\u0432\u0438\u0442\u0435",
    chatNoMessages: "\u041D\u044F\u043C\u0430 \u0441\u044A\u043E\u0431\u0449\u0435\u043D\u0438\u044F.",
    chatSelectThread: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440",
    chatYou: "\u0442\u0438",
    files: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435",
    program: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    filesEventFiles: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435 \u043A\u044A\u043C \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    filesProgram: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    filesChat: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435 \u043E\u0442 \u0447\u0430\u0442",
    filesBackups: "Backups",
    filesShared: "\u041E\u0431\u0449\u0438",
    filesTreeTitle: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435 \u043D\u0430 \u0440\u0435\u0439\u043B\u043C\u0430",
    filesRootHome: "\u041D\u0430\u0447\u0430\u043B\u043E",
    filesRootEvents: "\u0421\u044A\u0431\u0438\u0442\u0438\u044F",
    filesRootChat: "\u0427\u0430\u0442",
    filesRootBackups: "Backups",
    filesRootShared: "\u041E\u0431\u0449\u0438",
    filesChatThread: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435 \u0437\u0430 \u0447\u0430\u0442 \u043D\u0438\u0448\u043A\u0430",
    filesChoose: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0444\u0430\u0439\u043B\u0438",
    filesChooseProgram: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0444\u0430\u0439\u043B \u0437\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    filesUpload: "\u041A\u0430\u0447\u0438",
    filesUploadFolder: "\u041A\u0430\u0447\u0438 \u043F\u0430\u043F\u043A\u0430",
    filesChooseFiles: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0444\u0430\u0439\u043B\u0438",
    filesChooseFolder: "\u0418\u0437\u0431\u0435\u0440\u0438 \u043F\u0430\u043F\u043A\u0430",
    filesUploadDropHint: "\u041F\u0443\u0441\u043D\u0438 \u0444\u0430\u0439\u043B\u0438 \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0430 \u0442\u0443\u043A, \u0438\u043B\u0438 \u0438\u0437\u0431\u0435\u0440\u0438 \u0444\u0430\u0439\u043B\u0438 \u0437\u0430 \u043A\u0430\u0447\u0432\u0430\u043D\u0435.",
    filesUploadSelectionEmpty: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0444\u0430\u0439\u043B\u043E\u0432\u0435.",
    filesUploadSelectionSingle: "\u0418\u0437\u0431\u0440\u0430\u043D: {name} ({size})",
    filesUploadSelectionMultiple: "\u0418\u0437\u0431\u0440\u0430\u043D\u0438 \u0441\u0430 {count} \u0444\u0430\u0439\u043B\u0430 ({size}).",
    filesFolderUploadUnavailable: "\u041A\u0430\u0447\u0432\u0430\u043D\u0435 \u043D\u0430 \u043F\u0430\u043F\u043A\u0430 \u0435 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E \u0441\u0430\u043C\u043E \u0442\u0430\u043C, \u043A\u044A\u0434\u0435\u0442\u043E \u0441\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438 \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0438.",
    filesUploadingProgress: "\u041A\u0430\u0447\u0432\u0430\u043D\u0435 {current} \u043E\u0442 {total}: {name}",
    filesFolderUploaded: "\u041A\u0430\u0447\u0435\u043D\u0430 \u043F\u0430\u043F\u043A\u0430: {count} \u0444\u0430\u0439\u043B\u0430.",
    filesFolderLabel: "\u041F\u0430\u043F\u043A\u0430",
    filesSearchLabel: "\u0422\u044A\u0440\u0441\u0435\u043D\u0435",
    filesSearchPlaceholder: "\u0422\u044A\u0440\u0441\u0438 \u0432 \u0442\u0435\u043A\u0443\u0449\u0430\u0442\u0430 \u043F\u0430\u043F\u043A\u0430",
    filesSortLabel: "\u041F\u043E\u0434\u0440\u0435\u0434\u0438",
    filesSortModifiedDesc: "\u041D\u0430\u0439-\u043D\u043E\u0432\u0438 \u043F\u044A\u0440\u0432\u0438",
    filesSortModifiedAsc: "\u041D\u0430\u0439-\u0441\u0442\u0430\u0440\u0438 \u043F\u044A\u0440\u0432\u0438",
    filesSortNameAsc: "\u0418\u043C\u0435 A-Z",
    filesSortNameDesc: "\u0418\u043C\u0435 Z-A",
    filesSortTypeAsc: "\u0422\u0438\u043F A-Z",
    filesSortTypeDesc: "\u0422\u0438\u043F Z-A",
    filesSortSizeAsc: "\u041D\u0430\u0439-\u043C\u0430\u043B\u043A\u0438 \u043F\u044A\u0440\u0432\u0438",
    filesSortSizeDesc: "\u041D\u0430\u0439-\u0433\u043E\u043B\u0435\u043C\u0438 \u043F\u044A\u0440\u0432\u0438",
    filesViewSummaryAll: "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u0438 \u0441\u0430 {count} \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430.",
    filesViewSummaryFiltered: "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u0438 \u0441\u0430 {visible} \u043E\u0442 {total} \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430.",
    filesCurrentFolderLabel: "\u0422\u0435\u043A\u0443\u0449\u0430 \u043F\u0430\u043F\u043A\u0430",
    filesCurrentFolderHint: "\u0414\u0432\u043E\u0435\u043D \u043A\u043B\u0438\u043A \u043E\u0442\u0432\u0430\u0440\u044F. \u041F\u043B\u044A\u0437\u043D\u0438, \u0437\u0430 \u0434\u0430 \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0448. \u0414\u0435\u0441\u0435\u043D \u043A\u043B\u0438\u043A \u043F\u043E\u043A\u0430\u0437\u0432\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F.",
    filesViewAria: "\u0418\u0437\u0433\u043B\u0435\u0434",
    filesViewList: "\u0421\u043F\u0438\u0441\u044A\u043A",
    filesViewGrid: "\u041F\u043B\u043E\u0447\u043A\u0438",
    filesBack: "\u041D\u0430\u0437\u0430\u0434",
    filesShowUpload: "\u041F\u043E\u043A\u0430\u0436\u0438 \u043A\u0430\u0447\u0432\u0430\u043D\u0435",
    filesHideUpload: "\u0421\u043A\u0440\u0438\u0439 \u043A\u0430\u0447\u0432\u0430\u043D\u0435",
    filesSearchEmpty: "\u041D\u044F\u043C\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430\u0449\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438.",
    filesSearchEmptyTitle: "\u041D\u044F\u043C\u0430 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438 \u0437\u0430 \u0442\u043E\u0432\u0430 \u0442\u044A\u0440\u0441\u0435\u043D\u0435.",
    filesSearchEmptyHint: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438 \u0442\u044A\u0440\u0441\u0435\u043D\u0435\u0442\u043E \u0438\u043B\u0438 \u043F\u0440\u043E\u0431\u0432\u0430\u0439 \u0434\u0440\u0443\u0433\u0430 \u0434\u0443\u043C\u0430.",
    filesSelectionScopeLabel: "\u0422\u0438\u043F",
    filesSelectionPathLabel: "\u041F\u044A\u0442",
    filesSelectionMimeLabel: "\u0424\u043E\u0440\u043C\u0430\u0442",
    filesSelectionPreviewTitle: "\u0411\u044A\u0440\u0437 \u043F\u0440\u0435\u0433\u043B\u0435\u0434",
    filesSelectionPreviewIdle: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0444\u0430\u0439\u043B \u0437\u0430 \u043F\u0440\u0435\u0433\u043B\u0435\u0434.",
    filesSelectionPreviewLoading: "\u0417\u0430\u0440\u0435\u0436\u0434\u0430\u043D\u0435 \u043D\u0430 \u043F\u0440\u0435\u0433\u043B\u0435\u0434...",
    filesSelectionPreviewFolder: "\u041F\u0430\u043F\u043A\u0438\u0442\u0435 \u043D\u044F\u043C\u0430\u0442 inline preview.",
    filesSelectionPreviewUnavailable: "\u0417\u0430 \u0442\u043E\u0437\u0438 \u0442\u0438\u043F \u0444\u0430\u0439\u043B inline preview \u043D\u0435 \u0435 \u043D\u0430\u043B\u0438\u0447\u0435\u043D.",
    filesSelectionPreviewTextLarge: "\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u0438\u044F\u0442 preview \u0435 \u0442\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C \u0437\u0430 inline \u043F\u043E\u043A\u0430\u0437\u0432\u0430\u043D\u0435. \u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 Preview \u0438\u043B\u0438 Download.",
    filesSelectionPreviewError: "\u041D\u0435 \u0443\u0441\u043F\u044F inline preview.",
    filesMoreActions: "\u041E\u0449\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
    filesCopyPath: "\u041A\u043E\u043F\u0438\u0440\u0430\u0439 \u043F\u044A\u0442\u044F",
    filesPathCopied: "\u041F\u044A\u0442\u044F\u0442 \u0435 \u043A\u043E\u043F\u0438\u0440\u0430\u043D.",
    filesPathCopyFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u043A\u043E\u043F\u0438\u0440\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u043F\u044A\u0442\u044F.",
    filesUp: "\u041D\u0430\u0433\u043E\u0440\u0435",
    filesNewFolder: "\u041D\u043E\u0432\u0430 \u043F\u0430\u043F\u043A\u0430",
    filesRenameFolder: "\u041F\u0440\u0435\u0438\u043C\u0435\u043D\u0443\u0432\u0430\u0439 \u043F\u0430\u043F\u043A\u0430",
    filesMoveFolder: "\u041F\u0440\u0435\u043C\u0435\u0441\u0442\u0438 \u043F\u0430\u043F\u043A\u0430",
    filesDeleteFolder: "\u0418\u0437\u0442\u0440\u0438\u0439 \u043F\u0430\u043F\u043A\u0430",
    filesOpenEvent: "\u041E\u0442\u0432\u043E\u0440\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435",
    filesOpenEventUnavailable: "\u0422\u0430\u0437\u0438 \u043F\u0430\u043F\u043A\u0430 \u043D\u0435 \u0435 \u0441\u0432\u044A\u0440\u0437\u0430\u043D\u0430 \u0441 \u0430\u043A\u0442\u0438\u0432\u043D\u043E \u0441\u044A\u0431\u0438\u0442\u0438\u0435.",
    filesMoveFile: "\u041F\u0440\u0435\u043C\u0435\u0441\u0442\u0438",
    filesDownloadArchive: "\u0421\u0432\u0430\u043B\u0438 \u043C\u043E\u044F \u0430\u0440\u0445\u0438\u0432",
    filesUploadProgram: "\u041A\u0430\u0447\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    filesUploaded: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435\u0442\u0435 \u0441\u0430 \u043A\u0430\u0447\u0435\u043D\u0438.",
    filesLoading: "\u0417\u0430\u0440\u0435\u0436\u0434\u0430\u043D\u0435 \u043D\u0430 \u0444\u0430\u0439\u043B\u0438...",
    filesUploading: "\u041A\u0430\u0447\u0432\u0430\u043D\u0435 \u043D\u0430 \u0444\u0430\u0439\u043B\u0438...",
    filesArchivePreparing: "\u041F\u043E\u0434\u0433\u043E\u0442\u0432\u044F\u043D\u0435 \u043D\u0430 \u0430\u0440\u0445\u0438\u0432...",
    filesArchiveReady: "\u0410\u0440\u0445\u0438\u0432\u044A\u0442 \u0435 \u0441\u0432\u0430\u043B\u0435\u043D.",
    filesArchiveFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0441\u0432\u0430\u043B\u044F\u043D\u0435\u0442\u043E \u043D\u0430 \u0430\u0440\u0445\u0438\u0432\u0430.",
    filesCapacityFormat: "{used} \u043E\u0442 {limit} \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u043D\u0438",
    filesEmpty: "\u041D\u044F\u043C\u0430 \u0444\u0430\u0439\u043B\u043E\u0432\u0435.",
    filesEmptyTitle: "\u0422\u0430\u0437\u0438 \u043F\u0430\u043F\u043A\u0430 \u0435 \u043F\u0440\u0430\u0437\u043D\u0430.",
    filesEmptyHint: "\u041A\u0430\u0447\u0438 \u0444\u0430\u0439\u043B\u0438 \u0438\u043B\u0438 \u0441\u044A\u0437\u0434\u0430\u0439 \u043F\u0430\u043F\u043A\u0430, \u0437\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0435\u0448.",
    filesEmptyHintReadOnly: "\u0412 \u0442\u0430\u0437\u0438 \u043F\u0430\u043F\u043A\u0430 \u043E\u0449\u0435 \u043D\u044F\u043C\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430\u043D\u0438\u0435.",
    filesClearSearch: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438 \u0442\u044A\u0440\u0441\u0435\u043D\u0435\u0442\u043E",
    filesDownload: "\u0421\u0432\u0430\u043B\u0438",
    filesLoadFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0437\u0430\u0440\u0435\u0436\u0434\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0444\u0430\u0439\u043B\u0438.",
    filesUploadFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u043A\u0430\u0447\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0444\u0430\u0439\u043B.",
    filesDownloadFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0441\u0432\u0430\u043B\u044F\u043D\u0435\u0442\u043E \u043D\u0430 \u0444\u0430\u0439\u043B.",
    filesDeleteFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0438\u0437\u0442\u0440\u0438\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0444\u0430\u0439\u043B.",
    filesFolderCreateFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u043F\u0430\u043F\u043A\u0430.",
    filesFolderUpdateFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u043E\u0431\u043D\u043E\u0432\u044F\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u043F\u0430\u043F\u043A\u0430.",
    filesFolderDeleteFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0438\u0437\u0442\u0440\u0438\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u043F\u0430\u043F\u043A\u0430.",
    filesFileMoveFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0444\u0430\u0439\u043B.",
    filesFileMoved: "\u0424\u0430\u0439\u043B\u044A\u0442 \u0435 \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0435\u043D.",
    filesFolderCreated: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 \u0435 \u0441\u044A\u0437\u0434\u0430\u0434\u0435\u043D\u0430.",
    filesFolderUpdated: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 \u0435 \u043E\u0431\u043D\u043E\u0432\u0435\u043D\u0430.",
    filesFolderDeleted: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 \u0435 \u0438\u0437\u0442\u0440\u0438\u0442\u0430.",
    filesRefresh: "\u041E\u0431\u043D\u043E\u0432\u0438",
    filesFolderNamePrompt: "\u0412\u044A\u0432\u0435\u0434\u0438 \u0438\u043C\u0435 \u043D\u0430 \u043F\u0430\u043F\u043A\u0430:",
    filesFolderRenamePrompt: "\u041D\u043E\u0432\u043E \u0438\u043C\u0435 \u043D\u0430 \u043F\u0430\u043F\u043A\u0430:",
    filesFolderMovePrompt: "\u0412\u044A\u0432\u0435\u0434\u0438 \u043F\u044A\u0442 \u0434\u043E \u043F\u0430\u043F\u043A\u0430 (relative):",
    filesFileMovePrompt: "\u0412\u044A\u0432\u0435\u0434\u0438 \u043F\u044A\u0442 \u0434\u043E \u043F\u0430\u043F\u043A\u0430 (relative):",
    filesFolderLocked: "\u0422\u0430\u0437\u0438 \u043F\u0430\u043F\u043A\u0430 \u0435 \u0437\u0430\u043A\u043B\u044E\u0447\u0435\u043D\u0430.",
    filesDeleteFolderConfirmEmpty: "\u0414\u0430 \u0441\u0435 \u0438\u0437\u0442\u0440\u0438\u0435 \u043B\u0438 \u043F\u0430\u043F\u043A\u0430\u0442\u0430 \"{name}\"?",
    filesDeleteFolderConfirmWithFiles: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 \"{name}\" \u0441\u044A\u0434\u044A\u0440\u0436\u0430 {count} \u0444\u0430\u0439\u043B(\u0430). \u0414\u0430 \u0441\u0435 \u0438\u0437\u0442\u0440\u0438\u0435 \u043B\u0438 \u0432\u0441\u0435 \u043F\u0430\u043A?",
    filesDeleteFolderConfirmFallback: "\u0414\u0430 \u0441\u0435 \u0438\u0437\u0442\u0440\u0438\u0435 \u043B\u0438 \u043F\u0430\u043F\u043A\u0430\u0442\u0430 \"{name}\"? (\u0431\u0440\u043E\u044F\u0442 \u0444\u0430\u0439\u043B\u043E\u0432\u0435 \u043D\u0435 \u043C\u043E\u0436\u0435 \u0434\u0430 \u0441\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u0438)",
    filesEventDeletedSuffix: "\u0438\u0437\u0442\u0440\u0438\u0442\u043E \u043E\u0442 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0430",
    filesFolderNotSelected: "\u0418\u0437\u0431\u0435\u0440\u0438 \u043F\u0430\u043F\u043A\u0430.",
    filesOpenFolder: "\u041E\u0442\u0432\u043E\u0440\u0438 \u043F\u0430\u043F\u043A\u0430",
    filesOperationCancel: "\u041E\u0442\u043A\u0430\u0437",
    filesOperationApply: "\u041F\u0440\u0438\u043B\u043E\u0436\u0438",
    filesOperationMoveHere: "\u041F\u0440\u0435\u043C\u0435\u0441\u0442\u0438 \u0442\u0443\u043A",
    filesOperationValue: "\u0421\u0442\u043E\u0439\u043D\u043E\u0441\u0442",
    filesOperationDestination: "\u0426\u0435\u043B\u0435\u0432\u0430 \u043F\u0430\u043F\u043A\u0430",
    filesOperationSourceLabel: "\u041F\u0440\u0435\u043C\u0435\u0441\u0442\u0432\u0430\u0448",
    filesOperationSelectionLabel: "\u0426\u0435\u043B",
    filesOperationCreateTitle: "\u0421\u044A\u0437\u0434\u0430\u0439 \u043F\u0430\u043F\u043A\u0430",
    filesOperationRenameTitle: "\u041F\u0440\u0435\u0438\u043C\u0435\u043D\u0443\u0432\u0430\u0439 \u043F\u0430\u043F\u043A\u0430",
    filesOperationMoveFolderTitle: "\u041F\u0440\u0435\u043C\u0435\u0441\u0442\u0438 \u043F\u0430\u043F\u043A\u0430",
    filesOperationMoveFileTitle: "\u041F\u0440\u0435\u043C\u0435\u0441\u0442\u0438 \u0444\u0430\u0439\u043B",
    filesOperationCreateHint: "\u0412\u044A\u0432\u0435\u0434\u0438 \u0438\u043C\u0435 \u043D\u0430 \u043D\u043E\u0432\u0430\u0442\u0430 \u043F\u0430\u043F\u043A\u0430.",
    filesOperationRenameHint: "\u0412\u044A\u0432\u0435\u0434\u0438 \u043D\u043E\u0432\u043E\u0442\u043E \u0438\u043C\u0435 \u043D\u0430 \u043F\u0430\u043F\u043A\u0430.",
    filesOperationMoveFolderHint: "\u0418\u0437\u0431\u0435\u0440\u0438 \u043F\u0430\u043F\u043A\u0430 \u0437\u0430 \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0432\u0430\u043D\u0435 \u043E\u0442 \u0441\u043F\u0438\u0441\u044A\u043A\u0430 \u043F\u043E-\u0434\u043E\u043B\u0443.",
    filesOperationMoveFileHint: "\u0418\u0437\u0431\u0435\u0440\u0438 \u043F\u0430\u043F\u043A\u0430 \u0437\u0430 \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0432\u0430\u043D\u0435 \u043E\u0442 \u0441\u043F\u0438\u0441\u044A\u043A\u0430 \u043F\u043E-\u0434\u043E\u043B\u0443.",
    filesOperationApplying: "\u0418\u0437\u043F\u044A\u043B\u043D\u044F\u0432\u0430 \u0441\u0435...",
    filesOperationMissingValue: "\u041F\u044A\u0440\u0432\u043E \u0432\u044A\u0432\u0435\u0434\u0438 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442.",
    filesOperationMissingDestination: "\u041F\u044A\u0440\u0432\u043E \u0438\u0437\u0431\u0435\u0440\u0438 \u043F\u0430\u043F\u043A\u0430 \u0437\u0430 \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0432\u0430\u043D\u0435.",
    filesOperationInvalidDestination: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0434\u0440\u0443\u0433\u0430 \u043F\u0430\u043F\u043A\u0430 \u0437\u0430 \u043F\u0440\u0435\u043C\u0435\u0441\u0442\u0432\u0430\u043D\u0435.",
    filesOperationPickerRoot: "\u0413\u043B\u0430\u0432\u043D\u0430 \u043F\u0430\u043F\u043A\u0430 (/)",
    filesOperationPickerEmpty: "\u0422\u0443\u043A \u043E\u0449\u0435 \u043D\u044F\u043C\u0430 \u043D\u0430\u043B\u0438\u0447\u043D\u0438 \u043F\u0430\u043F\u043A\u0438.",
    filesOperationSelectionEmpty: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0430 \u0446\u0435\u043B\u0435\u0432\u0430 \u043F\u0430\u043F\u043A\u0430.",
    filesOperationSelectionValue: "\u0426\u0435\u043B: {path}",
    filesEventMissing: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435 \u043F\u044A\u0440\u0432\u043E.",
    filesCountLabel: "items",
    filesHeadName: "Name",
    filesHeadType: "Type",
    filesHeadModified: "Modified",
    filesHeadSize: "Size",
    filesHeadSelect: "\u0418\u0437\u0431\u043E\u0440",
    filesSelectHint: "Select a file to preview or download.",
    filesNoSelection: "No file selected.",
    filesBatchDownload: "\u0421\u0432\u0430\u043B\u0438 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u0442\u0435",
    filesBatchDelete: "\u0418\u0437\u0442\u0440\u0438\u0439 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u0442\u0435",
    filesBatchEmpty: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438 \u0437\u0430 batch \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F.",
    filesBatchSelected: "\u0418\u0437\u0431\u0440\u0430\u043D\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438: {count}.",
    filesBatchDeleteConfirm: "\u0414\u0430 \u0441\u0435 \u0438\u0437\u0442\u0440\u0438\u044F\u0442 \u043B\u0438 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438?",
    filesBatchDownloadDone: "\u0421\u0432\u0430\u043B\u0435\u043D\u0438 \u0441\u0430 {done} \u043E\u0442 {total} \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430.",
    filesBatchDownloadPartial: "\u0421\u0432\u0430\u043B\u0435\u043D\u0438 \u0441\u0430 {done} \u043E\u0442 {total} \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430. \u0427\u0430\u0441\u0442 \u043E\u0442 \u0441\u0432\u0430\u043B\u044F\u043D\u0438\u044F\u0442\u0430 \u043D\u0435 \u0443\u0441\u043F\u044F\u0445\u0430.",
    filesBatchDownloadFailed: "\u041D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u0432\u0430\u043B\u044F\u043D\u0435 \u043D\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438.",
    filesBatchDeleteDone: "\u0418\u0437\u0442\u0440\u0438\u0442\u0438 \u0441\u0430 {done} \u043E\u0442 {total} \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430.",
    filesBatchDeletePartial: "\u0418\u0437\u0442\u0440\u0438\u0442\u0438 \u0441\u0430 {done} \u043E\u0442 {total} \u0438\u0437\u0431\u0440\u0430\u043D\u0438 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430. \u0427\u0430\u0441\u0442 \u043E\u0442 \u0438\u0437\u0442\u0440\u0438\u0432\u0430\u043D\u0438\u044F\u0442\u0430 \u043D\u0435 \u0443\u0441\u043F\u044F\u0445\u0430.",
    filesBatchDeleteFailed: "\u041D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u0437\u0442\u0440\u0438\u0432\u0430\u043D\u0435 \u043D\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438.",
    filesPreviewPopupBlocked: "\u0418\u0437\u0441\u043A\u0430\u0447\u0430\u0449\u0438\u044F\u0442 \u043F\u0440\u043E\u0437\u043E\u0440\u0435\u0446 \u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0430\u043D. \u0420\u0430\u0437\u0440\u0435\u0448\u0438 popups \u0437\u0430 preview \u0432 \u043D\u043E\u0432 tab.",
    filesPreview: "Preview",
    filePreviewTitle: "File preview",
    filePreviewUnavailable: "Preview is not available for this file type.",
    eventProgramLabel: "\u0424\u0430\u0439\u043B \u0437\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 (PDF)",
    eventProgramManage: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    eventProgramInlineLabel: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 (PDF)",
    eventProgramModalTitle: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u043A\u044A\u043C \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E",
    eventProgramHelp: "\u041A\u0430\u0447\u0438 \u0435\u0434\u0438\u043D PDF \u0444\u0430\u0439\u043B. \u0422\u043E\u0439 \u0449\u0435 \u0441\u0435 \u043E\u0442\u0432\u0430\u0440\u044F \u043E\u0442 \u043F\u0440\u0435\u0433\u043B\u0435\u0434\u0430 \u043D\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E.",
    eventProgramPreview: "\u041F\u0440\u0435\u0433\u043B\u0435\u0434 \u043D\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    eventProgramClear: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    eventProgramNone: "\u041D\u044F\u043C\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430.",
    eventProgramCurrent: "\u0422\u0435\u043A\u0443\u0449\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    eventProgramPending: "\u041D\u043E\u0432\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430",
    eventProgramWillRemove: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430\u0442\u0430 \u0449\u0435 \u0441\u0435 \u043F\u0440\u0435\u043C\u0430\u0445\u043D\u0435 \u043F\u0440\u0438 \u0437\u0430\u043F\u0438\u0441.",
    eventProgramLoaded: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430\u0442\u0430 \u0435 \u0437\u0430\u0440\u0435\u0434\u0435\u043D\u0430.",
    eventProgramSaved: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430\u0442\u0430 \u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430.",
    eventProgramRemoved: "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u0430\u0442\u0430 \u0435 \u043F\u0440\u0435\u043C\u0430\u0445\u043D\u0430\u0442\u0430.",
    eventProgramLoadFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0434\u0430 \u0437\u0430\u0440\u0435\u0434\u0438 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430\u0442\u0430.",
    eventProgramSaveFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0434\u0430 \u0437\u0430\u043F\u0438\u0448\u0435 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430\u0442\u0430.",
    eventProgramUnsupported: "\u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 PDF \u0444\u0430\u0439\u043B \u0437\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430.",
    eventProgramMissing: "\u041D\u044F\u043C\u0430 \u0444\u0430\u0439\u043B \u0437\u0430 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0430 \u043A\u044A\u043C \u0442\u043E\u0432\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u0435.",
    eventFormDetailsTab: "\u0414\u0435\u0442\u0430\u0439\u043B\u0438",
    eventFormFilesTab: "\u0424\u0430\u0439\u043B\u043E\u0432\u0435",
    eventFilesFolderEnabledLabel: "\u0421\u044A\u0437\u0434\u0430\u0439 \u043F\u0430\u043F\u043A\u0430 \u0437\u0430 \u0444\u0430\u0439\u043B\u0438 \u043A\u044A\u043C \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E",
    eventFilesDetachedLabel: "\u041E\u0442\u043A\u0430\u0447\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E \u043E\u0442 \u0444\u0430\u0439\u043B\u043E\u0432\u0435\u0442\u0435",
    eventFilesSettingsLinkedSummary: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 \u0441 \u0444\u0430\u0439\u043B\u0438 \u043E\u0441\u0442\u0430\u0432\u0430 \u0432\u0440\u044A\u0437\u0430\u043D\u0430 \u0441\u044A\u0441 \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E.",
    eventFilesSettingsDetachedSummary: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 \u0441 \u0444\u0430\u0439\u043B\u0438 \u0435 \u043E\u0442\u043A\u0430\u0447\u0435\u043D\u0430. \u041C\u043E\u0436\u0435\u0448 \u0434\u0430 \u044F \u043F\u0440\u0435\u043C\u0430\u0445\u043D\u0435\u0448 \u0431\u0435\u0437 \u0434\u0430 \u0442\u0440\u0438\u0435\u0448 \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E.",
    eventFilesSettingsDisabledSummary: "\u0417\u0430 \u0442\u043E\u0432\u0430 \u0441\u044A\u0431\u0438\u0442\u0438\u0435 \u043D\u044F\u043C\u0430 \u0434\u0430 \u0441\u0435 \u0441\u044A\u0437\u0434\u0430\u0432\u0430 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C\u0430 \u043F\u0430\u043F\u043A\u0430 \u0437\u0430 \u0444\u0430\u0439\u043B\u0438.",
    eventFilesSettingsHelp: "\u041F\u0430\u043F\u043A\u0430\u0442\u0430 Program \u043E\u0441\u0442\u0430\u0432\u0430 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u0430. \u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u0441\u043A\u0438\u0442\u0435 \u0444\u0430\u0439\u043B\u0438 \u0441\u0430 \u0432 Other.",
    bugReport: "\u0414\u043E\u043A\u043B\u0430\u0434\u0432\u0430\u0439 \u0431\u044A\u0433",
    bugReportTitle: "\u0414\u043E\u043A\u043B\u0430\u0434\u0432\u0430\u0439 \u0431\u044A\u0433",
    bugReportFieldTitle: "\u0417\u0430\u0433\u043B\u0430\u0432\u0438\u0435",
    bugReportFieldDescription: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435",
    bugReportSubmit: "\u0418\u0437\u043F\u0440\u0430\u0442\u0438",
    bugReportSent: "\u0414\u043E\u043A\u043B\u0430\u0434\u044A\u0442 \u0435 \u0438\u0437\u043F\u0440\u0430\u0442\u0435\u043D.",
    bugReportFailed: "\u041D\u0435 \u0443\u0441\u043F\u044F \u0434\u0430 \u0438\u0437\u043F\u0440\u0430\u0442\u0438\u0448 \u0434\u043E\u043A\u043B\u0430\u0434\u0430.",
    bugReportTitlePlaceholder: "\u041A\u0440\u0430\u0442\u043A\u043E \u0437\u0430\u0433\u043B\u0430\u0432\u0438\u0435",
    bugReportDescPlaceholder: "\u041A\u0430\u043A\u0432\u043E \u0441\u0435 \u0441\u043B\u0443\u0447\u0438 \u0438 \u043A\u0430\u043A \u0434\u0430 \u0441\u0435 \u0432\u044A\u0437\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435...",
    confirmDeleteEvent: "\u0414\u0430 \u0441\u0435 \u0438\u0437\u0442\u0440\u0438\u0435 \u043B\u0438 \u0441\u044A\u0431\u0438\u0442\u0438\u0435\u0442\u043E?"
  }
};

let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
let selectedDateKey = todayKey;
let state = readState();
let eventsByDate = state.events;
let people = state.people;
let absences = state.absences;
let categories = state.categories;
let tasksByDate = state.tasks || {};
let stickyNotes = state.stickyNotes || [];
let stickyLayoutById = readStickyLayoutMap();
let lastModifiedAt = state.modifiedAt || null;
let editingPersonId = null;
let editingCategoryId = null;
let editingEventSeriesId = null;
let editingAbsenceId = null;
let currentView = "month";
let currentMainPanel = "calendar";
let eventsRegistrySearch = "";
let eventsRegistryFromDate = "";
let eventsRegistryToDate = "";
let eventsRegistryColumns = new Set(["date", "time", "title", "category", "people"]);
let eventsRegistryRows = [];
let editingStickyNoteId = "";
let stickyShareNoteId = "";
let sharedNotesSyncTimer = null;
let sharedNotesPushTimer = null;
let previewEventSeriesId = null;
let previewEventDateKey = null;
let previewEventSnapshot = null;
let personalSharedOverlayEventIds = new Set();
let personalSharedOverlayTaskIds = new Set();
let leaveAbsenceSyncTimer = null;
let leaveAbsenceSyncInFlight = false;
let leaveAbsenceLoadedViewKey = "";
let holidaySyncTimer = null;
let holidaySyncInFlight = false;
let holidayLoadedViewKey = "";
let holidaySignature = "";
let holidayMetaByDate = new Map();
let leaveQuickMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let suppressDayMenuOpenUntil = 0;
const savedUpcomingCollapsed = localStorage.getItem(UPCOMING_COLLAPSED_KEY);
let upcomingCollapsed = savedUpcomingCollapsed === null ? true : savedUpcomingCollapsed === "1";
const activeFilters = { categoryIds: new Set(), peopleIds: new Set() };
let currentUserRefreshTimer = null;
let accessTokenRefreshPromise = null;
let lastSessionFingerprint = "";
let stopDashboardClock = null;
let mobileCalendarTouchStartX = null;
let mobileCalendarTouchStartY = null;
const MOBILE_DAY_SHEET_DEFAULT_VH = 82;
const MOBILE_UPCOMING_SHEET_DEFAULT_VH = 74;
currentMainPanel = readMainPanelPreference();

applyTheme(currentTheme);
renderWeekdays();
renderCategoryOptions();
renderPeopleOptions();
renderAbsencePersonOptions();
renderTaskPersonOptions();
renderReportPeopleOptions();
renderPeopleManager();
renderCategoriesManager();
renderFilters();
applyDayTimelinePrefsToInputs();
syncEventTimeInputState();
  renderNotesPanel();
  renderCalendar();
  renderSelectedDayPanel();
renderUpcomingList();
renderMainPanelUI();
applyTranslations();
refreshChatAttachSummary();
startDashboardClock();
startDayTimelineRefresh();
renderCalendarModeUI();
renderMainPanelUI();
  setUpcomingCollapsed(upcomingCollapsed);
  updateMobileResponsivePanels();
  updateRepeatVisibility();
  bootstrapRemoteState();
  scheduleStickyNotesPullFromShared(250);
bootstrapCurrentUser();
queueLeaveAbsenceSync(true);
queueHolidaySync(true);
initRealtimeSync();
closeStorageStartupMenu();
if (READ_ONLY) {
  applyReadOnlyMode();
}

document.getElementById("prevMonth").addEventListener("click", () => {
  goPrevCalendarRange();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  goNextCalendarRange();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  selectedDateKey = todayKey;
  renderCalendar();
  renderSelectedDayPanel();
  queueLeaveAbsenceSync(true);
});

langToggle.addEventListener("change", () => {
  currentLang = langToggle.value === "bg" ? "bg" : "en";
  if (!READ_ONLY) localStorage.setItem("procal_lang", currentLang);
  applyTranslations();
  updateMobileResponsivePanels();
  renderWeekdays();
  renderCategoryOptions();
  renderCalendar();
  queueLeaveAbsenceSync(true);
  renderSelectedDayPanel();
  renderUpcomingList();
  renderPeopleOptions();
  renderAbsencePersonOptions();
  renderTaskPersonOptions();
  renderReportPeopleOptions();
  renderPeopleManager();
  renderCategoriesManager();
  renderFilters();
});

if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    setTheme(themeToggle.checked ? "dark" : "light");
  });
}

window.addEventListener("resize", () => {
  updateMobileResponsivePanels();
  if (currentView === "month") renderCalendar();
  syncDayTimelinePanelHeight();
  syncSidePanelHeights();
});

attachPanelWheelRouting(dayTimelinePanel, () => dayTimelineContent);
attachPanelWheelRouting(dayPanelShell, () => sideDayList);
attachPanelWheelRouting(upcomingPanel, () => upcomingList);

if (calendarGrid) {
  calendarGrid.addEventListener("touchstart", (event) => {
    if (!isMobileViewport() || currentView !== "month") return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    mobileCalendarTouchStartX = touch.clientX;
    mobileCalendarTouchStartY = touch.clientY;
  }, { passive: true });

  calendarGrid.addEventListener("touchend", (event) => {
    if (!isMobileViewport() || currentView !== "month") return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch || mobileCalendarTouchStartX === null || mobileCalendarTouchStartY === null) return;
    const deltaX = touch.clientX - mobileCalendarTouchStartX;
    const deltaY = touch.clientY - mobileCalendarTouchStartY;
    mobileCalendarTouchStartX = null;
    mobileCalendarTouchStartY = null;
    if (Math.abs(deltaY) > 48 || Math.abs(deltaX) < 60) return;
    if (deltaX < 0) {
      goNextCalendarRange();
      return;
    }
    goPrevCalendarRange();
  }, { passive: true });
}

if (addEventBtn) {
  addEventBtn.addEventListener("click", () => {
    if (!canCreateEventsInCurrentCalendar()) return;
    if (!selectedDateKey) selectedDateKey = todayKey;
    openDayMenu(selectedDateKey);
  });
}

if (sideDayQuickAddTrigger) {
  sideDayQuickAddTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSideDayQuickAdd();
  });
}

if (sideAddEventBtn) {
  sideAddEventBtn.addEventListener("click", () => {
    if (!canOpenEventCreateInCurrentCalendar()) return;
    toggleSideDayQuickAdd(false);
    if (!selectedDateKey) selectedDateKey = todayKey;
    openDayMenu(selectedDateKey);
    hideDayActionChoices();
    startEventCreateMode(selectedDateKey);
    setDayMenuSectionMode("event");
    if (eventTitleInput) eventTitleInput.focus();
  });
}

if (sideAddAbsenceBtn) {
  sideAddAbsenceBtn.addEventListener("click", () => {
    if (!canManageEventAndAbsenceChanges()) return;
    if (!selectedDateKey) selectedDateKey = todayKey;
    openDayMenu(selectedDateKey);
    hideDayActionChoices();
    setDayMenuSectionMode("absence");
    startAbsenceCreateMode(selectedDateKey);
  });
}

if (sideAddCompBtn) {
  sideAddCompBtn.addEventListener("click", () => {
    if (!canCompOverviewAccess()) return;
    toggleSideDayQuickAdd(false);
    if (!selectedDateKey) selectedDateKey = todayKey;
    openCompensationMenu(selectedDateKey);
  });
}

if (sideAddTaskBtn) {
  sideAddTaskBtn.addEventListener("click", () => {
    if (!canOpenTaskCreateInCurrentCalendar()) return;
    toggleSideDayQuickAdd(false);
    if (!selectedDateKey) selectedDateKey = todayKey;
    openDayMenu(selectedDateKey);
    hideDayActionChoices();
    setDayMenuSectionMode("task");
    renderStandaloneTaskList(selectedDateKey);
  });
}


openDataFileBtn.addEventListener("click", async () => {
  await handleOpenDataFile();
});

createDataFileBtn.addEventListener("click", async () => {
  await handleCreateDataFile();
});

useLocalOnlyBtn.addEventListener("click", () => {
  storageMode = "local";
  activeFileHandle = null;
  closeStorageStartupMenu();
});

monthViewBtn.addEventListener("click", () => {
  currentView = currentView === "year" ? "month" : "year";
  persistUiPrefs();
  renderCalendar();
  renderMainPanelUI();
});

if (yearViewBtn) {
  yearViewBtn.addEventListener("click", () => {
    currentView = "year";
    persistUiPrefs();
    renderCalendar();
    renderMainPanelUI();
  });
}


if (toggleUpcomingBtn) {
  toggleUpcomingBtn.addEventListener("click", () => {
    if (isMobileViewport()) {
      closeMobileUpcomingPanel();
      return;
    }
    setUpcomingCollapsed(!upcomingCollapsed);
  });
}
if (mobileUpcomingBtn) {
  mobileUpcomingBtn.addEventListener("click", () => {
    openMobileUpcomingPanel();
  });
}
if (mobileDayBtn) {
  mobileDayBtn.addEventListener("click", () => {
    openMobileDayPanel();
  });
}
if (closeMobileDayBtn) {
  closeMobileDayBtn.addEventListener("click", () => {
    closeMobileDayPanel();
  });
}
if (sideDayHead) {
  sideDayHead.addEventListener("pointerdown", (event) => {
    startMobileSheetDrag(event, dayPanelShell, MOBILE_DAY_SHEET_DEFAULT_VH);
  });
}
if (upcomingHead) {
  upcomingHead.addEventListener("pointerdown", (event) => {
    startMobileSheetDrag(event, upcomingPanel, MOBILE_UPCOMING_SHEET_DEFAULT_VH);
  });
}
window.addEventListener("pointermove", handleMobileSheetDragMove, { passive: false });
window.addEventListener("pointerup", finishMobileSheetDrag);
window.addEventListener("pointercancel", finishMobileSheetDrag);
document.addEventListener("pointerdown", handleMobileSheetOutsidePointerDown);
settingsBtn.addEventListener("click", () => {
  openSettingsMenu();
});

filtersBtn.addEventListener("click", () => {
  openFiltersMenu();
});
if (calendarPanelTabBtn) {
  calendarPanelTabBtn.addEventListener("click", () => {
    setMainPanel("calendar");
  });
}
if (eventsPanelTabBtn) {
  eventsPanelTabBtn.addEventListener("click", () => {
    setMainPanel("events");
  });
}
if (notesToggleBtn) {
  notesToggleBtn.addEventListener("click", () => {
    setMainPanel("notes");
  });
}
if (notesViewMonthBtn) {
  notesViewMonthBtn.addEventListener("click", () => {
    if (currentCalendarMode === "personal") return;
    switchCalendarMode("personal");
  });
}
if (notesViewYearBtn) {
  notesViewYearBtn.addEventListener("click", () => {
    if (currentCalendarMode === "shared") return;
    switchCalendarMode("shared");
  });
}
if (eventsSearchInput) {
  eventsSearchInput.addEventListener("input", () => {
    eventsRegistrySearch = String(eventsSearchInput.value || "");
    renderEventsRegistry();
  });
}
if (eventsFromDate) {
  eventsFromDate.addEventListener("change", () => {
    eventsRegistryFromDate = isDateKey(eventsFromDate.value) ? eventsFromDate.value : "";
    renderEventsRegistry();
  });
}
if (eventsToDate) {
  eventsToDate.addEventListener("change", () => {
    eventsRegistryToDate = isDateKey(eventsToDate.value) ? eventsToDate.value : "";
    renderEventsRegistry();
  });
}
if (eventsSearchClearBtn) {
  eventsSearchClearBtn.addEventListener("click", () => {
    eventsRegistrySearch = "";
    if (eventsSearchInput) eventsSearchInput.value = "";
    eventsRegistryFromDate = "";
    eventsRegistryToDate = "";
    if (eventsFromDate) eventsFromDate.value = "";
    if (eventsToDate) eventsToDate.value = "";
    renderEventsRegistry();
    if (eventsSearchInput) eventsSearchInput.focus();
  });
}
if (eventsReportColumns) {
  eventsReportColumns.addEventListener("change", (event) => {
    const input = event.target && event.target.matches ? event.target : null;
    if (!input || !input.matches("input[type=\"checkbox\"]")) return;
    const value = String(input.value || "");
    if (!value) return;
    if (input.checked) eventsRegistryColumns.add(value);
    else eventsRegistryColumns.delete(value);
    if (!eventsRegistryColumns.size) {
      eventsRegistryColumns.add(value);
      input.checked = true;
    }
    renderEventsRegistry();
  });
}
if (eventsExportOptionsBtn) {
  eventsExportOptionsBtn.addEventListener("click", () => {
    openEventsExportMenu();
  });
}
if (closeEventsExportBtn) {
  closeEventsExportBtn.addEventListener("click", () => {
    closeEventsExportMenu();
  });
}
if (eventsExportMenu) {
  eventsExportMenu.addEventListener("click", (event) => {
    if (event.target === eventsExportMenu) closeEventsExportMenu();
  });
}
if (eventsExportCsvBtn) {
  eventsExportCsvBtn.addEventListener("click", () => {
    exportEventsRegistryCsv();
  });
}
if (eventsExportPdfBtn) {
  eventsExportPdfBtn.addEventListener("click", () => {
    exportEventsRegistryPdf();
  });
}
if (eventsRegistryBody) {
  eventsRegistryBody.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest("[data-events-registry-open]") : null;
    if (!button) return;
    openEventFromRegistry(button.getAttribute("data-events-registry-open"));
  });
  eventsRegistryBody.addEventListener("dblclick", (event) => {
    const row = event.target && event.target.closest ? event.target.closest("[data-events-registry-row]") : null;
    if (!row) return;
    openEventFromRegistry(row.getAttribute("data-events-registry-row"));
  });
}
if (notificationsBtn) {
  notificationsBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openNotificationsMenu();
  });
}
if (chatBtn) {
  chatBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openChatModal();
  });
}
if (closeChatBtn) {
  closeChatBtn.addEventListener("click", () => {
    closeChatModal();
  });
}
if (chatFilesBtn) {
  chatFilesBtn.addEventListener("click", () => {
    openFilesModal({
      mode: "chat",
      chatScope: chatActiveScope === "direct" ? "direct" : "global",
      chatPeerUserId: chatActiveScope === "direct" ? String(chatActivePeerUserId || "") : ""
    });
  });
}
if (chatAttachBtn) {
  chatAttachBtn.addEventListener("click", () => {
    if (!canChatWrite()) return;
    if (chatFileInput) chatFileInput.click();
  });
}
if (chatFileInput) {
  chatFileInput.addEventListener("change", () => {
    chatPendingFiles = Array.from(chatFileInput.files || []);
    refreshChatAttachSummary();
  });
}
if (chatModal) {
  chatModal.addEventListener("click", (event) => {
    if (event.target === chatModal) closeChatModal();
  });
}
if (chatForm) {
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendChatMessage();
  });
}
if (chatMessages) {
  chatMessages.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const downloadBtn = target.closest("[data-file-download-id]");
    if (!(downloadBtn instanceof HTMLElement)) return;
    const fileId = decodeURIComponent(String(downloadBtn.dataset.fileDownloadId || ""));
    const fileName = decodeURIComponent(String(downloadBtn.dataset.fileName || "file.bin"));
    if (!fileId) return;
    try {
      await downloadProtectedFile(fileId, fileName);
    } catch (_) {
      // no-op
    }
  });
  chatMessages.addEventListener("scroll", () => {
    chatAutoStickToBottom = isChatNearBottom();
    updateChatScrollBottomButton();
  });
}
if (chatScrollBottomBtn) {
  chatScrollBottomBtn.addEventListener("click", () => {
    scrollChatToBottom();
    chatAutoStickToBottom = true;
    updateChatScrollBottomButton();
  });
}
if (closeNotificationsBtn) {
  closeNotificationsBtn.addEventListener("click", () => {
    closeNotificationsMenu();
  });
}
if (notificationsMenu) {
  notificationsMenu.addEventListener("click", (event) => {
    if (event.target === notificationsMenu) closeNotificationsMenu();
  });
}
if (notificationsUnreadFilterBtn) {
  notificationsUnreadFilterBtn.addEventListener("click", async () => {
    notificationsUnreadOnly = !notificationsUnreadOnly;
    setText("notificationsUnreadFilterBtn", notificationsUnreadOnly ? t("notificationsAll") : t("notificationsUnreadOnly"));
    await loadNotifications();
  });
}
if (notificationsMarkAllBtn) {
  notificationsMarkAllBtn.addEventListener("click", async () => {
    await markAllNotificationsRead();
  });
}
if (notificationsClearBtn) {
  notificationsClearBtn.addEventListener("click", async () => {
    await clearNotificationsForCurrentUser();
  });
}
if (bugReportBtn) {
  bugReportBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openBugReportModal();
  });
}
if (closeBugReportBtn) {
  closeBugReportBtn.addEventListener("click", () => {
    closeBugReportModal();
  });
}
if (bugReportModal) {
  bugReportModal.addEventListener("click", (event) => {
    if (event.target === bugReportModal) closeBugReportModal();
  });
}
if (closeFilesBtn) {
  closeFilesBtn.addEventListener("click", () => {
    closeFilesModal();
  });
}
if (filesModal) {
  filesModal.addEventListener("click", (event) => {
    const target = event.target;
    if (filesContextMenuOpen && target instanceof Element && !target.closest("#filesContextMenu")) {
      closeFilesContextMenu();
    }
    if (event.target === filesModal) closeFilesModal();
  });
}
if (filesOperationOverlay) {
  filesOperationOverlay.addEventListener("click", (event) => {
    if (event.target === filesOperationOverlay) {
      closeFilesOperationPanel();
    }
  });
}
if (filesTree) {
  filesTree.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const homeToggleBtn = target.closest("[data-files-tree-home-toggle]");
    if (homeToggleBtn instanceof HTMLElement) {
      filesTreeHomeExpanded = !filesTreeHomeExpanded;
      renderFilesTree();
      return;
    }

    const toggleBtn = target.closest("[data-files-tree-toggle]");
    if (toggleBtn instanceof HTMLElement) {
      const root = String(toggleBtn.dataset.filesRoot || "").trim();
      const relPath = decodeURIComponent(String(toggleBtn.dataset.filesPath || ""));
      if (!root) return;
      await toggleFilesTreeNode(root, relPath);
      return;
    }

    const selectBtn = target.closest("[data-files-tree-select]");
    if (selectBtn instanceof HTMLElement) {
      const root = String(selectBtn.dataset.filesRoot || "").trim();
      const relPath = decodeURIComponent(String(selectBtn.dataset.filesPath || ""));
      if (!root) return;
      await openFilesTreeNode(root, relPath);
    }
  });
  filesTree.addEventListener("dblclick", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const selectBtn = target.closest("[data-files-tree-select]");
    if (!(selectBtn instanceof HTMLElement)) return;
    const root = String(selectBtn.dataset.filesRoot || "").trim();
    const relPath = decodeURIComponent(String(selectBtn.dataset.filesPath || ""));
    if (!root) return;
    await openFilesTreeNode(root, relPath);
  });
  filesTree.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const dragLabel = target.closest("[data-files-tree-drag-root]");
    if (!(dragLabel instanceof HTMLElement)) return;
    const root = String(dragLabel.dataset.filesTreeDragRoot || "").trim();
    const relPath = decodeURIComponent(String(dragLabel.dataset.filesTreeDragPath || ""));
    const payload = getFilesTreeFolderDragPayload(root, relPath);
    if (!payload) {
      event.preventDefault();
      return;
    }
    filesDragState = payload;
    clearFilesDropTarget();
    closeFilesContextMenu();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(payload.rowKey || ""));
      event.dataTransfer.setData("application/x-procal-files-drag", JSON.stringify(payload));
    }
    dragLabel.classList.add("dragging");
  });
  filesTree.addEventListener("dragend", (event) => {
    const target = event.target;
    if (target instanceof Element) {
      const dragLabel = target.closest("[data-files-tree-drag-root]");
      if (dragLabel instanceof HTMLElement) dragLabel.classList.remove("dragging");
    }
    filesDragState = null;
    clearFilesDropTarget();
  });
  filesTree.addEventListener("dragover", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const payload = readFilesDragPayload(event);
    if (!payload) return;
    const selectBtn = target.closest("[data-files-tree-select]");
    if (!(selectBtn instanceof HTMLElement)) return;
    const root = String(selectBtn.dataset.filesRoot || "").trim();
    const relPath = decodeURIComponent(String(selectBtn.dataset.filesPath || ""));
    if (!isFilesDropAllowed(payload, root, relPath)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    setFilesDropTarget(root, relPath);
  });
  filesTree.addEventListener("drop", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const payload = readFilesDragPayload(event);
    if (!payload) return;
    const selectBtn = target.closest("[data-files-tree-select]");
    if (!(selectBtn instanceof HTMLElement)) return;
    const root = String(selectBtn.dataset.filesRoot || "").trim();
    const relPath = decodeURIComponent(String(selectBtn.dataset.filesPath || ""));
    if (!isFilesDropAllowed(payload, root, relPath)) return;
    event.preventDefault();
    await applyFilesDragMove(payload, root, relPath);
  });
  filesTree.addEventListener("dragleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && filesTree.contains(related)) return;
    clearFilesDropTarget();
  });
}
if (filesUploadForm) {
  filesUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await uploadFilesInModal();
  });
}
if (filesUploadInput) {
  filesUploadInput.addEventListener("change", async () => {
    refreshFilesUploadSummary();
    if (!filesUploadInput.files || !filesUploadInput.files.length) return;
    await uploadFilesInModal();
  });
}
if (filesUploadBtn) {
  filesUploadBtn.addEventListener("click", () => {
    if (!filesModalContext.canUpload) return;
    try { if (filesUploadInput) filesUploadInput.click(); } catch {}
  });
}
if (filesUploadFolderInput) {
  filesUploadFolderInput.addEventListener("change", async () => {
    const selected = Array.from(filesUploadFolderInput.files || []);
    if (!selected.length) return;
    try {
      await uploadFolderInModal(selected);
    } finally {
      filesUploadFolderInput.value = "";
    }
  });
}
if (filesSearchInput) {
  filesSearchInput.addEventListener("input", () => {
    filesExplorerState.search = String(filesSearchInput.value || "");
    refreshFilesExplorerView();
  });
}
if (filesSortSelect) {
  filesSortSelect.addEventListener("change", () => {
    setFilesSortMode(String(filesSortSelect.value || "modified_desc"));
  });
}
if (filesViewListBtn) {
  filesViewListBtn.addEventListener("click", () => {
    setFilesExplorerViewMode("list");
  });
}
if (filesViewGridBtn) {
  filesViewGridBtn.addEventListener("click", () => {
    setFilesExplorerViewMode("grid");
  });
}
if (filesHeadSortButtons.length) {
  filesHeadSortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const sortKey = String(button.dataset.filesSortKey || "").trim();
      if (!sortKey) return;
      toggleFilesSort(sortKey);
    });
  });
}
if (filesUploadForm) {
  filesUploadForm.addEventListener("dragenter", (event) => {
    if (!filesModalContext.canUpload) return;
    event.preventDefault();
    filesExplorerState.dragDepth += 1;
    filesUploadForm.classList.add("drag-active");
  });
  filesUploadForm.addEventListener("dragover", (event) => {
    if (!filesModalContext.canUpload) return;
    event.preventDefault();
    filesUploadForm.classList.add("drag-active");
  });
  ["dragleave", "dragend"].forEach((eventName) => {
    filesUploadForm.addEventListener(eventName, (event) => {
      if (!filesModalContext.canUpload) return;
      event.preventDefault();
      filesExplorerState.dragDepth = Math.max(0, Number(filesExplorerState.dragDepth || 0) - 1);
      if (filesExplorerState.dragDepth <= 0) {
        filesUploadForm.classList.remove("drag-active");
      }
    });
  });
  filesUploadForm.addEventListener("drop", async (event) => {
    if (!filesModalContext.canUpload) return;
    event.preventDefault();
    filesExplorerState.dragDepth = 0;
    filesUploadForm.classList.remove("drag-active");
    const files = await collectDroppedFiles(event.dataTransfer);
    if (!files.length) return;
    const containsFolderStructure = files.some((file) => normalizeExplorerPathLocal(String(file && file.webkitRelativePath || "")).includes("/"));
    if (containsFolderStructure && canUseFilesFolderUpload()) {
      await uploadFolderInModal(files);
      return;
    }
    if (assignFilesToUploadInput(files)) {
      await uploadFilesInModal();
    }
  });
}
if (filesHeadSelect instanceof HTMLInputElement) {
  filesHeadSelect.addEventListener("change", () => {
    toggleFilesBatchSelectAll(Boolean(filesHeadSelect.checked));
  });
}
if (filesList) {
  filesList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== "checkbox") return;
    const rowKey = decodeURIComponent(String(target.dataset.filesBatchId || ""));
    if (!rowKey) return;
    setFilesBatchSelection(rowKey, Boolean(target.checked));
  });
  filesList.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-files-row-rename-input]")) return;
    updateFilesInlineRenameValue(target.value);
  });
  filesList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const emptyActionBtn = target.closest("[data-files-empty-action]");
    if (emptyActionBtn instanceof HTMLElement) {
      const action = String(emptyActionBtn.dataset.filesEmptyAction || "").trim();
      event.preventDefault();
      event.stopPropagation();
      if (action === "clear-search") {
        clearFilesSearchFilter();
      } else if (action === "upload") {
        openFilesUploadChooser();
      } else if (action === "new-folder") {
        void createFilesFolderFromPrompt();
      }
      return;
    }
    const renameSaveBtn = target.closest("[data-files-row-rename-save]");
    if (renameSaveBtn instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      void submitFilesInlineRename();
      return;
    }
    const renameCancelBtn = target.closest("[data-files-row-rename-cancel]");
    if (renameCancelBtn instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      cancelFilesInlineRename();
      return;
    }
    if (target.closest("[data-files-row-rename-input]") || target.closest("[data-files-row-rename-controls]")) {
      return;
    }
    const menuBtn = target.closest("[data-files-row-menu]");
    if (menuBtn instanceof HTMLElement) {
      const rowEl = menuBtn.closest("[data-files-row-id]");
      if (!(rowEl instanceof HTMLElement)) return;
      const id = decodeURIComponent(String(rowEl.dataset.filesRowId || ""));
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = menuBtn.getBoundingClientRect();
      const menuLeft = Math.round(Math.min(bounds.right, window.innerWidth - 8));
      const menuTop = Math.round(Math.min(bounds.bottom + 6, window.innerHeight - 8));
      setSelectedFilesRow(id);
      const row = findFilesRowByKey(id);
      openFilesContextMenu(menuLeft, menuTop, row);
      return;
    }
    if (target instanceof HTMLInputElement && target.type === "checkbox") return;
    const row = target.closest("[data-files-row-id]");
    if (!(row instanceof HTMLElement)) return;
    const id = decodeURIComponent(String(row.dataset.filesRowId || ""));
    if (!id) return;
    setSelectedFilesRow(id);
    const now = Date.now();
    const isRepeatedClick = filesLastActivatedRowId === id && now - filesLastActivatedAt <= 380;
    filesLastActivatedRowId = id;
    filesLastActivatedAt = now;
    if (isRepeatedClick) {
      filesLastActivatedRowId = "";
      filesLastActivatedAt = 0;
      void activateSelectedFilesRow();
    }
  });
  filesList.addEventListener("dblclick", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-files-row-rename-input]") || target.closest("[data-files-row-rename-controls]")) return;
    if (target.closest("[data-files-row-menu]")) return;
    if (target instanceof HTMLInputElement && target.type === "checkbox") return;
    const rowEl = target.closest("[data-files-row-id]");
    if (!(rowEl instanceof HTMLElement)) return;
    const id = decodeURIComponent(String(rowEl.dataset.filesRowId || ""));
    if (!id) return;
    setSelectedFilesRow(id);
    filesLastActivatedRowId = "";
    filesLastActivatedAt = 0;
    await activateSelectedFilesRow();
  });
  filesList.addEventListener("contextmenu", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    event.preventDefault();
    const rowEl = target.closest("[data-files-row-id]");
    let row = null;
    if (rowEl instanceof HTMLElement) {
      const id = decodeURIComponent(String(rowEl.dataset.filesRowId || ""));
      if (id) {
        setSelectedFilesRow(id);
        row = findFilesRowByKey(id);
      }
    }
    openFilesContextMenu(event.clientX, event.clientY, row);
  });
  filesList.addEventListener("scroll", () => {
    closeFilesContextMenu();
  });
  filesList.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rowEl = target.closest("[data-files-row-id]");
    if (!(rowEl instanceof HTMLElement)) return;
    const id = decodeURIComponent(String(rowEl.dataset.filesRowId || ""));
    if (!id) return;
    const row = findFilesRowByKey(id);
    const payload = getFilesDragPayloadFromRow(row);
    if (!payload) {
      event.preventDefault();
      return;
    }
    filesDragState = payload;
    clearFilesDropTarget();
    closeFilesContextMenu();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(payload.rowKey || ""));
      event.dataTransfer.setData("application/x-procal-files-drag", JSON.stringify(payload));
    }
    rowEl.classList.add("dragging");
  });
  filesList.addEventListener("dragend", (event) => {
    const target = event.target;
    if (target instanceof Element) {
      const rowEl = target.closest("[data-files-row-id]");
      if (rowEl instanceof HTMLElement) rowEl.classList.remove("dragging");
    }
    filesDragState = null;
    clearFilesDropTarget();
  });
  filesList.addEventListener("dragover", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const payload = readFilesDragPayload(event);
    if (!payload) return;
    const dropTargetEl = target.closest("[data-files-drop-root]");
    let targetRoot = getFilesCurrentRoot();
    let targetPath = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
    if (dropTargetEl instanceof HTMLElement) {
      targetRoot = String(dropTargetEl.dataset.filesDropRoot || "").trim() || targetRoot;
      targetPath = decodeURIComponent(String(dropTargetEl.dataset.filesDropPath || ""));
    } else {
      const rowEl = target.closest("[data-files-row-id]");
      if (rowEl instanceof HTMLElement) return;
    }
    if (!isFilesDropAllowed(payload, targetRoot, targetPath)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    setFilesDropTarget(targetRoot, targetPath);
  });
  filesList.addEventListener("drop", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const payload = readFilesDragPayload(event);
    if (!payload) return;
    const dropTargetEl = target.closest("[data-files-drop-root]");
    let targetRoot = getFilesCurrentRoot();
    let targetPath = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
    if (dropTargetEl instanceof HTMLElement) {
      targetRoot = String(dropTargetEl.dataset.filesDropRoot || "").trim() || targetRoot;
      targetPath = decodeURIComponent(String(dropTargetEl.dataset.filesDropPath || ""));
    } else {
      const rowEl = target.closest("[data-files-row-id]");
      if (rowEl instanceof HTMLElement) return;
    }
    if (!isFilesDropAllowed(payload, targetRoot, targetPath)) return;
    event.preventDefault();
    await applyFilesDragMove(payload, targetRoot, targetPath);
  });
  filesList.addEventListener("dragleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && filesList.contains(related)) return;
    clearFilesDropTarget();
  });
  filesList.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-files-row-rename-input]")) return;
    if (event.key === "Enter") {
      event.preventDefault();
      void submitFilesInlineRename();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelFilesInlineRename();
    }
  });
}
document.addEventListener("click", (event) => {
  if (!filesContextMenuOpen) return;
  const target = event.target;
  if (target instanceof Element && target.closest("#filesContextMenu")) return;
  closeFilesContextMenu();
});
document.addEventListener("click", (event) => {
  if (!filesUploadPickerMenuOpen) return;
  const target = event.target;
  if (target instanceof Element && (target.closest("#filesUploadBtn") || target.closest("#filesUploadPickerMenu"))) return;
  closeFilesUploadPickerMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeFilesContextMenu();
    closeFilesUploadPickerMenu();
    closeFilesOperationPanel();
  }
});
window.addEventListener("resize", () => {
  closeFilesContextMenu();
  closeFilesUploadPickerMenu();
});
if (filesBreadcrumbs) {
  filesBreadcrumbs.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest("[data-files-path-crumb]");
    if (!(btn instanceof HTMLElement)) return;
    const nextPath = decodeURIComponent(String(btn.dataset.filesPathCrumb || ""));
    await navigateFilesToPath(nextPath);
  });
}
if (filesBackBtn) {
  filesBackBtn.addEventListener("click", async () => {
    await navigateFilesBack();
  });
}
if (filesUpBtn) {
  filesUpBtn.addEventListener("click", async () => {
    await navigateFilesUp();
  });
}
if (filesNewFolderBtn) {
  filesNewFolderBtn.addEventListener("click", async () => {
    await createFilesFolderFromPrompt();
  });
}
if (filesUploadToggleBtn) {
  filesUploadToggleBtn.addEventListener("click", () => {
    if (!filesModalContext.canUpload) return;
    filesUploadExpanded = !filesUploadExpanded;
    updateFilesContextUI();
    if (filesUploadExpanded) {
      setTimeout(() => {
        try { if (filesUploadInput) filesUploadInput.focus(); } catch {}
      }, 0);
    }
  });
}
if (filesRenameFolderBtn) {
  filesRenameFolderBtn.addEventListener("click", async () => {
    await renameSelectedFilesFolder();
  });
}
if (filesMoveFolderBtn) {
  filesMoveFolderBtn.addEventListener("click", async () => {
    await moveSelectedFilesFolder();
  });
}
if (filesDeleteFolderBtn) {
  filesDeleteFolderBtn.addEventListener("click", async () => {
    await deleteSelectedFilesFolder();
  });
}
if (filesMoveFileBtn) {
  filesMoveFileBtn.addEventListener("click", async () => {
    await moveSelectedFilesFile();
  });
}
if (filesOpenEventBtn) {
  filesOpenEventBtn.addEventListener("click", () => {
    openSelectedFilesEvent();
  });
}
if (filesOpenFolderBtn) {
  filesOpenFolderBtn.addEventListener("click", async () => {
    await openSelectedFilesFolder();
  });
}
if (filesOperationCancelBtn) {
  filesOperationCancelBtn.addEventListener("click", () => {
    closeFilesOperationPanel();
  });
}
if (filesOperationApplyBtn) {
  filesOperationApplyBtn.addEventListener("click", async () => {
    await applyFilesOperationPanel();
  });
}
if (filesOperationPickerTree) {
  filesOperationPickerTree.addEventListener("click", (event) => {
    const toggle = event.target && event.target.closest("[data-files-operation-toggle-root]");
    if (toggle && filesOperationState && filesOperationState.usePicker) {
      const nextRoot = String(toggle.dataset.filesOperationToggleRoot || "").trim();
      const nextPath = decodeURIComponent(String(toggle.dataset.filesOperationTogglePath || ""));
      const nodeKey = `${nextRoot}:${normalizeExplorerPathLocal(nextPath)}`;
      if (filesOperationTreeExpanded.has(nodeKey)) filesOperationTreeExpanded.delete(nodeKey);
      else filesOperationTreeExpanded.add(nodeKey);
      renderFilesOperationPicker();
      return;
    }
    const target = event.target && event.target.closest("[data-files-operation-target-root]");
    if (!target || !filesOperationState || !filesOperationState.usePicker) return;
    const nextRoot = String(target.dataset.filesOperationTargetRoot || filesOperationState.root || "").trim();
    const nextPath = decodeURIComponent(String(target.dataset.filesOperationTargetPath || ""));
    filesOperationState.selectedRoot = nextRoot;
    filesOperationState.selectedPath = normalizeExplorerPathLocal(nextPath);
    renderFilesOperationPicker();
  });
}
if (filesOperationInput) {
  filesOperationInput.addEventListener("keydown", async (event) => {
    if (filesOperationInput.classList.contains("hidden-section")) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    await applyFilesOperationPanel();
  });
}
if (filesPreviewBtn) {
  filesPreviewBtn.addEventListener("click", async () => {
    await previewSelectedFilesRow();
  });
}
if (filesDownloadBtn) {
  filesDownloadBtn.addEventListener("click", async () => {
    await downloadSelectedFilesRow();
  });
}
if (filesBatchDownloadBtn) {
  filesBatchDownloadBtn.addEventListener("click", async () => {
    await downloadSelectedFilesBatch();
  });
}
if (filesBatchDeleteBtn) {
  filesBatchDeleteBtn.addEventListener("click", async () => {
    await deleteSelectedFilesBatch();
  });
}
if (filesDownloadArchiveBtn) {
  filesDownloadArchiveBtn.addEventListener("click", async () => {
    await downloadMyFilesArchive();
  });
}
if (filesDeleteBtn) {
  filesDeleteBtn.addEventListener("click", async () => {
    await deleteSelectedFilesRow();
  });
}
[
  [eventTimePickerBtn, eventTime, () => t("startTime")],
  [eventTimeEndPickerBtn, eventTimeEnd, () => t("endTime")],
  [timelineWorkingStartPickerBtn, timelineWorkingStart, () => t("timelineWorkingStart")],
  [timelineWorkingEndPickerBtn, timelineWorkingEnd, () => t("timelineWorkingEnd")],
  [timelineVisibleStartPickerBtn, timelineVisibleStart, () => t("timelineVisibleStart")],
  [timelineVisibleEndPickerBtn, timelineVisibleEnd, () => t("timelineVisibleEnd")]
].forEach(([button, input, getLabel]) => {
  if (!button || !input) return;
  button.addEventListener("click", () => {
    openTimePickerForInput(input, typeof getLabel === "function" ? getLabel() : t("time"));
  });
});
if (closeTimePickerBtn) {
  closeTimePickerBtn.addEventListener("click", () => {
    closeModalElement(timePickerModal);
  });
}
if (timePickerListSelect) {
  timePickerListSelect.addEventListener("dblclick", () => {
    applyTimePickerSelection();
  });
}
if (clearTimePickerBtn) {
  clearTimePickerBtn.addEventListener("click", () => {
    clearTimePickerSelection();
  });
}
if (applyTimePickerBtn) {
  applyTimePickerBtn.addEventListener("click", () => {
    applyTimePickerSelection();
  });
}
if (timePickerModal) {
  timePickerModal.addEventListener("click", (event) => {
    if (event.target === timePickerModal) closeModalElement(timePickerModal);
  });
}
if (bugReportForm) {
  bugReportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitBugReport();
  });
}
if (addStickyNoteBtn) {
  addStickyNoteBtn.addEventListener("click", () => openStickyNoteForm());
}
if (closeStickyNoteBtn) {
  closeStickyNoteBtn.addEventListener("click", () => resetStickyNoteForm());
}
if (cancelStickyNoteBtn) {
  cancelStickyNoteBtn.addEventListener("click", () => resetStickyNoteForm());
}
if (stickyNoteForm) {
  stickyNoteForm.addEventListener("submit", handleStickyNoteSubmit);
}
if (saveStickyNoteBtn) {
  saveStickyNoteBtn.addEventListener("click", (event) => {
    if (!stickyNoteForm) return;
    event.preventDefault();
    if (typeof stickyNoteForm.requestSubmit === "function") {
      stickyNoteForm.requestSubmit();
    } else {
      handleStickyNoteSubmit(event);
    }
  });
}
if (stickyNoteModal) {
  stickyNoteModal.addEventListener("click", (event) => {
    if (event.target === stickyNoteModal) resetStickyNoteForm();
  });
}
renderStickyNotePalette();
if (stickyShareForm) {
  stickyShareForm.addEventListener("submit", handleStickyShareSubmit);
}
if (closeStickyShareBtn) {
  closeStickyShareBtn.addEventListener("click", closeStickyShareModal);
}
if (stickyShareCancelBtn) {
  stickyShareCancelBtn.addEventListener("click", closeStickyShareModal);
}
if (stickyShareSelectAllBtn) {
  stickyShareSelectAllBtn.addEventListener("click", () => setStickyShareRecipients(true));
}
if (stickyShareClearAllBtn) {
  stickyShareClearAllBtn.addEventListener("click", () => setStickyShareRecipients(false));
}
if (stickyShareModal) {
  stickyShareModal.addEventListener("click", (event) => {
    if (event.target === stickyShareModal) closeStickyShareModal();
  });
}
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".sticky-note-menu-wrap")) return;
  document.querySelectorAll(".sticky-note-menu").forEach((menu) => menu.classList.add("hidden"));
});
function setMenuMessage(text, isError) {
  const targets = [menuMsg, profileMsg].filter(Boolean);
  if (!targets.length) return;
  targets.forEach((target) => {
    target.textContent = text || "";
    target.style.color = isError ? "#b91c1c" : "#6b7280";
  });
}

async function doLogout() {
  await unregisterAndroidPushDevice();
  if (window.dataProvider && typeof window.dataProvider.clearAuth === "function") {
    await window.dataProvider.clearAuth({
      redirectTo: resolveRuntimePath("/login")
    });
    return;
  }
  localStorage.removeItem("procal_access_token");
  location.href = resolveRuntimePath("/login");
}

if (menuAdminBtn) {
  menuAdminBtn.addEventListener("click", () => {
    closeSettingsMenu();
    location.href = resolveRuntimePath("/admin.html");
  });
}
if (menuLogoutBtn) {
  menuLogoutBtn.addEventListener("click", async () => {
    await doLogout();
  });
}
if (menuProfileBtn) {
  menuProfileBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openProfileModal();
  });
}
if (menuGuideBtn) {
  menuGuideBtn.addEventListener("click", () => {
    closeSettingsMenu();
    window.open(resolveRuntimePath("/USER_GUIDE.html"), "_blank", "noopener,noreferrer");
  });
}
if (menuMobileAppBtn) {
  menuMobileAppBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openMobileAppDownload();
  });
}
if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    closeProfileModal();
  });
}
if (profileModal) {
  profileModal.addEventListener("click", (event) => {
    if (event.target === profileModal) closeProfileModal();
  });
}

if (saveMyProfileBtn) {
  saveMyProfileBtn.addEventListener("click", async () => {
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      const payload = {
        nickname: String((profileNicknameInput && profileNicknameInput.value) || "").trim(),
        fullName: String((profileFullNameInput && profileFullNameInput.value) || "").trim(),
        workplace: String((profileWorkplaceInput && profileWorkplaceInput.value) || "").trim(),
        jobTitle: String((profileJobTitleInput && profileJobTitleInput.value) || "").trim()
      };
      if (!payload.nickname || !payload.fullName || !payload.workplace || !payload.jobTitle) {
        setMenuMessage("Fill all profile fields.", true);
        return;
      }
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMenuMessage(String((body && body.error) || "Failed to save profile."), true);
        return;
      }
      if (body && body.user) {
        applyProfileUpdateLocally(body.user);
      }
      currentUserProfileIncomplete = Boolean(body && body.profileIncomplete);
      if (!currentUserProfileIncomplete) {
        setMenuMessage("Profile saved.", false);
        window.setTimeout(() => closeProfileModal(), 250);
        return;
      }
      setMenuMessage("Profile saved, but some required fields are still missing.", true);
    } catch {
      setMenuMessage("Failed to save profile.", true);
    }
  });
}


if (manageHostedPasswordBtn) {
  manageHostedPasswordBtn.addEventListener("click", () => {
    openHostedPasswordPortal();
  });
}
if (saveMyViewModeBtn) {
  saveMyViewModeBtn.addEventListener("click", async () => {
    try {
      const token = localStorage.getItem("procal_access_token");
      if (!token || !myViewModeSelect) return;
      const res = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({ viewMode: myViewModeSelect.value })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMenuMessage(String((body && body.error) || "Failed to save view mode"), true);
        return;
      }
      currentUserViewMode = myViewModeSelect.value;
      applyUserViewMode();
      setMenuMessage("View mode saved.", false);
    } catch {
      setMenuMessage("Failed to save view mode.", true);
    }
  });
}

if (calendarModeSelect) {
  calendarModeSelect.addEventListener("change", () => {
    switchCalendarMode(calendarModeSelect.value);
  });
}
if (refreshUsersBtn) {
  refreshUsersBtn.addEventListener("click", async () => {
    await loadAdminUsers();
  });
}


closeDayMenuBtn.addEventListener("click", () => {
  closeDayMenu();
});
if (closeEventPreviewBtn) {
  closeEventPreviewBtn.addEventListener("click", () => {
    closeEventPreview();
  });
}
if (eventPreviewEditBtn) {
  eventPreviewEditBtn.addEventListener("click", () => {
    if (!previewEventSeriesId) return;
    openEventEditModal(previewEventSeriesId, previewEventDateKey || selectedDateKey);
  });
}
if (eventPreviewAddTaskBtn) {
  eventPreviewAddTaskBtn.addEventListener("click", () => {
    if (!previewEventSnapshot) return;
    openLinkedTaskCreateForEvent(previewEventSnapshot, previewEventDateKey || selectedDateKey || previewEventSnapshot.startDate);
  });
}
if (eventPreviewFilesBtn) {
  eventPreviewFilesBtn.addEventListener("click", async () => {
    const eventKey = getCurrentEventFileKey();
    if (!eventKey) return;
    const startPath = await resolveEventFilesStartPath(eventKey);
    openFilesModal({ mode: "event", eventKey, path: startPath });
  });
}
if (eventPreviewProgramBtn) {
  eventPreviewProgramBtn.addEventListener("click", async () => {
    await previewCurrentEventProgram();
  });
}
if (eventPreviewDeleteBtn) {
  eventPreviewDeleteBtn.addEventListener("click", () => {
    if (!previewEventSeriesId) return;
    if (!canManageEventAndAbsenceChanges()) return;
    if (previewEventSnapshot && isSharedEventReadOnlyInPersonalMode(previewEventSnapshot)) return;
    if (!window.confirm(t("confirmDeleteEvent"))) return;
    deleteEventById(previewEventSeriesId);
    if (editingEventSeriesId === previewEventSeriesId) startEventCreateMode(selectedDateKey);
    persistState();
    closeEventPreview();
    renderCalendar();
    renderSelectedDayPanel();
    renderUpcomingList();
  });
}

closePeopleMenuBtn.addEventListener("click", () => {
  closePeopleMenu();
});

closeSettingsMenuBtn.addEventListener("click", () => {
  closeSettingsMenu();
});

closeFiltersMenuBtn.addEventListener("click", () => {
  closeFiltersMenu();
});

closeCategoriesMenuBtn.addEventListener("click", () => {
  closeCategoriesMenu();
  closeReportsMenu();
  closeCompensationMenu();
  closeFiltersMenu();
});

if (openEventFormBtn) {
  openEventFormBtn.addEventListener("click", () => {
    if (!canOpenEventCreateInCurrentCalendar()) return;
    startEventCreateMode();
    hideDayActionChoices();
    setDayMenuSectionMode("event");
    renderAbsentOptionsForRange();
  });
}

if (openAbsenceFormBtn) {
  openAbsenceFormBtn.addEventListener("click", () => {
    if (!canManageEventAndAbsenceChanges()) return;
    hideDayActionChoices();
    setDayMenuSectionMode("absence");
    startAbsenceCreateMode(selectedDateKey);
  });
}

if (openTaskFormBtn) {
  openTaskFormBtn.addEventListener("click", () => {
    if (!canOpenTaskCreateInCurrentCalendar()) return;
    hideDayActionChoices();
    setDayMenuSectionMode("task");
    if (selectedDateKey) renderStandaloneTaskList(selectedDateKey);
  });
}

toggleEventTasksBtn.addEventListener("click", () => {
  eventTasksEditorWrap.classList.toggle("hidden-section");
  updateEventTasksToggleLabel();
});

eventTaskAddBtn.addEventListener("click", () => {
  if (!canCreateTasksInCurrentCalendar()) return;
  const title = String(eventTaskTitle.value || "").trim();
  if (!title) return;
  const rangeStart = isDateKey(eventStart && eventStart.value) ? String(eventStart.value) : selectedDateKey;
  const rangeEnd = isDateKey(eventEnd && eventEnd.value) ? String(eventEnd.value) : selectedDateKey;
  const blockedAssignees = getAbsentPersonIdsForRange(rangeStart, rangeEnd);
  const personIds = getSelectedPersonIds(eventTaskPeopleChecklist).filter((id) => !blockedAssignees.has(id));
  if (personIds.some((id) => !people.some((p) => p.id === id))) return;
  draftEventTasks.push({ id: createTaskId(), title, personIds, done: false });
  eventTaskTitle.value = "";
  renderPeopleChecklist(eventTaskPeopleChecklist, []);
  refreshEventTaskChecklistAvailability();
  renderEventDraftTaskList();
});

reportsBtn.addEventListener("click", () => {
  closeSettingsMenu();
  openReportsMenu();
});
if (mediaMonitoringBtn) {
  mediaMonitoringBtn.addEventListener("click", () => {
    closeSettingsMenu();
    window.location.href = resolveRuntimePath("/media-monitoring");
  });
}
if (filesBtn) {
  filesBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openFilesModal({ mode: "shared" });
  });
}
if (leaveBtn) {
  leaveBtn.addEventListener("click", () => {
    closeSettingsMenu();
    window.location.href = resolveRuntimePath("/leave");
  });
}
if (currentUserLeaveBtn) {
  currentUserLeaveBtn.addEventListener("click", async () => {
    await openLeaveQuickModal();
  });
}
if (closeLeaveQuickBtn) {
  closeLeaveQuickBtn.addEventListener("click", () => {
    closeLeaveQuickModal();
  });
}
if (leaveQuickModal) {
  leaveQuickModal.addEventListener("click", (event) => {
    if (event.target === leaveQuickModal) closeLeaveQuickModal();
  });
}
if (leaveQuickPrevBtn) {
  leaveQuickPrevBtn.addEventListener("click", async () => {
    leaveQuickMonth = new Date(leaveQuickMonth.getFullYear(), leaveQuickMonth.getMonth() - 1, 1);
    await refreshLeaveQuickModalData();
  });
}
if (leaveQuickNextBtn) {
  leaveQuickNextBtn.addEventListener("click", async () => {
    leaveQuickMonth = new Date(leaveQuickMonth.getFullYear(), leaveQuickMonth.getMonth() + 1, 1);
    await refreshLeaveQuickModalData();
  });
}
if (leaveQuickRequestBtn) {
  leaveQuickRequestBtn.addEventListener("click", async () => {
    await openLeaveRequestModal();
  });
}
if (closeLeaveRequestBtn) {
  closeLeaveRequestBtn.addEventListener("click", () => {
    closeLeaveRequestModal();
  });
}
if (leaveRequestModal) {
  leaveRequestModal.addEventListener("click", (event) => {
    if (event.target === leaveRequestModal) closeLeaveRequestModal();
  });
}
if (leaveRequestType) {
  leaveRequestType.addEventListener("change", async () => {
    await refreshLeaveRequestSourceYearOptions();
  });
}
if (leaveRequestForm) {
  leaveRequestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitLeaveRequest();
  });
}

if (compensationBtn) {
  compensationBtn.addEventListener("click", () => {
    closeSettingsMenu();
    openCompensationMenu();
  });
}
closeReportsBtn.addEventListener("click", () => {
  closeReportsMenu();
});
if (closeCompensationBtn) {
  closeCompensationBtn.addEventListener("click", () => {
    closeCompensationMenu();
  });
}
if (compensationMenu) {
  compensationMenu.addEventListener("click", (event) => {
    if (event.target === compensationMenu) closeCompensationMenu();
  });
}
if (compLogModal) {
  compLogModal.addEventListener("click", (event) => {
    if (event.target === compLogModal) closeCompLogModal();
  });
}
if (closeCompLogBtn) closeCompLogBtn.addEventListener("click", closeCompLogModal);

eventStart.addEventListener("change", () => {
  syncEventEndDateWithStartDate();
  renderAbsentOptionsForRange();
  syncRepeatUntilMin();
});

eventEnd.addEventListener("change", () => {
  syncEventEndDateWithStartDate();
  renderAbsentOptionsForRange();
  syncRepeatUntilMin();
});

if (eventAllDay) {
  eventAllDay.addEventListener("change", () => {
    syncEventTimeInputState();
  });
}

if (eventFormDetailsTabBtn) {
  eventFormDetailsTabBtn.addEventListener("click", () => {
    setEventFormTab("details");
  });
}

if (eventFormRemindersTabBtn) {
  eventFormRemindersTabBtn.addEventListener("click", () => {
    setEventFormTab("reminders");
  });
}

if (eventFormFilesTabBtn) {
  eventFormFilesTabBtn.addEventListener("click", () => {
    if (!canUseFilesModule()) return;
    setEventFormTab("files");
  });
}

if (eventReminderEnabled) {
  eventReminderEnabled.addEventListener("change", () => {
    refreshEventReminderUi();
  });
}

if (eventReminderRecipients) {
  eventReminderRecipients.addEventListener("change", () => {
    refreshEventReminderUi();
  });
}

if (eventReminderAllDayTimePickerBtn && eventReminderAllDayTime) {
  eventReminderAllDayTimePickerBtn.addEventListener("click", () => {
    openTimePickerForInput(eventReminderAllDayTime, t("eventReminderAllDayTime"));
  });
}

if (eventFilesFolderEnabled) {
  eventFilesFolderEnabled.addEventListener("change", () => {
    refreshEventFilesSettingsUi();
  });
}

if (eventFilesDetached) {
  eventFilesDetached.addEventListener("change", () => {
    refreshEventFilesSettingsUi();
  });
}

if (openDayTimelineSettingsBtn) {
  openDayTimelineSettingsBtn.addEventListener("click", () => {
    openModalElement(dayTimelineSettingsModal);
  });
}
if (dayTimelinePrevBtn) {
  dayTimelinePrevBtn.addEventListener("click", () => {
    shiftSelectedTimelineDay(-1);
  });
}
if (dayTimelineNextBtn) {
  dayTimelineNextBtn.addEventListener("click", () => {
    shiftSelectedTimelineDay(1);
  });
}
if (closeDayTimelineSettingsBtn) {
  closeDayTimelineSettingsBtn.addEventListener("click", () => {
    closeModalElement(dayTimelineSettingsModal);
  });
}
if (dayTimelineSettingsModal) {
  dayTimelineSettingsModal.addEventListener("click", (event) => {
    if (event.target === dayTimelineSettingsModal) closeModalElement(dayTimelineSettingsModal);
  });
}

[timelineWorkingStart, timelineWorkingEnd, timelineVisibleStart, timelineVisibleEnd].forEach((input) => {
  if (!input) return;
  input.addEventListener("change", () => {
    updateDayTimelinePrefsFromInputs();
    renderDayTimelinePanel();
  });
});

if (timelineAutoFit) {
  timelineAutoFit.addEventListener("change", () => {
    updateDayTimelinePrefsFromInputs();
    renderDayTimelinePanel();
  });
}

repeatFreq.addEventListener("change", () => {
  updateRepeatVisibility();
  refreshEventReminderUi();
});

repeatEndMode.addEventListener("change", () => {
  updateRepeatVisibility();
});

dayMenu.addEventListener("click", (event) => {
  if (event.target === dayMenu) closeDayMenu();
});

if (eventPreviewModal) {
  eventPreviewModal.addEventListener("click", (event) => {
    if (event.target === eventPreviewModal) closeEventPreview();
  });
}

peopleMenu.addEventListener("click", (event) => {
  if (event.target === peopleMenu) closePeopleMenu();
});

settingsMenu.addEventListener("click", (event) => {
  if (event.target === settingsMenu) closeSettingsMenu();
});

categoriesMenu.addEventListener("click", (event) => {
  if (event.target === categoriesMenu) closeCategoriesMenu();
});

filtersMenu.addEventListener("click", (event) => {
  if (event.target === filtersMenu) closeFiltersMenu();
});

window.addEventListener("resize", () => {
  if (settingsMenu && !settingsMenu.classList.contains("hidden")) {
    positionSettingsMenu();
  }
});

reportsMenu.addEventListener("click", (event) => {
  if (event.target === reportsMenu) closeReportsMenu();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(".day-quick-add")) closeAllDayQuickAddMenus();
  if (!target.closest(".side-item-menu")) closeAllSideItemMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeModalElement(eventProgramModal);
  closeModalElement(dayTimelineSettingsModal);
  closeModalElement(timePickerModal);
  closeDayMenu();
  closeNotificationsMenu();
  closeEventPreview();
  closePeopleMenu();
  closeSettingsMenu();
  closeCategoriesMenu();
  closeReportsMenu();
  closeCompensationMenu();
  closeFiltersMenu();
  closeFilesModal();
  closeFilePreviewModal();
  closeAllDayQuickAddMenus();
  closeAllSideItemMenus();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    scheduleFileSave();
    return;
  }
  queuePeopleDirectorySync();
  refreshAndroidShellState();
  void syncAndroidPushRegistration(false);
});

window.addEventListener("focus", () => {
  refreshAndroidShellState();
  void syncAndroidPushRegistration(false);
});

window.addEventListener("beforeunload", () => {
  scheduleFileSave();
});

clearFiltersBtn.addEventListener("click", () => {
  activeFilters.categoryIds.clear();
  activeFilters.peopleIds.clear();
  persistUiPrefs();
  updateFiltersButtonState();
  renderFilters();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!selectedDateKey || !canManageEventAndAbsenceChanges()) return;
  if (!editingEventSeriesId && !canCreateEventsInCurrentCalendar()) return;

  const formData = new FormData(eventForm);
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const startTimeRaw = String(formData.get("time") || "").trim();
  const endTimeRaw = String(formData.get("timeEnd") || "").trim();
  const explicitAllDay = Boolean(formData.get("allDay"));
  const startDate = String(formData.get("eventStart") || "");
  const endDate = String(formData.get("eventEnd") || "");
  const recFreq = String(formData.get("repeatFreq") || "none");
  const recEndMode = String(formData.get("repeatEndMode") || "forever");
  const recCount = Number.parseInt(String(formData.get("repeatCount") || "0"), 10);
  const recUntil = String(formData.get("repeatUntil") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const chosenPeople = dedupeStrings(getCheckedPeopleIds());
  const chosenAbsent = dedupeStrings(formData.getAll("absent").map((v) => String(v)));
  const blockedForEvent = getAbsentPersonIdsForRange(startDate, endDate);
  const peopleIds = filterPeopleIds(chosenPeople).filter((id) => !blockedForEvent.has(id));
  const absentIds = filterPeopleIds(chosenAbsent).filter((id) => blockedForEvent.has(id));
  const filesSettings = getEventFilesFormState();
  const reminders = readEventReminderFormState();

  if (!title) return;
  if (!isDateKey(startDate) || !isDateKey(endDate)) return;
  if (startDate > endDate) return;
  if (!categories.some((item) => item.id === categoryId)) return;

  const timeMeta = window.ProCalModules && window.ProCalModules.eventTimeMeta;
  const parsedStartTime = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
    ? timeMeta.parseTimeToMinutes(startTimeRaw)
    : null;
  const parsedEndTime = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
    ? timeMeta.parseTimeToMinutes(endTimeRaw)
    : null;
  let isAllDay = explicitAllDay || (!startTimeRaw && !endTimeRaw);
  let startTime = "";
  let endTime = "";
  let time = "";
  if (!isAllDay) {
    const invalidTimeMessage = currentLang === "bg" ? "Използвай ЧЧ:ММ" : "Use HH:MM";
    const invalidTimeStepMessage = currentLang === "bg" ? "Използвай ЧЧ:ММ през 15 минути" : "Use HH:MM in 15-minute steps";
    if (parsedStartTime == null) {
      if (eventTime) {
        eventTime.setCustomValidity(invalidTimeMessage);
        eventTime.reportValidity();
      }
      return;
    }
    if (eventTime) eventTime.setCustomValidity("");
    if (endTimeRaw && parsedEndTime == null) {
      if (eventTimeEnd) {
        eventTimeEnd.setCustomValidity(invalidTimeMessage);
        eventTimeEnd.reportValidity();
      }
      return;
    }
    if (eventTimeEnd) eventTimeEnd.setCustomValidity("");
    if (parsedStartTime % 15 !== 0) {
      if (eventTime) {
        eventTime.setCustomValidity(invalidTimeStepMessage);
        eventTime.reportValidity();
      }
      return;
    }
    if (eventTime) eventTime.setCustomValidity("");
    if (parsedEndTime != null && parsedEndTime !== 24 * 60 && parsedEndTime % 15 !== 0) {
      if (eventTimeEnd) {
        eventTimeEnd.setCustomValidity(invalidTimeStepMessage);
        eventTimeEnd.reportValidity();
      }
      return;
    }
    if (eventTimeEnd) eventTimeEnd.setCustomValidity("");
    startTime = timeMeta && typeof timeMeta.minutesToTime === "function"
      ? timeMeta.minutesToTime(parsedStartTime)
      : startTimeRaw;
    const defaultEndMinutes = parsedEndTime != null
      ? parsedEndTime
      : (startDate === endDate ? Math.min(parsedStartTime + 60, 24 * 60) : parsedStartTime);
    if (startDate === endDate && defaultEndMinutes <= parsedStartTime) return;
    endTime = timeMeta && typeof timeMeta.minutesToTime === "function"
      ? timeMeta.minutesToTime(defaultEndMinutes)
      : endTimeRaw;
    if (endTime === "24:00") endTime = "";
    time = startTime;
  }

  const recurrence = buildRecurrenceRule(recFreq, recEndMode, recCount, recUntil, startDate);
  if (recFreq !== "none" && !recurrence) return;
  if (reminders.enabled) {
    const allDayReminderRaw = String(reminders.allDayTime || "09:00").trim();
    const parsedAllDayReminder = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
      ? timeMeta.parseTimeToMinutes(allDayReminderRaw)
      : null;
    if (parsedAllDayReminder == null || parsedAllDayReminder >= 24 * 60) {
      if (eventReminderAllDayTime) {
        eventReminderAllDayTime.setCustomValidity(currentLang === "bg" ? "Използвай ЧЧ:ММ" : "Use HH:MM");
        eventReminderAllDayTime.reportValidity();
      }
      setEventFormTab("reminders");
      return;
    }
    if (eventReminderAllDayTime) eventReminderAllDayTime.setCustomValidity("");
  }

  const entry = {
    id: editingEventSeriesId || createId(),
    title,
    description,
    time,
    startTime,
    endTime,
    isAllDay,
    startDate,
    endDate,
    categoryId,
    peopleIds,
    absentIds,
    filesFolderEnabled: Boolean(filesSettings.filesFolderEnabled),
    filesDetached: Boolean(filesSettings.filesDetached),
    reminders,
    recurrence,
    tasks: draftEventTasks.map((task) => ({ ...task }))
  };
  if (editingEventSeriesId) deleteEventById(editingEventSeriesId);
  const events = eventsByDate[startDate] || [];
  events.push(entry);
  events.sort(sortEvents);
  eventsByDate[startDate] = events;
  persistState();
  editingEventSeriesId = entry.id;
  applyTranslations();

  const programSyncOk = await syncEventProgramForEvent(entry.id);
  if (!programSyncOk) {
    renderCalendar();
    renderSelectedDayPanel();
    renderUpcomingList();
    return;
  }

  editingEventSeriesId = null;
  draftEventTasks = [];
  resetEventProgramState({ closeModal: true, clearExisting: true });
  suppressDayMenuOpen(320);
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
  closeDayMenu();
});

absenceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!LEGACY_ABSENCE_EDIT_ENABLED) return;
  if (!canManageEventAndAbsenceChanges()) return;
  const data = new FormData(absenceForm);
  const personId = String(data.get("absencePerson") || "");
  const startDate = String(data.get("absenceStart") || "");
  const endDate = String(data.get("absenceEnd") || "");
  const note = String(data.get("absenceNote") || "").trim();
  const knownIds = new Set(people.map((p) => p.id));

  if (!knownIds.has(personId)) return;
  if (!isDateKey(startDate) || !isDateKey(endDate)) return;
  if (startDate > endDate) return;

  if (editingAbsenceId) {
    absences = absences.filter((item) => item.id !== editingAbsenceId);
  }

  absences.push({
    id: editingAbsenceId || createAbsenceId(),
    personId,
    startDate,
    endDate,
    note
  });

  persistState();
  startAbsenceCreateMode(selectedDateKey);
  renderAbsentOptionsForRange();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
});


taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (READ_ONLY || !selectedDateKey) return;
  if (!canCreateTasksInCurrentCalendar()) return;
  const title = String(taskTitleInput.value || "").trim();
  const blockedAssignees = getAbsentPersonIdsForRange(selectedDateKey, selectedDateKey);
  const selectedPersonIds = getSelectedPersonIds(taskPersonChecklist).filter((id) => !blockedAssignees.has(id));
  const personIds = normalizePersonalTaskAssignees(selectedPersonIds);
  const categoryId = String(taskCategorySelect ? (taskCategorySelect.value || "") : "");
  if (!title) return;
  if (personIds.some((id) => !people.some((p) => p.id === id))) return;
  const safeCategoryId = categories.some((c) => c.id === categoryId) ? categoryId : "";
  const list = tasksByDate[selectedDateKey] || [];
  const newTask = {
    id: createTaskId(),
    title,
    personIds,
    categoryId: safeCategoryId,
    done: false,
    createdByUserId: String(currentUserId || "")
  };
  list.push(newTask);
  tasksByDate[selectedDateKey] = list;
  persistState();
  if (isPersonalCalendarMode()) {
    void sendPersonalTaskCollabInvites(selectedDateKey, newTask, personIds, true);
  }
  taskForm.reset();
  renderStandaloneTaskList(selectedDateKey);
  renderSelectedDayPanel();
  renderCalendar();
  renderUpcomingList();
});

reportsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderReportResults();
});
if (compensationForm) {
  compensationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    compEntriesShowAll = false;
    await syncOwnCompFromSelectedPerson();
  });
}
if (currentCompBalanceCard) {
  currentCompBalanceCard.addEventListener("click", () => {
    if (!currentUserId || !canReadOwnCompensations()) return;
    const me = (Array.isArray(people) ? people : []).find((p) => String(p.id || "") === String(currentUserId || ""));
    openCompLogModal(
      String(currentUserId),
      String((me && me.name) || currentUserName || "-"),
      String((me && me.color) || currentUserDisplayColor || "#64748b")
    );
  });
}
if (addCompEntryBtn) {
  addCompEntryBtn.addEventListener("click", async () => {
    await createCompensationEntry();
  });
}
if (openAdjustCompBtn) {
  openAdjustCompBtn.addEventListener("click", () => {
    openCompAdjustModal();
  });
}
if (closeCompAdjustBtn) {
  closeCompAdjustBtn.addEventListener("click", () => {
    closeCompAdjustModal();
  });
}
if (compAdjustModal) {
  compAdjustModal.addEventListener("click", (event) => {
    if (event.target === compAdjustModal) closeCompAdjustModal();
  });
}
if (compAdjustForm) {
  compAdjustForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await adjustCompensationEntry();
  });
}
if (saveReportPdfBtn) {
  saveReportPdfBtn.addEventListener("click", () => {
    saveReportAsPdf();
  });
}
personForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = String(personNameInput.value || "").trim();
  const color = normalizePersonColor(String(personColorInput.value || ""));
  if (!name) return;

  if (editingPersonId) {
    const duplicate = people.some(
      (person) => person.id !== editingPersonId && person.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return;
    const target = people.find((person) => person.id === editingPersonId);
    if (!target) return;
    target.name = name;
    target.color = color;
  } else if (!hasPersonName(name)) {
    people.push({ id: createPersonId(), name, color });
  }

  persistState();
  resetPersonEditor();
  renderPeopleOptions();
  renderAbsencePersonOptions();
  renderTaskPersonOptions();
  renderReportPeopleOptions();
  renderPeopleManager();
  renderFilters();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
});

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = String(categoryNameInput.value || "").trim();
  const color = normalizeHexColor(String(categoryColorInput.value || "#0ea5e9"), "#0ea5e9");
  if (!name) return;

  if (editingCategoryId) {
    const duplicate = categories.some(
      (item) => item.id !== editingCategoryId && item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return;
    const target = categories.find((item) => item.id === editingCategoryId);
    if (!target) return;
    target.name = name;
    target.color = color;
  } else if (!categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    categories.push({ id: createCategoryId(), name, color });
  }

  persistState();
  resetCategoryEditor();
  renderCategoryOptions();
  renderCategoriesManager();
  renderFilters();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
});

categoryCancelBtn.addEventListener("click", () => {
  resetCategoryEditor();
});

personCancelBtn.addEventListener("click", () => {
  resetPersonEditor();
});

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const payload = buildStatePayload(true);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `procal-visual-backup-${toDateKey(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });
}

if (importInput) {
  importInput.addEventListener("change", async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup format");

      const cleaned = sanitizeState(
        parsed.events || parsed.people || parsed.absences || parsed.categories || parsed.tasks
          ? parsed
          : { events: parsed, people: [], absences: [], categories: DEFAULT_CATEGORIES }
      );
      applyCleanState(cleaned, parsed && parsed.modifiedAt);
      persistState();
    } catch (error) {
      alert(t("importFailed"));
    } finally {
      importInput.value = "";
    }
  });
}

function renderWeekdays() {
  const calendarWeekdays = window.ProCalModules && window.ProCalModules.calendarWeekdays;
  if (!calendarWeekdays || typeof calendarWeekdays.renderWeekdays !== "function") return;
  calendarWeekdays.renderWeekdays({ container: weekdayRow, locale: getLocale() });
}

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

function getLocale() {
  return currentLang === "bg" ? "bg-BG" : "en-US";
}

function isMobileViewport() {
  try {
    return window.matchMedia("(max-width: 980px), (hover: none) and (pointer: coarse)").matches;
  } catch {
    return window.innerWidth <= 980;
  }
}

function readLang() {
  const raw = localStorage.getItem("procal_lang");
  return raw === "en" ? "en" : "bg";
}

function readTheme() {
  try {
    return localStorage.getItem("procal_theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  if (themeToggle) {
    themeToggle.checked = currentTheme === "dark";
  }
}

function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem("procal_theme", currentTheme);
  } catch {
    // keep the visual switch even if storage is unavailable
  }
}

function getDefaultDayTimelinePrefs() {
  return {
    workingStart: "08:00",
    workingEnd: "17:00",
    visibleStart: "07:30",
    visibleEnd: "17:30",
    autoFit: false
  };
}

function getDayTimelinePrefsModule() {
  return window.ProCalModules && window.ProCalModules.calendarDayTimelinePrefs;
}

function getTimePickerModule() {
  return window.ProCalModules && window.ProCalModules.uiTimePicker;
}

function getMobileSheetsModule() {
  return window.ProCalModules && window.ProCalModules.uiMobileSheets;
}

function readDayTimelinePrefs() {
  const mod = getDayTimelinePrefsModule();
  if (!mod || typeof mod.readDayTimelinePrefs !== "function") return getDefaultDayTimelinePrefs();
  return mod.readDayTimelinePrefs({
    storageRef: localStorage,
    storageKey: DAY_TIMELINE_PREFS_KEY,
    fallback: getDefaultDayTimelinePrefs()
  });
}

function persistDayTimelinePrefs() {
  const mod = getDayTimelinePrefsModule();
  if (!mod || typeof mod.persistDayTimelinePrefs !== "function") return;
  mod.persistDayTimelinePrefs({
    storageRef: localStorage,
    storageKey: DAY_TIMELINE_PREFS_KEY,
    prefs: dayTimelinePrefs
  });
}

function applyDayTimelinePrefsToInputs() {
  const mod = getDayTimelinePrefsModule();
  if (!mod || typeof mod.applyDayTimelinePrefsToInputs !== "function") return;
  mod.applyDayTimelinePrefsToInputs({
    prefs: dayTimelinePrefs,
    timelineWorkingStart,
    timelineWorkingEnd,
    timelineVisibleStart,
    timelineVisibleEnd,
    timelineAutoFit,
    summaryEl: dayTimelinePrefsSummary,
    t
  });
}

function updateDayTimelinePrefsFromInputs() {
  const mod = getDayTimelinePrefsModule();
  if (!mod || typeof mod.updateDayTimelinePrefsFromInputs !== "function") return;
  dayTimelinePrefs = mod.updateDayTimelinePrefsFromInputs({
    currentPrefs: dayTimelinePrefs,
    timelineWorkingStart,
    timelineWorkingEnd,
    timelineVisibleStart,
    timelineVisibleEnd,
    timelineAutoFit
  });
  applyDayTimelinePrefsToInputs();
  persistDayTimelinePrefs();
  updateDayTimelinePrefsSummary();
}

function updateDayTimelinePrefsSummary() {
  const mod = getDayTimelinePrefsModule();
  if (!mod || typeof mod.updateDayTimelinePrefsSummary !== "function") return;
  mod.updateDayTimelinePrefsSummary({
    prefs: dayTimelinePrefs,
    summaryEl: dayTimelinePrefsSummary,
    t
  });
}

function openModalElement(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModalElement(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function syncTimePickerColumnState() {
  const mod = getTimePickerModule();
  if (!mod || typeof mod.syncTimePickerColumnState !== "function") return;
  mod.syncTimePickerColumnState({
    listSelect: timePickerListSelect
  });
}

function applyTimePickerSelection() {
  const mod = getTimePickerModule();
  if (!mod || typeof mod.applyTimePickerSelection !== "function") return;
  mod.applyTimePickerSelection({
    listSelect: timePickerListSelect,
    modal: timePickerModal,
    closeModal: closeModalElement,
    eventCtor: Event
  });
}

function clearTimePickerSelection() {
  const mod = getTimePickerModule();
  if (!mod || typeof mod.clearTimePickerSelection !== "function") return;
  mod.clearTimePickerSelection({
    modal: timePickerModal,
    closeModal: closeModalElement,
    eventCtor: Event
  });
}

function openTimePickerForInput(input, label) {
  const mod = getTimePickerModule();
  if (!mod || typeof mod.openTimePickerForInput !== "function") return;
  const usesQuarterHourStep = input === eventTime || input === eventTimeEnd;
  const timeMeta = window.ProCalModules && window.ProCalModules.eventTimeMeta;
  const parsedWorkingStart = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
    ? timeMeta.parseTimeToMinutes(String((timelineWorkingStart && timelineWorkingStart.value) || ""))
    : null;
  const defaultMinutes = usesQuarterHourStep
    ? (parsedWorkingStart != null ? parsedWorkingStart : 8 * 60)
    : null;
  mod.openTimePickerForInput({
    input,
    label,
    minuteStep: usesQuarterHourStep ? 15 : 1,
    defaultMinutes,
    modal: timePickerModal,
    titleEl: timePickerTitle,
    listSelect: timePickerListSelect,
    openModal: openModalElement,
    t
  });
}

function syncEventTimeInputState() {
  const allDayChecked = Boolean(eventAllDay && eventAllDay.checked);
  [eventTime, eventTimeEnd].forEach((input) => {
    if (!input) return;
    input.disabled = allDayChecked;
    input.setAttribute("aria-disabled", allDayChecked ? "true" : "false");
  });
  [eventStartTimeField, eventEndTimeField].forEach((field) => {
    if (!field) return;
    field.classList.toggle("is-hidden", allDayChecked);
  });
}

function syncEventEndDateWithStartDate() {
  const startValue = eventStart && typeof eventStart.value === "string" ? eventStart.value : "";
  const endValue = eventEnd && typeof eventEnd.value === "string" ? eventEnd.value : "";
  const validStart = isDateKey(startValue);
  if (eventEnd) {
    eventEnd.min = validStart ? startValue : "";
  }
  if (!eventEnd || !validStart) return;
  if (!isDateKey(endValue) || endValue < startValue) {
    eventEnd.value = startValue;
  }
}

function getEventTimeMeta(evt) {
  const mod = window.ProCalModules && window.ProCalModules.eventTimeMeta;
  if (!mod || typeof mod.resolveEventTimeMeta !== "function") {
    return { isAllDay: !String((evt && evt.time) || "").trim(), startTime: String((evt && evt.time) || "").trim(), endTime: "" };
  }
  return mod.resolveEventTimeMeta(evt);
}

function getEventTimeLabelForDate(evt, dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.eventTimeMeta;
  if (!mod || typeof mod.getEventTimeLabelForDate !== "function") return String((evt && evt.time) || t("anyTime"));
  return mod.getEventTimeLabelForDate(evt, dateKey, { t });
}

function getEventTimeRangeLabel(evt) {
  const mod = window.ProCalModules && window.ProCalModules.eventTimeMeta;
  if (!mod || typeof mod.getEventTimeRangeLabel !== "function") return String((evt && evt.time) || t("anyTime"));
  return mod.getEventTimeRangeLabel(evt, { t });
}

function applyTranslations() {
  langToggle.value = currentLang;
  const appBrandTitle = getAppBrandTitle();
  setText("appTitle", appBrandTitle);
  document.title = appBrandTitle;
  setText("appSubtitle", t("subtitle"));
  setText("appVersionLabel", `${t("versionLabel")}: ${APP_VERSION}`);
  setText("settingsBtn", t("menuLabel"));
  setText("menuProfileBtn", t("profile"));
  setText("menuGuideBtn", t("userGuide"));
  setText("menuMobileAppBtn", t("mobileApp"));
  setText("profileTitle", t("profile"));
  setText("menuShortcutsTitle", t("quickActions"));
  setText("profileNicknameLabel", t("userLabel"));
  setText("profileRoleLabel", t("roleLabel"));
  setText("profileStatusLabel", t("statusLabel"));
  setText("profileFullNameLabel", t("fullNameLabel"));
  setText("profileWorkplaceLabel", t("workplaceLabel"));
  setText("profileJobTitleLabel", t("jobTitleLabel"));
  setText("profileNicknameInputLabel", t("nicknameLabel"));
  setText("profileFullNameInputLabel", t("fullNameLabel"));
  setText("profileWorkplaceInputLabel", t("workplaceLabel"));
  setText("profileJobTitleInputLabel", t("jobTitleLabel"));
  setText("saveMyProfileBtn", t("save"));
  setText("closeProfileBtn", t("close"));
  setText("notificationsLabel", t("notifications"));
  setText("chatBtnLabel", t("chat"));
  setText("chatTitle", t("chatTitle"));
  setText("chatSidebarTitle", t("chatConversations"));
  setText("chatFilesBtn", t("files"));
  setText("closeChatBtn", t("close"));
  setTitle("chatBtn", t("chat"));
  if (chatInput) chatInput.placeholder = t("chatTypeMessage");
  setText("chatAttachBtn", t("chatAttach"));
  setText("chatSendBtn", t("chatSend"));
  setTitle("chatScrollBottomBtn", t("chatScrollLatest"));
  setText("notificationsTitle", t("notifications"));
  setText("notificationsUnreadFilterBtn", notificationsUnreadOnly ? t("notificationsAll") : t("notificationsUnreadOnly"));
  setText("notificationsMarkAllBtn", t("notificationsMarkAll"));
  setText("notificationsClearBtn", t("notificationsClear"));
  setText("closeNotificationsBtn", t("close"));
  setTitle("notificationsBtn", t("notifications"));
  setText("bugReportBtn", t("bugReport"));
  setText("bugReportTitle", t("bugReportTitle"));
  setText("bugReportTitleLabel", t("bugReportFieldTitle"));
  setText("bugReportDescLabel", t("bugReportFieldDescription"));
  setText("bugReportSubmitBtn", t("bugReportSubmit"));
  setText("closeBugReportBtn", t("close"));
  setTitle("bugReportBtn", t("bugReport"));
  if (bugReportInputTitle) bugReportInputTitle.placeholder = t("bugReportTitlePlaceholder");
  if (bugReportInputDesc) bugReportInputDesc.placeholder = t("bugReportDescPlaceholder");
  setText("calendarPanelTabBtn", t("calendarLabel"));
  setText("eventsPanelTabBtn", t("eventsTitle"));
  setText("notesPanelTitle", t("notesTitle"));
  setText("addStickyNoteBtn", t("addNote"));
  setText("eventsRegistryTitle", t("eventsTitle"));
  setText("eventsRegistrySubtitle", t("eventsRegistrySubtitle"));
  setText("eventsSearchLabel", t("eventsSearchLabel"));
  setText("eventsFromLabel", t("eventsFromLabel"));
  setText("eventsToLabel", t("eventsToLabel"));
  setText("eventsSearchClearBtn", t("clear"));
  setText("eventsExportOptionsBtn", t("eventsExportOptions"));
  setText("eventsExportTitle", t("eventsExportTitle"));
  setText("closeEventsExportBtn", t("close"));
  setText("eventsReportColumnsTitle", t("eventsReportColumnsTitle"));
  setText("eventsReportColumnsHint", t("eventsReportColumnsHint"));
  setText("eventsColumnDateLabel", t("date"));
  setText("eventsColumnTimeLabel", t("time"));
  setText("eventsColumnTitleLabel", t("title"));
  setText("eventsColumnCategoryLabel", t("category"));
  setText("eventsColumnPeopleLabel", t("peopleParticipants"));
  setText("eventsExportCsvBtn", t("exportCsv"));
  setText("eventsExportPdfBtn", t("exportPdf"));
  setText("eventsStatsTitle", t("eventsStatsTitle"));
  if (eventsSearchInput) eventsSearchInput.setAttribute("placeholder", t("eventsSearchPlaceholder"));
  setText("stickyNoteTitleLabel", t("noteTitle"));
  setText("stickyNoteTextLabel", t("noteDescription"));
  setText("stickyNoteColorLabel", t("noteColor"));
  setText("saveStickyNoteBtn", t("saveNote"));
  setText("closeStickyNoteBtn", t("close"));
  updateStickyNoteModalTitle();
  setText("cancelStickyNoteBtn", t("cancel"));
  setText("stickyShareTitle", t("noteShareTitle"));
  setText("stickyShareModeLabel", t("noteShareMode"));
  setText("stickySharePeopleLabel", t("noteShareRecipients"));
  setText("stickyShareSelectAllBtn", t("noteSelectAll"));
  setText("stickyShareClearAllBtn", t("noteClearAll"));
  setText("stickyShareSubmitBtn", t("noteShareSubmit"));
  setText("stickyShareCancelBtn", t("cancel"));
  setText("closeStickyShareBtn", t("close"));
  setText("notesLegendOwned", t("notesLegendOwned"));
  setText("notesLegendShared", t("notesLegendShared"));
  if (stickyShareMode) {
    const optCopy = stickyShareMode.querySelector("option[value=\"copy\"]");
    const optSyncRo = stickyShareMode.querySelector("option[value=\"sync_readonly\"]");
    const optSyncEd = stickyShareMode.querySelector("option[value=\"sync_edit\"]");
    const optSend = stickyShareMode.querySelector("option[value=\"send\"]");
    if (optCopy) optCopy.textContent = t("noteShareCopy");
    if (optSyncRo) optSyncRo.textContent = t("noteShareSyncReadonly");
    if (optSyncEd) optSyncEd.textContent = t("noteShareSyncEdit");
    if (optSend) optSend.textContent = t("noteShareSend");
  }
  updateNotesToggleButton();
  if (currentMainPanel === "events") renderEventsRegistry();
  setText("menuAdminBtn", t("openAdminPanel"));
  setText("notesViewModeLabel", t("calendarLabel"));
  renderCurrentUserLabel();
  renderCurrentCompBalanceLabel();
  renderConnectionStatus();
  if (calendarModeSelect) {
    setText("calendarModeLabel", t("calendarLabel"));
    const personalOpt = calendarModeSelect.querySelector("option[value=\"personal\"]");
    const sharedOpt = calendarModeSelect.querySelector("option[value=\"shared\"]");
    if (personalOpt) personalOpt.textContent = t("personalCalendar");
    if (sharedOpt) sharedOpt.textContent = t("sharedCalendar");
    renderCalendarModeUI();
renderMainPanelUI();
  }
  applyUserViewMode();
  setText("addEventBtn", t("addEvent"));
  updateViewButtons();


  setText("prevMonth", t("prev"));
  setText("nextMonth", t("next"));
  setText("todayBtn", t("today"));
  setText("upcomingTitle", t("upcomingTitle"));
  setText("mobileDayBtn", t("forDay"));
  setText("mobileUpcomingBtn", t("upcomingTitle"));
  setTitle("closeMobileDayBtn", t("close"));
  setText("exportBtn", t("exportJson"));
  setText("importLabel", t("importJson"));
  setText("closeDayMenuBtn", t("close"));
  setText("openEventFormBtn", t("addEvent"));
  setText("openAbsenceFormBtn", t("openAbsence"));
  setText("openTaskFormBtn", t("addTask"));
  setText("taskSectionTitle", t("addTask"));
  setText("taskTitleLabel", t("task"));
  setText("taskPersonLabel", t("person"));
  setText("taskCategoryLabel", t("category"));
  setText("addTaskSubmitBtn", t("addTask"));
  updateEventTasksToggleLabel();
  setText("eventTaskAddBtn", t("addTask"));
  setText("reportsBtn", t("reports"));
  setText("mediaMonitoringBtn", t("mediaMonitoring"));
  setText("leaveBtn", t("leave"));
  setText("currentUserLeaveBtn", t("leaveAvailableTitle"));
  setText("leaveQuickTitle", t("leaveAvailableTitle"));
  setText("leaveQuickPaidLabel", t("leaveAvailablePaid"));
  setText("leaveQuickStudyLabel", t("leaveAvailableStudy"));
  setText("leaveQuickUnpaidLabel", t("leaveUsedUnpaid"));
  setText("leaveQuickSickLabel", t("leaveUsedSick"));
  setText("leaveQuickRequestBtn", t("requestAbsence"));
  setText("leaveQuickPrevBtn", t("prev"));
  setText("leaveQuickNextBtn", t("next"));
  setText("closeLeaveQuickBtn", t("close"));
  setText("leaveRequestTitle", t("requestAbsence"));
  setText("leaveRequestTypeLabel", t("compType"));
  setText("leaveRequestStartLabel", t("startDate"));
  setText("leaveRequestEndLabel", t("endDate"));
  setText("leaveRequestSourceYearLabel", t("sourceYear"));
  setText("leaveRequestNoteLabel", t("note"));
  setText("leaveRequestSubmitBtn", t("submit"));
  setText("closeLeaveRequestBtn", t("close"));
  if (leaveRequestType) {
    const paidOpt = leaveRequestType.querySelector("option[value=\"paid\"]");
    const sickOpt = leaveRequestType.querySelector("option[value=\"sick\"]");
    const unpaidOpt = leaveRequestType.querySelector("option[value=\"unpaid\"]");
    const studyOpt = leaveRequestType.querySelector("option[value=\"study\"]");
    if (paidOpt) paidOpt.textContent = t("leaveTypePaid");
    if (sickOpt) sickOpt.textContent = t("leaveTypeSick");
    if (unpaidOpt) unpaidOpt.textContent = t("leaveTypeUnpaid");
    if (studyOpt) studyOpt.textContent = t("leaveTypeStudy");
  }
  setText("reportsTitle", t("reports"));
  setText("closeReportsBtn", t("close"));
  setText("reportPersonLabel", t("person"));
  setText("reportStartLabel", t("from"));
  setText("reportEndLabel", t("toLabel"));
  setText("runReportBtn", t("generateReport"));
  setText("saveReportPdfBtn", t("savePdf"));
  setText("compensationBtn", t("compensations"));
  setText("filesBtn", t("files"));
  setText("compensationTitle", t("compensations"));
  setText("compOverviewTitle", t("compOverviewTitle"));
  setText("closeCompensationBtn", t("close"));
  setText("compPersonLabel", t("person"));
  setText("compDateLabel", t("compDate"));
  setText("compKindLabel", t("compType"));
  setText("compMinutesLabel", t("compMinutes"));
  setText("compDurationLabel", t("compMinutes"));
  setText("compLogTitle", t("compLogTitle"));
  setText("compLogDurationLabel", t("compMinutes"));
  setText("ownBalanceCaption", t("ownBalanceCaption"));
  setText("compReasonLabel", t("compReason"));
  setText("addCompEntryBtn", t("compAddEntry"));
  setText("compAdjustSignLabel", t("compAdjustSignLabel"));
  setText("adjustCompEntryBtn", t("compAdjustBtn"));
  setText("compAdjustPositiveOpt", t("compAdjustPositive"));
  setText("compAdjustNegativeOpt", t("compAdjustNegative"));
  setText("openAdjustCompBtn", t("compAdjustOpen"));
  setText("compAdjustTitle", t("compAdjustTitle"));
  setText("closeCompAdjustBtn", t("close"));
  setText("compAdjustDateLabel", t("compDate"));
  setText("compAdjustDurationLabel", t("compMinutes"));
  setText("compAdjustReasonLabel", t("compReason"));
  setText("eventTitleLabel", t("title"));
  setText("eventDescLabel", t("description"));
  setText("eventProgramLabel", t("eventProgramLabel"));
  setText("eventProgramInlineLabel", t("eventProgramInlineLabel"));
  setText("openEventProgramModalBtn", t("eventProgramManage"));
  setText("eventProgramModalTitle", t("eventProgramModalTitle"));
  setText("eventProgramHelp", t("eventProgramHelp"));
  setText("eventProgramPreviewBtn", t("eventProgramPreview"));
  setText("eventProgramClearBtn", t("eventProgramClear"));
  setText("eventFormDetailsTabBtn", t("eventFormDetailsTab"));
  setText("eventFormRemindersTabBtn", t("eventFormRemindersTab"));
  setText("eventFormFilesTabBtn", t("eventFormFilesTab"));
  setText("eventReminderEnabledLabel", t("eventReminderEnabled"));
  setText("eventReminderOffsetLabel", t("eventReminderOffset"));
  setText("eventReminderAtStartOpt", t("eventReminderAtStart"));
  setText("eventReminder5MinOpt", t("eventReminder5Min"));
  setText("eventReminder10MinOpt", t("eventReminder10Min"));
  setText("eventReminder15MinOpt", t("eventReminder15Min"));
  setText("eventReminder30MinOpt", t("eventReminder30Min"));
  setText("eventReminder1HourOpt", t("eventReminder1Hour"));
  setText("eventReminder1DayOpt", t("eventReminder1Day"));
  setText("eventReminder1WeekOpt", t("eventReminder1Week"));
  setText("eventReminder1MonthOpt", t("eventReminder1Month"));
  setText("eventReminderAllDayTimeLabel", t("eventReminderAllDayTime"));
  setText("eventReminderRepeatLabel", t("eventReminderRepeat"));
  setText("eventReminderEveryOccurrenceOpt", t("eventReminderEveryOccurrence"));
  setText("eventReminderFirstOnlyOpt", t("eventReminderFirstOnly"));
  setText("eventReminderRecipientsLabel", t("eventReminderRecipients"));
  setText("eventReminderParticipantsTasksOpt", t("eventReminderParticipantsTasks"));
  setText("eventReminderParticipantsOpt", t("eventReminderParticipants"));
  setText("eventReminderTaskAssigneesOpt", t("eventReminderTaskAssignees"));
  setText("eventReminderAllOpt", t("eventReminderAll"));
  setText("eventReminderCustomOpt", t("eventReminderCustom"));
  setText("eventReminderCustomPeopleLabel", t("eventReminderCustomPeople"));
  setText("eventFilesFolderEnabledLabel", t("eventFilesFolderEnabledLabel"));
  setText("eventFilesDetachedLabel", t("eventFilesDetachedLabel"));
  setText("eventFilesSettingsHelp", t("eventFilesSettingsHelp"));
  refreshEventFilesSettingsUi();
  setEventFormTab(eventFormActiveTab);
  setText("eventAllDayLabel", t("allDay"));
  setText("eventStartLabel", t("eventStartBlock"));
  setText("eventEndLabel", t("eventEndBlock"));
  setText("eventStartDateAssist", t("startDate"));
  setText("eventEndDateAssist", t("endDate"));
  setText("eventTimeLabel", t("startTime"));
  setText("eventEndTimeLabel", t("endTime"));
  apply24HourTimeInputs();
  setText("dayTimelineTitle", t("dayTimeline"));
  setText("openDayTimelineSettingsBtn", t("dayTimelineSettings"));
  setText("dayTimelineSettingsTitle", t("dayTimelineSettingsTitle"));
  setText("timePickerTitle", t("timePickerTitle"));
  setText("timePickerListLabel", t("time"));
  setText("clearTimePickerBtn", t("timePickerClear"));
  setText("applyTimePickerBtn", t("timePickerApply"));
  setText("timelineWorkingStartLabel", t("timelineWorkingStart"));
  setText("timelineWorkingEndLabel", t("timelineWorkingEnd"));
  setText("timelineVisibleStartLabel", t("timelineVisibleStart"));
  setText("timelineVisibleEndLabel", t("timelineVisibleEnd"));
  setText("timelineAutoFitLabel", t("timelineAutoFit"));
  setText("dayTimelineEmpty", selectedDateKey ? t("timelineNoEvents") : t("timelineSelectDay"));
  if (dayTimelinePrevBtn) {
    dayTimelinePrevBtn.title = t("timelinePrevDay");
    dayTimelinePrevBtn.setAttribute("aria-label", t("timelinePrevDay"));
  }
  if (dayTimelineNextBtn) {
    dayTimelineNextBtn.title = t("timelineNextDay");
    dayTimelineNextBtn.setAttribute("aria-label", t("timelineNextDay"));
  }
  if (eventStart) eventStart.setAttribute("aria-label", t("startDate"));
  if (eventEnd) eventEnd.setAttribute("aria-label", t("endDate"));
  if (eventTime) {
    eventTime.setAttribute("aria-label", t("startTime"));
    eventTime.setAttribute("placeholder", "HH:MM");
  }
  if (eventTimeEnd) {
    eventTimeEnd.setAttribute("aria-label", t("endTime"));
    eventTimeEnd.setAttribute("placeholder", "HH:MM");
  }
  [timelineWorkingStart, timelineWorkingEnd, timelineVisibleStart, timelineVisibleEnd].forEach((input) => {
    if (!input) return;
    input.setAttribute("placeholder", "HH:MM");
  });
  if (timelineWorkingStart) timelineWorkingStart.setAttribute("aria-label", t("timelineWorkingStart"));
  if (timelineWorkingEnd) timelineWorkingEnd.setAttribute("aria-label", t("timelineWorkingEnd"));
  if (timelineVisibleStart) timelineVisibleStart.setAttribute("aria-label", t("timelineVisibleStart"));
  if (timelineVisibleEnd) timelineVisibleEnd.setAttribute("aria-label", t("timelineVisibleEnd"));
  [
    [eventTimePickerBtn, t("startTime")],
    [eventTimeEndPickerBtn, t("endTime")],
    [eventReminderAllDayTimePickerBtn, t("eventReminderAllDayTime")],
    [timelineWorkingStartPickerBtn, t("timelineWorkingStart")],
    [timelineWorkingEndPickerBtn, t("timelineWorkingEnd")],
    [timelineVisibleStartPickerBtn, t("timelineVisibleStart")],
    [timelineVisibleEndPickerBtn, t("timelineVisibleEnd")]
  ].forEach(([button, label]) => {
    if (!button) return;
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
  });
  updateDayTimelinePrefsSummary();
  setText("repeatFreqLabel", t("repeat"));
  setText("repeatEndModeLabel", t("repeatEnds"));
  setText("repeatNoneOpt", t("repeatNone"));
  setText("repeatDailyOpt", t("repeatDaily"));
  setText("repeatWeeklyOpt", t("repeatWeekly"));
  setText("repeatMonthlyOpt", t("repeatMonthly"));
  setText("repeatYearlyOpt", t("repeatYearly"));
  setText("repeatForeverOpt", t("repeatForever"));
  setText("repeatCountOpt", t("repeatCount"));
  setText("repeatUntilOpt", t("repeatUntil"));
  setText("repeatCountLabel", t("repeatCountLabel"));
  setText("repeatUntilLabel", t("repeatUntilLabel"));
  setText("eventCategoryLabel", t("category"));
  setText("eventPeopleLabel", t("peopleParticipants"));
  setText("eventAbsentLabel", t("absentPeople"));
  setText("addEventSubmitBtn", t("addEventSubmit"));
  setText("absenceSectionTitle", t("addAbsenceTitle"));
  setText("absencePersonLabel", t("person"));
  setText("absenceStartLabel", t("startDate"));
  setText("absenceEndLabel", t("endDate"));
  setText("absenceNoteLabel", t("note"));
  setText("addAbsenceSubmitBtn", editingAbsenceId ? t("save") : t("addAbsenceSubmit"));
  setText("eventsListTitle", t("eventsTitle"));
  setText("peopleModalTitle", t("peopleTitle"));
  setText("categoriesModalTitle", t("categoriesTitle"));
  setText("closePeopleMenuBtn", t("close"));
  setText("closeCategoriesMenuBtn", t("close"));
  setText("personCancelBtn", t("cancel"));
  setText("categoryCancelBtn", t("cancel"));
  setText("categorySaveBtn", editingCategoryId ? t("save") : t("addCategory"));
  setText("filtersBtn", t("filtersTitle"));
  setText("langToggleLabel", t("language"));
  setText("themeToggleLabel", t("darkMode"));
  if (themeToggle) themeToggle.checked = currentTheme === "dark";
  setText("myViewModeLabel", t("myViewMode"));
  setText("saveMyViewModeBtn", t("saveMyViewMode"));
  setText("manageHostedPasswordBtn", t("managePasswordPublic"));
  setText("menuLogoutBtn", t("logout"));
  setText("closeFiltersMenuBtn", t("close"));
  setText("sideDayTitle", t("selectedDay"));
  setText("sideDayQuickAddTrigger", `+ ${t("add")}`);
  setText("sideAddEventBtn", t("addEvent"));
  setText("sideAddTaskBtn", t("addTask"));
  setText("sideAddAbsenceBtn", t("quickAbsenceShort"));
  setText("sideAddCompBtn", t("compensations"));
  setTitle("sideDayQuickAddTrigger", t("add"));
  setTitle("sideAddEventBtn", t("addEvent"));
  setTitle("sideAddTaskBtn", t("addTask"));
  setTitle("sideAddAbsenceBtn", t("openAbsence"));
  setTitle("sideAddCompBtn", t("compensations"));
  setText("eventPreviewTitle", t("eventOverview"));
  setText("eventPreviewFilesBtn", t("files"));
  setText("eventPreviewProgramBtn", t("eventProgramPreview"));
  setText("eventPreviewEditBtn", t("edit"));
  setText("eventPreviewAddTaskBtn", t("addTask"));
  setText("eventPreviewDeleteBtn", t("delete"));
  setText("closeEventPreviewBtn", t("close"));
  setText("filesTitle", t("files"));
  setText("filesTreeTitle", t("filesTreeTitle"));
  setText("filesHeadSelectLabel", t("filesHeadSelect"));
  setText("filesHeadName", t("filesHeadName"));
  setText("filesHeadType", t("filesHeadType"));
  setText("filesHeadModified", t("filesHeadModified"));
  setText("filesHeadSize", t("filesHeadSize"));
  setText("filesPreviewBtn", t("filesPreview"));
  setText("filesDownloadBtn", t("filesDownload"));
  setText("filesDeleteBtn", t("delete"));
  setText("closeFilesBtn", t("close"));
  setText("filesUploadLabel", t("filesChoose"));
  setText("filesUploadDropHint", t("filesUploadDropHint"));
  setText("filesUploadBtn", t("filesUpload"));
  setText("filesUploadFilesBtn", t("filesChooseFiles"));
  setText("filesUploadFolderBtn", t("filesChooseFolder"));
  setText("filesUploadSummary", t("filesUploadSelectionEmpty"));
  setText("filesSearchLabel", t("filesSearchLabel"));
  setText("filesSortLabel", t("filesSortLabel"));
  setText("filesSortModifiedDescOpt", t("filesSortModifiedDesc"));
  setText("filesSortModifiedAscOpt", t("filesSortModifiedAsc"));
  setText("filesSortNameAscOpt", t("filesSortNameAsc"));
  setText("filesSortNameDescOpt", t("filesSortNameDesc"));
  setText("filesSortTypeAscOpt", t("filesSortTypeAsc"));
  setText("filesSortTypeDescOpt", t("filesSortTypeDesc"));
  setText("filesSortSizeAscOpt", t("filesSortSizeAsc"));
  setText("filesSortSizeDescOpt", t("filesSortSizeDesc"));
  setText("filesViewListBtn", t("filesViewList"));
  setText("filesViewGridBtn", t("filesViewGrid"));
  setText("filesViewSummary", t("filesViewSummaryAll").replace("{count}", "0"));
  setText("filesCurrentFolderLabel", t("filesCurrentFolderLabel"));
  setText("filesCurrentFolderHint", t("filesCurrentFolderHint"));
  if (filesViewToggle) filesViewToggle.setAttribute("aria-label", t("filesViewAria"));
  if (filesSearchInput) filesSearchInput.setAttribute("placeholder", t("filesSearchPlaceholder"));
  setText("filesBatchDownloadBtn", t("filesBatchDownload"));
  setText("filesBatchDeleteBtn", t("filesBatchDelete"));
  setText("filesDownloadArchiveBtn", t("filesDownloadArchive"));
  setText("filesBatchSummary", t("filesBatchEmpty"));
  setText("filesOperationSourceLabel", t("filesOperationSourceLabel"));
  setText("filesOperationSelectionLabel", t("filesOperationSelectionLabel"));
  setText("filesOperationSelection", t("filesOperationSelectionEmpty"));
  setText("filesOperationSelectionPath", "/");
  setText("filesBackBtn", t("filesBack"));
  setText("filesUpBtn", t("filesUp"));
  setText("filesNewFolderBtn", t("filesNewFolder"));
  setText("filesUploadToggleBtn", filesUploadExpanded ? t("filesHideUpload") : t("filesShowUpload"));
  setText("filesRenameFolderBtn", t("filesRenameFolder"));
  setText("filesMoveFolderBtn", t("filesMoveFolder"));
  setText("filesDeleteFolderBtn", t("filesDeleteFolder"));
  setText("filesOpenEventBtn", t("filesOpenEvent"));
  setText("filesOpenFolderBtn", t("filesOpenFolder"));
  setText("filesMoveFileBtn", t("filesMoveFile"));
  setText("filesCapacityLabel", t("filesCapacityFormat").replace("{used}", "0 MB").replace("{limit}", "0 MB"));
  setText("filesOperationCancelBtn", t("filesOperationCancel"));
  setText("filesOperationApplyBtn", t("filesOperationApply"));
  setText("filesOperationLabel", t("filesOperationValue"));
  updateFilesOperationSourceUi();
  updateFilesOperationSelectionUi();
  setText("filesSelectionName", t("filesNoSelection"));
  setText("filesSelectionMeta", t("filesSelectHint"));
  setText("filesSelectionScope", `${t("filesSelectionScopeLabel")}: -`);
  setText("filesSelectionPath", `${t("filesSelectionPathLabel")}: -`);
  setText("filesSelectionMime", `${t("filesSelectionMimeLabel")}: -`);
  setText("filesSelectionPreviewTitle", t("filesSelectionPreviewTitle"));
  setText("filesSelectionPreviewStatus", t("filesSelectionPreviewIdle"));
  updateFilesHeadSortUi();
  updateFilesExplorerLocationUi();
  setText("filePreviewTitle", t("filePreviewTitle"));
  setText("filePreviewDownloadBtn", t("filesDownload"));
  setText("closeFilePreviewBtn", t("close"));
  setText("filePreviewFallbackText", t("filePreviewUnavailable"));
  setText("filtersTitle", t("filtersTitle"));
  setText("filterCategoriesTitle", t("filterCategories"));
  setText("filterPeopleTitle", t("filterPeople"));
  setText("clearFiltersBtn", t("clearFilters"));
  setText("addEventSubmitBtn", editingEventSeriesId ? t("saveEvent") : t("addEventSubmit"));
  personSaveBtn.textContent = editingPersonId ? t("save") : t("addPerson");
  document.getElementById("eventTitle").setAttribute("placeholder", t("titlePlaceholder"));
  document.getElementById("eventDescription").setAttribute("placeholder", t("descriptionPlaceholder"));
  document.getElementById("absenceNote").setAttribute("placeholder", t("absencePlaceholder"));
  document.getElementById("personName").setAttribute("placeholder", t("personPlaceholder"));
  document.getElementById("categoryName").setAttribute("placeholder", t("categoryPlaceholder"));
  document.getElementById("taskTitle").setAttribute("placeholder", t("taskTitlePlaceholder"));
  document.getElementById("eventTaskTitle").setAttribute("placeholder", t("taskTitlePlaceholder"));
  if (profileNicknameInput) profileNicknameInput.setAttribute("placeholder", t("nicknameLabel"));
  if (profileFullNameInput) profileFullNameInput.setAttribute("placeholder", t("fullNameLabel"));
  if (profileWorkplaceInput) profileWorkplaceInput.setAttribute("placeholder", t("workplaceLabel"));
  if (profileJobTitleInput) profileJobTitleInput.setAttribute("placeholder", t("jobTitleLabel"));
  renderCategoryOptions();
  updateLastModifiedLabel();
  updateRepeatVisibility();
  renderNotificationsList();
  renderNotificationsBadge();
  refreshChatAttachSummary();
  updateEventProgramSummaryUI();
  renderFilesTree();
  updateFilesBatchSummary();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setTitle(id, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute("title", value);
}
function renderCurrentUserLabel() {
  const el = document.getElementById("currentUserLabel");
  if (!currentUserName) {
    if (el) el.textContent = "";
    if (currentUserLeaveBtn) currentUserLeaveBtn.style.display = "none";
    if (ownBalanceUser) {
      ownBalanceUser.textContent = "-";
      ownBalanceUser.style.color = "";
    }
    return;
  }
  const role = currentUserRole ? ` (${t("roleLabel")}: ${currentUserRole})` : "";
  if (el) {
    el.textContent = `${t("userLabel")}: ${currentUserName}${role}`;
  }
  if (currentUserLeaveBtn) currentUserLeaveBtn.style.display = canLeaveSelfAccess() ? "" : "none";
  if (ownBalanceUser) {
    ownBalanceUser.textContent = currentUserName || "-";
    const me = (Array.isArray(people) ? people : []).find((p) => String(p.id || "") === String(currentUserId || ""));
    const fallbackColor = /^#[0-9a-fA-F]{6}$/.test(String(currentUserDisplayColor || "")) ? String(currentUserDisplayColor) : "var(--ink)";
    const meColor = /^#[0-9a-fA-F]{6}$/.test(String(me && me.color ? me.color : "")) ? String(me.color) : "";
    ownBalanceUser.style.color = String(fallbackColor || meColor || "var(--ink)");
  }
}

function renderCurrentCompBalanceLabel() {
  const target = currentCompBalanceValue;
  if (!target) return;
  if (!currentUserId || !canReadOwnCompensations()) {
    target.textContent = "-";
    if (currentCompBalanceCard) currentCompBalanceCard.className = "own-balance-card neutral";
    return;
  }
  const value = Number(currentCompBalanceMinutes);
  if (!Number.isFinite(value)) {
    target.textContent = "...";
    if (currentCompBalanceCard) currentCompBalanceCard.className = "own-balance-card neutral";
    return;
  }
  target.textContent = formatCompMinutes(value);
  if (currentCompBalanceCard) {
    const stateClass = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
    currentCompBalanceCard.className = `own-balance-card ${stateClass}`;
  }
}

async function refreshCurrentCompBalance() {
  if (!currentUserId || !canReadOwnCompensations()) {
    currentCompBalanceMinutes = null;
    renderCurrentCompBalanceLabel();
    return;
  }
  try {
    const body = await fetchCompJson(`/api/compensations/balance?userId=${encodeURIComponent(String(currentUserId))}`);
    currentCompBalanceMinutes = Number(body && body.minutes);
  } catch {
    currentCompBalanceMinutes = null;
  }
  renderCurrentCompBalanceLabel();
}

function renderConnectionStatus() {
  const mod = window.ProCalModules && window.ProCalModules.uiStatus;
  if (!mod || typeof mod.renderConnectionStatus !== "function") return;
  mod.renderConnectionStatus({
    connectionStatus,
    connectionStatusText,
    realtimeConnectionStatus,
    currentUserId,
    currentLang,
    t
  });
}

function renderNotificationsBadge() {
  const mod = window.ProCalModules && window.ProCalModules.uiStatus;
  if (!mod || typeof mod.renderCountBadge !== "function") return;
  mod.renderCountBadge({
    badgeEl: notificationsBadge,
    count: notificationsUnreadCount,
    hiddenClass: "hidden-section"
  });
}

function formatNotificationDateTime(value) {
  const mod = window.ProCalModules && window.ProCalModules.notificationsFormat;
  if (!mod || typeof mod.formatNotificationDateTime !== "function") return String(value || "");
  return mod.formatNotificationDateTime(value, { t, locale: getLocale() });
}

function formatUiDateTime24(value) {
  const mod = window.ProCalModules && window.ProCalModules.uiDateTime;
  if (mod && typeof mod.formatDateTime24 === "function") {
    return mod.formatDateTime24(value, { locale: getLocale() });
  }
  const dt = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(dt.getTime())) return String(value || "");
  return dt.toLocaleString(getLocale(), { hour12: false });
}

function apply24HourTimeInputs() {
  const mod = window.ProCalModules && window.ProCalModules.uiDateTime;
  const timeInputs = [
    timelineWorkingStart,
    timelineWorkingEnd,
    timelineVisibleStart,
    timelineVisibleEnd
  ].filter(Boolean);
  timeInputs.forEach((input) => {
    if (mod && typeof mod.apply24hTimeInput === "function") {
      mod.apply24hTimeInput(input, {
        locale: getLocale(),
        stepSeconds: 60,
        invalidMessage: currentLang === "bg" ? "Използвай ЧЧ:ММ" : "Use HH:MM"
      });
      return;
    }
    if (String(input.type || "").toLowerCase() !== "time") return;
    input.setAttribute("step", "60");
    input.setAttribute("lang", "en-GB");
    input.setAttribute("inputmode", "numeric");
  });
  [eventTime, eventTimeEnd].filter(Boolean).forEach((input) => {
    if (mod && typeof mod.apply24hTimeInput === "function") {
      mod.apply24hTimeInput(input, {
        locale: getLocale(),
        stepSeconds: 900,
        minuteStep: 15,
        allowMidnight24: input === eventTimeEnd,
        invalidMessage: currentLang === "bg" ? "Използвай ЧЧ:ММ през 15 минути" : "Use HH:MM in 15-minute steps"
      });
      return;
    }
    if (String(input.type || "").toLowerCase() !== "time") return;
    input.setAttribute("step", "900");
    input.setAttribute("lang", "en-GB");
    input.setAttribute("inputmode", "numeric");
  });
}

function startDashboardClock() {
  const mod = window.ProCalModules && window.ProCalModules.uiDateTime;
  if (!mod || typeof mod.startLiveClock !== "function") return;
  if (typeof stopDashboardClock === "function") return;
  stopDashboardClock = mod.startLiveClock({
    timeEl: dashboardClockTime,
    dateEl: dashboardClockDate,
    weekdayEl: dashboardClockWeekday,
    getLocale
  });
}

function startDayTimelineRefresh() {
  if (dayTimelineRefreshTimer) return;
  dayTimelineRefreshTimer = window.setInterval(() => {
    if (String(selectedDateKey || "") !== toDateKey(new Date())) return;
    renderDayTimelinePanel();
  }, 60000);
}

function clampMobileSheetHeightVh(value) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.clampMobileSheetHeightVh !== "function") return MOBILE_UPCOMING_SHEET_DEFAULT_VH;
  return mod.clampMobileSheetHeightVh(value);
}

function setMobileSheetHeight(panelEl, heightVh) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.setMobileSheetHeight !== "function") return;
  mod.setMobileSheetHeight(panelEl, heightVh);
}

function clearMobileSheetHeight(panelEl) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.clearMobileSheetHeight !== "function") return;
  mod.clearMobileSheetHeight(panelEl);
}

function getMobileSheetHeight(panelEl, fallbackVh) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.getMobileSheetHeight !== "function") return fallbackVh;
  return mod.getMobileSheetHeight(panelEl, fallbackVh);
}

function startMobileSheetDrag(event, panelEl, fallbackVh) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.startMobileSheetDrag !== "function") return;
  mod.startMobileSheetDrag({
    event,
    panelEl,
    fallbackVh,
    isMobileViewport
  });
}

function handleMobileSheetDragMove(event) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.handleMobileSheetDragMove !== "function") return;
  mod.handleMobileSheetDragMove(event);
}

function finishMobileSheetDrag() {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.finishMobileSheetDrag !== "function") return;
  mod.finishMobileSheetDrag();
}

function updateMobileResponsivePanels() {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.updateMobileResponsivePanels !== "function") return;
  mod.updateMobileResponsivePanels({
    upcomingPanel,
    dayPanelShell,
    toggleUpcomingBtn,
    t,
    updateUpcomingToggleUI,
    isMobileViewport
  });
}

function openMobileUpcomingPanel() {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.openMobileUpcomingPanel !== "function") return;
  mod.openMobileUpcomingPanel({
    upcomingPanel,
    dayPanelShell,
    defaultHeightVh: MOBILE_UPCOMING_SHEET_DEFAULT_VH,
    isMobileViewport
  });
}

function closeMobileUpcomingPanel() {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.closeMobileUpcomingPanel !== "function") return;
  mod.closeMobileUpcomingPanel({
    upcomingPanel,
    isMobileViewport
  });
}

function openMobileDayPanel() {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.openMobileDayPanel !== "function") return;
  mod.openMobileDayPanel({
    upcomingPanel,
    dayPanelShell,
    defaultHeightVh: MOBILE_DAY_SHEET_DEFAULT_VH,
    isMobileViewport
  });
}

function closeMobileDayPanel() {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.closeMobileDayPanel !== "function") return;
  mod.closeMobileDayPanel({
    dayPanelShell,
    isMobileViewport
  });
}

function closeMobileOverlayPanels() {
  closeMobileDayPanel();
  closeMobileUpcomingPanel();
}

function handleMobileSheetOutsidePointerDown(event) {
  const mod = getMobileSheetsModule();
  if (!mod || typeof mod.handleMobileSheetOutsidePointerDown !== "function") return;
  mod.handleMobileSheetOutsidePointerDown({
    event,
    dayPanelShell,
    upcomingPanel,
    isMobileViewport
  });
}

function goPrevCalendarRange() {
  if (currentView === "year") {
    currentMonth = new Date(currentMonth.getFullYear() - 1, 0, 1);
  } else {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  }
  renderCalendar();
  queueLeaveAbsenceSync(true);
}

function goNextCalendarRange() {
  if (currentView === "year") {
    currentMonth = new Date(currentMonth.getFullYear() + 1, 0, 1);
  } else {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }
  renderCalendar();
  queueLeaveAbsenceSync(true);
}

function formatNotificationActor(item) {
  const mod = window.ProCalModules && window.ProCalModules.notificationsFormat;
  if (!mod || typeof mod.formatNotificationActor !== "function") return "";
  return mod.formatNotificationActor(item, { t, currentUserId, getPersonNameById });
}

function isImportantNotificationType(type) {
  const mod = window.ProCalModules && window.ProCalModules.notificationsFormat;
  return mod && typeof mod.isImportantNotificationType === "function"
    ? mod.isImportantNotificationType(type)
    : false;
}

function isPersonalTaskCollabInviteNotification(item) {
  const mod = window.ProCalModules && window.ProCalModules.notificationsFormat;
  return mod && typeof mod.isPersonalTaskCollabInviteNotification === "function"
    ? mod.isPersonalTaskCollabInviteNotification(item)
    : false;
}

async function respondToPersonalTaskCollabInvite(notificationId, action) {
  const id = String(notificationId || "").trim();
  const mode = action === "decline" ? "decline" : "accept";
  if (!id) return;
  try {
    const token = await ensureAccessToken();
    if (!token) return;
    const res = await fetch(`/api/legacy/personal-task-collab/respond/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action: mode })
    });
    if (!res.ok) return;
  } catch {
    // no-op
  }
  scheduleNotificationsRefresh(10);
  queueRealtimeSync();
  queueCurrentUserSessionRefresh(true);
}

function renderNotificationsList() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsRender;
  if (!mod || typeof mod.renderList !== "function") return;
  mod.renderList({
    documentRef: document,
    notificationsList,
    notificationsRows,
    t,
    currentLang,
    formatNotificationDateTime,
    formatNotificationActor,
    isImportantNotificationType,
    isPersonalTaskCollabInviteNotification,
    onInviteRespond: respondToPersonalTaskCollabInvite,
    onMarkRead: markNotificationRead
  });
}

async function fetchNotifications(path, init) {
  const mod = window.ProCalModules && window.ProCalModules.authFetch;
  if (!mod || typeof mod.fetchJsonWithBearer !== "function") throw new Error("auth");
  return mod.fetchJsonWithBearer(path, init, {
    ensureAccessToken,
    errorPrefix: "notifications"
  });
}

async function refreshNotificationUnreadCount() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.refreshUnreadCount !== "function") return;
  await mod.refreshUnreadCount({
    currentUserId,
    fetchNotifications,
    setUnreadCount: (value) => { notificationsUnreadCount = Number(value) || 0; },
    renderNotificationsBadge
  });
}

async function loadNotifications() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.load !== "function") return;
  await mod.load({
    notificationsUnreadOnly,
    fetchNotifications,
    getLoadInFlight: () => notificationsLoadInFlight,
    setLoadInFlight: (value) => { notificationsLoadInFlight = Boolean(value); },
    setRows: (rows) => { notificationsRows = Array.isArray(rows) ? rows : []; },
    setUnreadCount: (value) => { notificationsUnreadCount = Number(value) || 0; },
    renderNotificationsList,
    renderNotificationsBadge
  });
}

function scheduleNotificationsRefresh(delay = 120) {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.scheduleRefresh !== "function") return;
  mod.scheduleRefresh({
    delay,
    getRefreshTimer: () => notificationsRefreshTimer,
    setRefreshTimer: (value) => { notificationsRefreshTimer = value || null; },
    refreshNotificationUnreadCount,
    loadNotifications,
    isNotificationsMenuOpen: () => Boolean(notificationsMenu && !notificationsMenu.classList.contains("hidden"))
  });
}

async function markNotificationRead(id) {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.markRead !== "function") return;
  await mod.markRead({
    id,
    fetchNotifications,
    loadNotifications,
    setUnreadCount: (value) => { notificationsUnreadCount = Number(value) || 0; }
  });
}

async function markAllNotificationsRead() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.markAllRead !== "function") return;
  await mod.markAllRead({
    fetchNotifications,
    loadNotifications,
    setUnreadCount: (value) => { notificationsUnreadCount = Number(value) || 0; }
  });
}

async function clearNotificationsForCurrentUser() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.clearForCurrentUser !== "function") return;
  await mod.clearForCurrentUser({
    fetchNotifications,
    loadNotifications,
    renderNotificationsList,
    renderNotificationsBadge,
    setRows: (rows) => { notificationsRows = Array.isArray(rows) ? rows : []; },
    setUnreadCount: (value) => { notificationsUnreadCount = Number(value) || 0; }
  });
}

function openNotificationsMenu() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.openMenu !== "function") return;
  mod.openMenu({
    notificationsMenu,
    loadNotifications
  });
}

function closeNotificationsMenu() {
  const mod = window.ProCalModules && window.ProCalModules.notificationsController;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ notificationsMenu });
}

function renderChatBadge() {
  const mod = window.ProCalModules && window.ProCalModules.uiStatus;
  if (!mod || typeof mod.renderCountBadge !== "function") return;
  mod.renderCountBadge({
    badgeEl: chatUnreadBadge,
    count: chatUnreadCount,
    hiddenClass: "hidden-section"
  });
}

async function fetchChatJson(path, init) {
  const mod = window.ProCalModules && window.ProCalModules.authFetch;
  if (!mod || typeof mod.fetchJsonWithBearer !== "function") throw new Error("auth");
  return mod.fetchJsonWithBearer(path, init, {
    ensureAccessToken,
    errorPrefix: "chat"
  });
}

async function fetchFilesJson(path, init) {
  const mod = window.ProCalModules && window.ProCalModules.authFetch;
  if (!mod || typeof mod.fetchJsonWithBearer !== "function") throw new Error("auth");
  return mod.fetchJsonWithBearer(path, init, {
    ensureAccessToken,
    errorPrefix: "files"
  });
}

function formatBytes(size) {
  const bytes = Math.max(0, Number(size || 0));
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setFilesStatus(text, danger) {
  if (!filesStatus) return;
  filesStatus.textContent = String(text || "");
  filesStatus.style.color = danger ? "#b91c1c" : "#64748b";
}

async function copyFilesPathToClipboard(pathValue) {
  const text = getFilesOperationDisplayPath(pathValue);
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.opacity = "0";
      area.style.pointerEvents = "none";
      document.body.appendChild(area);
      area.focus();
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) throw new Error("copy_failed");
    }
    setFilesStatus(t("filesPathCopied"), false);
  } catch (_) {
    setFilesStatus(t("filesPathCopyFailed"), true);
  }
}

function getFilesClipboardPath(row) {
  if (!row) return normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
  if (String(row.entryType || "") === "folder") {
    return normalizeExplorerPathLocal(String(row.path || ""));
  }
  if (Boolean(row.backup)) {
    return normalizeExplorerPathLocal(String(row.path || row.name || row.fileName || ""));
  }
  return normalizeExplorerPathLocal(String(row.path || row.name || row.fileName || ""));
}

function buildFilesUploadFormData(file, fields) {
  const formData = new FormData();
  formData.append("file", file, String(file && file.name || "file"));
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    formData.append(key, text);
  });
  return formData;
}

function canUseFilesFolderUpload() {
  const mode = String(filesModalContext && filesModalContext.mode || "chat");
  return Boolean(filesModalContext && filesModalContext.canUpload)
    && Boolean(filesModalContext && filesModalContext.canCreateFolder)
    && mode !== "chat";
}

function closeFilesUploadPickerMenu() {
  filesUploadPickerMenuOpen = false;
  if (!filesUploadPickerMenu) return;
  filesUploadPickerMenu.classList.add("hidden-section");
}

function refreshFilesUploadSummary() {
  const selected = filesUploadInput && filesUploadInput.files
    ? Array.from(filesUploadInput.files || [])
    : [];
  const canUpload = Boolean(filesModalContext && filesModalContext.canUpload);
  const totalBytes = selected.reduce((sum, file) => sum + Math.max(0, Number(file && file.size || 0)), 0);
  if (filesUploadSummary) {
    if (!selected.length) {
      filesUploadSummary.textContent = t("filesUploadSelectionEmpty");
    } else if (selected.length === 1) {
      filesUploadSummary.textContent = t("filesUploadSelectionSingle")
        .replace("{name}", String(selected[0] && selected[0].name || "file"))
        .replace("{size}", formatBytes(totalBytes));
    } else {
      filesUploadSummary.textContent = t("filesUploadSelectionMultiple")
        .replace("{count}", String(selected.length))
        .replace("{size}", formatBytes(totalBytes));
    }
  }
  if (filesUploadBtn) filesUploadBtn.disabled = !canUpload;
  if (filesUploadFilesBtn) filesUploadFilesBtn.disabled = !canUpload;
  if (filesUploadFolderBtn) {
    const folderUploadAvailable = canUseFilesFolderUpload();
    filesUploadFolderBtn.classList.toggle("hidden-section", !folderUploadAvailable);
    filesUploadFolderBtn.disabled = !folderUploadAvailable;
  }
}

function openFilesUploadChooser() {
  if (!filesModalContext || !filesModalContext.canUpload) return;
  if (!filesUploadExpanded) {
    filesUploadExpanded = true;
    updateFilesContextUI();
  }
  setTimeout(() => {
    try {
      if (filesUploadInput) filesUploadInput.click();
    } catch (_) {
      // Ignore UI click issues.
    }
  }, 0);
}

function clearFilesSearchFilter() {
  filesExplorerState.search = "";
  if (filesSearchInput) filesSearchInput.value = "";
  refreshFilesExplorerView();
  try {
    if (filesSearchInput) filesSearchInput.focus();
  } catch (_) {
    // Ignore focus errors.
  }
}

function assignFilesToUploadInput(nextFiles) {
  const files = Array.isArray(nextFiles)
    ? nextFiles.filter((file) => file instanceof File)
    : Array.from(nextFiles || []).filter((file) => file instanceof File);
  if (!filesUploadInput || !files.length) {
    refreshFilesUploadSummary();
    return false;
  }
  try {
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    filesUploadInput.files = dataTransfer.files;
    refreshFilesUploadSummary();
    return true;
  } catch (_) {
    refreshFilesUploadSummary();
    return false;
  }
}

function attachRelativePathToFile(file, relativePath) {
  if (!(file instanceof File)) return null;
  const cleanRelativePath = normalizeExplorerPathLocal(String(relativePath || file.webkitRelativePath || file.name || ""));
  if (!cleanRelativePath) return file;
  try {
    const nextFile = new File([file], String(file.name || "file"), {
      type: String(file.type || ""),
      lastModified: Number(file.lastModified || Date.now())
    });
    Object.defineProperty(nextFile, "webkitRelativePath", {
      value: cleanRelativePath,
      configurable: true
    });
    return nextFile;
  } catch (_) {
    try {
      Object.defineProperty(file, "webkitRelativePath", {
        value: cleanRelativePath,
        configurable: true
      });
    } catch {
      // Ignore relative-path assignment failures.
    }
    return file;
  }
}

async function readDroppedDirectoryEntries(reader) {
  const items = [];
  while (true) {
    const chunk = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!Array.isArray(chunk) || !chunk.length) break;
    items.push(...chunk);
  }
  return items;
}

async function collectDroppedEntryFiles(entry, basePath, files) {
  if (!entry) return;
  const nextBasePath = normalizeExplorerPathLocal(basePath);
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    }).catch(() => null);
    if (!(file instanceof File)) return;
    const relativePath = normalizeExplorerPathLocal([nextBasePath, String(file.name || "file")].filter(Boolean).join("/"));
    const nextFile = attachRelativePathToFile(file, relativePath);
    if (nextFile instanceof File) files.push(nextFile);
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readDroppedDirectoryEntries(reader);
    for (const childEntry of entries) {
      await collectDroppedEntryFiles(
        childEntry,
        [nextBasePath, String(entry.name || "")].filter(Boolean).join("/"),
        files
      );
    }
  }
}

async function collectDroppedFiles(dataTransfer) {
  const nextFiles = [];
  const items = dataTransfer && dataTransfer.items
    ? Array.from(dataTransfer.items || [])
    : [];
  const supportsEntries = items.some((item) => item && typeof item.webkitGetAsEntry === "function");
  if (supportsEntries) {
    for (const item of items) {
      if (!item) continue;
      const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
      if (entry) {
        await collectDroppedEntryFiles(entry, "", nextFiles);
        continue;
      }
      const file = typeof item.getAsFile === "function" ? item.getAsFile() : null;
      if (!(file instanceof File)) continue;
      const nextFile = attachRelativePathToFile(file, String(file.name || "file"));
      if (nextFile instanceof File) nextFiles.push(nextFile);
    }
    return nextFiles;
  }
  const files = dataTransfer && dataTransfer.files ? Array.from(dataTransfer.files || []) : [];
  return files.map((file) => attachRelativePathToFile(file, String(file.webkitRelativePath || file.name || "file"))).filter((file) => file instanceof File);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function renderFilesCapacity(usedBytes, limitBytes) {
  const used = Math.max(0, Number(usedBytes || 0));
  const limit = Math.max(0, Number(limitBytes || 0));
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  if (filesCapacityFill) {
    filesCapacityFill.style.width = `${percent}%`;
    const bar = filesCapacityFill.parentElement;
    if (bar) {
      bar.setAttribute("aria-valuenow", String(percent));
      bar.setAttribute("title", `${percent}%`);
    }
  }
  if (filesCapacityLabel) {
    const usedText = formatBytes(used);
    const limitText = limit > 0 ? formatBytes(limit) : "0 B";
    filesCapacityLabel.textContent = t("filesCapacityFormat")
      .replace("{used}", usedText)
      .replace("{limit}", limitText);
  }
}

async function loadFilesCapacity() {
  try {
    const body = await fetchFilesJson("/api/files/storage");
    const usedBytes = Number(body && body.usedBytes || 0);
    const limitBytes = Number(body && body.limitBytes || 0);
    renderFilesCapacity(usedBytes, limitBytes);
  } catch (_) {
    renderFilesCapacity(0, 0);
  }
}

function buildChatFileMarker(fileId, fileName) {
  const id = String(fileId || "").trim();
  const name = encodeURIComponent(String(fileName || "file").trim() || "file");
  return id ? `[[file:${id}:${name}]]` : "";
}

function refreshChatAttachSummary() {
  if (!chatAttachSummary) return;
  if (!Array.isArray(chatPendingFiles) || !chatPendingFiles.length) {
    chatAttachSummary.textContent = t("chatNoFiles");
    return;
  }
  const names = chatPendingFiles.slice(0, 2).map((file) => String(file && file.name || "file")).join(", ");
  const extra = chatPendingFiles.length > 2 ? ` +${chatPendingFiles.length - 2}` : "";
  chatAttachSummary.textContent = `${chatPendingFiles.length} ${t("chatFilesSelected")}: ${names}${extra}`;
}

function clearChatPendingFiles() {
  chatPendingFiles = [];
  if (chatFileInput) chatFileInput.value = "";
  refreshChatAttachSummary();
}

async function uploadChatPendingFiles() {
  const markers = [];
  if (!Array.isArray(chatPendingFiles) || !chatPendingFiles.length) return markers;
  for (const file of chatPendingFiles) {
    const payload = chatActiveScope === "global"
      ? buildFilesUploadFormData(file, { scope: "global" })
      : buildFilesUploadFormData(file, {
          scope: "direct",
          peerUserId: String(chatActivePeerUserId || "")
        });
    const result = await fetchFilesJson("/api/files/chat/upload", {
      method: "POST",
      body: payload
    });
    const created = result && result.file ? result.file : null;
    if (!created || !created.id) continue;
    const marker = buildChatFileMarker(created.id, created.fileName || file.name || "file");
    if (marker) markers.push(marker);
  }
  return markers;
}

function getChatThreadLabel(item) {
  const mod = window.ProCalModules && window.ProCalModules.chatMeta;
  if (!mod || typeof mod.getThreadLabel !== "function") return "";
  return mod.getThreadLabel(item, { t, getPersonNameById });
}

function getChatThreadColor(item) {
  const mod = window.ProCalModules && window.ProCalModules.chatMeta;
  if (!mod || typeof mod.getThreadColor !== "function") return "#64748b";
  return mod.getThreadColor(item, { operationalPeople: getOperationalPeople() });
}

function getChatActiveThreadKey() {
  const mod = window.ProCalModules && window.ProCalModules.chatMeta;
  if (!mod || typeof mod.getActiveThreadKey !== "function") return "";
  return mod.getActiveThreadKey({
    chatActiveScope,
    currentUserId,
    chatActivePeerUserId
  });
}

function renderChatThreadList() {
  const mod = window.ProCalModules && window.ProCalModules.chatUi;
  if (!mod || typeof mod.renderThreadList !== "function") return;
  mod.renderThreadList({
    documentRef: document,
    chatThreadList,
    canChatAccess: canChatAccess(),
    t,
    chatRows,
    chatOnlineUserIds,
    currentUserId,
    operationalPeople: getOperationalPeople(),
    chatActiveScope,
    chatActivePeerUserId,
    getChatThreadLabel,
    getChatThreadColor,
    getLocale,
    formatNotificationDateTime,
    onSelectThread: selectChatThread
  });
}

function isChatNearBottom(thresholdPx) {
  const mod = window.ProCalModules && window.ProCalModules.chatUi;
  return mod && typeof mod.isNearBottom === "function"
    ? mod.isNearBottom({
        chatMessagesEl: chatMessages,
        thresholdPx
      })
    : true;
}

function scrollChatToBottom() {
  const mod = window.ProCalModules && window.ProCalModules.chatUi;
  if (!mod || typeof mod.scrollToBottom !== "function") return;
  mod.scrollToBottom({ chatMessagesEl: chatMessages });
}

function updateChatScrollBottomButton() {
  const mod = window.ProCalModules && window.ProCalModules.chatUi;
  if (!mod || typeof mod.updateScrollBottomButton !== "function") return;
  mod.updateScrollBottomButton({
    chatScrollBottomBtn,
    chatMessagesEl: chatMessages,
    chatOpen,
    chatActiveScope,
    thresholdPx: 64,
    hiddenClass: "hidden-section"
  });
}

function renderChatMessages(options) {
  const mod = window.ProCalModules && window.ProCalModules.chatUi;
  if (!mod || typeof mod.renderMessages !== "function") return;
  const result = mod.renderMessages({
    documentRef: document,
    chatMessagesEl: chatMessages,
    chatScrollBottomBtn,
    chatOpen,
    chatActiveScope,
    chatMessageRows,
    currentUserId,
    t,
    getPersonNameById,
    formatNotificationDateTime,
    chatAutoStickToBottom,
    forceBottom: Boolean(options && typeof options === "object" && options.forceBottom),
    nearBottomThresholdPx: 64,
    hiddenClass: "hidden-section"
  });
  if (result && result.chatAutoStickToBottom === true) {
    chatAutoStickToBottom = true;
  }
}

function updateChatHeader() {
  const mod = window.ProCalModules && window.ProCalModules.chatUi;
  if (!mod || typeof mod.updateHeader !== "function") return;
  mod.updateHeader({
    chatThreadHeader,
    chatActiveScope,
    chatActivePeerUserId,
    t,
    getPersonNameById
  });
}

function isChatRealtimeConnected() {
  const mod = window.ProCalModules && window.ProCalModules.uiStatus;
  return mod && typeof mod.isRealtimeConnected === "function"
    ? mod.isRealtimeConnected({ realtimeConnectionStatus })
    : realtimeConnectionStatus === "connected";
}

function getChatBadgePollIntervalMs() {
  const mod = window.ProCalModules && window.ProCalModules.uiStatus;
  return mod && typeof mod.getChatBadgePollIntervalMs === "function"
    ? mod.getChatBadgePollIntervalMs({ realtimeConnectionStatus })
    : (isChatRealtimeConnected() ? 15000 : 4000);
}

function getChatOpenPollIntervalMs() {
  const mod = window.ProCalModules && window.ProCalModules.uiStatus;
  return mod && typeof mod.getChatOpenPollIntervalMs === "function"
    ? mod.getChatOpenPollIntervalMs({ realtimeConnectionStatus })
    : (isChatRealtimeConnected() ? 8000 : 1200);
}

async function refreshChatUnreadCount() {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.refreshUnreadCount !== "function") return;
  await mod.refreshUnreadCount({
    currentUserId,
    canChatAccess: canChatAccess(),
    fetchChatJson,
    chatUnreadCount,
    setChatUnreadCount: (value) => { chatUnreadCount = Number(value) || 0; },
    renderChatBadge
  });
}

async function loadChatThreads() {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.loadThreads !== "function") return;
  await mod.loadThreads({
    chatOpen,
    chatThreadsLoading,
    canChatAccess: canChatAccess(),
    fetchChatJson,
    chatActiveScope,
    chatActivePeerUserId,
    getChatActiveThreadKey,
    setChatThreadsLoading: (value) => { chatThreadsLoading = Boolean(value); },
    setChatRows: (rows) => { chatRows = Array.isArray(rows) ? rows : []; },
    setChatOnlineUserIds: (setValue) => { chatOnlineUserIds = setValue instanceof Set ? setValue : new Set(); },
    renderChatThreadList
  });
}

async function loadChatMessages() {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.loadMessages !== "function") return;
  await mod.loadMessages({
    chatOpen,
    chatMessagesLoading,
    canChatAccess: canChatAccess(),
    chatActiveScope,
    chatActivePeerUserId,
    fetchChatJson,
    setChatMessagesLoading: (value) => { chatMessagesLoading = Boolean(value); },
    setChatMessageRows: (rows) => { chatMessageRows = Array.isArray(rows) ? rows : []; },
    renderChatMessages
  });
}

async function markChatThreadRead() {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.markThreadRead !== "function") return;
  await mod.markThreadRead({
    chatOpen,
    canChatAccess: canChatAccess(),
    chatActiveScope,
    chatActivePeerUserId,
    chatMarkReadInFlight,
    chatRows,
    chatUnreadCount,
    fetchChatJson,
    getChatActiveThreadKey,
    renderChatBadge,
    renderChatThreadList,
    setChatMarkReadInFlight: (value) => { chatMarkReadInFlight = Boolean(value); },
    setChatRows: (rows) => { chatRows = Array.isArray(rows) ? rows : []; },
    setChatUnreadCount: (value) => { chatUnreadCount = Math.max(0, Number(value) || 0); }
  });
}

async function selectChatThread(scope, peerUserId) {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.selectThread !== "function") return;
  await mod.selectThread({
    scope,
    peerUserId,
    setChatActiveScope: (value) => { chatActiveScope = value === "direct" ? "direct" : "global"; },
    setChatActivePeerUserId: (value) => { chatActivePeerUserId = String(value || ""); },
    setChatAutoStickToBottom: (value) => { chatAutoStickToBottom = Boolean(value); },
    updateChatHeader,
    renderChatThreadList,
    loadChatMessages,
    markChatThreadRead
  });
}

function openChatModal() {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.openModal !== "function") return;
  mod.openModal({
    documentRef: document,
    chatModal,
    canChatAccess: canChatAccess(),
    chatActiveScope,
    chatScrollBottomBtn,
    setChatOpen: (value) => { chatOpen = Boolean(value); },
    setChatAutoStickToBottom: (value) => { chatAutoStickToBottom = Boolean(value); },
    updateChatHeader,
    renderChatThreadList,
    renderChatMessages,
    loadChatThreads,
    loadChatMessages,
    markChatThreadRead,
    selectChatThread,
    refreshChatUnreadCount,
    getChatOpenPollIntervalMs,
    getChatOpenPollTimer: () => chatOpenPollTimer,
    setChatOpenPollTimer: (value) => { chatOpenPollTimer = value || null; }
  });
}

function closeChatModal() {
  const mod = window.ProCalModules && window.ProCalModules.chatController;
  if (!mod || typeof mod.closeModal !== "function") return;
  mod.closeModal({
    chatModal,
    chatScrollBottomBtn,
    hiddenClass: "hidden-section",
    setChatOpen: (value) => { chatOpen = Boolean(value); },
    getChatOpenPollTimer: () => chatOpenPollTimer,
    setChatOpenPollTimer: (value) => { chatOpenPollTimer = value || null; }
  });
}

function getCurrentEventFileKey() {
  const raw = String(previewEventSeriesId || "").trim();
  return raw || "";
}

function readEventFilesFolderEnabled(value) {
  if (!value || typeof value !== "object") return true;
  if (!Object.prototype.hasOwnProperty.call(value, "filesFolderEnabled")) return true;
  return Boolean(value.filesFolderEnabled);
}

function readEventFilesDetached(value) {
  if (!value || typeof value !== "object") return false;
  return Boolean(value.filesDetached);
}

function getEventFilesFormState() {
  return {
    filesFolderEnabled: eventFilesFolderEnabled instanceof HTMLInputElement
      ? Boolean(eventFilesFolderEnabled.checked)
      : true,
    filesDetached: eventFilesDetached instanceof HTMLInputElement
      ? Boolean(eventFilesDetached.checked)
      : false
  };
}

function refreshEventFilesSettingsUi() {
  const settings = getEventFilesFormState();
  const summaryKey = !settings.filesFolderEnabled
    ? "eventFilesSettingsDisabledSummary"
    : settings.filesDetached
      ? "eventFilesSettingsDetachedSummary"
      : "eventFilesSettingsLinkedSummary";
  if (eventFilesSettingsSummary) {
    eventFilesSettingsSummary.textContent = t(summaryKey);
  }
}

function readEventReminderFormState() {
  const enabled = Boolean(eventReminderEnabled && eventReminderEnabled.checked);
  if (!enabled) return { enabled: false };
  const offset = Number.parseInt(String(eventReminderOffset && eventReminderOffset.value || "15"), 10);
  const timeMeta = window.ProCalModules && window.ProCalModules.eventTimeMeta;
  const allDayTimeRaw = String(eventReminderAllDayTime && eventReminderAllDayTime.value || "09:00").trim();
  const parsedAllDayTime = timeMeta && typeof timeMeta.parseTimeToMinutes === "function"
    ? timeMeta.parseTimeToMinutes(allDayTimeRaw)
    : null;
  const recipientScope = String(eventReminderRecipients && eventReminderRecipients.value || "participants_tasks");
  const customRecipientIds = recipientScope === "custom"
    ? getCheckedIdsFromContainer(eventReminderCustomPeopleChecklist)
    : [];
  return {
    enabled: true,
    offsetMinutes: Number.isFinite(offset) && offset >= 0 ? offset : 15,
    allDayTime: parsedAllDayTime == null
      ? "09:00"
      : (timeMeta && typeof timeMeta.minutesToTime === "function" ? timeMeta.minutesToTime(parsedAllDayTime) : allDayTimeRaw),
    repeatMode: String(eventReminderRepeat && eventReminderRepeat.value || "each_occurrence") === "first_only" ? "first_only" : "each_occurrence",
    recipientScope: ["participants_tasks", "participants", "task_assignees", "all", "custom"].includes(recipientScope)
      ? recipientScope
      : "participants_tasks",
    customRecipientIds: filterPeopleIds(customRecipientIds)
  };
}

function applyEventReminderFormState(value) {
  const cfg = value && typeof value === "object" ? value : {};
  if (eventReminderEnabled instanceof HTMLInputElement) {
    eventReminderEnabled.checked = Boolean(cfg.enabled);
  }
  if (eventReminderOffset) {
    const allowedOffsets = new Set(["0", "5", "10", "15", "30", "60", "1440", "10080", "43200"]);
    const nextOffset = String(Number(cfg.offsetMinutes));
    eventReminderOffset.value = allowedOffsets.has(nextOffset) ? nextOffset : "15";
  }
  if (eventReminderAllDayTime) eventReminderAllDayTime.value = String(cfg.allDayTime || "09:00");
  if (eventReminderRepeat) eventReminderRepeat.value = String(cfg.repeatMode || "each_occurrence") === "first_only" ? "first_only" : "each_occurrence";
  if (eventReminderRecipients) {
    const scope = String(cfg.recipientScope || "participants_tasks");
    eventReminderRecipients.value = ["participants_tasks", "participants", "task_assignees", "all", "custom"].includes(scope)
      ? scope
      : "participants_tasks";
  }
  renderEventReminderCustomPeople(filterPeopleIds(Array.isArray(cfg.customRecipientIds) ? cfg.customRecipientIds : []));
  refreshEventReminderUi();
}

function refreshEventReminderUi() {
  const enabled = Boolean(eventReminderEnabled && eventReminderEnabled.checked);
  if (eventReminderSettings) eventReminderSettings.classList.toggle("hidden-section", !enabled);
  const isRepeating = repeatFreq && repeatFreq.value !== "none";
  if (eventReminderRepeatWrap) eventReminderRepeatWrap.classList.toggle("hidden-section", !enabled || !isRepeating);
  if (eventReminderCustomPeopleWrap) {
    eventReminderCustomPeopleWrap.classList.toggle(
      "hidden-section",
      !enabled || !eventReminderRecipients || eventReminderRecipients.value !== "custom"
    );
  }
}

function renderEventReminderCustomPeople(selectedIds) {
  renderPeopleChecklist(eventReminderCustomPeopleChecklist, selectedIds || []);
}

function getCheckedIdsFromContainer(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map((el) => String(el && el.value || "").trim())
    .filter(Boolean);
}

function setEventFormTab(nextTab) {
  const filesAvailable = canUseFilesModule();
  const requested = String(nextTab || "");
  const targetTab = filesAvailable && requested === "files" ? "files" : requested === "reminders" ? "reminders" : "details";
  eventFormActiveTab = targetTab;
  const showDetails = targetTab === "details";
  const showReminders = targetTab === "reminders";
  if (eventFormDetailsTabBtn) {
    eventFormDetailsTabBtn.classList.toggle("active", showDetails);
    eventFormDetailsTabBtn.setAttribute("aria-selected", showDetails ? "true" : "false");
  }
  if (eventFormRemindersTabBtn) {
    eventFormRemindersTabBtn.classList.toggle("active", showReminders);
    eventFormRemindersTabBtn.setAttribute("aria-selected", showReminders ? "true" : "false");
  }
  if (eventFormFilesTabBtn) {
    eventFormFilesTabBtn.classList.toggle("hidden-section", !filesAvailable);
    eventFormFilesTabBtn.classList.toggle("active", targetTab === "files");
    eventFormFilesTabBtn.setAttribute("aria-selected", targetTab === "files" ? "true" : "false");
  }
  if (eventFormDetailsPanel) eventFormDetailsPanel.classList.toggle("hidden-section", !showDetails);
  if (eventFormRemindersPanel) eventFormRemindersPanel.classList.toggle("hidden-section", !showReminders);
  if (eventFormFilesPanel) {
    eventFormFilesPanel.classList.toggle("hidden-section", targetTab !== "files" || !filesAvailable);
  }
  refreshEventReminderUi();
}

function applyEventFilesFormState(value) {
  const nextFolderEnabled = readEventFilesFolderEnabled(value);
  const nextDetached = readEventFilesDetached(value);
  if (eventFilesFolderEnabled instanceof HTMLInputElement) {
    eventFilesFolderEnabled.checked = nextFolderEnabled;
  }
  if (eventFilesDetached instanceof HTMLInputElement) {
    eventFilesDetached.checked = nextDetached;
  }
  refreshEventFilesSettingsUi();
}

function getEventFilesSettingsForEvent(eventKey) {
  const key = String(eventKey || "").trim();
  if (key && String(editingEventSeriesId || "").trim() === key) {
    return getEventFilesFormState();
  }
  const baseEvent = key ? findBaseEventById(key) : null;
  return {
    filesFolderEnabled: readEventFilesFolderEnabled(baseEvent),
    filesDetached: readEventFilesDetached(baseEvent)
  };
}

function sanitizeEventFolderLabelPart(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || String(fallback || "").trim();
}

function formatEventFolderDate(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.replace(/-/g, ".");
  }
  return "";
}

function buildEventFolderNameForFiles(eventKey, startDate, title) {
  const fallback = normalizeFilesPathSegment(eventKey || "event");
  const datePart = formatEventFolderDate(startDate);
  const titlePart = sanitizeEventFolderLabelPart(title, "");
  if (datePart && titlePart) return `${datePart} - ${titlePart}`;
  if (titlePart) return titlePart;
  if (datePart) return datePart;
  return fallback;
}

function getEventFolderNameHintForFiles(eventKey) {
  const key = String(eventKey || "").trim();
  if (!key) return normalizeFilesPathSegment("event");
  if (previewEventSnapshot && String(previewEventSeriesId || "").trim() === key) {
    return buildEventFolderNameForFiles(key, previewEventSnapshot.startDate, previewEventSnapshot.title);
  }
  const base = findBaseEventById(key);
  if (base) {
    return buildEventFolderNameForFiles(key, base.startDate, base.title);
  }
  return buildEventFolderNameForFiles(key, "", "");
}

async function resolveEventFilesStartPath(eventKey) {
  const key = String(eventKey || "").trim();
  if (!key) return "";
  try {
    const body = await fetchFilesJson(`/api/files/events/${encodeURIComponent(key)}`);
    const fromApi = String(body && (body.defaultPath || body.folderPath) || "").trim();
    if (!fromApi) return `${getEventFolderNameHintForFiles(key)}/other`;
    if (fromApi.includes("/")) return normalizeExplorerPathLocal(fromApi);
    return normalizeExplorerPathLocal(`${fromApi}/other`);
  } catch (_) {
    return normalizeExplorerPathLocal(`${getEventFolderNameHintForFiles(key)}/other`);
  }
}

function normalizeFilesPathSegment(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "u";
}

function buildChatThreadKeyForFiles(scope, userId, peerUserId) {
  if (String(scope || "") !== "direct") return "global";
  const left = normalizeFilesPathSegment(userId);
  const right = normalizeFilesPathSegment(peerUserId);
  return left < right ? `dm:${left}:${right}` : `dm:${right}:${left}`;
}

function getFilesRootByMode(mode) {
  if (mode === "event") return "events";
  if (mode === "shared") return "shared";
  if (mode === "backups") return "backups";
  return "chat";
}

function getFilesModeByRoot(root) {
  if (root === "events") return "event";
  if (root === "shared") return "shared";
  if (root === "backups") return "backups";
  return "chat";
}

function getFilesTreeRoots(nextCtx) {
  const ctx = nextCtx && typeof nextCtx === "object" ? nextCtx : filesModalContext;
  const primaryRoot = getFilesRootByMode(String(ctx && ctx.mode || "chat"));
  if (!FILES_TREE_ROOTS.includes(primaryRoot)) {
    return [...FILES_TREE_ROOTS];
  }
  return [...FILES_TREE_ROOTS];
}

function getFilesDefaultPathForContext(nextCtx) {
  const ctx = nextCtx && typeof nextCtx === "object" ? nextCtx : filesModalContext;
  const mode = String(ctx.mode || "chat");
  if (mode === "event") {
    const current = normalizeExplorerPathLocal(String(ctx.currentPath || ""));
    if (current) return current;
    const eventKey = String(ctx.eventKey || "").trim();
    if (!eventKey) return "";
    const folderHint = getEventFolderNameHintForFiles(eventKey);
    return `${folderHint}/other`;
  }
  if (mode === "chat") {
    const owner = normalizeFilesPathSegment(currentUserId || "u");
    const scope = ctx.chatScope === "direct" ? "direct" : "global";
    const peer = normalizeFilesPathSegment(String(ctx.chatPeerUserId || ""));
    const threadKey = buildChatThreadKeyForFiles(scope, owner, peer || owner);
    return `${owner}/${threadKey}`;
  }
  if (mode === "shared") {
    return "";
  }
  return "";
}

function normalizeExplorerPathLocal(value) {
  const raw = String(value || "").replace(/\\/g, "/").trim();
  if (!raw) return "";
  return raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function buildFilesHistorySnapshot() {
  return {
    mode: ["event", "chat", "shared"].includes(String(filesModalContext && filesModalContext.mode || ""))
      ? String(filesModalContext.mode)
      : "shared",
    eventKey: String(filesModalContext && filesModalContext.eventKey || ""),
    chatScope: filesModalContext && filesModalContext.chatScope === "direct" ? "direct" : "global",
    chatPeerUserId: String(filesModalContext && filesModalContext.chatPeerUserId || ""),
    path: normalizeExplorerPathLocal(String(filesModalContext && filesModalContext.currentPath || ""))
  };
}

function areFilesHistorySnapshotsEqual(left, right) {
  if (!left || !right) return false;
  return String(left.mode || "") === String(right.mode || "")
    && String(left.eventKey || "") === String(right.eventKey || "")
    && String(left.chatScope || "") === String(right.chatScope || "")
    && String(left.chatPeerUserId || "") === String(right.chatPeerUserId || "")
    && normalizeExplorerPathLocal(String(left.path || "")) === normalizeExplorerPathLocal(String(right.path || ""));
}

function resetFilesHistory(snapshot) {
  const nextSnapshot = snapshot && typeof snapshot === "object" ? snapshot : null;
  filesHistoryStack = nextSnapshot ? [nextSnapshot] : [];
  filesHistoryIndex = nextSnapshot ? 0 : -1;
}

function recordFilesHistorySnapshot(replaceCurrent) {
  const snapshot = buildFilesHistorySnapshot();
  if (replaceCurrent && filesHistoryIndex >= 0 && filesHistoryIndex < filesHistoryStack.length) {
    filesHistoryStack[filesHistoryIndex] = snapshot;
    return;
  }
  const current = filesHistoryIndex >= 0 ? filesHistoryStack[filesHistoryIndex] : null;
  if (current && areFilesHistorySnapshotsEqual(current, snapshot)) return;
  filesHistoryStack = filesHistoryStack.slice(0, filesHistoryIndex + 1);
  filesHistoryStack.push(snapshot);
  filesHistoryIndex = filesHistoryStack.length - 1;
}

function updateFilesExplorerLocationUi() {
  const mode = String(filesModalContext && filesModalContext.mode || "chat");
  const currentRoot = getFilesRootByMode(mode);
  const currentPath = normalizeExplorerPathLocal(String(filesModalContext && filesModalContext.currentPath || ""));
  const rootLabel = getFilesRootLabel(currentRoot);
  const segments = currentPath.split("/").filter(Boolean);
  const folderName = segments.length ? String(segments[segments.length - 1] || rootLabel) : rootLabel;
  if (filesCurrentFolderName) filesCurrentFolderName.textContent = folderName || rootLabel || "/";
  if (filesCurrentFolderPath) {
    filesCurrentFolderPath.textContent = `${rootLabel} • ${getFilesOperationDisplayPath(currentPath)}`;
  }
}

function updateFilesBreadcrumbsUI() {
  if (!filesBreadcrumbs) return;
  const crumbs = Array.isArray(filesModalContext.breadcrumbs) ? filesModalContext.breadcrumbs : [];
  if (!crumbs.length) {
    filesBreadcrumbs.textContent = "/";
    return;
  }
  filesBreadcrumbs.innerHTML = "";
  crumbs.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ghost-btn";
    btn.textContent = String(item && item.name || "/");
    btn.dataset.filesPathCrumb = encodeURIComponent(String(item && item.path || ""));
    if (index === crumbs.length - 1) btn.disabled = true;
    filesBreadcrumbs.appendChild(btn);
  });
}

function updateFilesContextUI() {
  const mode = String(filesModalContext && filesModalContext.mode || "chat");
  const isEvent = mode === "event";
  const isChat = mode === "chat";
  const isBackups = mode === "backups";
  const isShared = mode === "shared";
  const currentRoot = getFilesRootByMode(mode);

  const canUpload = Boolean(filesModalContext && filesModalContext.canUpload);
  const canCreateFolder = Boolean(filesModalContext && filesModalContext.canCreateFolder);
  if (filesUploadForm) filesUploadForm.classList.toggle("hidden-section", !canUpload || !filesUploadExpanded);
  if (filesUploadInput) filesUploadInput.multiple = true;
  if (filesSortSelect) filesSortSelect.value = String(filesExplorerState.sort || "modified_desc");
  updateFilesHeadSortUi();
  updateFilesViewModeUi();
  if (filesTreeTitle) filesTreeTitle.textContent = t("filesTreeTitle");
  refreshFilesUploadSummary();

  if (filesContextLabel) {
    if (isEvent) {
      filesContextLabel.textContent = t("filesEventFiles");
    } else if (isChat) {
      filesContextLabel.textContent = t("filesChatThread");
    } else if (isShared) {
      filesContextLabel.textContent = t("filesShared");
    } else {
      filesContextLabel.textContent = t("filesBackups");
    }
  }

  if (filesUploadLabel) {
    filesUploadLabel.textContent = t("filesChoose");
  }
  if (filesUploadBtn) filesUploadBtn.textContent = t("filesUpload");
  if (filesUploadToggleBtn) {
    filesUploadToggleBtn.classList.toggle("hidden-section", !canUpload);
    filesUploadToggleBtn.textContent = filesUploadExpanded ? t("filesHideUpload") : t("filesShowUpload");
  }
  if (filesBackBtn) filesBackBtn.disabled = filesHistoryIndex <= 0;
  if (filesNewFolderBtn) filesNewFolderBtn.disabled = !canCreateFolder;
  if (filesUpBtn) filesUpBtn.disabled = !String(filesModalContext.currentPath || "").trim();
  updateFilesExplorerLocationUi();
  updateFilesBreadcrumbsUI();
  updateFilesBatchSummary();
}

function getFilesTreeNodeKey(root, relPath) {
  const cleanRoot = String(root || "").trim();
  const cleanPath = normalizeExplorerPathLocal(relPath);
  return `${cleanRoot}:${cleanPath}`;
}

function setFilesTreeNode(root, relPath, payload) {
  const key = getFilesTreeNodeKey(root, relPath);
  const folders = Array.isArray(payload && payload.folders)
    ? payload.folders.filter((row) => row && String(row.entryType || "") === "folder")
    : [];
  filesTreeCache.set(key, {
    root: String(root || ""),
    path: normalizeExplorerPathLocal(relPath),
    folders: folders.map((row) => ({
      name: String(row.name || ""),
      path: String(row.path || ""),
      locked: Boolean(row.locked),
      eventKey: String(row.eventKey || ""),
      canRename: Object.prototype.hasOwnProperty.call(row || {}, "canRename") ? Boolean(row.canRename) : undefined,
      canMove: Object.prototype.hasOwnProperty.call(row || {}, "canMove") ? Boolean(row.canMove) : undefined,
      canDelete: Object.prototype.hasOwnProperty.call(row || {}, "canDelete") ? Boolean(row.canDelete) : undefined,
      eventDeletedFromCalendar: Boolean(row.eventDeletedFromCalendar)
    })),
    loadedAt: Date.now()
  });
}

function getFilesTreeNode(root, relPath) {
  return filesTreeCache.get(getFilesTreeNodeKey(root, relPath)) || null;
}

function getFilesRootLabel(root) {
  if (root === "events") return t("filesRootEvents");
  if (root === "chat") return t("filesRootChat");
  if (root === "backups") return t("filesRootBackups");
  if (root === "shared") return t("filesRootShared");
  return root;
}

async function loadFilesTreeNode(root, relPath) {
  const rootName = String(root || "").trim();
  const cleanPath = normalizeExplorerPathLocal(relPath);
  const key = getFilesTreeNodeKey(rootName, cleanPath);
  if (filesTreeLoadingKeys.has(key)) return;
  filesTreeLoadingKeys.add(key);
  try {
    const query = `?root=${encodeURIComponent(rootName)}&path=${encodeURIComponent(cleanPath)}`;
    const body = await fetchFilesJson(`/api/files/explorer${query}`);
    setFilesTreeNode(rootName, cleanPath, body || {});
  } catch (_) {
    setFilesTreeNode(rootName, cleanPath, { folders: [] });
  } finally {
    filesTreeLoadingKeys.delete(key);
  }
}

function isFilesTreeSelected(root, relPath) {
  const currentRoot = getFilesRootByMode(String(filesModalContext.mode || "chat"));
  const currentPath = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
  return currentRoot === String(root || "") && currentPath === normalizeExplorerPathLocal(relPath);
}

function renderFilesTreeBranch(root, relPath) {
  const node = getFilesTreeNode(root, relPath);
  const branch = document.createElement("ul");
  branch.className = "files-tree";
  const folders = Array.isArray(node && node.folders) ? node.folders : [];
  folders.forEach((folder) => {
    const li = document.createElement("li");
    li.className = "files-tree-node";
    const row = document.createElement("div");
    row.className = "files-tree-row";
    const folderPath = normalizeExplorerPathLocal(String(folder.path || ""));
    const nodeKey = getFilesTreeNodeKey(root, folderPath);
    const isExpanded = filesTreeExpanded.has(nodeKey);
    const childNode = getFilesTreeNode(root, folderPath);
    const loadedChildren = childNode && Array.isArray(childNode.folders) ? childNode.folders : null;
    const canExpand = !loadedChildren || loadedChildren.length > 0;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "files-tree-toggle";
    toggle.dataset.filesTreeToggle = encodeURIComponent(nodeKey);
    toggle.dataset.filesRoot = root;
    toggle.dataset.filesPath = encodeURIComponent(folderPath);
    toggle.textContent = isExpanded ? "v" : ">";
    toggle.disabled = !canExpand;
    const label = document.createElement("button");
    const dropTargetKey = getFilesDropTargetKey(root, folderPath);
    label.type = "button";
    label.className = `files-tree-label${isFilesTreeSelected(root, folderPath) ? " active" : ""}${filesDropTargetKey === dropTargetKey ? " drop-target" : ""}`;
    label.dataset.filesTreeSelect = encodeURIComponent(nodeKey);
    label.dataset.filesRoot = root;
    label.dataset.filesPath = encodeURIComponent(folderPath);
    label.dataset.filesTreeDropKey = encodeURIComponent(dropTargetKey);
    const dragPayload = getFilesTreeFolderDragPayload(root, folderPath);
    label.draggable = Boolean(dragPayload);
    if (dragPayload) {
      label.dataset.filesTreeDragRoot = root;
      label.dataset.filesTreeDragPath = encodeURIComponent(folderPath);
    }
    label.innerHTML = getFilesTreeLabelMarkup(
      folder && typeof folder === "object"
        ? { ...folder, entryType: "folder" }
        : { entryType: "folder", name: String(folderPath || "-") }
    );
    row.append(toggle, label);
    li.appendChild(row);
    if (isExpanded) {
      const childBranch = renderFilesTreeBranch(root, folderPath);
      childBranch.classList.add("files-tree-children");
      li.appendChild(childBranch);
    }
    branch.appendChild(li);
  });
  return branch;
}

function renderFilesTreeRootNode(root) {
  const nodeKey = getFilesTreeNodeKey(root, "");
  const isExpanded = filesTreeExpanded.has(nodeKey);
  const li = document.createElement("li");
  li.className = "files-tree-node";
  const row = document.createElement("div");
  row.className = "files-tree-row";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "files-tree-toggle";
  toggle.dataset.filesTreeToggle = encodeURIComponent(nodeKey);
  toggle.dataset.filesRoot = root;
  toggle.dataset.filesPath = "";
  toggle.textContent = isExpanded ? "v" : ">";
  const label = document.createElement("button");
  const dropTargetKey = getFilesDropTargetKey(root, "");
  label.type = "button";
  label.className = `files-tree-label${isFilesTreeSelected(root, "") ? " active" : ""}${filesDropTargetKey === dropTargetKey ? " drop-target" : ""}`;
  label.dataset.filesTreeSelect = encodeURIComponent(nodeKey);
  label.dataset.filesRoot = root;
  label.dataset.filesPath = "";
  label.dataset.filesTreeDropKey = encodeURIComponent(dropTargetKey);
  label.textContent = getFilesRootLabel(root);
  row.append(toggle, label);
  li.appendChild(row);

  if (isExpanded) {
    const branch = renderFilesTreeBranch(root, "");
    branch.classList.add("files-tree-children");
    li.appendChild(branch);
  }
  return li;
}

function renderFilesTree() {
  if (!filesTree) return;
  filesTree.innerHTML = "";
  const homeNode = document.createElement("li");
  homeNode.className = "files-tree-node";
  const homeRow = document.createElement("div");
  homeRow.className = "files-tree-row";
  const homeToggle = document.createElement("button");
  homeToggle.type = "button";
  homeToggle.className = "files-tree-toggle";
  homeToggle.dataset.filesTreeHomeToggle = "1";
  homeToggle.textContent = filesTreeHomeExpanded ? "v" : ">";
  const homeLabel = document.createElement("span");
  homeLabel.className = "files-tree-label static";
  homeLabel.textContent = t("filesRootHome");
  homeRow.append(homeToggle, homeLabel);
  homeNode.appendChild(homeRow);

  if (filesTreeHomeExpanded) {
    const homeChildren = document.createElement("ul");
    homeChildren.className = "files-tree files-tree-children";
    getFilesTreeRoots().forEach((root) => {
      homeChildren.appendChild(renderFilesTreeRootNode(root));
    });
    homeNode.appendChild(homeChildren);
  }

  filesTree.appendChild(homeNode);
}

async function ensureFilesTreeInitialized() {
  const loadRoots = getFilesTreeRoots().map(async (root) => {
    const rootKey = getFilesTreeNodeKey(root, "");
    if (!filesTreeExpanded.has(rootKey)) filesTreeExpanded.add(rootKey);
    await loadFilesTreeNode(root, "");
  });
  await Promise.all(loadRoots);
  renderFilesTree();
}

async function toggleFilesTreeNode(root, relPath) {
  const key = getFilesTreeNodeKey(root, relPath);
  if (filesTreeExpanded.has(key)) {
    filesTreeExpanded.delete(key);
    renderFilesTree();
    return;
  }
  filesTreeExpanded.add(key);
  await loadFilesTreeNode(root, relPath);
  renderFilesTree();
}

async function openFilesTreeNode(root, relPath) {
  const mode = getFilesModeByRoot(root);
  const existingEventKey = String(filesModalContext.eventKey || "").trim();
  const existingChatScope = filesModalContext.chatScope === "direct" ? "direct" : "global";
  const existingChatPeerUserId = String(filesModalContext.chatPeerUserId || "");
  filesModalContext.mode = mode;
  filesModalContext.currentPath = normalizeExplorerPathLocal(relPath);
  filesModalContext.eventKey = mode === "event" ? existingEventKey : "";
  filesModalContext.chatScope = mode === "chat" ? existingChatScope : "global";
  filesModalContext.chatPeerUserId = mode === "chat" ? existingChatPeerUserId : "";
  filesSelectedId = "";
  filesBatchSelection = new Set();
  await loadFilesContext();
}

function getFilesRowKey(row) {
  if (!row) return "";
  if (String(row.entryType || "") === "folder") {
    return `folder:${String(row.path || "")}`;
  }
  if (Boolean(row.backup)) {
    return `backup:${String(row.path || row.name || "")}`;
  }
  return `file:${String(row.id || "")}`;
}

function resolveFilesRowTypeLabel(row) {
  if (!row) return t("files");
  if (String(row.entryType || "") === "folder") return t("filesFolderLabel");
  if (Boolean(row.backup)) return t("filesBackups");
  const scope = String(row && row.scope || "").trim().toLowerCase();
  if (scope === "chat_file") return t("filesChat");
  if (scope === "shared_file") return t("filesShared");
  if (scope === "event_program") return t("filesProgram");
  if (scope === "event_file") return t("filesEventFiles");
  return t("files");
}

function findSelectedFilesRow() {
  if (!filesSelectedId || !Array.isArray(filesVisibleRows)) return null;
  return filesVisibleRows.find((row) => getFilesRowKey(row) === filesSelectedId) || null;
}

function filesRowSupportsBatch(row) {
  return Boolean(row) && (String(row.entryType || "") === "file" || String(row.entryType || "") === "folder");
}

function findFilesRowByKey(rowKey) {
  if (!Array.isArray(filesVisibleRows)) return null;
  const key = String(rowKey || "");
  return filesVisibleRows.find((row) => getFilesRowKey(row) === key) || null;
}

function getSelectedBatchRows() {
  const rows = [];
  if (!(filesBatchSelection instanceof Set)) return rows;
  filesBatchSelection.forEach((rowKey) => {
    const row = findFilesRowByKey(rowKey);
    if (!row || !filesRowSupportsBatch(row)) return;
    rows.push(row);
  });
  return rows;
}

function normalizeBatchFolderSelection(rows) {
  const folderPaths = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || String(row.entryType || "") !== "folder") return;
    const pathValue = normalizeExplorerPathLocal(String(row.path || ""));
    if (!pathValue) return;
    folderPaths.push(pathValue);
  });
  folderPaths.sort((left, right) => left.length - right.length || left.localeCompare(right));
  const kept = [];
  folderPaths.forEach((pathValue) => {
    if (kept.some((parentPath) => pathValue === parentPath || pathValue.startsWith(`${parentPath}/`))) return;
    kept.push(pathValue);
  });
  return kept;
}

function getEffectiveBatchDeleteRows(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const selectedFolderPaths = normalizeBatchFolderSelection(sourceRows);
  const effective = sourceRows.filter((row) => {
    if (!row) return false;
    if (String(row.entryType || "") === "folder") {
      const folderPath = normalizeExplorerPathLocal(String(row.path || ""));
      return selectedFolderPaths.includes(folderPath);
    }
    const parentPath = normalizeExplorerPathLocal(String(row.path || ""));
    return !selectedFolderPaths.some((folderPath) => parentPath === folderPath || parentPath.startsWith(`${folderPath}/`));
  });
  return effective.sort((left, right) => {
    const leftFolder = String(left && left.entryType || "") === "folder";
    const rightFolder = String(right && right.entryType || "") === "folder";
    if (leftFolder !== rightFolder) return leftFolder ? 1 : -1;
    if (leftFolder && rightFolder) {
      return normalizeExplorerPathLocal(String(right && right.path || "")).length
        - normalizeExplorerPathLocal(String(left && left.path || "")).length;
    }
    return 0;
  });
}

function pruneFilesBatchSelection() {
  if (!(filesBatchSelection instanceof Set)) filesBatchSelection = new Set();
  const next = new Set();
  filesBatchSelection.forEach((rowKey) => {
    const row = findFilesRowByKey(rowKey);
    if (!row || !filesRowSupportsBatch(row)) return;
    next.add(rowKey);
  });
  filesBatchSelection = next;
}

function updateFilesBatchSummary() {
  pruneFilesBatchSelection();
  const selectedCount = filesBatchSelection.size;
  const selectableCount = Array.isArray(filesVisibleRows)
    ? filesVisibleRows.filter((row) => filesRowSupportsBatch(row)).length
    : 0;
  if (filesBatchActions) {
    filesBatchActions.classList.toggle("hidden-section", selectedCount <= 1);
    filesBatchActions.classList.toggle("is-busy", filesBatchBusy);
  }
  if (filesBatchSummary) {
    filesBatchSummary.textContent = selectedCount > 0
      ? t("filesBatchSelected").replace("{count}", String(selectedCount))
      : t("filesBatchEmpty");
  }
  if (filesBatchDownloadBtn) filesBatchDownloadBtn.disabled = selectedCount <= 0 || filesBatchBusy;
  if (filesBatchDeleteBtn) filesBatchDeleteBtn.disabled = selectedCount <= 0 || filesBatchBusy;
  if (filesHeadSelect instanceof HTMLInputElement) {
    const allSelected = selectableCount > 0 && selectedCount >= selectableCount;
    const partial = selectedCount > 0 && selectedCount < selectableCount;
    filesHeadSelect.checked = allSelected;
    filesHeadSelect.indeterminate = partial;
    filesHeadSelect.disabled = selectableCount <= 0 || filesBatchBusy;
  }
}

function setFilesBatchBusy(nextBusy) {
  filesBatchBusy = Boolean(nextBusy);
  updateFilesBatchSummary();
}

function buildFilesBatchResultText(successKey, partialKey, failedKey, successCount, totalCount) {
  const done = Math.max(0, Number(successCount || 0));
  const total = Math.max(0, Number(totalCount || 0));
  if (done <= 0) return t(failedKey);
  const key = done < total ? partialKey : successKey;
  return t(key)
    .replace("{done}", String(done))
    .replace("{total}", String(total));
}

function getFolderActionPermission(folder, action) {
  if (!folder || String(folder.entryType || "") !== "folder") return false;
  const locked = Boolean(folder.locked);
  const key = action === "rename"
    ? "canRename"
    : action === "move"
      ? "canMove"
      : "canDelete";
  if (Object.prototype.hasOwnProperty.call(folder, key)) {
    const allowed = Boolean(folder[key]);
    if (!allowed && action === "delete") {
      const folderPath = normalizeExplorerPathLocal(String(folder.path || ""));
      const isEventRootFolder = String(filesModalContext && filesModalContext.mode || "") === "event"
        && Boolean(folderPath)
        && folderPath.split("/").filter(Boolean).length === 1;
      if (isEventRootFolder && Boolean(folder.eventDeletedFromCalendar)) return true;
    }
    return allowed;
  }
  return !locked;
}

function formatFilesFolderLabel(folderLike) {
  const base = String((folderLike && (folderLike.name || folderLike.fileName)) || "-");
  if (folderLike && folderLike.eventDeletedFromCalendar) {
    return `${base} (${t("filesEventDeletedSuffix")})`;
  }
  return base;
}

function getFilesTreeLabelMarkup(folderLike) {
  const labelText = formatFilesFolderLabel(folderLike);
  const locked = Boolean(folderLike && folderLike.locked);
  return `<span class="files-tree-label-text">${escapeHtml(labelText)}</span>${locked ? `<span class="files-tree-lock" title="${escapeHtml(t("filesFolderLocked"))}" aria-hidden="true">🔒</span>` : ""}`;
}

function getFilesRowDisplayName(row) {
  return String(row && row.entryType || "") === "folder"
    ? formatFilesFolderLabel(row)
    : String(row && (row.name || row.fileName) || "file.bin");
}

function getFilesRowIconKind(row) {
  if (!row) return "file";
  if (String(row.entryType || "") === "folder") return "folder";
  if (Boolean(row.backup)) return "archive";
  const fileName = String(row && (row.name || row.fileName) || "").trim().toLowerCase();
  const mimeType = String(row && row.mimeType || "").trim().toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) return "pdf";
  if (
    mimeType.startsWith("text/")
    || mimeType === "application/json"
    || mimeType === "application/xml"
    || fileName.endsWith(".txt")
    || fileName.endsWith(".md")
    || fileName.endsWith(".json")
    || fileName.endsWith(".xml")
    || fileName.endsWith(".csv")
    || fileName.endsWith(".log")
  ) {
    return "text";
  }
  return "file";
}

function getFilesRowIconMarkup(row) {
  const kind = getFilesRowIconKind(row);
  const title = kind === "folder"
    ? t("filesFolderLabel")
    : resolveFilesRowTypeLabel(row);
  const svg = kind === "folder"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A3.5 3.5 0 0 1 17.5 20h-11A3.5 3.5 0 0 1 3 16.5z"/></svg>'
    : kind === "image"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L20 9v9.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z"/><circle cx="9" cy="10" r="1.6"/><path d="m7 18 3.2-3.4a1 1 0 0 1 1.45 0L14 17l1.7-1.8a1 1 0 0 1 1.48.05L19 17.5V19H7z"/></svg>'
      : kind === "pdf"
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L20 9v9.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z"/><path d="M8 16h1.1v-1.4h.75c1.1 0 1.95-.62 1.95-1.67 0-1.06-.74-1.64-1.98-1.64H8zm1.1-2.28v-1.48h.63c.63 0 .98.23.98.72 0 .5-.34.76-.96.76zM12.6 16h1.95c1.65 0 2.7-.92 2.7-2.82 0-1.9-1.05-2.74-2.76-2.74H12.6zm1.1-.89V11.3h.66c1.07 0 1.8.5 1.8 1.89 0 1.38-.73 1.92-1.8 1.92z"/></svg>'
        : kind === "text"
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L20 9v9.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z"/><path d="M8 11h8v1.4H8zm0 3h8v1.4H8zm0-6h5v1.4H8z"/></svg>'
          : kind === "archive"
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L20 9v9.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z"/><path d="M9 7.4h4v1.2H9zm0 2h4v1.2H9zm1.2 2H12v1.1h1.1v1.25H12V15h-1.1v-1.25H9.8V12.5h1.1z"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L20 9v9.5A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z"/><path d="M8 12h8v1.4H8z"/></svg>';
  return `<span class="files-row-icon files-row-icon-${kind}" title="${escapeHtml(title)}">${svg}</span>`;
}

function getFilesRowModifiedAt(row) {
  return String(row && row.createdAt || row && row.modifiedAt || row && row.mtime || "");
}

function normalizeFilesSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function compareFilesText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    sensitivity: "base",
    numeric: true
  });
}

function getFilesSortDescriptor(sortMode) {
  const raw = String(sortMode || "modified_desc").trim().toLowerCase();
  if (raw === "name_asc" || raw === "name_desc") {
    return { key: "name", direction: raw.endsWith("_desc") ? "desc" : "asc" };
  }
  if (raw === "type_asc" || raw === "type_desc") {
    return { key: "type", direction: raw.endsWith("_desc") ? "desc" : "asc" };
  }
  if (raw === "size_asc" || raw === "size_desc") {
    return { key: "size", direction: raw.endsWith("_desc") ? "desc" : "asc" };
  }
  return { key: "modified", direction: raw.endsWith("_asc") ? "asc" : "desc" };
}

function updateFilesHeadSortUi() {
  if (!filesHeadSortButtons.length) return;
  const descriptor = getFilesSortDescriptor(filesExplorerState && filesExplorerState.sort || "modified_desc");
  filesHeadSortButtons.forEach((button) => {
    const buttonKey = String(button.dataset.filesSortKey || "").trim();
    const active = buttonKey === descriptor.key;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    const indicator = button.querySelector(".files-head-sort-indicator");
    if (indicator) {
      indicator.textContent = active ? (descriptor.direction === "asc" ? "↑" : "↓") : "";
    }
  });
}

function setFilesSortMode(nextSort) {
  filesExplorerState.sort = String(nextSort || "modified_desc");
  if (filesSortSelect) filesSortSelect.value = String(filesExplorerState.sort || "modified_desc");
  updateFilesHeadSortUi();
  refreshFilesExplorerView();
}

function toggleFilesSort(sortKey) {
  const key = String(sortKey || "").trim().toLowerCase();
  if (!key) return;
  const current = getFilesSortDescriptor(filesExplorerState && filesExplorerState.sort || "modified_desc");
  const defaults = {
    name: "name_asc",
    type: "type_asc",
    modified: "modified_desc",
    size: "size_desc"
  };
  if (current.key === key) {
    setFilesSortMode(`${key}_${current.direction === "asc" ? "desc" : "asc"}`);
    return;
  }
  setFilesSortMode(defaults[key] || "modified_desc");
}

function compareFilesRows(left, right) {
  const leftFolder = String(left && left.entryType || "") === "folder";
  const rightFolder = String(right && right.entryType || "") === "folder";
  if (leftFolder !== rightFolder) return leftFolder ? -1 : 1;

  const sortMode = String(filesExplorerState && filesExplorerState.sort || "modified_desc");
  const leftName = getFilesRowDisplayName(left);
  const rightName = getFilesRowDisplayName(right);
  const leftType = resolveFilesRowTypeLabel(left);
  const rightType = resolveFilesRowTypeLabel(right);
  const leftModified = Date.parse(getFilesRowModifiedAt(left)) || 0;
  const rightModified = Date.parse(getFilesRowModifiedAt(right)) || 0;
  const leftSize = Math.max(0, Number(left && left.sizeBytes || 0));
  const rightSize = Math.max(0, Number(right && right.sizeBytes || 0));

  if (sortMode === "modified_asc" && leftModified !== rightModified) return leftModified - rightModified;
  if (sortMode === "modified_desc" && leftModified !== rightModified) return rightModified - leftModified;
  if (sortMode === "name_asc") {
    const byName = compareFilesText(leftName, rightName);
    if (byName !== 0) return byName;
  }
  if (sortMode === "name_desc") {
    const byName = compareFilesText(rightName, leftName);
    if (byName !== 0) return byName;
  }
  if (sortMode === "type_asc") {
    const byType = compareFilesText(leftType, rightType);
    if (byType !== 0) return byType;
  }
  if (sortMode === "type_desc") {
    const byType = compareFilesText(rightType, leftType);
    if (byType !== 0) return byType;
  }
  if (sortMode === "size_asc" && leftSize !== rightSize) return leftSize - rightSize;
  if (sortMode === "size_desc" && leftSize !== rightSize) return rightSize - leftSize;

  if (rightModified !== leftModified) return rightModified - leftModified;
  return compareFilesText(leftName, rightName);
}

function getFilesVisibleRows() {
  const search = normalizeFilesSearchValue(filesExplorerState && filesExplorerState.search || "");
  const rows = Array.isArray(filesRows) ? [...filesRows] : [];
  const filtered = search
    ? rows.filter((row) => {
        const haystack = [
          getFilesRowDisplayName(row),
          String(row && row.path || ""),
          String(row && row.mimeType || ""),
          resolveFilesRowTypeLabel(row)
        ].join(" ").toLowerCase();
        return haystack.includes(search);
      })
    : rows;
  return filtered.sort(compareFilesRows);
}

function updateFilesViewSummary() {
  if (!filesViewSummary) return;
  const total = Array.isArray(filesRows) ? filesRows.length : 0;
  const visible = Array.isArray(filesVisibleRows) ? filesVisibleRows.length : 0;
  const hasFilter = Boolean(normalizeFilesSearchValue(filesExplorerState && filesExplorerState.search || ""));
  filesViewSummary.textContent = hasFilter
    ? t("filesViewSummaryFiltered").replace("{visible}", String(visible)).replace("{total}", String(total))
    : t("filesViewSummaryAll").replace("{count}", String(visible));
}

function getFilesExplorerViewMode() {
  return filesExplorerState && filesExplorerState.view === "grid" ? "grid" : "list";
}

function updateFilesViewModeUi() {
  const view = getFilesExplorerViewMode();
  if (filesListPanel) filesListPanel.classList.toggle("grid-view", view === "grid");
  if (filesList) filesList.classList.toggle("grid-view", view === "grid");
  if (filesViewListBtn) {
    const active = view === "list";
    filesViewListBtn.classList.toggle("active", active);
    filesViewListBtn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (filesViewGridBtn) {
    const active = view === "grid";
    filesViewGridBtn.classList.toggle("active", active);
    filesViewGridBtn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function setFilesExplorerViewMode(nextView) {
  const view = String(nextView || "").trim().toLowerCase() === "grid" ? "grid" : "list";
  filesExplorerState.view = view;
  saveFilesExplorerViewMode(view);
  updateFilesViewModeUi();
  renderFilesList();
}

function getFilesCurrentRoot() {
  return getFilesRootByMode(String(filesModalContext && filesModalContext.mode || "chat"));
}

function getFilesEntryParentPath(pathValue) {
  const parts = normalizeExplorerPathLocal(pathValue).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function normalizeFilesDropDestination(root, relPath) {
  const nextRoot = String(root || "").trim();
  const nextPath = normalizeExplorerPathLocal(relPath);
  if (nextRoot !== "events") {
    return {
      root: nextRoot,
      path: nextPath
    };
  }
  const parts = nextPath.split("/").filter(Boolean);
  if (parts.length === 1) {
    return {
      root: nextRoot,
      path: `${parts[0]}/other`
    };
  }
  return {
    root: nextRoot,
    path: nextPath
  };
}

function getFilesDropTargetKey(root, relPath) {
  return `${String(root || "").trim()}:${normalizeExplorerPathLocal(relPath)}`;
}

function getFilesFolderEventKey(folder) {
  if (!folder || String(folder.entryType || "") !== "folder") return "";
  const direct = String(folder.eventKey || "").trim();
  if (direct) return direct;
  const currentRoot = getFilesCurrentRoot();
  const folderPath = normalizeExplorerPathLocal(String(folder.path || ""));
  const currentPath = normalizeExplorerPathLocal(String(filesModalContext && filesModalContext.currentPath || ""));
  if (currentRoot === "events" && folderPath && folderPath === currentPath) {
    return String(filesModalContext && filesModalContext.eventKey || "").trim();
  }
  return "";
}

function getFilesDragPayloadFromRow(row) {
  if (!row) return null;
  const entryType = String(row.entryType || "");
  const root = getFilesCurrentRoot();
  if (entryType === "folder") {
    if (!getFolderActionPermission(row, "move")) return null;
    const sourcePath = normalizeExplorerPathLocal(String(row.path || ""));
    if (!sourcePath) return null;
    return {
      kind: "folder",
      root,
      rowKey: getFilesRowKey(row),
      sourcePath,
      sourceParentPath: getFilesEntryParentPath(sourcePath),
      label: formatFilesFolderLabel(row)
    };
  }
  if (Boolean(row.backup) || !String(row.id || "").trim()) return null;
  const sourcePath = normalizeExplorerPathLocal(String(row.path || ""));
  if (root === "events") {
    const sourceSegments = sourcePath.split("/").filter(Boolean);
    if (String(sourceSegments[1] || "").toLowerCase() === "program") return null;
  }
  return {
    kind: "file",
    root,
    rowKey: getFilesRowKey(row),
    fileId: String(row.id || "").trim(),
    sourcePath,
    sourceParentPath: getFilesEntryParentPath(sourcePath),
    label: getFilesRowDisplayName(row)
  };
}

function readFilesDragPayload(event) {
  if (filesDragState) return filesDragState;
  try {
    const raw = event && event.dataTransfer ? String(event.dataTransfer.getData("application/x-procal-files-drag") || "") : "";
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function isFilesDropAllowed(payload, targetRoot, targetPath) {
  if (!payload || !targetRoot) return false;
  const root = String(targetRoot || "").trim();
  const normalizedTarget = normalizeFilesDropDestination(root, targetPath);
  const nextTargetPath = normalizedTarget.path;
  const sourceParentPath = normalizeExplorerPathLocal(String(payload.sourceParentPath || ""));
  const sourceRoot = String(payload.root || "").trim();
  if (payload.kind === "file" && sourceRoot !== root) return false;
  if (root === "events") {
    const targetSegments = nextTargetPath.split("/").filter(Boolean);
    const sourceSegments = normalizeExplorerPathLocal(String(payload.sourcePath || "")).split("/").filter(Boolean);
    const targetLane = String(targetSegments[1] || "").toLowerCase();
    const sourceLane = String(sourceSegments[1] || "").toLowerCase();
    if (targetSegments.length < 2) return false;
    if (targetLane === "program") return false;
    if (payload.kind === "file") {
      if (sourceLane === "program") return false;
      if (sourceSegments.length >= 1 && String(sourceSegments[0] || "") !== String(targetSegments[0] || "")) return false;
    }
    if (payload.kind === "folder") {
      if (sourceRoot === "events" && sourceSegments.length < 3) return false;
      if (!["other", "files"].includes(targetLane)) return false;
      if (sourceRoot === "events" && sourceSegments.length >= 1 && !String(sourceSegments[0] || "").trim()) return false;
    }
  }
  if (payload.kind === "file") {
    return nextTargetPath !== sourceParentPath;
  }
  if (payload.kind === "folder") {
    const sourcePath = normalizeExplorerPathLocal(String(payload.sourcePath || ""));
    if (!sourcePath) return false;
    if (sourceRoot === root && nextTargetPath === sourceParentPath) return false;
    if (sourceRoot === root && nextTargetPath === sourcePath) return false;
    if (sourceRoot === root && nextTargetPath && nextTargetPath.startsWith(`${sourcePath}/`)) return false;
    return true;
  }
  return false;
}

function updateFilesDropTargetUi() {
  const activeKey = String(filesDropTargetKey || "");
  if (filesListPanel) {
    filesListPanel.classList.toggle(
      "drop-target-current",
      Boolean(filesDragState) && activeKey === getFilesDropTargetKey(getFilesCurrentRoot(), String(filesModalContext.currentPath || ""))
    );
  }
  if (filesList) {
    filesList.querySelectorAll("[data-files-drop-target-key]").forEach((element) => {
      const key = decodeURIComponent(String(element.getAttribute("data-files-drop-target-key") || ""));
      element.classList.toggle("drop-target", Boolean(activeKey) && key === activeKey);
    });
  }
  if (filesTree) {
    filesTree.querySelectorAll("[data-files-tree-drop-key]").forEach((element) => {
      const key = decodeURIComponent(String(element.getAttribute("data-files-tree-drop-key") || ""));
      element.classList.toggle("drop-target", Boolean(activeKey) && key === activeKey);
    });
  }
}

function setFilesDropTarget(root, relPath) {
  const targetKey = root && isFilesDropAllowed(filesDragState, root, relPath)
    ? getFilesDropTargetKey(root, relPath)
    : "";
  if (filesDropTargetKey === targetKey) return;
  filesDropTargetKey = targetKey;
  updateFilesDropTargetUi();
}

function clearFilesDropTarget() {
  if (!filesDropTargetKey) return;
  filesDropTargetKey = "";
  updateFilesDropTargetUi();
}

function canStartFilesRowDrag(row) {
  return Boolean(getFilesDragPayloadFromRow(row));
}

function parseFilesTreeNodeKey(key) {
  const raw = String(key || "");
  const index = raw.indexOf(":");
  if (index <= 0) return { root: "", path: "" };
  return {
    root: raw.slice(0, index),
    path: normalizeExplorerPathLocal(raw.slice(index + 1))
  };
}

async function refreshFilesTreeFromExpandedState() {
  filesTreeCache = new Map();
  const roots = getFilesTreeRoots();
  const queue = [];
  const seen = new Set();
  const pushLoad = (root, relPath) => {
    const loadKey = getFilesDropTargetKey(root, relPath);
    if (!root || seen.has(loadKey)) return;
    seen.add(loadKey);
    queue.push(loadFilesTreeNode(root, relPath));
  };
  roots.forEach((root) => pushLoad(root, ""));
  Array.from(filesTreeExpanded).forEach((key) => {
    const parsed = parseFilesTreeNodeKey(key);
    if (!roots.includes(parsed.root)) return;
    pushLoad(parsed.root, parsed.path);
  });
  await Promise.all(queue);
  renderFilesTree();
}

async function applyFilesDragMove(payload, targetRoot, targetPath) {
  if (!isFilesDropAllowed(payload, targetRoot, targetPath)) return false;
  const normalizedTarget = normalizeFilesDropDestination(targetRoot, targetPath);
  try {
    if (payload.kind === "file") {
      await fetchFilesJson("/api/files/explorer/files/move", {
        method: "POST",
        body: JSON.stringify({
          fileId: String(payload.fileId || ""),
          targetRoot: normalizedTarget.root,
          targetPath: normalizedTarget.path
        })
      });
      setFilesStatus(t("filesFileMoved"), false);
    } else {
      await fetchFilesJson("/api/files/explorer/folders", {
        method: "PATCH",
        body: JSON.stringify({
          root: String(payload.root || "").trim(),
          path: normalizeExplorerPathLocal(String(payload.sourcePath || "")),
          targetRoot: normalizedTarget.root,
          targetPath: normalizedTarget.path
        })
      });
      setFilesStatus(t("filesFolderUpdated"), false);
    }
    filesSelectedId = "";
    filesBatchSelection = new Set();
    filesInlineRenameState = null;
    filesDragState = null;
    clearFilesDropTarget();
    await refreshFilesTreeFromExpandedState();
    await loadFilesContext({ replaceHistory: true });
    return true;
  } catch (error) {
    filesDragState = null;
    clearFilesDropTarget();
    setFilesStatus(
      error && error.message
        ? error.message
        : payload && payload.kind === "file"
          ? t("filesFileMoveFailed")
          : t("filesFolderUpdateFailed"),
      true
    );
    return false;
  }
}

function refreshFilesExplorerView() {
  filesVisibleRows = getFilesVisibleRows();
  const visibleKeys = new Set(filesVisibleRows.map((row) => getFilesRowKey(row)).filter(Boolean));
  if (filesInlineRenameState && !visibleKeys.has(String(filesInlineRenameState.rowKey || ""))) {
    filesInlineRenameState = null;
  }
  if (filesSelectedId && !visibleKeys.has(filesSelectedId)) {
    filesSelectedId = "";
  }
  if (!filesSelectedId && filesVisibleRows.length) {
    filesSelectedId = getFilesRowKey(filesVisibleRows[0]);
  }
  if (!(filesBatchSelection instanceof Set)) filesBatchSelection = new Set();
  filesBatchSelection = new Set(Array.from(filesBatchSelection).filter((rowKey) => visibleKeys.has(String(rowKey || ""))));
  updateFilesViewSummary();
  updateFilesViewModeUi();
  renderFilesList();
}

function revokeFilesSelectionPreviewUrl() {
  if (filesSelectionPreviewObjectUrl) {
    URL.revokeObjectURL(filesSelectionPreviewObjectUrl);
    filesSelectionPreviewObjectUrl = "";
  }
}

function resetFilesSelectionPreview(stateText, keepVisible) {
  revokeFilesSelectionPreviewUrl();
  filesSelectionPreviewPendingKey = "";
  filesSelectionPreviewKey = keepVisible ? filesSelectionPreviewKey : "";
  if (filesSelectionPane) filesSelectionPane.classList.toggle("preview-active", Boolean(keepVisible));
  if (filesSelectionPreviewWrap) filesSelectionPreviewWrap.classList.remove("hidden-section");
  if (filesSelectionPreviewStatus) {
    filesSelectionPreviewStatus.textContent = String(stateText || "");
    filesSelectionPreviewStatus.style.color = "#64748b";
  }
  if (filesSelectionPreviewImage) {
    filesSelectionPreviewImage.classList.add("hidden-section");
    filesSelectionPreviewImage.removeAttribute("src");
  }
  if (filesSelectionPreviewFrame) {
    filesSelectionPreviewFrame.classList.add("hidden-section");
    filesSelectionPreviewFrame.src = "about:blank";
  }
  if (filesSelectionPreviewText) {
    filesSelectionPreviewText.classList.add("hidden-section");
    filesSelectionPreviewText.textContent = "";
  }
}

function isFilesInlinePreviewable(fileName, mimeType) {
  const lowerName = String(fileName || "").trim().toLowerCase();
  const mime = String(mimeType || "").trim().toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf") || lowerName.endsWith(".pdf")) return "frame";
  if (
    mime.startsWith("text/")
    || mime === "application/json"
    || mime === "application/xml"
    || lowerName.endsWith(".json")
    || lowerName.endsWith(".txt")
    || lowerName.endsWith(".md")
    || lowerName.endsWith(".csv")
    || lowerName.endsWith(".log")
    || lowerName.endsWith(".xml")
  ) {
    return "text";
  }
  return "";
}

async function refreshFilesSelectionPreview() {
  if (!filesSelectionPane && !filesSelectionPreviewWrap) {
    revokeFilesSelectionPreviewUrl();
    filesSelectionPreviewPendingKey = "";
    filesSelectionPreviewKey = "";
    return;
  }
  const selected = findSelectedFilesRow();
  const rowKey = getFilesRowKey(selected);
  if (!selected || String(selected.entryType || "") === "folder") {
    filesSelectionPreviewKey = rowKey || "";
    resetFilesSelectionPreview(selected ? t("filesSelectionPreviewFolder") : t("filesSelectionPreviewIdle"), true);
    return;
  }
  const fileName = getFilesRowDisplayName(selected);
  const previewKind = isFilesInlinePreviewable(fileName, String(selected && selected.mimeType || ""));
  if (!previewKind) {
    filesSelectionPreviewKey = rowKey;
    resetFilesSelectionPreview(t("filesSelectionPreviewUnavailable"), true);
    return;
  }
  if (filesSelectionPreviewKey === rowKey || filesSelectionPreviewPendingKey === rowKey) {
    return;
  }

  const requestId = ++filesSelectionPreviewRequestId;
  filesSelectionPreviewPendingKey = rowKey;
  resetFilesSelectionPreview(t("filesSelectionPreviewLoading"), true);

  try {
    const fetched = Boolean(selected.backup)
      ? await fetchBackupFileBlob(String(selected.name || selected.fileName || ""))
      : await fetchProtectedFileBlob(String(selected.id || ""));
    if (requestId !== filesSelectionPreviewRequestId) return;

    const blob = fetched && fetched.blob instanceof Blob ? fetched.blob : null;
    const effectiveName = String(fetched && fetched.fileName || fileName || "file.bin");
    const effectiveKind = isFilesInlinePreviewable(effectiveName, blob && blob.type ? blob.type : selected && selected.mimeType);
    if (!blob || !effectiveKind) {
      filesSelectionPreviewKey = rowKey;
      resetFilesSelectionPreview(t("filesSelectionPreviewUnavailable"), true);
      return;
    }

    filesSelectionPreviewKey = rowKey;
    filesSelectionPreviewPendingKey = "";
    if (filesSelectionPreviewStatus) filesSelectionPreviewStatus.textContent = "";
    revokeFilesSelectionPreviewUrl();

    if (effectiveKind === "image") {
      filesSelectionPreviewObjectUrl = URL.createObjectURL(blob);
      if (filesSelectionPreviewImage) {
        filesSelectionPreviewImage.src = filesSelectionPreviewObjectUrl;
        filesSelectionPreviewImage.classList.remove("hidden-section");
      }
      return;
    }
    if (effectiveKind === "frame") {
      filesSelectionPreviewObjectUrl = URL.createObjectURL(blob);
      if (filesSelectionPreviewFrame) {
        filesSelectionPreviewFrame.src = filesSelectionPreviewObjectUrl;
        filesSelectionPreviewFrame.classList.remove("hidden-section");
      }
      return;
    }
    if (blob.size > 512 * 1024) {
      resetFilesSelectionPreview(t("filesSelectionPreviewTextLarge"), true);
      filesSelectionPreviewKey = rowKey;
      return;
    }
    const text = await blob.text();
    if (requestId !== filesSelectionPreviewRequestId) return;
    if (filesSelectionPreviewText) {
      filesSelectionPreviewText.textContent = text;
      filesSelectionPreviewText.classList.remove("hidden-section");
    }
    if (filesSelectionPreviewStatus) filesSelectionPreviewStatus.textContent = "";
  } catch (_) {
    if (requestId !== filesSelectionPreviewRequestId) return;
    filesSelectionPreviewKey = rowKey;
    resetFilesSelectionPreview(t("filesSelectionPreviewError"), true);
  } finally {
    if (requestId === filesSelectionPreviewRequestId) {
      filesSelectionPreviewPendingKey = "";
    }
  }
}

function updateFilesSelectionPane() {
  const selected = findSelectedFilesRow();
  const hasSelection = Boolean(selected);
  const folderActionTarget = getFilesFolderActionTarget();
  const eventActionTarget = getFilesEventActionTarget();
  if (filesSelectionName) {
    filesSelectionName.textContent = hasSelection
      ? (String(selected && selected.entryType || "") === "folder" ? formatFilesFolderLabel(selected) : String((selected && (selected.name || selected.fileName)) || "file.bin"))
      : t("filesNoSelection");
  }
  if (filesSelectionMeta) {
    if (!hasSelection) {
      filesSelectionMeta.textContent = t("filesSelectHint");
    } else {
      const createdAt = String((selected && selected.createdAt) || (selected && selected.modifiedAt) || "");
      const sizeText = String(selected && selected.entryType || "") === "folder"
        ? "-"
        : formatBytes(selected && selected.sizeBytes || 0);
      filesSelectionMeta.textContent = `${resolveFilesRowTypeLabel(selected)} • ${formatNotificationDateTime(createdAt)} • ${sizeText}`;
    }
  }
  if (filesSelectionScope) {
    filesSelectionScope.textContent = `${t("filesSelectionScopeLabel")}: ${hasSelection ? resolveFilesRowTypeLabel(selected) : "-"}`;
  }
  if (filesSelectionPath) {
    const pathValue = hasSelection ? getFilesOperationDisplayPath(String(selected && selected.path || "")) : "-";
    filesSelectionPath.textContent = `${t("filesSelectionPathLabel")}: ${pathValue}`;
  }
  if (filesSelectionMime) {
    const mimeValue = hasSelection && String(selected && selected.entryType || "") !== "folder"
      ? String(selected && selected.mimeType || "-")
      : "-";
    filesSelectionMime.textContent = `${t("filesSelectionMimeLabel")}: ${mimeValue || "-"}`;
  }
  const isFolder = hasSelection && String(selected && selected.entryType || "") === "folder";
  const isBackup = hasSelection && Boolean(selected && selected.backup);
  if (filesOpenEventBtn) filesOpenEventBtn.classList.toggle("hidden-section", !folderActionTarget || !eventActionTarget);
  if (filesOpenFolderBtn) filesOpenFolderBtn.classList.toggle("hidden-section", !isFolder);
  if (filesRenameFolderBtn) filesRenameFolderBtn.classList.toggle("hidden-section", !isFolder);
  if (filesMoveFolderBtn) filesMoveFolderBtn.classList.toggle("hidden-section", !isFolder);
  if (filesDeleteFolderBtn) filesDeleteFolderBtn.classList.toggle("hidden-section", !isFolder);
  if (filesMoveFileBtn) filesMoveFileBtn.classList.toggle("hidden-section", !hasSelection || isFolder || isBackup);
  if (filesPreviewBtn) filesPreviewBtn.classList.toggle("hidden-section", !hasSelection || isFolder);
  if (filesDownloadBtn) filesDownloadBtn.classList.toggle("hidden-section", !hasSelection || isFolder);
  if (filesDeleteBtn) filesDeleteBtn.classList.toggle("hidden-section", !hasSelection || isFolder || isBackup);
  if (filesOpenEventBtn) filesOpenEventBtn.disabled = !eventActionTarget;
  if (filesOpenFolderBtn) filesOpenFolderBtn.disabled = !isFolder;
  if (filesPreviewBtn) filesPreviewBtn.disabled = !hasSelection || isFolder;
  if (filesDownloadBtn) filesDownloadBtn.disabled = !hasSelection || isFolder;
  if (filesMoveFileBtn) filesMoveFileBtn.disabled = !hasSelection || isFolder || isBackup;
  if (filesDeleteBtn) filesDeleteBtn.disabled = !hasSelection || isFolder || isBackup;
  const canUseFolderActions = Boolean(folderActionTarget);
  if (filesRenameFolderBtn) filesRenameFolderBtn.disabled = !canUseFolderActions || !getFolderActionPermission(folderActionTarget, "rename");
  if (filesMoveFolderBtn) filesMoveFolderBtn.disabled = !canUseFolderActions || !getFolderActionPermission(folderActionTarget, "move");
  if (filesDeleteFolderBtn) filesDeleteFolderBtn.disabled = !canUseFolderActions || !getFolderActionPermission(folderActionTarget, "delete");
  void refreshFilesSelectionPreview();
}

function closeFilesContextMenu() {
  filesContextMenuOpen = false;
  if (!filesContextMenu) return;
  filesContextMenu.classList.add("hidden-section");
  filesContextMenu.setAttribute("aria-hidden", "true");
  filesContextMenu.innerHTML = "";
  filesContextMenu.style.left = "0px";
  filesContextMenu.style.top = "0px";
}

function getFilesContextMenuItems(row) {
  const items = [];
  const hasRow = Boolean(row);
  const isFolder = hasRow && String(row && row.entryType || "") === "folder";
  const isBackup = hasRow && Boolean(row && row.backup);

  if (hasRow && isFolder) {
    const eventKey = getFilesFolderEventKey(row);
    if (eventKey && findBaseEventById(eventKey)) {
      items.push({
        label: t("filesOpenEvent"),
        action: async () => openSelectedFilesEvent()
      });
    }
    items.push({
      label: t("filesOpenFolder"),
      action: async () => openSelectedFilesFolder()
    });
    if (getFolderActionPermission(row, "rename")) {
      items.push({
        label: t("filesRenameFolder"),
        action: async () => renameSelectedFilesFolder()
      });
    }
    if (getFolderActionPermission(row, "move")) {
      items.push({
        label: t("filesMoveFolder"),
        action: async () => moveSelectedFilesFolder()
      });
    }
    items.push({
      label: t("filesCopyPath"),
      action: async () => copyFilesPathToClipboard(getFilesClipboardPath(row))
    });
    if (getFolderActionPermission(row, "delete")) {
      items.push({ divider: true });
      items.push({
        label: t("filesDeleteFolder"),
        danger: true,
        action: async () => deleteSelectedFilesFolder()
      });
    }
    return items;
  }

  if (hasRow) {
    items.push({
      label: t("filesPreview"),
      action: async () => previewSelectedFilesRow()
    });
    items.push({
      label: t("filesDownload"),
      action: async () => downloadSelectedFilesRow()
    });
    items.push({
      label: t("filesCopyPath"),
      action: async () => copyFilesPathToClipboard(getFilesClipboardPath(row))
    });
    if (!isBackup) {
      items.push({
        label: t("filesMoveFile"),
        action: async () => moveSelectedFilesFile()
      });
      items.push({ divider: true });
      items.push({
        label: t("delete"),
        danger: true,
        action: async () => deleteSelectedFilesRow()
      });
    }
    return items;
  }

  if (String(filesModalContext.currentPath || "").trim()) {
    items.push({
      label: t("filesUp"),
      action: async () => navigateFilesUp()
    });
  }
  if (filesModalContext.canCreateFolder) {
    items.push({
      label: t("filesNewFolder"),
      action: async () => createFilesFolderFromPrompt()
    });
  }
  if (filesModalContext.canUpload) {
    items.push({
      label: t("filesUpload"),
      action: async () => {
        try { if (filesUploadInput) filesUploadInput.click(); } catch {}
      }
    });
  }
  if (canUseFilesFolderUpload()) {
    items.push({
      label: t("filesUploadFolder"),
      action: async () => {
        try { if (filesUploadFolderInput) filesUploadFolderInput.click(); } catch {}
      }
    });
  }
  if (items.length) items.push({ divider: true });
  items.push({
    label: t("filesCopyPath"),
    action: async () => copyFilesPathToClipboard(getFilesClipboardPath(null))
  });
  items.push({
    label: t("filesRefresh"),
    action: async () => loadFilesContext()
  });
  return items;
}

function openFilesContextMenu(clientX, clientY, row) {
  if (!filesContextMenu) return;
  const items = getFilesContextMenuItems(row).filter(Boolean);
  if (!items.length) {
    closeFilesContextMenu();
    return;
  }

  filesContextMenu.innerHTML = "";
  items.forEach((item) => {
    if (item.divider) {
      const divider = document.createElement("div");
      divider.className = "files-context-menu-divider";
      divider.setAttribute("aria-hidden", "true");
      filesContextMenu.appendChild(divider);
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = `files-context-menu-item${item.danger ? " danger" : ""}`;
    button.setAttribute("role", "menuitem");
    button.textContent = String(item.label || "");
    button.addEventListener("click", async () => {
      closeFilesContextMenu();
      if (typeof item.action === "function") {
        await item.action();
      }
    });
    filesContextMenu.appendChild(button);
  });

  filesContextMenu.classList.remove("hidden-section");
  filesContextMenu.setAttribute("aria-hidden", "false");
  filesContextMenuOpen = true;

  requestAnimationFrame(() => {
    if (!filesContextMenu) return;
    const bounds = filesContextMenu.getBoundingClientRect();
    const safeLeft = Math.max(8, Math.min(clientX, window.innerWidth - bounds.width - 8));
    const safeTop = Math.max(8, Math.min(clientY, window.innerHeight - bounds.height - 8));
    filesContextMenu.style.left = `${safeLeft}px`;
    filesContextMenu.style.top = `${safeTop}px`;
  });
}

function setSelectedFilesRow(nextId) {
  const normalized = String(nextId || "").trim();
  if (filesInlineRenameState && filesInlineRenameState.rowKey !== normalized) {
    filesInlineRenameState = null;
  }
  filesSelectedId = normalized;
  renderFilesList();
  updateFilesSelectionPane();
}

async function activateSelectedFilesRow() {
  const selected = findSelectedFilesRow();
  if (!selected) return;
  if (String(selected.entryType || "") === "folder") {
    await openSelectedFilesFolder();
    return;
  }
  await previewSelectedFilesRow();
}

function buildFilesEmptyStateConfig() {
  const hasSearch = Boolean(normalizeFilesSearchValue(filesExplorerState && filesExplorerState.search || ""));
  if (hasSearch) {
    return {
      title: t("filesSearchEmptyTitle"),
      hint: t("filesSearchEmptyHint"),
      actions: [
        { type: "clear-search", label: t("filesClearSearch") }
      ]
    };
  }
  const actions = [];
  if (filesModalContext && filesModalContext.canUpload) {
    actions.push({ type: "upload", label: t("filesUpload") });
  }
  if (filesModalContext && filesModalContext.canCreateFolder) {
    actions.push({ type: "new-folder", label: t("filesNewFolder") });
  }
  return {
    title: t("filesEmptyTitle"),
    hint: actions.length ? t("filesEmptyHint") : t("filesEmptyHintReadOnly"),
    actions
  };
}

function renderFilesEmptyState() {
  const state = buildFilesEmptyStateConfig();
  const li = document.createElement("li");
  li.className = "files-empty-state-item";
  const actionsHtml = Array.isArray(state.actions) && state.actions.length
    ? `
      <div class="files-empty-state-actions">
        ${state.actions.map((action) => `
          <button
            class="ghost-btn"
            type="button"
            data-files-empty-action="${escapeHtml(String(action.type || ""))}"
          >${escapeHtml(String(action.label || ""))}</button>
        `).join("")}
      </div>
    `
    : "";
  li.innerHTML = `
    <div class="files-empty-state empty-card">
      <span class="files-empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A3.5 3.5 0 0 1 17.5 20h-11A3.5 3.5 0 0 1 3 16.5z"/></svg>
      </span>
      <p class="files-empty-state-title empty-card-title">${escapeHtml(String(state.title || t("filesEmpty")))}</p>
      <p class="files-empty-state-hint empty-card-hint">${escapeHtml(String(state.hint || ""))}</p>
      ${actionsHtml}
    </div>
  `;
  return li;
}

function renderFilesList() {
  if (!filesList) return;
  updateFilesViewModeUi();
  filesList.innerHTML = "";
  filesList.classList.remove("files-list-empty");
  if (filesCountLabel) {
    const count = Array.isArray(filesRows) ? filesRows.length : 0;
    filesCountLabel.textContent = `${count} ${t("filesCountLabel")}`;
  }
  updateFilesViewSummary();

  if (!Array.isArray(filesVisibleRows) || !filesVisibleRows.length) {
    filesList.classList.add("files-list-empty");
    filesList.appendChild(renderFilesEmptyState());
    updateFilesSelectionPane();
    updateFilesBatchSummary();
    return;
  }

  filesVisibleRows.forEach((row) => {
    const li = document.createElement("li");
    const rowKey = getFilesRowKey(row);
    const fileName = getFilesRowDisplayName(row);
    const createdAt = getFilesRowModifiedAt(row);
    const sizeText = String(row && row.entryType || "") === "folder" ? "-" : formatBytes(row && row.sizeBytes || 0);
    const rowType = resolveFilesRowTypeLabel(row);
    const rowKindClass = String(row && row.entryType || "") === "folder" ? " folder" : "";
    const currentRoot = getFilesCurrentRoot();
    const folderPath = normalizeExplorerPathLocal(String(row && row.path || ""));
    const isFolder = String(row && row.entryType || "") === "folder";
    const canDrag = canStartFilesRowDrag(row);
    const dropTargetKey = isFolder ? getFilesDropTargetKey(currentRoot, folderPath) : "";
    const batchChecked = filesBatchSelection instanceof Set && filesBatchSelection.has(rowKey);
    const isBatchFile = filesRowSupportsBatch(row);
    const checkboxHtml = isBatchFile
      ? `<label class="files-row-check"><input type="checkbox" data-files-batch-id="${encodeURIComponent(rowKey)}" ${batchChecked ? "checked" : ""}></label>`
      : `<span class="files-row-check">-</span>`;
    const isInlineRename = Boolean(
      filesInlineRenameState
      && filesInlineRenameState.rowKey === rowKey
      && String(row && row.entryType || "") === "folder"
    );
    const rowActionsLabel = escapeHtml(t("filesMoreActions"));
    li.className = `files-row${rowKindClass}${rowKey === filesSelectedId ? " selected" : ""}${isInlineRename ? " inline-rename" : ""}${dropTargetKey && filesDropTargetKey === dropTargetKey ? " drop-target" : ""}`;
    li.dataset.filesRowId = encodeURIComponent(rowKey);
    if (canDrag) {
      li.draggable = true;
      li.dataset.filesDraggable = "1";
    } else {
      li.draggable = false;
      delete li.dataset.filesDraggable;
    }
    if (isFolder) {
      li.dataset.filesDropTargetKey = encodeURIComponent(dropTargetKey);
      li.dataset.filesDropRoot = currentRoot;
      li.dataset.filesDropPath = encodeURIComponent(folderPath);
    }
    const renameControlsHtml = isInlineRename
      ? `
        <span class="files-row-inline-rename" data-files-row-rename-controls="1">
          <input
            class="files-row-rename-input"
            type="text"
            maxlength="255"
            value="${escapeHtml(String(filesInlineRenameState && filesInlineRenameState.value || ""))}"
            data-files-row-rename-input="${encodeURIComponent(rowKey)}"
            aria-label="${escapeHtml(t("filesRenameFolder"))}"
            ${filesInlineRenameState && filesInlineRenameState.saving ? "disabled" : ""}
          >
          <button class="ghost-btn files-row-rename-btn" type="button" data-files-row-rename-save="${encodeURIComponent(rowKey)}" ${filesInlineRenameState && filesInlineRenameState.saving ? "disabled" : ""}>${escapeHtml(t("save"))}</button>
          <button class="ghost-btn files-row-rename-btn" type="button" data-files-row-rename-cancel="${encodeURIComponent(rowKey)}" ${filesInlineRenameState && filesInlineRenameState.saving ? "disabled" : ""}>${escapeHtml(t("cancel"))}</button>
        </span>
      `
      : `<span class="files-row-label">${escapeHtml(fileName)}</span>`;
    li.innerHTML = `
      ${checkboxHtml}
      <span class="files-row-name">
        <span class="files-row-name-main">${getFilesRowIconMarkup(row)}${renameControlsHtml}</span>
        ${isInlineRename ? "" : `<button class="files-row-menu-btn" type="button" data-files-row-menu="${encodeURIComponent(rowKey)}" aria-label="${rowActionsLabel}" title="${rowActionsLabel}" aria-haspopup="menu">&#8942;</button>`}
      </span>
      <span class="files-row-type">${escapeHtml(rowType)}</span>
      <span class="files-row-modified">${escapeHtml(formatNotificationDateTime(createdAt))}</span>
      <span class="files-row-size">${escapeHtml(sizeText)}</span>
    `;
    filesList.appendChild(li);
  });
  updateFilesSelectionPane();
  updateFilesBatchSummary();
}

async function downloadMyFilesArchive() {
  if (filesDownloadArchiveBtn) filesDownloadArchiveBtn.disabled = true;
  setFilesStatus(t("filesArchivePreparing"), false);
  try {
    const token = await ensureAccessToken();
    if (!token) throw new Error("auth");
    const response = await fetch("/api/files/archive/my", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error(`archive:${response.status}`);
    const blob = await response.blob();
    const disposition = String(response.headers.get("content-disposition") || "");
    const fileNameMatch = disposition.match(/filename="([^"]+)"/i);
    const fileName = fileNameMatch && fileNameMatch[1]
      ? fileNameMatch[1]
      : `procal-user-archive-${Date.now()}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setFilesStatus(t("filesArchiveReady"), false);
  } catch (_) {
    setFilesStatus(t("filesArchiveFailed"), true);
  } finally {
    if (filesDownloadArchiveBtn) filesDownloadArchiveBtn.disabled = false;
  }
}

async function loadFilesContext(options) {
  const nextOptions = options && typeof options === "object" ? options : {};
  closeFilesContextMenu();
  closeFilesUploadPickerMenu();
  clearFilesDropTarget();
  updateFilesContextUI();
  void loadFilesCapacity();
  setFilesStatus(t("filesLoading"), false);
  try {
    const mode = String(filesModalContext && filesModalContext.mode || "chat");
    const root = getFilesRootByMode(mode);
    const query = `?root=${encodeURIComponent(root)}&path=${encodeURIComponent(String(filesModalContext.currentPath || ""))}`;
    const body = await fetchFilesJson(`/api/files/explorer${query}`);
    filesModalContext.currentPath = String(body && body.path || "");
    filesModalContext.eventKey = root === "events" ? String(body && body.eventKey || "") : "";
    filesModalContext.breadcrumbs = Array.isArray(body && body.breadcrumbs) ? body.breadcrumbs : [];
    filesModalContext.canUpload = Boolean(body && body.canUpload);
    filesModalContext.canCreateFolder = Boolean(body && body.canCreateFolder);
    setFilesTreeNode(root, filesModalContext.currentPath, body || {});
    const treeAncestors = [""];
    const segments = normalizeExplorerPathLocal(filesModalContext.currentPath).split("/").filter(Boolean);
    let accPath = "";
    segments.forEach((segment) => {
      accPath = accPath ? `${accPath}/${segment}` : segment;
      treeAncestors.push(accPath);
    });
    treeAncestors.forEach((ancestorPath) => {
      filesTreeExpanded.add(getFilesTreeNodeKey(root, ancestorPath));
    });
    const ancestorLoads = treeAncestors.map((_, idx) => {
      const parentPath = idx <= 0 ? "" : treeAncestors[idx - 1];
      return loadFilesTreeNode(root, parentPath);
    });
    await Promise.all(ancestorLoads);
    const folders = Array.isArray(body && body.folders) ? body.folders : [];
    const files = Array.isArray(body && body.files) ? body.files : [];
    filesRows = [...folders, ...files];
    refreshFilesExplorerView();
    if (nextOptions.resetHistory) resetFilesHistory(buildFilesHistorySnapshot());
    else if (nextOptions.recordHistory !== false) recordFilesHistorySnapshot(Boolean(nextOptions.replaceHistory));
    updateFilesContextUI();
    renderFilesTree();
    setFilesStatus("", false);
  } catch (error) {
    filesRows = [];
    filesVisibleRows = [];
    filesSelectedId = "";
    filesBatchSelection = new Set();
    renderFilesList();
    renderFilesTree();
    setFilesStatus(error && error.message ? error.message : t("filesLoadFailed"), true);
  }
}

function openFilesModal(options) {
  if (!canUseFilesModule()) {
    return;
  }
  const next = options && typeof options === "object" ? options : {};
  const mode = ["event", "chat", "shared"].includes(String(next.mode || ""))
    ? String(next.mode)
    : "shared";
  const activeEventKey = getCurrentEventFileKey();
  filesModalContext = {
    mode,
    eventKey: mode === "event" ? String(next.eventKey || activeEventKey || "") : "",
    chatScope: next.chatScope === "direct" ? "direct" : "global",
    chatPeerUserId: String(next.chatPeerUserId || ""),
    canUpload: false,
    canCreateFolder: false,
    currentPath: "",
    breadcrumbs: []
  };
  if (filesModalContext.mode === "chat" && chatActiveScope === "direct" && chatActivePeerUserId) {
    filesModalContext.chatScope = "direct";
    filesModalContext.chatPeerUserId = String(chatActivePeerUserId || "");
  }
  filesModalContext.currentPath = normalizeExplorerPathLocal(String(next.path || getFilesDefaultPathForContext(filesModalContext) || ""));
  filesExplorerState.search = "";
  filesExplorerState.sort = "modified_desc";
  filesExplorerState.dragDepth = 0;
  filesUploadExpanded = false;
  filesBatchBusy = false;
  filesTreeHomeExpanded = true;
  resetFilesHistory(null);
  filesLastActivatedRowId = "";
  filesLastActivatedAt = 0;
  filesDragState = null;
  filesInlineRenameState = null;
  clearFilesDropTarget();
  resetFilesSelectionPreview("", false);
  if (filesSearchInput) filesSearchInput.value = "";
  if (filesSortSelect) filesSortSelect.value = "modified_desc";
  if (filesUploadFolderInput) filesUploadFolderInput.value = "";
  filesBatchSelection = new Set();
  closeFilesContextMenu();
  closeFilesUploadPickerMenu();
  closeFilesOperationPanel();
  if (filesModal) {
    filesModal.classList.remove("hidden");
    filesModal.setAttribute("aria-hidden", "false");
  }
  void (async () => {
    await ensureFilesTreeInitialized();
    await loadFilesContext({ resetHistory: true });
  })();
}

function closeFilesModal() {
  if (!filesModal) return;
  filesModal.classList.add("hidden");
  filesModal.setAttribute("aria-hidden", "true");
  filesRows = [];
  filesVisibleRows = [];
  filesSelectedId = "";
  filesBatchSelection = new Set();
  filesModalContext.canUpload = false;
  filesModalContext.canCreateFolder = false;
  filesModalContext.currentPath = "";
  filesModalContext.breadcrumbs = [];
  filesTreeExpanded = new Set();
  filesTreeCache = new Map();
  filesTreeLoadingKeys = new Set();
  filesUploadExpanded = false;
  filesBatchBusy = false;
  filesTreeHomeExpanded = true;
  resetFilesHistory(null);
  filesLastActivatedRowId = "";
  filesLastActivatedAt = 0;
  filesDragState = null;
  filesInlineRenameState = null;
  if (filesList) filesList.innerHTML = "";
  if (filesTree) filesTree.innerHTML = "";
  if (filesUploadInput) filesUploadInput.value = "";
  if (filesUploadFolderInput) filesUploadFolderInput.value = "";
  if (filesSearchInput) filesSearchInput.value = "";
  if (filesSortSelect) filesSortSelect.value = "modified_desc";
  filesExplorerState.search = "";
  filesExplorerState.sort = "modified_desc";
  filesExplorerState.dragDepth = 0;
  clearFilesDropTarget();
  closeFilesContextMenu();
  closeFilesUploadPickerMenu();
  if (filesUploadForm) filesUploadForm.classList.remove("drag-active");
  resetFilesSelectionPreview("", false);
  refreshFilesUploadSummary();
  closeFilesOperationPanel();
  setFilesStatus("", false);
  updateFilesSelectionPane();
  updateFilesBatchSummary();
  closeFilePreviewModal();
}

function getSelectedFilesFolderEntry() {
  const selected = findSelectedFilesRow();
  if (!selected || String(selected.entryType || "") !== "folder") return null;
  return selected;
}

function getCurrentFilesFolderEntryFromTree() {
  const currentPath = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
  if (!currentPath) return null;
  const root = getFilesRootByMode(String(filesModalContext.mode || "chat"));
  return getFilesTreeFolderEntry(root, currentPath);
}

function getFilesTreeFolderEntry(root, relPath) {
  const currentPath = normalizeExplorerPathLocal(relPath);
  if (!currentPath) return null;
  const parts = currentPath.split("/").filter(Boolean);
  const fallbackName = String(parts[parts.length - 1] || currentPath);
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
  const parentNode = getFilesTreeNode(root, parentPath);
  const folders = Array.isArray(parentNode && parentNode.folders) ? parentNode.folders : [];
  const hit = folders.find((row) => normalizeExplorerPathLocal(String(row && row.path || "")) === currentPath);
  if (!hit) {
    return {
      entryType: "folder",
      name: fallbackName,
      path: currentPath,
      locked: false,
      eventKey: root === "events" ? String(filesModalContext && filesModalContext.eventKey || "") : ""
    };
  }
  return {
    entryType: "folder",
    name: String(hit.name || fallbackName),
    path: currentPath,
    locked: Boolean(hit.locked),
    eventKey: String(hit.eventKey || (root === "events" ? String(filesModalContext && filesModalContext.eventKey || "") : "")),
    canRename: Object.prototype.hasOwnProperty.call(hit, "canRename") ? Boolean(hit.canRename) : undefined,
    canMove: Object.prototype.hasOwnProperty.call(hit, "canMove") ? Boolean(hit.canMove) : undefined,
    canDelete: Object.prototype.hasOwnProperty.call(hit, "canDelete") ? Boolean(hit.canDelete) : undefined,
    eventDeletedFromCalendar: Boolean(hit.eventDeletedFromCalendar)
  };
}

function getFilesTreeFolderDragPayload(root, relPath) {
  const folder = getFilesTreeFolderEntry(root, relPath);
  if (!folder || !getFolderActionPermission(folder, "move")) return null;
  const sourcePath = normalizeExplorerPathLocal(String(folder.path || ""));
  if (!sourcePath) return null;
  return {
    kind: "folder",
    root: String(root || "").trim(),
    rowKey: getFilesRowKey(folder),
    sourcePath,
    sourceParentPath: getFilesEntryParentPath(sourcePath),
    label: formatFilesFolderLabel(folder)
  };
}

function getFilesFolderActionTarget() {
  const selectedFolder = getSelectedFilesFolderEntry();
  if (selectedFolder) return selectedFolder;
  const currentFolder = getCurrentFilesFolderEntryFromTree();
  if (currentFolder) return currentFolder;
  return null;
}

function getFilesEventActionTarget() {
  const folder = getFilesFolderActionTarget();
  if (!folder) return null;
  const eventKey = getFilesFolderEventKey(folder);
  if (!eventKey) return null;
  const eventRow = findBaseEventById(eventKey);
  if (!eventRow) return null;
  return {
    folder,
    eventKey,
    eventRow
  };
}

function getSelectedFilesFileEntry() {
  const selected = findSelectedFilesRow();
  if (!selected || String(selected.entryType || "") === "folder") return null;
  return selected;
}

function cancelFilesInlineRename(render = true) {
  filesInlineRenameState = null;
  if (render) renderFilesList();
}

function startFilesInlineRename(folder) {
  if (!folder || String(folder.entryType || "") !== "folder") return;
  if (!getFolderActionPermission(folder, "rename")) {
    setFilesStatus(t("filesFolderLocked"), true);
    return;
  }
  const rowKey = getFilesRowKey(folder);
  if (!rowKey) return;
  filesSelectedId = rowKey;
  filesInlineRenameState = {
    rowKey,
    folderPath: normalizeExplorerPathLocal(String(folder.path || "")),
    originalName: String(folder.name || ""),
    value: String(folder.name || ""),
    saving: false
  };
  renderFilesList();
  requestAnimationFrame(() => {
    try {
      const input = filesList
        ? Array.from(filesList.querySelectorAll("[data-files-row-rename-input]"))
          .find((node) => String(node && node.getAttribute("data-files-row-rename-input") || "") === encodeURIComponent(rowKey))
        : null;
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    } catch {}
  });
}

function updateFilesInlineRenameValue(nextValue) {
  if (!filesInlineRenameState) return;
  filesInlineRenameState.value = String(nextValue || "").slice(0, 255);
}

async function submitFilesInlineRename() {
  const state = filesInlineRenameState;
  if (!state || state.saving) return;
  const value = String(state.value || "").trim();
  if (!value) {
    setFilesStatus(t("filesOperationMissingValue"), true);
    return;
  }
  if (value === String(state.originalName || "").trim()) {
    cancelFilesInlineRename();
    return;
  }
  state.saving = true;
  renderFilesList();
  try {
    const root = getFilesRootByMode(String(filesModalContext.mode || "chat"));
    const parentPath = normalizeExplorerPathLocal(
      String(state.folderPath || "").split("/").filter(Boolean).slice(0, -1).join("/")
    );
    const nextPath = normalizeExplorerPathLocal([parentPath, value].filter(Boolean).join("/"));
    filesSelectedId = nextPath ? `folder:${nextPath}` : "";
    await fetchFilesJson("/api/files/explorer/folders", {
      method: "PATCH",
      body: JSON.stringify({
        root,
        path: state.folderPath,
        newName: value
      })
    });
    filesInlineRenameState = null;
    await loadFilesContext({ recordHistory: false });
    setFilesStatus(t("filesFolderUpdated"), false);
  } catch (error) {
    if (filesInlineRenameState) filesInlineRenameState.saving = false;
    renderFilesList();
    setFilesStatus(error && error.message ? error.message : t("filesFolderUpdateFailed"), true);
  }
}

async function navigateFilesToPath(nextPath, options) {
  filesInlineRenameState = null;
  filesModalContext.currentPath = normalizeExplorerPathLocal(nextPath);
  filesSelectedId = "";
  await loadFilesContext(options);
}

async function navigateFilesBack() {
  if (filesHistoryIndex <= 0) return;
  filesInlineRenameState = null;
  const nextIndex = filesHistoryIndex - 1;
  const snapshot = filesHistoryStack[nextIndex];
  if (!snapshot) return;
  filesHistoryIndex = nextIndex;
  filesModalContext.mode = ["event", "chat", "shared"].includes(String(snapshot.mode || ""))
    ? String(snapshot.mode)
    : "shared";
  filesModalContext.eventKey = filesModalContext.mode === "event" ? String(snapshot.eventKey || "") : "";
  filesModalContext.chatScope = snapshot.chatScope === "direct" ? "direct" : "global";
  filesModalContext.chatPeerUserId = String(snapshot.chatPeerUserId || "");
  filesModalContext.currentPath = normalizeExplorerPathLocal(String(snapshot.path || ""));
  filesSelectedId = "";
  filesBatchSelection = new Set();
  filesUploadExpanded = false;
  await loadFilesContext({ recordHistory: false });
}

async function navigateFilesUp() {
  const current = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
  if (!current) return;
  const parts = current.split("/").filter(Boolean);
  parts.pop();
  await navigateFilesToPath(parts.join("/"));
}

async function openSelectedFilesFolder() {
  const folder = getSelectedFilesFolderEntry();
  if (!folder) return;
  await navigateFilesToPath(String(folder.path || ""));
}

function openSelectedFilesEvent() {
  const target = getFilesEventActionTarget();
  if (!target || !target.eventRow) {
    setFilesStatus(t("filesOpenEventUnavailable"), true);
    return false;
  }
  const previewDateKey = String(target.eventRow.startDate || selectedDateKey || todayKey || "");
  closeFilesModal();
  openEventPreview(target.eventRow, previewDateKey);
  return true;
}

function closeFilesOperationPanel() {
  filesOperationSubmitting = false;
  filesOperationState = null;
  filesOperationTreeExpanded = new Set();
  if (filesOperationOverlay) filesOperationOverlay.classList.add("hidden-section");
  if (filesOperationPanel) filesOperationPanel.classList.add("hidden-section");
  if (filesOperationInput) filesOperationInput.value = "";
  if (filesOperationInput) filesOperationInput.classList.remove("hidden-section");
  if (filesOperationPickerWrap) filesOperationPickerWrap.classList.add("hidden-section");
  if (filesOperationPickerTree) filesOperationPickerTree.innerHTML = "";
  if (filesOperationSourceValue) filesOperationSourceValue.textContent = "-";
  if (filesOperationSelectionPath) filesOperationSelectionPath.textContent = "/";
  if (filesOperationSelection) filesOperationSelection.textContent = t("filesOperationSelectionEmpty");
  if (filesOperationHint) filesOperationHint.textContent = "";
  updateFilesOperationControlsUi();
}

function getFilesOperationDisplayPath(pathValue) {
  const cleanPath = normalizeExplorerPathLocal(pathValue);
  return cleanPath ? `/${cleanPath}` : "/";
}

function getFilesOperationDisplayLocation(rootValue, pathValue) {
  const rootLabel = getFilesRootLabel(String(rootValue || "").trim());
  const cleanPath = normalizeExplorerPathLocal(pathValue);
  return cleanPath ? `${rootLabel} /${cleanPath}` : `${rootLabel} /`;
}

function getFilesOperationTargetLabel(pathValue) {
  const cleanPath = normalizeExplorerPathLocal(pathValue);
  if (!cleanPath) return t("filesOperationPickerRoot");
  const parts = cleanPath.split("/").filter(Boolean);
  return String(parts[parts.length - 1] || t("filesOperationPickerRoot"));
}

function updateFilesOperationSourceUi() {
  const op = filesOperationState;
  if (!filesOperationSourceValue) return;
  if (!op || !op.usePicker) {
    filesOperationSourceValue.textContent = "-";
    return;
  }
  const sourceLabel = String(op.sourceLabel || "").trim();
  const sourcePath = getFilesOperationDisplayLocation(String(op.root || ""), String(op.sourcePath || op.sourceParentPath || ""));
  filesOperationSourceValue.textContent = sourceLabel
    ? `${sourceLabel} • ${sourcePath}`
    : sourcePath;
}

function updateFilesOperationControlsUi() {
  const op = filesOperationState;
  const selectedRoot = String(op && (op.selectedRoot || op.root) || "").trim();
  const selectedPath = normalizeExplorerPathLocal(String(op && op.selectedPath || ""));
  const selectionAllowed = op && op.usePicker ? isFilesOperationDestinationAllowed(selectedRoot, selectedPath) : true;
  if (filesOperationApplyBtn) {
    filesOperationApplyBtn.textContent = filesOperationSubmitting
      ? t("filesOperationApplying")
      : (op && op.applyLabel ? op.applyLabel : t("filesOperationApply"));
    filesOperationApplyBtn.disabled = !op || filesOperationSubmitting || (Boolean(op && op.usePicker) && !selectionAllowed);
  }
  if (filesOperationCancelBtn) {
    filesOperationCancelBtn.disabled = filesOperationSubmitting;
  }
  if (filesOperationInput) {
    filesOperationInput.disabled = filesOperationSubmitting;
  }
  if (filesOperationPickerWrap) {
    filesOperationPickerWrap.classList.toggle("is-busy", filesOperationSubmitting);
  }
}

function setFilesOperationSubmitting(nextSubmitting) {
  filesOperationSubmitting = Boolean(nextSubmitting);
  updateFilesOperationControlsUi();
}

function getFilesOperationTreeNodeKey(root, relPath) {
  return `${String(root || "").trim()}:${normalizeExplorerPathLocal(relPath)}`;
}

function getFilesOperationPickerRoots(op) {
  const currentOp = op && typeof op === "object" ? op : filesOperationState;
  const sourceRoot = String(currentOp && currentOp.root || "").trim();
  if (currentOp && String(currentOp.type || "") === "move_folder" && ["events", "shared"].includes(sourceRoot)) {
    return ["events", "shared"];
  }
  return sourceRoot ? [sourceRoot] : [];
}

function seedFilesOperationTreeExpandedState(op) {
  const currentOp = op && typeof op === "object" ? op : filesOperationState;
  filesOperationTreeExpanded = new Set();
  const roots = getFilesOperationPickerRoots(currentOp);
  const expandPath = (root, relPath) => {
    if (!root) return;
    filesOperationTreeExpanded.add(getFilesOperationTreeNodeKey(root, ""));
    const cleanPath = normalizeExplorerPathLocal(relPath);
    if (!cleanPath) return;
    const parts = cleanPath.split("/").filter(Boolean);
    let acc = "";
    parts.forEach((part) => {
      acc = acc ? `${acc}/${part}` : part;
      filesOperationTreeExpanded.add(getFilesOperationTreeNodeKey(root, acc));
    });
  };
  roots.forEach((root) => expandPath(root, ""));
  if (currentOp) {
    expandPath(String(currentOp.root || "").trim(), String(currentOp.sourceParentPath || currentOp.sourcePath || ""));
    expandPath(String(currentOp.selectedRoot || currentOp.root || "").trim(), String(currentOp.selectedPath || ""));
  }
}

async function ensureFilesOperationPickerData(root, relPath = "", visited = new Set()) {
  const cleanRoot = String(root || "").trim();
  const cleanPath = normalizeExplorerPathLocal(relPath);
  const nodeKey = getFilesTreeNodeKey(cleanRoot, cleanPath);
  if (!cleanRoot || visited.has(nodeKey)) return;
  visited.add(nodeKey);
  await loadFilesTreeNode(cleanRoot, cleanPath);
  const node = getFilesTreeNode(cleanRoot, cleanPath);
  const folders = Array.isArray(node && node.folders) ? node.folders : [];
  for (const folder of folders) {
    const childPath = normalizeExplorerPathLocal(String(folder && folder.path || ""));
    if (!childPath) continue;
    await ensureFilesOperationPickerData(cleanRoot, childPath, visited);
  }
}

function collectFilesOperationFolderOptions(root, relPath = "", depth = 0, items = [], visited = new Set()) {
  const cleanRoot = String(root || "").trim();
  const cleanPath = normalizeExplorerPathLocal(relPath);
  const nodeKey = getFilesTreeNodeKey(cleanRoot, cleanPath);
  if (!cleanRoot || visited.has(nodeKey)) return items;
  visited.add(nodeKey);
  const node = getFilesTreeNode(cleanRoot, cleanPath);
  const folders = Array.isArray(node && node.folders) ? node.folders : [];
  folders.forEach((folder) => {
    const childPath = normalizeExplorerPathLocal(String(folder && folder.path || ""));
    if (!childPath) return;
    items.push({
      path: childPath,
      depth,
      name: formatFilesFolderLabel(folder && typeof folder === "object"
        ? { ...folder, entryType: "folder" }
        : { entryType: "folder", name: childPath })
    });
    collectFilesOperationFolderOptions(cleanRoot, childPath, depth + 1, items, visited);
  });
  return items;
}

function isFilesOperationDestinationAllowed(targetRoot, targetPath) {
  const op = filesOperationState;
  if (!op) return false;
  const root = String(targetRoot || op.root || "").trim();
  const selectedPath = normalizeExplorerPathLocal(targetPath);
  if (op.type === "move_file") {
    return isFilesDropAllowed({
      kind: "file",
      root: String(op.root || "").trim(),
      sourcePath: normalizeExplorerPathLocal(String(op.sourcePath || "")),
      sourceParentPath: normalizeExplorerPathLocal(String(op.sourceParentPath || "")),
      fileId: String(op.fileId || "")
    }, root, selectedPath);
  }
  if (op.type === "move_folder") {
    return isFilesDropAllowed({
      kind: "folder",
      root: String(op.root || "").trim(),
      sourcePath: normalizeExplorerPathLocal(String(op.sourcePath || "")),
      sourceParentPath: normalizeExplorerPathLocal(String(op.sourceParentPath || ""))
    }, root, selectedPath);
  }
  return true;
}

function updateFilesOperationSelectionUi() {
  const op = filesOperationState;
  if (!filesOperationSelection) return;
  if (!op || !op.usePicker) {
    filesOperationSelection.textContent = t("filesOperationSelectionEmpty");
    if (filesOperationSelectionPath) filesOperationSelectionPath.textContent = "/";
    return;
  }
  const selectedRoot = String(op.selectedRoot || op.root || "").trim();
  const selectedPath = normalizeExplorerPathLocal(String(op.selectedPath || ""));
  if (isFilesOperationDestinationAllowed(selectedRoot, selectedPath)) {
    filesOperationSelection.textContent = getFilesOperationTargetLabel(selectedPath);
    if (filesOperationSelectionPath) {
      filesOperationSelectionPath.textContent = getFilesOperationDisplayLocation(selectedRoot, selectedPath);
    }
    return;
  }
  filesOperationSelection.textContent = t("filesOperationSelectionEmpty");
  if (filesOperationSelectionPath) filesOperationSelectionPath.textContent = "/";
}

function renderFilesOperationTreeBranch(root, relPath) {
  const node = getFilesTreeNode(root, relPath);
  const branch = document.createElement("ul");
  branch.className = "files-tree files-tree-children";
  const folders = Array.isArray(node && node.folders) ? node.folders : [];
  folders.forEach((folder) => {
    const folderPath = normalizeExplorerPathLocal(String(folder && folder.path || ""));
    if (!folderPath) return;
    const li = document.createElement("li");
    li.className = "files-tree-node";
    const row = document.createElement("div");
    row.className = "files-tree-row";
    const childNode = getFilesTreeNode(root, folderPath);
    const childFolders = Array.isArray(childNode && childNode.folders) ? childNode.folders : [];
    const canExpand = childFolders.length > 0;
    const nodeKey = getFilesOperationTreeNodeKey(root, folderPath);
    const isExpanded = filesOperationTreeExpanded.has(nodeKey);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "files-tree-toggle";
    toggle.dataset.filesOperationToggleRoot = root;
    toggle.dataset.filesOperationTogglePath = encodeURIComponent(folderPath);
    toggle.textContent = isExpanded ? "v" : ">";
    toggle.disabled = !canExpand;
    const button = document.createElement("button");
    const op = filesOperationState;
    const selectedRoot = String(op && (op.selectedRoot || op.root) || "").trim();
    const selectedPath = normalizeExplorerPathLocal(String(op && op.selectedPath || ""));
    const allowed = isFilesOperationDestinationAllowed(root, folderPath);
    button.type = "button";
    button.className = `files-tree-label files-operation-tree-target${allowed && root === selectedRoot && folderPath === selectedPath ? " active" : ""}`;
    button.dataset.filesOperationTargetRoot = root;
    button.dataset.filesOperationTargetPath = encodeURIComponent(folderPath);
    button.disabled = !allowed;
    button.innerHTML = getFilesTreeLabelMarkup(
      folder && typeof folder === "object"
        ? { ...folder, entryType: "folder" }
        : { entryType: "folder", name: folderPath }
    );
    row.append(toggle, button);
    li.appendChild(row);
    if (canExpand && isExpanded) {
      const childBranch = renderFilesOperationTreeBranch(root, folderPath);
      if (childBranch.childElementCount > 0) {
        li.appendChild(childBranch);
      }
    }
    branch.appendChild(li);
  });
  return branch;
}

function renderFilesOperationPicker() {
  if (!filesOperationPickerTree) return;
  const op = filesOperationState;
  filesOperationPickerTree.innerHTML = "";
  if (!op || !op.usePicker) return;

  const roots = getFilesOperationPickerRoots(op);
  const homeNode = document.createElement("li");
  homeNode.className = "files-tree-node";
  const homeRow = document.createElement("div");
  homeRow.className = "files-tree-row";
  const homeLabel = document.createElement("span");
  homeLabel.className = "files-tree-label static";
  homeLabel.textContent = t("filesRootHome");
  homeRow.appendChild(homeLabel);
  homeNode.appendChild(homeRow);
  const rootList = document.createElement("ul");
  rootList.className = "files-tree files-tree-children";

  roots.forEach((root) => {
    const rootItem = document.createElement("li");
    rootItem.className = "files-tree-node";
    const rootRow = document.createElement("div");
    rootRow.className = "files-tree-row";
    const rootNode = getFilesTreeNode(root, "");
    const rootChildren = Array.isArray(rootNode && rootNode.folders) ? rootNode.folders : [];
    const rootNodeKey = getFilesOperationTreeNodeKey(root, "");
    const rootExpanded = filesOperationTreeExpanded.has(rootNodeKey);
    const rootToggle = document.createElement("button");
    rootToggle.type = "button";
    rootToggle.className = "files-tree-toggle";
    rootToggle.dataset.filesOperationToggleRoot = root;
    rootToggle.dataset.filesOperationTogglePath = "";
    rootToggle.textContent = rootExpanded ? "v" : ">";
    rootToggle.disabled = rootChildren.length <= 0;
    const rootButton = document.createElement("button");
    const selectedRoot = String(op.selectedRoot || op.root || "").trim();
    const selectedPath = normalizeExplorerPathLocal(String(op.selectedPath || ""));
    const rootAllowed = isFilesOperationDestinationAllowed(root, "");
    rootButton.type = "button";
    rootButton.className = `files-tree-label files-operation-tree-target${rootAllowed && root === selectedRoot && !selectedPath ? " active" : ""}`;
    rootButton.dataset.filesOperationTargetRoot = root;
    rootButton.dataset.filesOperationTargetPath = "";
    rootButton.disabled = !rootAllowed;
    rootButton.textContent = getFilesRootLabel(root);
    rootRow.append(rootToggle, rootButton);
    rootItem.appendChild(rootRow);
    if (rootExpanded) {
      const branch = renderFilesOperationTreeBranch(root, "");
      if (branch.childElementCount > 0) {
        rootItem.appendChild(branch);
      }
    }
    rootList.appendChild(rootItem);
  });

  homeNode.appendChild(rootList);
  const tree = document.createElement("ul");
  tree.className = "files-tree files-operation-picker-tree";
  tree.appendChild(homeNode);
  filesOperationPickerTree.appendChild(tree);

  if (!roots.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = t("filesOperationPickerEmpty");
    filesOperationPickerTree.appendChild(empty);
  }

  updateFilesOperationSelectionUi();
  updateFilesOperationControlsUi();
}

async function prepareFilesOperationPicker() {
  const op = filesOperationState;
  if (!op || !op.usePicker) return;
  if (filesOperationPickerTree) {
    filesOperationPickerTree.innerHTML = `<p class="muted">${escapeHtml(t("filesLoading"))}</p>`;
  }
  const roots = getFilesOperationPickerRoots(op);
  await Promise.all(roots.map((root) => ensureFilesOperationPickerData(root)));
  renderFilesOperationPicker();
}

async function openFilesOperationPanel(options) {
  const next = options && typeof options === "object" ? options : {};
  filesOperationSubmitting = false;
  filesOperationState = {
    type: String(next.type || ""),
    root: getFilesRootByMode(String(filesModalContext.mode || "chat")),
    selectedRoot: String(next.selectedRoot || getFilesRootByMode(String(filesModalContext.mode || "chat"))),
    folderPath: String(next.folderPath || ""),
    fileId: String(next.fileId || ""),
    sourcePath: String(next.sourcePath || next.folderPath || ""),
    sourceParentPath: String(next.sourceParentPath || ""),
    sourceLabel: String(next.sourceLabel || ""),
    applyLabel: String(next.applyLabel || ""),
    usePicker: Boolean(next.usePicker),
    selectedPath: normalizeExplorerPathLocal(String(next.selectedPath || ""))
  };
  if (filesOperationTitle) filesOperationTitle.textContent = String(next.title || t("filesOperationValue"));
  if (filesOperationLabel) {
    filesOperationLabel.textContent = next.usePicker ? t("filesOperationDestination") : t("filesOperationValue");
  }
  if (filesOperationHint) filesOperationHint.textContent = String(next.hint || "");
  if (filesOperationInput) {
    filesOperationInput.classList.toggle("hidden-section", Boolean(next.usePicker));
  }
  if (filesOperationPickerWrap) {
    filesOperationPickerWrap.classList.toggle("hidden-section", !Boolean(next.usePicker));
  }
  if (filesOperationInput) {
    filesOperationInput.value = String(next.value || "");
    filesOperationInput.placeholder = String(next.placeholder || "");
  }
  if (Boolean(next.usePicker)) {
    seedFilesOperationTreeExpandedState(filesOperationState);
  } else {
    filesOperationTreeExpanded = new Set();
  }
  updateFilesOperationSourceUi();
  updateFilesOperationSelectionUi();
  if (filesOperationOverlay) filesOperationOverlay.classList.remove("hidden-section");
  if (filesOperationPanel) filesOperationPanel.classList.remove("hidden-section");
  updateFilesOperationControlsUi();
  if (Boolean(next.usePicker)) {
    await prepareFilesOperationPicker();
  } else {
    setTimeout(() => {
      try { if (filesOperationInput) filesOperationInput.focus(); } catch {}
    }, 0);
  }
}

async function applyFilesOperationPanel() {
  if (!filesOperationState || filesOperationSubmitting) return;
  const op = filesOperationState;
  const selectedRoot = String(op.selectedRoot || op.root || "").trim();
  const value = op.usePicker
    ? normalizeExplorerPathLocal(String(op.selectedPath || ""))
    : String(filesOperationInput && filesOperationInput.value || "").trim();
  if (op.usePicker) {
    if (!isFilesOperationDestinationAllowed(selectedRoot, value)) {
      setFilesStatus(value ? t("filesOperationInvalidDestination") : t("filesOperationMissingDestination"), true);
      return;
    }
  } else if (!value) {
    setFilesStatus(t("filesOperationMissingValue"), true);
    return;
  }
  setFilesOperationSubmitting(true);
  try {
    if (op.type === "create_folder") {
      await fetchFilesJson("/api/files/explorer/folders", {
        method: "POST",
        body: JSON.stringify({
          root: op.root,
          parentPath: String(filesModalContext.currentPath || ""),
          name: value
        })
      });
      await loadFilesContext();
      setFilesStatus(t("filesFolderCreated"), false);
      closeFilesOperationPanel();
      return;
    }
    if (op.type === "rename_folder") {
      await fetchFilesJson("/api/files/explorer/folders", {
        method: "PATCH",
        body: JSON.stringify({
          root: op.root,
          path: op.folderPath,
          newName: value
        })
      });
      await loadFilesContext();
      setFilesStatus(t("filesFolderUpdated"), false);
      closeFilesOperationPanel();
      return;
    }
    if (op.type === "move_folder") {
      await fetchFilesJson("/api/files/explorer/folders", {
        method: "PATCH",
        body: JSON.stringify({
          root: op.root,
          path: op.folderPath,
          targetRoot: selectedRoot,
          targetPath: value
        })
      });
      await loadFilesContext();
      setFilesStatus(t("filesFolderUpdated"), false);
      closeFilesOperationPanel();
      return;
    }
    if (op.type === "move_file") {
      await fetchFilesJson("/api/files/explorer/files/move", {
        method: "POST",
        body: JSON.stringify({
          fileId: op.fileId,
          targetRoot: selectedRoot,
          targetPath: value
        })
      });
      await loadFilesContext();
      setFilesStatus(t("filesFolderUpdated"), false);
      closeFilesOperationPanel();
      return;
    }
  } catch (error) {
    const fallback = op.type === "create_folder"
      ? t("filesFolderCreateFailed")
      : op.type === "move_file"
        ? t("filesFileMoveFailed")
        : t("filesFolderUpdateFailed");
    setFilesStatus(error && error.message ? error.message : fallback, true);
  } finally {
    setFilesOperationSubmitting(false);
  }
}

async function createFilesFolderFromPrompt() {
  const root = getFilesRootByMode(String(filesModalContext.mode || "chat"));
  if (root === "backups" || !filesModalContext.canCreateFolder) {
    setFilesStatus(t("filesFolderLocked"), true);
    return;
  }
  await openFilesOperationPanel({
    type: "create_folder",
    title: t("filesOperationCreateTitle"),
    hint: t("filesOperationCreateHint"),
    value: "",
    placeholder: t("filesOperationCreateTitle")
  });
}

async function renameSelectedFilesFolder() {
  const selectedFolder = getSelectedFilesFolderEntry();
  if (selectedFolder) {
    startFilesInlineRename(selectedFolder);
    return;
  }
  const folder = getCurrentFilesFolderEntryFromTree();
  if (!folder) {
    setFilesStatus(t("filesFolderNotSelected"), true);
    return;
  }
  if (!getFolderActionPermission(folder, "rename")) {
    setFilesStatus(t("filesFolderLocked"), true);
    return;
  }
  await openFilesOperationPanel({
    type: "rename_folder",
    folderPath: String(folder.path || ""),
    title: t("filesOperationRenameTitle"),
    hint: t("filesOperationRenameHint"),
    value: String(folder.name || ""),
    placeholder: t("filesOperationRenameTitle")
  });
}

async function moveSelectedFilesFolder() {
  const folder = getFilesFolderActionTarget();
  if (!folder) {
    setFilesStatus(t("filesFolderNotSelected"), true);
    return;
  }
  if (!getFolderActionPermission(folder, "move")) {
    setFilesStatus(t("filesFolderLocked"), true);
    return;
  }
  const folderPath = normalizeExplorerPathLocal(String(folder.path || ""));
  const folderParts = folderPath.split("/").filter(Boolean);
  const sourceParentPath = folderParts.length > 1 ? folderParts.slice(0, -1).join("/") : "";
  await openFilesOperationPanel({
    type: "move_folder",
    usePicker: true,
    folderPath,
    sourcePath: folderPath,
    sourceParentPath,
    sourceLabel: formatFilesFolderLabel(folder),
    applyLabel: t("filesOperationMoveHere"),
    selectedPath: sourceParentPath,
    title: t("filesOperationMoveFolderTitle"),
    hint: t("filesOperationMoveFolderHint"),
    value: "",
    placeholder: ""
  });
}

async function countFilesRecursivelyInFolder(root, folderPath) {
  const normalizedRoot = String(root || "").trim();
  const startPath = normalizeExplorerPathLocal(folderPath);
  if (!normalizedRoot || !startPath) return 0;
  const queue = [startPath];
  const visited = new Set();
  let count = 0;

  while (queue.length) {
    const pathValue = normalizeExplorerPathLocal(queue.shift() || "");
    if (!pathValue || visited.has(pathValue)) continue;
    visited.add(pathValue);
    const query = `?root=${encodeURIComponent(normalizedRoot)}&path=${encodeURIComponent(pathValue)}`;
    const body = await fetchFilesJson(`/api/files/explorer${query}`);
    const files = Array.isArray(body && body.files) ? body.files : [];
    const folders = Array.isArray(body && body.folders) ? body.folders : [];
    count += files.length;
    folders.forEach((folder) => {
      const childPath = normalizeExplorerPathLocal(String(folder && folder.path || ""));
      if (!childPath || visited.has(childPath)) return;
      queue.push(childPath);
    });
  }
  return count;
}

async function deleteSelectedFilesFolder() {
  const folder = getFilesFolderActionTarget();
  if (!folder) {
    setFilesStatus(t("filesFolderNotSelected"), true);
    return;
  }
  if (!getFolderActionPermission(folder, "delete")) {
    setFilesStatus(t("filesFolderLocked"), true);
    return;
  }
  const root = getFilesRootByMode(String(filesModalContext.mode || "chat"));
  const folderName = formatFilesFolderLabel(folder);
  let confirmMessage = t("filesDeleteFolderConfirmFallback")
    .replace("{name}", folderName)
    .replace("{count}", "?");
  try {
    const filesCount = await countFilesRecursivelyInFolder(root, String(folder.path || ""));
    confirmMessage = (filesCount > 0 ? t("filesDeleteFolderConfirmWithFiles") : t("filesDeleteFolderConfirmEmpty"))
      .replace("{name}", folderName)
      .replace("{count}", String(filesCount));
  } catch (_) {
    // Fall back to generic confirmation text.
  }
  if (!window.confirm(confirmMessage)) return;
  try {
    await fetchFilesJson("/api/files/explorer/folders", {
      method: "DELETE",
      body: JSON.stringify({
        root,
        path: String(folder.path || "")
      })
    });
    await loadFilesContext();
    setFilesStatus(t("filesFolderDeleted"), false);
  } catch (error) {
    setFilesStatus(error && error.message ? error.message : t("filesFolderDeleteFailed"), true);
  }
}

async function moveSelectedFilesFile() {
  const fileEntry = getSelectedFilesFileEntry();
  if (!fileEntry || Boolean(fileEntry.backup)) return;
  await openFilesOperationPanel({
    type: "move_file",
    usePicker: true,
    fileId: String(fileEntry.id || ""),
    sourcePath: String(fileEntry.path || filesModalContext.currentPath || ""),
    sourceParentPath: String(filesModalContext.currentPath || ""),
    sourceLabel: getFilesRowDisplayName(fileEntry),
    applyLabel: t("filesOperationMoveHere"),
    selectedPath: String(filesModalContext.currentPath || ""),
    title: t("filesOperationMoveFileTitle"),
    hint: t("filesOperationMoveFileHint"),
    value: "",
    placeholder: ""
  });
}

function buildFilesUploadProgressText(current, total, fileName) {
  return t("filesUploadingProgress")
    .replace("{current}", String(current))
    .replace("{total}", String(total))
    .replace("{name}", String(fileName || "file"));
}

async function ensureFilesFolderPath(root, targetPath, cache) {
  const cleanRoot = String(root || "").trim();
  const cleanPath = normalizeExplorerPathLocal(targetPath);
  const known = cache instanceof Set ? cache : new Set();
  if (!cleanRoot || !cleanPath) return;
  const segments = cleanPath.split("/").filter(Boolean);
  let parentPath = "";
  for (const segment of segments) {
    const nextPath = parentPath ? `${parentPath}/${segment}` : segment;
    if (known.has(nextPath)) {
      parentPath = nextPath;
      continue;
    }
    try {
      await fetchFilesJson("/api/files/explorer/folders", {
        method: "POST",
        body: JSON.stringify({
          root: cleanRoot,
          parentPath,
          name: segment
        })
      });
    } catch (error) {
      const message = String(error && error.message || "");
      if (!/already exists/i.test(message)) throw error;
    }
    known.add(nextPath);
    parentPath = nextPath;
  }
}

async function uploadFolderInModal(selectedFiles) {
  const files = Array.isArray(selectedFiles)
    ? selectedFiles.filter((file) => file instanceof File)
    : [];
  if (!files.length) return;
  if (!canUseFilesFolderUpload()) {
    setFilesStatus(t("filesFolderUploadUnavailable"), true);
    return;
  }

  const mode = String(filesModalContext && filesModalContext.mode || "chat");
  const root = getFilesRootByMode(mode);
  const currentPath = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
  const folderCache = new Set();
  let uploadedCount = 0;

  if (filesUploadBtn) filesUploadBtn.disabled = true;
  if (filesUploadFolderBtn) filesUploadFolderBtn.disabled = true;

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const relativePath = normalizeExplorerPathLocal(String(file.webkitRelativePath || file.name || ""));
      const relativeParts = relativePath.split("/").filter(Boolean);
      const nestedSegments = relativeParts.length > 1 ? relativeParts.slice(0, -1) : [];
      const nestedPath = nestedSegments.join("/");
      const targetFolderPath = normalizeExplorerPathLocal(
        [currentPath, nestedPath].filter(Boolean).join("/")
      );
      const eventKey = String(filesModalContext.eventKey || "").trim();
      const eventFileSettings = mode === "event" ? getEventFilesSettingsForEvent(eventKey) : null;
      const eventDetachedFlag = Boolean(eventFileSettings && (eventFileSettings.filesDetached || !eventFileSettings.filesFolderEnabled));

      setFilesStatus(buildFilesUploadProgressText(index + 1, files.length, file.name || relativePath || "file"), false);
      await ensureFilesFolderPath(root, targetFolderPath, folderCache);

      const formData = buildFilesUploadFormData(file, mode === "event"
        ? {
            root: "events",
            path: targetFolderPath || currentPath,
            eventKey,
            eventFolderName: String(
              (targetFolderPath || currentPath).split("/").filter(Boolean)[0]
              || (typeof getEventFolderNameHintForFiles === "function"
                ? getEventFolderNameHintForFiles(eventKey)
                : "")
            ).trim(),
            detachedFromCalendar: eventDetachedFlag ? "true" : "false"
          }
        : {
            root: "shared",
            path: targetFolderPath
          });
      await fetchFilesJson("/api/files/explorer/upload", {
        method: "POST",
        body: formData
      });
      uploadedCount += 1;
    }
    await loadFilesContext();
    setFilesStatus(t("filesFolderUploaded").replace("{count}", String(uploadedCount)), false);
  } catch (error) {
    setFilesStatus(error && error.message ? error.message : t("filesUploadFailed"), true);
  } finally {
    refreshFilesUploadSummary();
  }
}

async function uploadFilesInModal() {
  if (!filesUploadInput || !filesUploadInput.files || !filesUploadInput.files.length) return;
  const selected = Array.from(filesUploadInput.files || []);
  const mode = String(filesModalContext && filesModalContext.mode || "chat");
  const root = getFilesRootByMode(mode);
  if (root === "backups") return;

  setFilesStatus(t("filesUploading"), false);
  if (filesUploadBtn) filesUploadBtn.disabled = true;
  if (filesUploadFolderBtn) filesUploadFolderBtn.disabled = true;
  const markerBuffer = [];
  try {
    const currentPath = normalizeExplorerPathLocal(String(filesModalContext.currentPath || ""));
    const currentSegments = currentPath ? currentPath.split("/").map((segment) => segment.trim()).filter(Boolean) : [];
    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      setFilesStatus(buildFilesUploadProgressText(index + 1, selected.length, file.name || "file"), false);
      if (mode === "event") {
        const eventKey = String(filesModalContext.eventKey || "").trim();
        const eventFileSettings = getEventFilesSettingsForEvent(eventKey);
        const eventDetachedFlag = Boolean(eventFileSettings.filesDetached || !eventFileSettings.filesFolderEnabled);
        const eventFolderName = String(currentSegments[0] || (eventKey ? getEventFolderNameHintForFiles(eventKey) : "")).trim();
        if (!eventKey && !eventFolderName) throw new Error(t("filesEventMissing"));

        if (eventKey) {
          const formData = buildFilesUploadFormData(file, {
            kind: "file",
            eventFolderName: eventFolderName || null,
            detachedFromCalendar: eventDetachedFlag ? "true" : "false"
          });
          const uploaded = await fetchFilesJson(`/api/files/events/${encodeURIComponent(eventKey)}/upload`, {
            method: "POST",
            body: formData
          });
          const uploadedId = String(uploaded && uploaded.file && uploaded.file.id || "");
          const eventBaseFolder = eventFolderName || getEventFolderNameHintForFiles(eventKey);
          const defaultEventFolder = `${eventBaseFolder}/other`;
          if (
            uploadedId
            && eventBaseFolder
            && currentPath
            && currentPath.startsWith(`${eventBaseFolder}/`)
            && currentPath !== defaultEventFolder
          ) {
            await fetchFilesJson("/api/files/explorer/files/move", {
              method: "POST",
              body: JSON.stringify({
                fileId: uploadedId,
                targetRoot: "events",
                targetPath: currentPath
              })
            });
          }
        } else {
          const targetPath = currentPath || `${eventFolderName}/other`;
          const formData = buildFilesUploadFormData(file, {
            root: "events",
            path: targetPath,
            eventFolderName,
            detachedFromCalendar: eventDetachedFlag ? "true" : "false"
          });
          await fetchFilesJson("/api/files/explorer/upload", {
            method: "POST",
            body: formData
          });
        }
      } else if (mode === "shared") {
        const formData = buildFilesUploadFormData(file, {
          root: "shared",
          path: currentPath
        });
        await fetchFilesJson("/api/files/explorer/upload", {
          method: "POST",
          body: formData
        });
      } else if (mode === "chat") {
        const chatDefaultPath = getFilesDefaultPathForContext(filesModalContext);
        const payload = filesModalContext.chatScope === "direct"
          ? buildFilesUploadFormData(file, {
              scope: "direct",
              peerUserId: String(filesModalContext.chatPeerUserId || "")
            })
          : buildFilesUploadFormData(file, { scope: "global" });
        const result = await fetchFilesJson("/api/files/chat/upload", {
          method: "POST",
          body: payload
        });
        if (result && result.file && result.file.id) {
          markerBuffer.push(buildChatFileMarker(result.file.id, result.file.fileName || file.name));
          const uploadedId = String(result.file.id || "");
          if (uploadedId && currentPath && currentPath !== chatDefaultPath && currentPath.startsWith(`${chatDefaultPath}/`)) {
            await fetchFilesJson("/api/files/explorer/files/move", {
              method: "POST",
              body: JSON.stringify({
                fileId: uploadedId,
                targetRoot: "chat",
                targetPath: currentPath
              })
            });
          }
        }
      }
    }
    if (mode === "chat" && markerBuffer.length && chatInput) {
      const prefix = String(chatInput.value || "").trim();
      chatInput.value = [prefix, ...markerBuffer].filter((item) => String(item || "").trim()).join("\n");
      if (chatModal && !chatModal.classList.contains("hidden")) {
        chatInput.focus();
      }
    }
    filesUploadInput.value = "";
    refreshFilesUploadSummary();
    await loadFilesContext();
    setFilesStatus(t("filesUploaded"), false);
  } catch (error) {
    setFilesStatus(error && error.message ? error.message : t("filesUploadFailed"), true);
  } finally {
    refreshFilesUploadSummary();
  }
}

async function deleteFileFromFilesModal(fileId, row) {
  const id = String(fileId || "").trim();
  if (!id) return;
  try {
    await fetchFilesJson("/api/files/explorer/files", {
      method: "DELETE",
      body: JSON.stringify({ fileId: id })
    });
    await loadFilesContext();
  } catch (error) {
    setFilesStatus(error && error.message ? error.message : t("filesDeleteFailed"), true);
  }
}

async function previewSelectedFilesRow() {
  const row = findSelectedFilesRow();
  if (!row || String(row.entryType || "") === "folder") return;
  try {
    if (Boolean(row.backup)) {
      await openFilePreviewForBackupFile(String(row.name || row.fileName || ""));
      return;
    }
    await openFilePreviewForRemoteFile(row);
  } catch (_) {
    setFilesStatus(t("filesDownloadFailed"), true);
  }
}

async function downloadSelectedFilesRow() {
  const row = findSelectedFilesRow();
  if (!row || String(row.entryType || "") === "folder") return;
  try {
    if (Boolean(row.backup)) {
      await downloadBackupFile(String(row.name || row.fileName || ""));
      return;
    }
    await downloadProtectedFile(String(row.id || ""), String(row.name || row.fileName || "file.bin"));
  } catch (_) {
    setFilesStatus(t("filesDownloadFailed"), true);
  }
}

async function deleteSelectedFilesRow() {
  const row = findSelectedFilesRow();
  if (!row || Boolean(row.backup) || String(row.entryType || "") === "folder") return;
  await deleteFileFromFilesModal(String(row.id || ""), row);
}

function setFilesBatchSelection(rowKey, checked) {
  const key = String(rowKey || "");
  if (!key) return;
  if (!(filesBatchSelection instanceof Set)) filesBatchSelection = new Set();
  if (checked) filesBatchSelection.add(key);
  else filesBatchSelection.delete(key);
  updateFilesBatchSummary();
}

function toggleFilesBatchSelectAll(checked) {
  const on = Boolean(checked);
  const next = new Set();
  if (on && Array.isArray(filesVisibleRows)) {
    filesVisibleRows.forEach((row) => {
      if (!filesRowSupportsBatch(row)) return;
      const rowKey = getFilesRowKey(row);
      if (!rowKey) return;
      next.add(rowKey);
    });
  }
  filesBatchSelection = next;
  renderFilesList();
}

async function downloadSelectedFilesBatch() {
  if (filesBatchBusy) return;
  const rows = getSelectedBatchRows();
  if (!rows.length) return;
  let successCount = 0;
  setFilesBatchBusy(true);
  try {
    for (const row of rows) {
      if (String(row.entryType || "") === "folder") {
        continue;
      }
      if (Boolean(row.backup)) {
        try {
          await downloadBackupFile(String(row.name || row.fileName || ""));
          successCount += 1;
        } catch (_) {
          // Continue with remaining files.
        }
        continue;
      }
      const fileId = String(row.id || "").trim();
      if (!fileId) continue;
      try {
        await downloadProtectedFile(fileId, String(row.name || row.fileName || "file.bin"));
        successCount += 1;
      } catch (_) {
        // Continue with remaining files.
      }
    }
    setFilesStatus(
      buildFilesBatchResultText("filesBatchDownloadDone", "filesBatchDownloadPartial", "filesBatchDownloadFailed", successCount, rows.length),
      successCount <= 0 || successCount < rows.length
    );
  } finally {
    setFilesBatchBusy(false);
  }
}

async function deleteSelectedFilesBatch() {
  if (filesBatchBusy) return;
  const rows = getEffectiveBatchDeleteRows(
    getSelectedBatchRows().filter((row) => !Boolean(row.backup))
  );
  if (!rows.length) return;
  if (!window.confirm(t("filesBatchDeleteConfirm"))) return;
  let deletedCount = 0;
  setFilesBatchBusy(true);
  try {
    for (const row of rows) {
      if (String(row.entryType || "") === "folder") {
        try {
          await fetchFilesJson("/api/files/explorer/folders", {
            method: "DELETE",
            body: JSON.stringify({
              root: getFilesCurrentRoot(),
              path: normalizeExplorerPathLocal(String(row.path || ""))
            })
          });
          deletedCount += 1;
        } catch (_) {
          // Continue with remaining items.
        }
        continue;
      }
      const fileId = String(row.id || "").trim();
      if (!fileId) continue;
      try {
        await fetchFilesJson("/api/files/explorer/files", {
          method: "DELETE",
          body: JSON.stringify({ fileId })
        });
        deletedCount += 1;
      } catch (_) {
        // Continue with remaining items.
      }
    }
    if (deletedCount > 0) {
      filesBatchSelection = new Set();
      await loadFilesContext();
    }
    setFilesStatus(
      buildFilesBatchResultText("filesBatchDeleteDone", "filesBatchDeletePartial", "filesBatchDeleteFailed", deletedCount, rows.length),
      deletedCount <= 0 || deletedCount < rows.length
    );
  } finally {
    setFilesBatchBusy(false);
  }
}

async function sendChatMessage() {
  if (!chatForm || !chatInput || chatSending || !canChatWrite()) return;
  const body = String(chatInput.value || "").trim();
  const hasPendingFiles = Array.isArray(chatPendingFiles) && chatPendingFiles.length > 0;
  if (!body && !hasPendingFiles) return;
  if (chatActiveScope === "direct" && !String(chatActivePeerUserId || "")) return;
  chatSending = true;
  if (chatSendBtn) chatSendBtn.disabled = true;
  if (chatAttachBtn) chatAttachBtn.disabled = true;
  try {
    const attachmentMarkers = hasPendingFiles ? await uploadChatPendingFiles() : [];
    const payloadBody = [body, ...attachmentMarkers].filter((item) => String(item || "").trim()).join("\n");
    if (!payloadBody) return;
    const payload = chatActiveScope === "global"
      ? { scope: "global", body: payloadBody }
      : { scope: "direct", peerUserId: String(chatActivePeerUserId || ""), body: payloadBody };
    const res = await fetchChatJson("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    chatInput.value = "";
    clearChatPendingFiles();
    if (res && res.item) {
      chatMessageRows = [...(Array.isArray(chatMessageRows) ? chatMessageRows : []), res.item];
      renderChatMessages({ forceBottom: true });
    }
    await loadChatThreads();
    await markChatThreadRead();
  } catch {
    // no-op
  } finally {
    chatSending = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    if (chatAttachBtn) chatAttachBtn.disabled = false;
    if (chatInput) chatInput.focus();
  }
}

function initChatPolling() {
  if (chatBadgePollTimer) {
    clearInterval(chatBadgePollTimer);
    chatBadgePollTimer = null;
  }
  if (!canChatAccess()) {
    chatUnreadCount = 0;
    renderChatBadge();
    return;
  }
  void refreshChatUnreadCount();
  chatBadgePollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    void refreshChatUnreadCount();
  }, getChatBadgePollIntervalMs());
}

function chatMessageMatchesActiveThread(msg) {
  if (!msg || !chatActiveScope) return false;
  if (chatActiveScope === "global") return String(msg.scope || "") === "global";
  if (String(msg.scope || "") !== "direct") return false;
  const peerId = String(chatActivePeerUserId || "");
  const senderId = String(msg.senderId || "");
  const recipientId = String(msg.recipientUserId || "");
  const meId = String(currentUserId || "");
  return (senderId === peerId && recipientId === meId) || (senderId === meId && recipientId === peerId);
}

function scheduleChatRealtimeRefresh(kind) {
  if (!canChatAccess()) return;
  if (chatRealtimeRefreshTimer) return;
  chatRealtimeRefreshTimer = setTimeout(() => {
    chatRealtimeRefreshTimer = null;
    void (async () => {
      if (kind === "presence") {
        if (chatOpen) renderChatThreadList();
        return;
      }
      if (chatOpen) {
        await loadChatThreads();
        if (kind === "activeThread") {
          await loadChatMessages();
          await markChatThreadRead();
        }
      }
      await refreshChatUnreadCount();
    })();
  }, kind === "presence" ? 0 : 80);
}

function setBugReportMessage(text, danger) {
  if (!bugReportMsg) return;
  bugReportMsg.textContent = String(text || "");
  bugReportMsg.style.color = danger ? "#b91c1c" : "#475569";
}

function openBugReportModal() {
  if (!bugReportModal) return;
  setBugReportMessage("", false);
  if (bugReportForm) bugReportForm.reset();
  bugReportModal.classList.remove("hidden");
  bugReportModal.setAttribute("aria-hidden", "false");
  if (bugReportInputTitle) bugReportInputTitle.focus();
}

function closeBugReportModal() {
  if (!bugReportModal) return;
  bugReportModal.classList.add("hidden");
  bugReportModal.setAttribute("aria-hidden", "true");
}

async function submitBugReport() {
  const title = String((bugReportInputTitle && bugReportInputTitle.value) || "").trim();
  const description = String((bugReportInputDesc && bugReportInputDesc.value) || "").trim();
  if (!title || !description) {
    setBugReportMessage(t("bugReportFailed"), true);
    return;
  }
  if (bugReportSubmitBtn) bugReportSubmitBtn.disabled = true;
  try {
    const token = await ensureAccessToken();
    if (!token) throw new Error("auth");
    const res = await fetch("/api/bugs/report", {
      method: "POST",
      credentials: "include",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title,
        description,
        pageUrl: window.location.pathname,
        appVersion: APP_VERSION
      })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(String((body && (body.error || body.message)) || "submit_failed"));
    }
    setBugReportMessage(t("bugReportSent"), false);
    setTimeout(() => closeBugReportModal(), 600);
  } catch {
    setBugReportMessage(t("bugReportFailed"), true);
  } finally {
    if (bugReportSubmitBtn) bugReportSubmitBtn.disabled = false;
  }
}

function showSyncToast(text) {
  if (!syncToast) return;
  syncToast.textContent = String(text || "");
  syncToast.classList.remove("hidden");
  syncToast.classList.add("show");
  if (realtimeSyncToastTimer) clearTimeout(realtimeSyncToastTimer);
  realtimeSyncToastTimer = setTimeout(() => {
    syncToast.classList.remove("show");
    syncToast.classList.add("hidden");
  }, 2600);
}

function buildSessionFingerprint() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  if (!mod || typeof mod.buildSessionFingerprint !== "function") return "";
  return mod.buildSessionFingerprint({
    currentUserPermissions,
    currentUserFeatureFlags,
    currentUserId,
    currentUserName,
    currentUserViewMode,
    currentUserRole,
    currentUserStatus,
    currentUserDisplayColor,
    currentUserCalendarTintOpacity
  });
}

function getUserUiPrefsKey() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  if (!mod || typeof mod.getUserUiPrefsKey !== "function") return "";
  return mod.getUserUiPrefsKey({
    currentUserId,
    currentCalendarMode,
    userUiPrefsKeyPrefix: USER_UI_PREFS_KEY
  });
}

function persistUiPrefs() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  if (!mod || typeof mod.persistUiPrefs !== "function") return;
  mod.persistUiPrefs({
    storage: localStorage,
    currentUserId,
    currentCalendarMode,
    userUiPrefsKeyPrefix: USER_UI_PREFS_KEY,
    currentMainPanel,
    currentView,
    activeFilters,
    mainPanelKey: MAIN_PANEL_KEY
  });
}

function restoreUiPrefs() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  if (!mod || typeof mod.restoreUiPrefs !== "function") {
    setMainPanel(readMainPanelPreference(), false);
    return;
  }
  mod.restoreUiPrefs({
    storage: localStorage,
    currentUserId,
    currentCalendarMode,
    userUiPrefsKeyPrefix: USER_UI_PREFS_KEY,
    mainPanelKey: MAIN_PANEL_KEY,
    activeFilters,
    categories,
    people,
    setCurrentView: (value) => { currentView = value === "year" ? "year" : "month"; },
    setMainPanel
  });
}

function readMainPanelPreference() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  return mod && typeof mod.readMainPanelPreference === "function"
    ? mod.readMainPanelPreference({
        storage: localStorage,
        mainPanelKey: MAIN_PANEL_KEY
      })
    : "calendar";
}

function updateNotesToggleButton() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  if (!mod || typeof mod.updateNotesToggleButton !== "function") return;
  mod.updateNotesToggleButton({
    calendarPanelTabBtn,
    eventsPanelTabBtn,
    notesToggleBtn,
    notesViewModeLabel,
    notesViewToggle,
    notesViewMonthBtn,
    notesViewYearBtn,
    currentMainPanel,
    currentCalendarMode,
    t
  });
}

function renderMainPanelUI() {
  const mod = window.ProCalModules && window.ProCalModules.uiPreferences;
  if (!mod || typeof mod.renderMainPanelUI !== "function") return;
  mod.renderMainPanelUI({
    layoutEl,
    notesPanel,
    eventsPanel,
    calendarPanelTabBtn,
    eventsPanelTabBtn,
    notesToggleBtn,
    notesViewModeLabel,
    notesViewToggle,
    notesViewMonthBtn,
    notesViewYearBtn,
    currentMainPanel,
    currentCalendarMode,
    t,
    documentRef: document
  });
}

function setMainPanel(panel, persist = true) {
  currentMainPanel = panel === "notes" || panel === "events" ? panel : "calendar";
  closeMobileOverlayPanels();
  renderMainPanelUI();
  if (currentMainPanel === "events") renderEventsRegistry();
  if (currentMainPanel === "notes") scheduleStickyNotesPullFromShared(0);
  if (persist && !READ_ONLY) {
    localStorage.setItem(MAIN_PANEL_KEY, currentMainPanel);
    persistUiPrefs();
  }
}

function scheduleStickyNotesPullFromShared(delayMs = 200) {
  const mod = window.ProCalModules && window.ProCalModules.notesSyncFlow;
  if (!mod || typeof mod.schedulePull !== "function") return;
  sharedNotesSyncTimer = mod.schedulePull({
    existingTimer: sharedNotesSyncTimer,
    delayMs,
    onRun: () => {
      sharedNotesSyncTimer = null;
      syncStickyNotesFromShared();
    }
  });
}

async function syncStickyNotesFromShared() {
  const mod = window.ProCalModules && window.ProCalModules.notesSyncFlow;
  if (!mod || typeof mod.syncFromShared !== "function") return;
  await mod.syncFromShared({
    dataProvider: window.dataProvider,
    stickyNotes,
    sanitizeStickyNotes,
    setStickyNotes: (rows) => { stickyNotes = Array.isArray(rows) ? rows : []; },
    pruneStickyNoteOffsets,
    persistLocalStateSnapshot: () => {
      try {
        localStorage.setItem(getStateStorageKey(), JSON.stringify(buildStatePayload(true)));
      } catch {}
    },
    renderNotesPanel
  });
}

function scheduleStickyNotesPushToShared() {
  const mod = window.ProCalModules && window.ProCalModules.notesSyncFlow;
  if (!mod || typeof mod.schedulePush !== "function") return;
  sharedNotesPushTimer = mod.schedulePush({
    existingTimer: sharedNotesPushTimer,
    delayMs: 250,
    onRun: async () => {
      sharedNotesPushTimer = null;
      if (!mod || typeof mod.pushToShared !== "function") return;
      await mod.pushToShared({
        readOnly: READ_ONLY,
        dataProvider: window.dataProvider,
        stickyNotes,
        sanitizeStickyNotes,
        nowIso: () => new Date().toISOString(),
        afterSave: () => scheduleStickyNotesPullFromShared(120)
      });
    }
  });
}

function createStickyNoteId() {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.createStickyNoteId !== "function") {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return mod.createStickyNoteId();
}

function normalizeNoteOffset(value) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.normalizeNoteOffset !== "function") {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n > 2500) return 2500;
    if (n < -2500) return -2500;
    return Math.round(n);
  }
  return mod.normalizeNoteOffset(value);
}

function getStickyLayoutStorageKey() {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.getStickyLayoutStorageKey !== "function") {
    return `${STICKY_LAYOUT_KEY}_${String(currentUserId || "anon")}`;
  }
  return mod.getStickyLayoutStorageKey({
    stickyLayoutKey: STICKY_LAYOUT_KEY,
    currentUserId
  });
}

function readStickyLayoutMap() {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.readStickyLayoutMap !== "function") return {};
  return mod.readStickyLayoutMap({
    storageRef: localStorage,
    storageKey: getStickyLayoutStorageKey(),
    normalizeNoteOffset
  });
}

function saveStickyLayoutMap() {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.saveStickyLayoutMap !== "function") return;
  mod.saveStickyLayoutMap({
    storageRef: localStorage,
    storageKey: getStickyLayoutStorageKey(),
    stickyLayoutById
  });
}

function clampStickyOffsetY(value) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.clampStickyOffsetY !== "function") {
    const y = normalizeNoteOffset(value);
    return y < 0 ? 0 : y;
  }
  return mod.clampStickyOffsetY(value, { normalizeNoteOffset });
}

function getStickyNoteOffset(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.getStickyNoteOffset !== "function") {
    const id = String(note && note.id ? note.id : "");
    const local = id ? stickyLayoutById[id] : null;
    if (local && typeof local === "object") {
      return { x: normalizeNoteOffset(local.x), y: clampStickyOffsetY(local.y) };
    }
    return {
      x: normalizeNoteOffset(note && note.offsetX),
      y: clampStickyOffsetY(note && note.offsetY)
    };
  }
  return mod.getStickyNoteOffset(note, {
    stickyLayoutById,
    normalizeNoteOffset,
    clampStickyOffsetY
  });
}

function setStickyNoteOffset(noteId, x, y) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.setStickyNoteOffset !== "function") return;
  const changed = mod.setStickyNoteOffset({
    noteId,
    x,
    y,
    stickyLayoutById,
    normalizeNoteOffset,
    clampStickyOffsetY
  });
  if (changed) saveStickyLayoutMap();
}

function deleteStickyNoteOffset(noteId) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.deleteStickyNoteOffset !== "function") return;
  const changed = mod.deleteStickyNoteOffset({
    noteId,
    stickyLayoutById
  });
  if (changed) saveStickyLayoutMap();
}

function pruneStickyNoteOffsets(validNoteIds) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.pruneStickyNoteOffsets !== "function") return;
  const changed = mod.pruneStickyNoteOffsets({
    stickyLayoutById,
    validNoteIds
  });
  if (changed) saveStickyLayoutMap();
}

function sanitizeStickyNotes(list) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.sanitizeStickyNotes !== "function") return [];
  return mod.sanitizeStickyNotes(list, {
    createStickyNoteId,
    normalizeHexColor,
    isValidDateTime,
    normalizeNoteOffset,
    normalizeStickyShareEntries
  });
}

function canViewStickyNote(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.canViewStickyNote !== "function") return false;
  return mod.canViewStickyNote(note, {
    identityIds: getCurrentUserIdentityIds(),
    getStickyShares
  });
}

function canEditStickyNote(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.canEditStickyNote !== "function") return false;
  return mod.canEditStickyNote(note, {
    identityIds: getCurrentUserIdentityIds(),
    getStickyShares
  });
}

function canDeleteStickyNote(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.canDeleteStickyNote !== "function") return false;
  return mod.canDeleteStickyNote(note, {
    identityIds: getCurrentUserIdentityIds(),
    getStickyShares
  });
}

function isStickyOwner(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.isStickyOwner !== "function") return false;
  return mod.isStickyOwner(note, {
    identityIds: getCurrentUserIdentityIds()
  });
}

function getVisibleStickyNotes() {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.getVisibleStickyNotes !== "function") return [];
  return mod.getVisibleStickyNotes({
    stickyNotes,
    canViewStickyNote
  });
}

function resolvePersonShareId(person) {
  const roster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!roster || typeof roster.resolveShareId !== "function") return "";
  return roster.resolveShareId(person);
}

function getCurrentUserIdentityIds() {
  const roster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!roster || typeof roster.getCurrentUserIdentityIds !== "function") return new Set();
  return roster.getCurrentUserIdentityIds(currentUserId, getOperationalPeople());
}

function getOperationalPeople() {
  const roster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!roster || typeof roster.getOperationalPeople !== "function") return [];
  return roster.getOperationalPeople({
    peopleDirectoryUsers,
    people,
    normalizePersonColor
  });
}

function getPersonDisplayName(person, roster) {
  const peopleRoster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!peopleRoster || typeof peopleRoster.getPersonDisplayName !== "function") return "-";
  return peopleRoster.getPersonDisplayName(person, Array.isArray(roster) ? roster : getOperationalPeople());
}

function normalizeStickyShareEntries(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.normalizeStickyShareEntries !== "function") return [];
  return mod.normalizeStickyShareEntries(note);
}

function getStickyShares(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.getStickyShares !== "function") return normalizeStickyShareEntries(note);
  return mod.getStickyShares(note);
}

function getPersonNameById(id) {
  const roster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!roster || typeof roster.getPersonNameById !== "function") return String(id || "");
  return roster.getPersonNameById(id, getOperationalPeople());
}

function getStickySharedAudienceNames(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.getStickySharedAudienceNames !== "function") return [];
  return mod.getStickySharedAudienceNames(note, {
    getStickyShares,
    getPersonNameById,
    dedupeStrings
  });
}

function getShareRecipients() {
  const roster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!roster || typeof roster.getShareRecipients !== "function") return [];
  const ids = getCurrentUserIdentityIds();
  return roster.getShareRecipients({
    roster: getOperationalPeople(),
    ids,
    resolveShareId: resolvePersonShareId,
    isCurrentUserShareId: (shareId) => isCurrentUserShareId(shareId)
  });
}

function isCurrentUserShareId(shareId) {
  const roster = window.ProCalModules && window.ProCalModules.peopleRoster;
  if (!roster || typeof roster.isCurrentUserShareId !== "function") return false;
  return roster.isCurrentUserShareId(shareId, {
    currentUserId,
    myIds: getCurrentUserIdentityIds(),
    roster: getOperationalPeople(),
    resolveShareId: resolvePersonShareId
  });
}

function canMoveStickyNote(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesCoreState;
  if (!mod || typeof mod.canMoveStickyNote !== "function") return canViewStickyNote(note);
  return mod.canMoveStickyNote(note, { canViewStickyNote });
}

function updateStickyNoteModalTitle() {
  const mod = window.ProCalModules && window.ProCalModules.notesModalFlow;
  if (!mod || typeof mod.updateStickyNoteModalTitle !== "function") return;
  mod.updateStickyNoteModalTitle({
    stickyNoteModalTitle,
    editingStickyNoteId,
    t
  });
}

function setStickyNoteColor(value) {
  const modalFlow = window.ProCalModules && window.ProCalModules.notesModalFlow;
  const paletteModule = window.ProCalModules && window.ProCalModules.notesPalette;
  if (!modalFlow || typeof modalFlow.setStickyNoteColor !== "function") return;
  modalFlow.setStickyNoteColor({
    value,
    paletteModule,
    normalizeHexColor,
    stickyNoteColorInput,
    stickyNotePalette
  });
}

function renderStickyNotePalette() {
  const modalFlow = window.ProCalModules && window.ProCalModules.notesModalFlow;
  const paletteModule = window.ProCalModules && window.ProCalModules.notesPalette;
  if (!modalFlow || typeof modalFlow.renderStickyNotePalette !== "function") return;
  modalFlow.renderStickyNotePalette({
    paletteModule,
    stickyNotePalette,
    colors: STICKY_NOTE_COLORS,
    setStickyNoteColor,
    stickyNoteColorInput
  });
}

function resetStickyNoteForm() {
  const mod = window.ProCalModules && window.ProCalModules.notesModalFlow;
  if (!mod || typeof mod.resetStickyNoteForm !== "function") return;
  mod.resetStickyNoteForm({
    setEditingStickyNoteId: (value) => { editingStickyNoteId = String(value || ""); },
    stickyNoteForm,
    setStickyNoteColor,
    stickyNoteModal,
    updateStickyNoteModalTitle
  });
}

function openStickyNoteForm(note) {
  const mod = window.ProCalModules && window.ProCalModules.notesModalFlow;
  if (!mod || typeof mod.openStickyNoteForm !== "function") return;
  mod.openStickyNoteForm({
    note,
    stickyNoteForm,
    setEditingStickyNoteId: (value) => { editingStickyNoteId = String(value || ""); },
    stickyNoteTitleInput,
    stickyNoteTextInput,
    setStickyNoteColor,
    normalizeHexColor,
    stickyNoteModal,
    updateStickyNoteModalTitle
  });
}

async function handleStickyNoteSubmit(event) {
  event.preventDefault();
  if (READ_ONLY || !stickyNoteTitleInput || !stickyNoteTextInput || !stickyNoteColorInput) return;

  if (!currentUserId) {
    await refreshCurrentUserSession(false);
  }
  if (!currentUserId) {
    const tok = await ensureAccessToken();
    const uid = getUserIdFromToken(tok);
    if (uid) currentUserId = uid;
  }
  if (!currentUserId) {
    showSyncToast("Session not ready. Please refresh.");
    return;
  }

  const title = String(stickyNoteTitleInput.value || "").trim();
  const text = String(stickyNoteTextInput.value || "").trim();
  if (!title && !text) return;

  const noteActions = window.ProCalModules && window.ProCalModules.notesNoteActions;
  if (!noteActions || typeof noteActions.upsertNote !== "function") return;
  const result = noteActions.upsertNote({
    stickyNotes,
    editingStickyNoteId,
    title,
    text,
    color: stickyNoteColorInput.value,
    currentUserId: String(currentUserId || ""),
    currentUserName: String(currentUserName || ""),
    createStickyNoteId,
    normalizeHexColor,
    canEditStickyNote,
    setStickyNoteOffset
  });
  if (!result || !result.applied) return;
  editingStickyNoteId = String(result.editingStickyNoteId || "");

  persistState();
  scheduleStickyNotesPushToShared();
  resetStickyNoteForm();
  renderNotesPanel();
}

function deleteStickyNote(noteId) {
  const noteActions = window.ProCalModules && window.ProCalModules.notesNoteActions;
  if (!noteActions || typeof noteActions.deleteNote !== "function") return;
  const result = noteActions.deleteNote({
    stickyNotes,
    noteId,
    canDeleteStickyNote,
    getCurrentUserIdentityIds,
    hasGlobalAdminPrivileges,
    getStickyShares,
    currentUserId: String(currentUserId || ""),
    deleteStickyNoteOffset
  });
  if (!result || !result.applied) return;

  persistState();
  scheduleStickyNotesPushToShared();
  renderNotesPanel();
}

function closeStickyShareModal() {
  const mod = window.ProCalModules && window.ProCalModules.notesModalFlow;
  if (!mod || typeof mod.closeStickyShareModal !== "function") return;
  mod.closeStickyShareModal({
    setStickyShareNoteId: (value) => { stickyShareNoteId = String(value || ""); },
    stickyShareModal
  });
}

function renderStickySharePeopleChecklist(selectedIds = []) {
  const shareModule = window.ProCalModules && window.ProCalModules.notesShare;
  if (!shareModule || typeof shareModule.renderPeopleChecklist !== "function") return;
  shareModule.renderPeopleChecklist({
    container: stickySharePeopleChecklist,
    rows: getShareRecipients(),
    selectedIds,
    resolvePersonShareId,
    getPersonDisplayName
  });
}

function openStickyShareModal(noteId) {
  const mod = window.ProCalModules && window.ProCalModules.notesModalFlow;
  if (!mod || typeof mod.openStickyShareModal !== "function") return;
  mod.openStickyShareModal({
    noteId,
    setStickyShareNoteId: (value) => { stickyShareNoteId = String(value || ""); },
    stickyNotes,
    isStickyOwner,
    stickyShareMode,
    renderStickySharePeopleChecklist,
    getStickyShares,
    stickyShareModal
  });
}

function setStickyShareRecipients(enabled) {
  const shareModule = window.ProCalModules && window.ProCalModules.notesShare;
  if (!shareModule || typeof shareModule.setRecipients !== "function") return;
  shareModule.setRecipients(stickySharePeopleChecklist, enabled);
}

function readStickyShareRecipients() {
  const shareModule = window.ProCalModules && window.ProCalModules.notesShare;
  if (!shareModule || typeof shareModule.readRecipients !== "function") return [];
  return shareModule.readRecipients(stickySharePeopleChecklist);
}

function handleStickyShareSubmit(event) {
  const mod = window.ProCalModules && window.ProCalModules.notesSyncFlow;
  if (!mod || typeof mod.handleShareSubmit !== "function") return;
  mod.handleShareSubmit({
    event,
    readOnly: READ_ONLY,
    stickyNotes,
    stickyShareNoteId,
    isStickyOwner,
    closeStickyShareModal,
    getCurrentUserIdentityIds,
    readStickyShareRecipients,
    isCurrentUserShareId,
    stickyShareMode,
    createStickyNoteId,
    getPersonNameById,
    normalizeHexColor,
    setStickyNoteOffset,
    deleteStickyNoteOffset,
    persistState,
    scheduleStickyNotesPushToShared,
    renderNotesPanel
  });
}

function renderNotesPanel() {
  const renderModule = window.ProCalModules && window.ProCalModules.notesRender;
  if (!renderModule || typeof renderModule.renderPanel !== "function") return;
  renderModule.renderPanel({
    container: stickyNotesList,
    rows: getVisibleStickyNotes(),
    t,
    myIds: getCurrentUserIdentityIds(),
    normalizeHexColor,
    isStickyOwner,
    canEditStickyNote,
    canDeleteStickyNote,
    canMoveStickyNote,
    getStickyNoteOffset,
    getPersonNameById,
    getStickyShares,
    dedupeStrings,
    onEdit: (note) => openStickyNoteForm(note),
    onShare: (note) => openStickyShareModal(note && note.id),
    onDelete: (note) => deleteStickyNote(note && note.id),
    onStartDrag: (event, note) => startStickyDrag(event, note && note.id)
  });
}

function startStickyDrag(event, noteId) {
  const dragModule = window.ProCalModules && window.ProCalModules.notesDrag;
  if (!dragModule || typeof dragModule.startDrag !== "function") return;
  const id = String(noteId || "");
  const note = stickyNotes.find((x) => String(x.id || "") === id);
  dragModule.startDrag(event, note, {
    readOnly: READ_ONLY,
    canMoveStickyNote,
    listEl: stickyNotesList,
    getStickyNoteOffset,
    normalizeNoteOffset,
    setStickyNoteOffset
  });
}

function applyCurrentUserPayload(body, showNotice) {
  const mod = window.ProCalModules && window.ProCalModules.appCurrentUser;
  if (!mod || typeof mod.applyCurrentUserPayload !== "function") return false;
  const changed = mod.applyCurrentUserPayload(body, showNotice, {
    getLastSessionFingerprint: () => lastSessionFingerprint,
    setLastSessionFingerprint: (value) => { lastSessionFingerprint = String(value || ""); },
    buildSessionFingerprint,
    hasGlobalAdminPrivilegesForRole: (role) => {
      const facade = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
      if (!facade || typeof facade.hasGlobalAdminPrivileges !== "function") return false;
      return facade.hasGlobalAdminPrivileges(String(role || ""));
    },
    readStickyLayoutMap,
    commitState: (nextState, nextStickyLayoutById) => {
      currentUserName = String(nextState.currentUserName || "");
      currentUserId = String(nextState.currentUserId || "");
      currentUserViewMode = "tasks";
      currentUserRole = String(nextState.currentUserRole || "");
      currentUserStatus = String(nextState.currentUserStatus || "");
      currentUserDisplayColor = String(nextState.currentUserDisplayColor || "#64748b");
      currentUserCalendarTintOpacity = Number.isFinite(Number(nextState.currentUserCalendarTintOpacity))
        ? Number(nextState.currentUserCalendarTintOpacity)
        : 10;
      currentUserFullName = String(nextState.currentUserFullName || "");
      currentUserWorkplace = String(nextState.currentUserWorkplace || "");
      currentUserJobTitle = String(nextState.currentUserJobTitle || "");
      currentUserFeatureFlags = nextState.currentUserFeatureFlags && typeof nextState.currentUserFeatureFlags === "object"
        ? { ...nextState.currentUserFeatureFlags }
        : {};
      currentUserPermissions = nextState.currentUserPermissions instanceof Set
        ? nextState.currentUserPermissions
        : new Set();
      stickyLayoutById = nextStickyLayoutById || {};
    },
    afterApplyUi: (nextState) => {
      renderCurrentUserLabel();
      renderCurrentCompBalanceLabel();
      renderConnectionStatus();
      applySettingsAccessControls();
      if (myViewModeSelect) myViewModeSelect.value = "tasks";
      applyUserViewMode();
      renderCalendarModeIndicators();
      initChatPolling();
      renderAdminUsersPanel();
      queuePeopleDirectorySync();
    },
    t,
    showSyncToast
  });
  currentUserHostedIdentity = false;
  currentUserPublicPortalUrl = "";
  currentUserProfileIncomplete = Boolean(body && body.profileIncomplete);
  updateProfilePasswordControls();
  if (!currentUserProfileIncomplete) {
    profileCompletionPromptShown = false;
  }
  return changed;
}

async function ensureAccessToken() {
  const mod = window.ProCalModules && window.ProCalModules.appAccessToken;
  if (!mod || typeof mod.ensureAccessToken !== "function") return "";
  return mod.ensureAccessToken({
    storageRef: localStorage,
    fetchRef: fetch,
    isJwtAccessTokenFresh,
    getLocalRefreshPromise: () => accessTokenRefreshPromise,
    setLocalRefreshPromise: (value) => { accessTokenRefreshPromise = value || null; }
  });
}

function parseJwtPayload(token) {
  const mod = window.ProCalModules && window.ProCalModules.authJwt;
  return mod && typeof mod.parseJwtPayload === "function" ? mod.parseJwtPayload(token) : null;
}

function isJwtAccessTokenFresh(token, skewSeconds = 0) {
  const mod = window.ProCalModules && window.ProCalModules.authJwt;
  return mod && typeof mod.isJwtAccessTokenFresh === "function"
    ? mod.isJwtAccessTokenFresh(token, skewSeconds)
    : false;
}
function getUserIdFromToken(token) {
  const mod = window.ProCalModules && window.ProCalModules.authJwt;
  return mod && typeof mod.getUserIdFromToken === "function" ? mod.getUserIdFromToken(token) : "";
}
async function refreshCurrentUserSession(showNotice) {
  const mod = window.ProCalModules && window.ProCalModules.appSessionFacade;
  if (!mod || typeof mod.refreshCurrentUserSession !== "function") return;
  return mod.refreshCurrentUserSession(showNotice, {
    ensureAccessToken,
    fetchRef: fetch,
    applyCurrentUserPayload,
    queueLeaveAbsenceSync,
    refreshCurrentCompBalance,
    scheduleNotificationsRefresh
  });
}
function queueCurrentUserSessionRefresh(showNotice) {
  const mod = window.ProCalModules && window.ProCalModules.appSessionFacade;
  if (!mod || typeof mod.queueCurrentUserSessionRefresh !== "function") return;
  return mod.queueCurrentUserSessionRefresh(showNotice, {
    getTimer: () => currentUserRefreshTimer,
    setTimer: (value) => { currentUserRefreshTimer = value || null; },
    refreshCurrentUserSession
  });
}
function queueAdminUsersRefresh() {
  const mod = window.ProCalModules && window.ProCalModules.appSessionFacade;
  if (!mod || typeof mod.queueAdminUsersRefresh !== "function") return;
  return mod.queueAdminUsersRefresh({
    isAdminRole,
    getTimer: () => adminRealtimeRefreshTimer,
    setTimer: (value) => { adminRealtimeRefreshTimer = value || null; },
    loadAdminUsers
  });
}

function shouldShowExternalSyncToast(payload) {
  const mod = window.ProCalModules && window.ProCalModules.appSessionFacade;
  if (!mod || typeof mod.shouldShowExternalSyncToast !== "function") return false;
  return mod.shouldShowExternalSyncToast(payload, {
    currentUserId
  });
}

function isNewRealtimePayload(payload) {
  const mod = window.ProCalModules && window.ProCalModules.appSessionFacade;
  if (!mod || typeof mod.isNewRealtimePayload !== "function") return true;
  return mod.isNewRealtimePayload(payload, {
    normalizeCalendarMode,
    signatureByMode: lastRealtimeSignatureByMode
  });
}

function hasGlobalAdminPrivileges() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.hasGlobalAdminPrivileges !== "function") return false;
  return mod.hasGlobalAdminPrivileges(currentUserRole);
}

function canUseFeature(featureKey) {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canUseFeature !== "function") return true;
  return mod.canUseFeature(currentUserFeatureFlags, featureKey);
}

function canReadAllReports() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canReadAllReports !== "function") return false;
  return mod.canReadAllReports({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canReadOwnReports() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canReadOwnReports !== "function") return false;
  return mod.canReadOwnReports({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canReadAllCompensations() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canReadAllCompensations !== "function") return false;
  return mod.canReadAllCompensations({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canReadOwnCompensations() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canReadOwnCompensations !== "function") return false;
  return mod.canReadOwnCompensations({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canManageCompensations() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canManageCompensations !== "function") return false;
  return mod.canManageCompensations({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canCompOverviewAccess() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canCompOverviewAccess !== "function") return false;
  return mod.canCompOverviewAccess({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canMediaAccess() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canMediaAccess !== "function") return false;
  return mod.canMediaAccess(currentUserPermissions, currentUserFeatureFlags);
}

function canChatAccess() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canChatAccess !== "function") return false;
  return mod.canChatAccess(currentUserPermissions, currentUserFeatureFlags);
}

function canChatWrite() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canChatWrite !== "function") return false;
  return mod.canChatWrite(currentUserPermissions, currentUserFeatureFlags);
}

function canLeaveAccess() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canLeaveAccess !== "function") return false;
  return mod.canLeaveAccess({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canLeaveSelfAccess() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canLeaveSelfAccess !== "function") return false;
  return mod.canLeaveSelfAccess({ role: currentUserRole, permissions: currentUserPermissions, featureFlags: currentUserFeatureFlags });
}

function canUseFilesModule() {
  return canUseFeature("files");
}

function canUseNotesModule() {
  return canUseFeature("notes");
}

function canUseAdminPanel() {
  return canUseFeature("admin_panel");
}

function closeLeaveQuickModal() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.closeLeaveQuickModal !== "function") return;
  mod.closeLeaveQuickModal({ leaveQuickModal });
}

function toYmdLocalDate(date) {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (mod && typeof mod.toYmdLocalDate === "function") return mod.toYmdLocalDate(date, { toDateKey });
  return toDateKey(date);
}

function formatLeaveQuickMonthLabel(date) {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (mod && typeof mod.formatLeaveQuickMonthLabel === "function") {
    return mod.formatLeaveQuickMonthLabel(date, { getLocale });
  }
  return date.toLocaleDateString(getLocale(), { year: "numeric", month: "long" });
}

function getLeaveTagText(type) {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (mod && typeof mod.getLeaveTagText === "function") return mod.getLeaveTagText(type);
  return "?";
}

function closeLeaveRequestModal() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.closeLeaveRequestModal !== "function") return;
  mod.closeLeaveRequestModal({ leaveRequestModal });
}

async function refreshLeaveQuickModalData() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.refreshLeaveQuickModalData !== "function") return;
  return mod.refreshLeaveQuickModalData({
    currentUserId,
    getLeaveQuickMonth: () => leaveQuickMonth,
    leaveQuickMonthLabel,
    leaveQuickPaidValue,
    leaveQuickStudyValue,
    leaveQuickUnpaidValue,
    leaveQuickSickValue,
    leaveQuickCalendar,
    ensureAccessToken,
    fetchRef: fetch,
    t,
    getLocale,
    toDateKey,
    renderLeaveQuickCalendar
  });
}

function renderLeaveQuickCalendar(records, monthStart, monthEnd) {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickCalendar;
  if (!mod || typeof mod.renderQuickCalendar !== "function") return;
  mod.renderQuickCalendar({
    documentRef: document,
    leaveQuickCalendar,
    records,
    monthStart,
    monthEnd,
    getLocale,
    parseDateKey,
    toDateKey,
    getLeaveTagText,
    currentLang
  });
}

function escapeHtmlText(value) {
  const mod = window.ProCalModules && window.ProCalModules.leaveDocumentTemplate;
  if (mod && typeof mod.escapeHtmlText === "function") return mod.escapeHtmlText(value);
  return String(value == null ? "" : value);
}

function getLeaveTypeLabelForPrint(type) {
  const mod = window.ProCalModules && window.ProCalModules.leaveDocumentTemplate;
  if (mod && typeof mod.getLeaveTypeLabelForPrint === "function") {
    return mod.getLeaveTypeLabelForPrint(type, { t });
  }
  return String(type || "");
}

function formatBgDocumentDate(value) {
  const mod = window.ProCalModules && window.ProCalModules.leaveDocumentTemplate;
  if (mod && typeof mod.formatBgDocumentDate === "function") return mod.formatBgDocumentDate(value);
  return String(value || "");
}

function isWeekendDateKeyForLeaveDoc(dateKey) {
  if (!isDateKey(String(dateKey || ""))) return false;
  const day = parseDateKey(String(dateKey)).getDay();
  return day === 0 || day === 6;
}

async function computeReturnToWorkDateText(record, token) {
  const mod = window.ProCalModules && window.ProCalModules.leaveDocumentTemplate;
  if (!mod || typeof mod.computeReturnToWorkDateText !== "function") return "";
  return mod.computeReturnToWorkDateText(record, token, {
    fetchRef: fetch,
    isDateKey,
    addDaysToKey,
    isDayOffHoliday
  });
}

async function buildLeaveRequestDocumentHtml(record, token) {
  const mod = window.ProCalModules && window.ProCalModules.leaveDocumentTemplate;
  if (!mod || typeof mod.buildLeaveRequestDocumentHtml !== "function") return "";
  return mod.buildLeaveRequestDocumentHtml(record, token, {
    fetchRef: fetch,
    t,
    currentUserName,
    currentUserFullName,
    currentUserRole,
    currentUserJobTitle,
    currentUserWorkplace,
    isDateKey,
    addDaysToKey,
    isDayOffHoliday
  });
}

async function downloadLeaveRequestDocument(record, token) {
  const mod = window.ProCalModules && window.ProCalModules.leaveDocumentTemplate;
  if (!mod || typeof mod.downloadLeaveRequestDocument !== "function") return false;
  return mod.downloadLeaveRequestDocument(record, token, {
    documentRef: document,
    URLRef: URL,
    BlobRef: Blob,
    buildHtml: buildLeaveRequestDocumentHtml
  });
}

async function refreshLeaveRequestSourceYearOptions() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.refreshLeaveRequestSourceYearOptions !== "function") return;
  return mod.refreshLeaveRequestSourceYearOptions({
    leaveRequestSourceYearWrap,
    leaveRequestSourceYear
  });
}

async function openLeaveRequestModal() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.openLeaveRequestModal !== "function") return;
  return mod.openLeaveRequestModal({
    leaveRequestModal,
    leaveRequestType,
    leaveRequestStart,
    leaveRequestEnd,
    leaveRequestNote,
    leaveRequestStatus,
    toDateKey,
    refreshLeaveRequestSourceYearOptions
  });
}

async function submitLeaveRequest() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.submitLeaveRequest !== "function") return;
  return mod.submitLeaveRequest({
    leaveRequestType,
    leaveRequestStart,
    leaveRequestEnd,
    leaveRequestNote,
    leaveRequestStatus,
    currentUserId,
    ensureAccessToken,
    fetchRef: fetch,
    t,
    currentLang,
    downloadLeaveRequestDocument,
    refreshLeaveQuickModalData,
    queueLeaveAbsenceSync
  });
}

async function openLeaveQuickModal() {
  const mod = window.ProCalModules && window.ProCalModules.leaveQuickRequestFlow;
  if (!mod || typeof mod.openLeaveQuickModal !== "function") return;
  return mod.openLeaveQuickModal({
    leaveQuickModal,
    currentUserId,
    canLeaveSelfAccess,
    setLeaveQuickMonth: (value) => { leaveQuickMonth = value; },
    refreshLeaveQuickModalData
  });
}

function getLeaveAbsenceViewKey() {
  if (currentView === "year") {
    return `year:${currentMonth.getFullYear()}`;
  }
  const y = currentMonth.getFullYear();
  const mA = currentMonth.getMonth() + 1;
  const mB = mA === 12 ? 1 : (mA + 1);
  const yB = mA === 12 ? (y + 1) : y;
  return `month:${y}-${String(mA).padStart(2, "0")}:${yB}-${String(mB).padStart(2, "0")}`;
}

function getVisibleLeaveMatrixMonths() {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.getVisibleLeaveMatrixMonths !== "function") return [];
  return mod.getVisibleLeaveMatrixMonths({
    currentView,
    currentMonth
  });
}

function normalizeLeaveNote(leaveType, note) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.normalizeLeaveNote !== "function") return String(note || "");
  return mod.normalizeLeaveNote(leaveType, note, {
    currentLang
  });
}

async function syncLeaveAbsencesForCurrentMonth(force) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.syncLeaveAbsencesForCurrentMonth !== "function") return;
  return mod.syncLeaveAbsencesForCurrentMonth(force, {
    canLeaveAccess,
    getLeaveAbsenceSyncInFlight: () => leaveAbsenceSyncInFlight,
    setLeaveAbsenceSyncInFlight: (value) => { leaveAbsenceSyncInFlight = Boolean(value); },
    getLeaveAbsenceViewKey,
    getLeaveAbsenceLoadedViewKey: () => leaveAbsenceLoadedViewKey,
    setLeaveAbsenceLoadedViewKey: (value) => { leaveAbsenceLoadedViewKey = String(value || ""); },
    ensureAccessToken,
    getVisibleLeaveMatrixMonths,
    fetchRef: fetch,
    isDateKey,
    normalizeLeaveNote,
    getAbsences: () => absences,
    setAbsences: (value) => { absences = Array.isArray(value) ? value : []; },
    refreshEventPeopleAvailability,
    refreshTaskChecklistAvailability,
    selectedDateKey,
    refreshEventTaskChecklistAvailability,
    renderCalendar,
    renderSelectedDayPanel,
    renderUpcomingList
  });
}

function queueLeaveAbsenceSync(force) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.queueLeaveAbsenceSync !== "function") return;
  return mod.queueLeaveAbsenceSync(force, {
    canLeaveAccess,
    getLeaveAbsenceSyncTimer: () => leaveAbsenceSyncTimer,
    setLeaveAbsenceSyncTimer: (value) => { leaveAbsenceSyncTimer = value || null; },
    syncLeaveAbsencesForCurrentMonth
  });
}

function getHolidayVisibleRange() {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.getHolidayVisibleRange !== "function") return { from: "", to: "" };
  return mod.getHolidayVisibleRange({
    currentView,
    currentMonth,
    toDateKey
  });
}

function getHolidayNamesForDate(dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.getHolidayNamesForDate !== "function") return [];
  return mod.getHolidayNamesForDate(dateKey, { holidayMetaByDate });
}

function isDayOffHoliday(dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.isDayOffHoliday !== "function") return false;
  return mod.isDayOffHoliday(dateKey, { holidayMetaByDate });
}

async function syncHolidayDatesForView(force) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.syncHolidayDatesForView !== "function") return;
  return mod.syncHolidayDatesForView(force, {
    getHolidaySyncInFlight: () => holidaySyncInFlight,
    setHolidaySyncInFlight: (value) => { holidaySyncInFlight = Boolean(value); },
    getHolidayVisibleRange,
    getCurrentView: () => currentView,
    getHolidayLoadedViewKey: () => holidayLoadedViewKey,
    setHolidayLoadedViewKey: (value) => { holidayLoadedViewKey = String(value || ""); },
    ensureAccessToken,
    fetchRef: fetch,
    isDateKey,
    getHolidaySignature: () => holidaySignature,
    setHolidaySignature: (value) => { holidaySignature = String(value || ""); },
    setHolidayMetaByDate: (value) => { holidayMetaByDate = value instanceof Map ? value : new Map(); },
    renderCalendar
  });
}

function queueHolidaySync(force) {
  const mod = window.ProCalModules && window.ProCalModules.leaveOverlaySync;
  if (!mod || typeof mod.queueHolidaySync !== "function") return;
  return mod.queueHolidaySync(force, {
    getHolidaySyncTimer: () => holidaySyncTimer,
    setHolidaySyncTimer: (value) => { holidaySyncTimer = value || null; },
    syncHolidayDatesForView
  });
}

function getAllowedCompPeople() {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.getAllowedCompPeople !== "function") return [];
  return peopleOptions.getAllowedCompPeople({
    canCompOverviewAccess: canCompOverviewAccess(),
    currentUserId,
    currentUserName,
    currentUserDisplayColor,
    roster: getOperationalPeople()
  });
}

function getAllowedCompPersonId() {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.getAllowedCompPersonId !== "function") return String(currentUserId || "");
  return peopleOptions.getAllowedCompPersonId({
    selectEl: compPerson,
    currentUserId,
    canCompOverviewAccess: canCompOverviewAccess()
  });
}

function getAllowedReportPeople() {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.getAllowedReportPeople !== "function") return [];
  return peopleOptions.getAllowedReportPeople({
    canReadAllReports: canReadAllReports(),
    currentUserId,
    currentUserName,
    currentUserDisplayColor,
    roster: getOperationalPeople()
  });
}

async function bootstrapCurrentUser() {
  try {
    refreshAndroidShellState();
    const token = await ensureAccessToken();
    if (!token) return;
    const res = await fetch(`/api/me?ts=${Date.now()}`, {
      headers: { authorization: `Bearer ${token}` },
      credentials: "include",
      cache: "no-store"
    });
    if (res.status === 304) {
      maybeRequestAndroidPushPermission();
      await syncAndroidPushRegistration(false);
      handlePushIntentFromUrl();
      return;
    }
    if (!res.ok) return;
    const body = await res.json().catch(() => null);
    if (!body) return;
    const firstLoad = !lastSessionFingerprint;
    applyCurrentUserPayload(body, !firstLoad);
    restoreUiPrefs();
    if (!canUseNotesModule() && currentMainPanel === "notes") {
      setMainPanel("calendar", false);
    }
    renderFilters();
    renderCalendar();
    renderSelectedDayPanel();
    renderUpcomingList();
    await refreshCurrentCompBalance();
    await refreshNotificationUnreadCount();
    await refreshChatUnreadCount();
    maybePromptProfileCompletion();
    maybeRequestAndroidPushPermission();
    await syncAndroidPushRegistration(false);
    handlePushIntentFromUrl();
  } catch {
    // ignore user badge failure
  }
}
function applyUserViewMode() {
  currentUserViewMode = "tasks";
  const simple = false;
  const tasksEnabled = canUseFeature("tasks");
  const notesEnabled = canUseNotesModule();
  const filesEnabled = canUseFilesModule();
  const adminPanelEnabled = canUseAdminPanel();

  if (myViewModeSelect) myViewModeSelect.value = "tasks";
  if (openTaskFormBtn) openTaskFormBtn.style.display = (simple || !tasksEnabled) ? "none" : "";
  if (toggleEventTasksBtn) toggleEventTasksBtn.style.display = (simple || !tasksEnabled) ? "none" : "";
  if (sideAddTaskBtn) sideAddTaskBtn.style.display = tasksEnabled ? "" : "none";
  if (eventPreviewAddTaskBtn) eventPreviewAddTaskBtn.style.display = tasksEnabled ? "" : "none";
  if (reportsBtn) reportsBtn.style.display = (simple || !canReadOwnReports()) ? "none" : "";
  if (mediaMonitoringBtn) mediaMonitoringBtn.style.display = canMediaAccess() ? "" : "none";
  if (chatBtn) chatBtn.style.display = canChatAccess() ? "" : "none";
  if (!canChatAccess()) closeChatModal();
  if (filesBtn) {
    filesBtn.style.display = filesEnabled ? "" : "none";
    filesBtn.disabled = !filesEnabled;
  }
  if (chatFilesBtn) chatFilesBtn.style.display = filesEnabled ? "" : "none";
  if (chatSendBtn) chatSendBtn.style.display = canChatWrite() ? "" : "none";
  if (chatInput) chatInput.disabled = !canChatWrite();
  if (leaveBtn) leaveBtn.style.display = canLeaveAccess() ? "" : "none";
  if (currentUserLeaveBtn) currentUserLeaveBtn.style.display = canLeaveSelfAccess() ? "" : "none";
  if (compensationBtn) compensationBtn.style.display = canCompOverviewAccess() ? "" : "none";
  if (!canCompOverviewAccess()) closeCompensationMenu();
  if (!tasksEnabled && eventTasksEditorWrap) eventTasksEditorWrap.classList.add("hidden-section");
  if (!tasksEnabled && taskFormSection) taskFormSection.classList.add("hidden-section");
  if (sideAddAbsenceBtn) sideAddAbsenceBtn.style.display = canLeaveAccess() ? "" : "none";
  if (sideAddCompBtn) sideAddCompBtn.style.display = canCompOverviewAccess() ? "" : "none";
  if (notesToggleBtn) notesToggleBtn.style.display = notesEnabled ? "" : "none";
  if (!notesEnabled && currentMainPanel === "notes") setMainPanel("calendar", false);
  if (eventPreviewFilesBtn) eventPreviewFilesBtn.style.display = filesEnabled ? "" : "none";
  if (eventPreviewProgramBtn) eventPreviewProgramBtn.style.display = filesEnabled ? "" : "none";
  if (eventProgramInput) eventProgramInput.disabled = !filesEnabled;
  if (openEventProgramModalBtn) openEventProgramModalBtn.style.display = filesEnabled ? "" : "none";
  if (eventProgramPreviewBtn) eventProgramPreviewBtn.style.display = filesEnabled ? "" : "none";
  if (eventProgramClearBtn) eventProgramClearBtn.style.display = filesEnabled ? "" : "none";
  if (eventFormFilesTabBtn) eventFormFilesTabBtn.style.display = filesEnabled ? "" : "none";
  if (!filesEnabled) setEventFormTab("details");
  if (!filesEnabled) closeModalElement(eventProgramModal);
  if (!filesEnabled) closeFilesModal();
  if (menuAdminBtn) {
    const showAdminButton = hasGlobalAdminPrivileges() && adminPanelEnabled;
    menuAdminBtn.style.display = showAdminButton ? "" : "none";
    menuAdminBtn.disabled = !showAdminButton;
  }
  renderCurrentCompBalanceLabel();

  if (simple) {
    taskFormSection.classList.add("hidden-section");
    eventTasksEditorWrap.classList.add("hidden-section");
    if (reportsMenu) reportsMenu.classList.add("hidden");
    if (compensationMenu) compensationMenu.classList.add("hidden");
  }

  applyCalendarModePermissions();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
}

function isTaskViewEnabled() {
  return true;
}

function isSharedUserTaskOnlyMode() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.isSharedUserTaskOnlyMode !== "function") return false;
  return mod.isSharedUserTaskOnlyMode({
    calendarMode: currentCalendarMode,
    role: currentUserRole,
    permissions: currentUserPermissions
  });
}

function currentUserHasPermission(permissionKey) {
  const key = String(permissionKey || "").trim();
  if (!key || !(currentUserPermissions instanceof Set)) return false;
  return currentUserPermissions.has("*") || currentUserPermissions.has(key);
}

function canCreateEventsInCurrentCalendar() {
  if (isPersonalCalendarMode()) return true;
  return currentUserHasPermission("events.create");
}

function canCreateTasksInCurrentCalendar() {
  if (isPersonalCalendarMode()) return true;
  return currentUserHasPermission("tasks.create");
}

function canOpenEventCreateInCurrentCalendar() {
  return canManageEventAndAbsenceChanges() && canCreateEventsInCurrentCalendar();
}

function canOpenTaskCreateInCurrentCalendar() {
  return !READ_ONLY && isTaskViewEnabled() && canCreateTasksInCurrentCalendar();
}

function canManageEventAndAbsenceChanges() {
  const mod = window.ProCalModules && window.ProCalModules.appPermissionsFacade;
  if (!mod || typeof mod.canManageEventAndAbsenceChanges !== "function") return false;
  return mod.canManageEventAndAbsenceChanges({
    readOnly: READ_ONLY,
    calendarMode: currentCalendarMode,
    role: currentUserRole,
    permissions: currentUserPermissions
  });
}

function updateSideDayQuickAddVisibility() {
  const mod = window.ProCalModules && window.ProCalModules.calendarModePermissions;
  if (!mod || typeof mod.updateSideDayQuickAddVisibility !== "function") return;
  mod.updateSideDayQuickAddVisibility({
    canQuickAddEvent: canOpenEventCreateInCurrentCalendar(),
    canQuickAddTask: canOpenTaskCreateInCurrentCalendar(),
    canQuickAddComp: canCompOverviewAccess(),
    sideAddEventBtn,
    sideAddTaskBtn,
    sideAddCompBtn,
    sideDayQuickAdd,
    toggleSideDayQuickAdd
  });
}

function applyCalendarModePermissions() {
  const mod = window.ProCalModules && window.ProCalModules.calendarModePermissions;
  if (!mod || typeof mod.applyCalendarModePermissions !== "function") return;
  mod.applyCalendarModePermissions({
    restrict: isSharedUserTaskOnlyMode(),
    restrictSharedEventCreate: !canCreateEventsInCurrentCalendar(),
    restrictSharedTaskCreate: !canCreateTasksInCurrentCalendar(),
    taskViewEnabled: isTaskViewEnabled(),
    legacyAbsenceEditEnabled: LEGACY_ABSENCE_EDIT_ENABLED,
    openEventFormBtn,
    openTaskFormBtn,
    addEventBtn,
    openAbsenceFormBtn,
    sideAddAbsenceBtn,
    sideAddEventBtn,
    sideAddTaskBtn,
    sideAddCompBtn,
    sideDayQuickAdd,
    eventFormSection,
    absenceFormSection,
    updateSideDayQuickAddVisibility
  });
}
function updateEventTasksToggleLabel() {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.updateEventTasksToggleLabel !== "function") return;
  mod.updateEventTasksToggleLabel({
    toggleEventTasksBtn,
    eventTasksEditorWrap,
    t
  });
}

function startEventCreateMode(baseDateKey) {
  const flow = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  const previewMod = window.ProCalModules && window.ProCalModules.eventsFormPreview;
  if (!flow || typeof flow.startEventCreateMode !== "function") return;
  flow.startEventCreateMode({
    baseDateKey,
    selectedDateKey,
    todayKey,
    setEditingEventSeriesId: (value) => { editingEventSeriesId = value == null ? null : String(value); },
    prepareCreateForm: previewMod && typeof previewMod.prepareCreateForm === "function"
      ? (opts) => previewMod.prepareCreateForm(opts)
      : null,
    eventForm,
    eventAllDay,
    eventTimeInput: eventTime,
    eventTimeEndInput: eventTimeEnd,
    eventStart,
    eventEnd,
    repeatFreq,
    repeatEndMode,
    repeatCount,
    repeatUntil,
    eventCategory,
    categories,
    eventTasksEditorWrap,
    clearPeopleChecks,
    setDraftEventTasks: (tasks) => { draftEventTasks = Array.isArray(tasks) ? tasks : []; },
    renderEventDraftTaskList,
    updateRepeatVisibility,
    renderAbsentOptionsForRange,
    applyTranslations
  });
  resetEventProgramState({ closeModal: true, clearExisting: true });
  applyEventFilesFormState({ filesFolderEnabled: true, filesDetached: false });
  applyEventReminderFormState({ enabled: false, offsetMinutes: 15, allDayTime: "09:00", repeatMode: "each_occurrence", recipientScope: "participants_tasks" });
  setEventFormTab("details");
  syncEventEndDateWithStartDate();
  syncEventTimeInputState();
}

function startEventEditMode(seriesId) {
  const flow = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  const previewMod = window.ProCalModules && window.ProCalModules.eventsFormPreview;
  if (!flow || typeof flow.startEventEditMode !== "function") return false;
  const opened = flow.startEventEditMode({
    seriesId,
    findBaseEventById,
    setEditingEventSeriesId: (value) => { editingEventSeriesId = value == null ? null : String(value); },
    prepareEditForm: previewMod && typeof previewMod.prepareEditForm === "function"
      ? (opts) => previewMod.prepareEditForm(opts)
      : null,
    eventForm,
    eventAllDay,
    eventTimeInput: eventTime,
    eventTimeEndInput: eventTimeEnd,
    eventStart,
    eventEnd,
    eventDescription,
    eventCategory,
    categories,
    repeatFreq,
    repeatEndMode,
    repeatCount,
    repeatUntil,
    eventPeopleChecklist,
    eventAbsent,
    eventTasksEditorWrap,
    eventTitleInput,
    updateRepeatVisibility,
    renderAbsentOptionsForRange,
    refreshEventPeopleAvailability,
    setDraftEventTasks: (tasks) => { draftEventTasks = Array.isArray(tasks) ? tasks : []; },
    renderEventDraftTaskList,
    applyTranslations
  });
  if (!opened) return false;
  resetEventProgramState({ closeModal: true, clearExisting: false });
  applyEventFilesFormState(findBaseEventById(editingEventSeriesId));
  applyEventReminderFormState(findBaseEventById(editingEventSeriesId)?.reminders);
  setEventFormTab("details");
  void loadEventProgramForEvent(editingEventSeriesId, { silent: true });
  syncEventEndDateWithStartDate();
  syncEventTimeInputState();
  return true;
}


function startAbsenceCreateMode(baseDateKey) {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.startAbsenceCreateMode !== "function") return;
  mod.startAbsenceCreateMode({
    legacyAbsenceEditEnabled: LEGACY_ABSENCE_EDIT_ENABLED,
    setEditingAbsenceId: (value) => { editingAbsenceId = value == null ? null : String(value); },
    absenceFormSection,
    absenceForm,
    baseDateKey,
    selectedDateKey,
    todayKey,
    absenceStart,
    absenceEnd,
    applyTranslations
  });
}

function startAbsenceEditMode(absenceId) {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.startAbsenceEditMode !== "function") return false;
  return mod.startAbsenceEditMode({
    absenceId,
    legacyAbsenceEditEnabled: LEGACY_ABSENCE_EDIT_ENABLED,
    absences,
    setEditingAbsenceId: (value) => { editingAbsenceId = value == null ? null : String(value); },
    absencePerson,
    absenceStart,
    absenceEnd,
    absenceNote,
    applyTranslations,
    openDayMenu,
    hideDayActionChoices,
    setDayMenuSectionMode,
    selectedDateKey
  });
}

function updateRepeatVisibility() {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.updateRepeatVisibility !== "function") return;
  mod.updateRepeatVisibility({
    repeatFreq,
    repeatEndMode,
    repeatCountWrap,
    repeatUntilWrap,
    syncRepeatUntilMin
  });
}

function syncRepeatUntilMin() {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.syncRepeatUntilMin !== "function") return;
  mod.syncRepeatUntilMin({
    eventStart,
    repeatUntil,
    isDateKey
  });
}

function buildRecurrenceRule(freq, endMode, count, untilDate, baseStartDate) {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.buildRecurrenceRule !== "function") return null;
  return mod.buildRecurrenceRule({
    freq,
    endMode,
    count,
    untilDate,
    baseStartDate,
    isDateKey
  });
}

function openDayMenu(dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.openDayMenu !== "function") return;
  mod.openDayMenu({
    nowTs: Date.now(),
    suppressDayMenuOpenUntil,
    dateKey,
    selectedDateKey,
    todayKey,
    setSelectedDateKey: (value) => { selectedDateKey = String(value || ""); },
    closeEventPreview,
    selectedDateTitle,
    parseDateKey,
    getLocale,
    startEventCreateMode,
    categories,
    eventCategory,
    renderAbsentOptionsForRange,
    absenceStart,
    absenceEnd,
    setDayMenuSectionMode: (mode) => setDayMenuSectionMode(mode),
    refreshTaskChecklistAvailability,
    renderStandaloneTaskList,
    showDayActionChoices,
    renderSelectedDayPanel,
    dayMenu
  });
}

function setDayMenuSectionMode(mode) {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.setDayMenuSectionMode !== "function") return;
  mod.setDayMenuSectionMode({
    mode,
    eventFormSection,
    absenceFormSection,
    taskFormSection,
    eventListWrap,
    onTaskMode: () => refreshTaskChecklistAvailability(selectedDateKey),
    onEventMode: () => {
      refreshEventPeopleAvailability();
      refreshEventTaskChecklistAvailability();
    }
  });
}

function closeDayMenu() {
  closeModalElement(eventProgramModal);
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ panel: dayMenu });
}

function hideDayActionChoices() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.hideDayActionChoices !== "function") return;
  mod.hideDayActionChoices({ dayActionButtons });
}

function showDayActionChoices() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.showDayActionChoices !== "function") return;
  mod.showDayActionChoices({
    dayActionButtons,
    applyCalendarModePermissions,
    renderCalendar,
    renderSelectedDayPanel,
    renderUpcomingList
  });
}

function openPeopleMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.openMenu !== "function") return;
  mod.openMenu({ panel: peopleMenu });
}

function closePeopleMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ panel: peopleMenu });
}

function openSettingsMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.openMenu !== "function") return;
  mod.openMenu({
    panel: settingsMenu,
    beforeOpen: () => {
      applySettingsAccessControls();
      positionSettingsMenu();
    },
    afterOpen: renderAdminUsersPanel
  });
}

function closeSettingsMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ panel: settingsMenu });
}

function positionSettingsMenu() {
  if (!settingsMenu) return;
  const card = settingsMenu.querySelector(".modal-card");
  if (!card || !settingsBtn) return;
  const triggerRect = settingsBtn.getBoundingClientRect();
  const cardWidth = Math.min(320, Math.max(260, window.innerWidth - 24));
  const gap = 8;
  let left = triggerRect.right - cardWidth;
  if (left < 12) left = 12;
  if (left + cardWidth > window.innerWidth - 12) left = window.innerWidth - cardWidth - 12;
  let top = triggerRect.bottom + gap;
  const maxTop = window.innerHeight - 84;
  if (top > maxTop) top = maxTop;
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}

function renderProfileSummary() {
  if (profileNicknameValue) profileNicknameValue.textContent = currentUserName || "-";
  if (profileRoleValue) profileRoleValue.textContent = currentUserRole || "-";
  if (profileStatusValue) profileStatusValue.textContent = currentUserStatus || "-";
  if (profileFullNameValue) profileFullNameValue.textContent = currentUserFullName || "-";
  if (profileWorkplaceValue) profileWorkplaceValue.textContent = currentUserWorkplace || "-";
  if (profileJobTitleValue) profileJobTitleValue.textContent = currentUserJobTitle || "-";
}

function syncProfileInputs() {
  if (profileNicknameInput) profileNicknameInput.value = currentUserName || "";
  if (profileFullNameInput) profileFullNameInput.value = currentUserFullName || "";
  if (profileWorkplaceInput) profileWorkplaceInput.value = currentUserWorkplace || "";
  if (profileJobTitleInput) profileJobTitleInput.value = currentUserJobTitle || "";
}

function applyProfileUpdateLocally(payload) {
  if (!payload || typeof payload !== "object") return;
  currentUserName = String(payload.nickname || payload.username || currentUserName || "");
  currentUserFullName = String(payload.fullName || "");
  currentUserWorkplace = String(payload.workplace || "");
  currentUserJobTitle = String(payload.jobTitle || "");
  renderProfileSummary();
  syncProfileInputs();
}

function maybePromptProfileCompletion() {
  if (!currentUserHostedIdentity || !currentUserProfileIncomplete || profileCompletionPromptShown) return;
  profileCompletionPromptShown = true;
  openProfileModal({
    message: "Complete your profile to finish entering this realm.",
    focusFirstField: true
  });
}

function openProfileModal(options) {
  const o = options || {};
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.openMenu !== "function") return;
  mod.openMenu({
    panel: profileModal,
    beforeOpen: () => {
      renderProfileSummary();
      syncProfileInputs();
      updateProfilePasswordControls();
      setMenuMessage(String(o.message || ""), false);
      if (o.focusFirstField && profileNicknameInput) {
        window.setTimeout(() => {
          try { profileNicknameInput.focus(); } catch {}
        }, 30);
      }
    }
  });
}

function closeProfileModal() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ panel: profileModal });
}

function openFiltersMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.openMenu !== "function") return;
  mod.openMenu({ panel: filtersMenu });
}

function closeFiltersMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ panel: filtersMenu });
}

function setUpcomingCollapsed(next) {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.setUpcomingCollapsed !== "function") return;
  mod.setUpcomingCollapsed({
    next,
    setValue: (value) => { upcomingCollapsed = Boolean(value); },
    layoutEl,
    upcomingPanel,
    storageRef: localStorage,
    storageKey: UPCOMING_COLLAPSED_KEY,
    updateUpcomingToggleUI
  });
}

function updateUpcomingToggleUI() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.updateUpcomingToggleUI !== "function") return;
  mod.updateUpcomingToggleUI({
    toggleUpcomingBtn,
    upcomingCollapsed
  });
}

function openCategoriesMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.openMenu !== "function") return;
  mod.openMenu({ panel: categoriesMenu });
}

function closeCategoriesMenu() {
  const mod = window.ProCalModules && window.ProCalModules.uiMenus;
  if (!mod || typeof mod.closeMenu !== "function") return;
  mod.closeMenu({ panel: categoriesMenu });
}

function renderUpcomingList() {
  const calendarViews = window.ProCalModules && window.ProCalModules.calendarViews;
  if (calendarViews && typeof calendarViews.renderUpcomingList === "function") {
    const rendered = calendarViews.renderUpcomingList({
      collectUpcomingRows,
      isTaskViewEnabled,
      upcomingList,
      t,
      buildPeopleMap,
      tasksByDate,
      toggleStandaloneTaskDone,
      getTaskAssigneeNames,
      categories,
      getCategoryById,
      getCategoryBgColor,
      todayKey,
      getEventsForDate,
      matchesEventFilters,
      setSelectedDateKey: (key) => { selectedDateKey = key; },
      renderCalendar,
      renderSelectedDayPanel,
      openEventPreview,
      openDayMenu,
      currentLang
    });
    if (rendered) return;
  }
  const mod = window.ProCalModules && window.ProCalModules.upcomingListUi;
  if (!mod || typeof mod.renderList !== "function") return;
  mod.renderList({
    documentRef: document,
    collectUpcomingRows,
    isTaskViewEnabled,
    upcomingList,
    t,
    buildPeopleMap,
    tasksByDate,
    toggleStandaloneTaskDone,
    getTaskAssigneeNames,
    categories,
    getCategoryById,
    getCategoryBgColor,
    todayKey,
    getEventsForDate,
    matchesEventFilters,
    setSelectedDateKey: (key) => { selectedDateKey = key; },
    renderCalendar,
    renderSelectedDayPanel,
    openEventPreview,
    openDayMenu,
    currentLang,
    getPersonDisplayName,
    getOperationalPeople
  });
}

function renderCalendar() {
  const calendarViews = window.ProCalModules && window.ProCalModules.calendarViews;
  if (!calendarViews || typeof calendarViews.renderCalendar !== "function") return;
  calendarViews.renderCalendar({
    calendarGrid,
    weekdayRow,
    updateViewButtons,
    currentView,
    renderYearCalendar,
    renderTwoMonthCalendar
  });
  queueLeaveAbsenceSync(false);
  queueHolidaySync(false);
  if (currentMainPanel === "events") renderEventsRegistry();
}

function collectEventRegistryRows() {
  const rows = [];
  const seen = new Set();
  Object.entries(eventsByDate || {}).forEach(([storageDateKey, events]) => {
    if (!Array.isArray(events)) return;
    events.forEach((evt, index) => {
      if (!evt || typeof evt !== "object") return;
      const eventId = String(evt.seriesId || evt.id || "");
      const fallbackKey = `${storageDateKey}:${index}`;
      const rowKey = eventId || fallbackKey;
      if (seen.has(rowKey)) return;
      seen.add(rowKey);
      const startDate = String(evt.startDate || storageDateKey || "");
      const endDate = String(evt.endDate || startDate || "");
      rows.push({
        key: rowKey,
        storageDateKey,
        event: {
          ...evt,
          startDate,
          endDate,
          seriesId: eventId || rowKey
        }
      });
    });
  });
  rows.sort((a, b) => {
    const aDate = String((a.event && a.event.startDate) || "");
    const bDate = String((b.event && b.event.startDate) || "");
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return sortEvents(a.event, b.event);
  });
  return rows;
}

function formatEventRegistryDate(evt) {
  const startDate = String((evt && evt.startDate) || "");
  const endDate = String((evt && evt.endDate) || startDate || "");
  const startLabel = formatDateKeyShort(startDate);
  if (!endDate || endDate === startDate) return startLabel;
  return `${startLabel} ${t("to")} ${formatDateKeyShort(endDate)}`;
}

function formatDateKeyShort(dateKey) {
  if (!isDateKey(dateKey)) return String(dateKey || "-");
  const date = parseDateKey(dateKey);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return String(dateKey || "-");
  return date.toLocaleDateString(getLocale(), { year: "numeric", month: "short", day: "numeric" });
}

function getEventRegistrySearchBlob(row) {
  const evt = row && row.event ? row.event : {};
  const category = getCategoryById(evt.categoryId);
  return [
    evt.title,
    evt.description,
    evt.startDate,
    evt.endDate,
    getEventTimeRangeLabel(evt),
    category && category.name,
    describeEventPeople(evt)
  ].filter(Boolean).join(" ").toLowerCase();
}

function openEventsExportMenu() {
  if (!eventsExportMenu) return;
  renderEventsRegistry();
  eventsExportMenu.classList.remove("hidden");
  eventsExportMenu.setAttribute("aria-hidden", "false");
}

function closeEventsExportMenu() {
  if (!eventsExportMenu) return;
  eventsExportMenu.classList.add("hidden");
  eventsExportMenu.setAttribute("aria-hidden", "true");
}

function eventMatchesRegistryPeriod(row) {
  const evt = row && row.event ? row.event : {};
  const startDate = String(evt.startDate || "");
  const endDate = String(evt.endDate || startDate || "");
  const rawFrom = isDateKey(eventsRegistryFromDate) ? eventsRegistryFromDate : "";
  const rawTo = isDateKey(eventsRegistryToDate) ? eventsRegistryToDate : "";
  const from = rawFrom && rawTo && rawFrom > rawTo ? rawTo : rawFrom;
  const to = rawFrom && rawTo && rawFrom > rawTo ? rawFrom : rawTo;
  if (from && endDate && endDate < from) return false;
  if (to && startDate && startDate > to) return false;
  return true;
}

function getEventRegistryColumnDefs() {
  return [
    { key: "date", label: t("date") },
    { key: "time", label: t("time") },
    { key: "title", label: t("title") },
    { key: "category", label: t("category") },
    { key: "people", label: t("peopleParticipants") }
  ];
}

function getEventRegistryCellText(row, columnKey) {
  const evt = row && row.event ? row.event : {};
  const category = getCategoryById(evt.categoryId);
  switch (columnKey) {
    case "date":
      return formatEventRegistryDate(evt);
    case "time":
      return getEventTimeRangeLabel(evt) || t("anyTime");
    case "title":
      return evt.title || t("untitledEvent");
    case "category":
      return category && category.name ? category.name : t("unknown");
    case "people":
      return describeEventPeople(evt) || "-";
    default:
      return "";
  }
}

function renderEventRegistryCell(row, columnKey) {
  const evt = row && row.event ? row.event : {};
  if (columnKey === "title") {
    return `
      <strong>${escapeHtml(getEventRegistryCellText(row, columnKey))}</strong>
      ${evt.description ? `<span class="events-registry-description">${escapeHtml(evt.description)}</span>` : ""}
    `;
  }
  if (columnKey === "category") {
    const category = getCategoryById(evt.categoryId);
    const categoryColor = category && category.color ? category.color : "#64748b";
    return `
      <span class="events-registry-category">
        <span class="events-registry-category-dot" style="background:${escapeHtml(categoryColor)}"></span>
        ${escapeHtml(getEventRegistryCellText(row, columnKey))}
      </span>
    `;
  }
  return escapeHtml(getEventRegistryCellText(row, columnKey));
}

function renderEventsRegistryStats(rows) {
  if (!eventsStatsSummary || !eventsStatsList) return;
  const list = Array.isArray(rows) ? rows : [];
  const counts = new Map();
  list.forEach((row) => {
    const evt = row && row.event ? row.event : {};
    const category = getCategoryById(evt.categoryId);
    const key = category && category.id ? category.id : "__unknown";
    const existing = counts.get(key) || {
      name: category && category.name ? category.name : t("unknown"),
      color: category && category.color ? category.color : "#64748b",
      count: 0
    };
    existing.count += 1;
    counts.set(key, existing);
  });

  const stats = Array.from(counts.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return String(a.name || "").localeCompare(String(b.name || ""), getLocale(), { sensitivity: "base" });
  });

  eventsStatsSummary.textContent = stats.length
    ? t("eventsStatsSummary")
      .replace("{count}", String(list.length))
      .replace("{categories}", String(stats.length))
    : t("eventsStatsEmpty");

  eventsStatsList.innerHTML = stats.map((item) => `
    <span class="events-stat-pill" title="${escapeHtml(t("eventsCategoryStat").replace("{count}", String(item.count)).replace("{category}", item.name))}">
      <span class="events-registry-category-dot" style="background:${escapeHtml(item.color)}"></span>
      <strong>${escapeHtml(String(item.count))}</strong>
      <span>${escapeHtml(item.name)}</span>
    </span>
  `).join("");
}

function renderEventsRegistry() {
  if (!eventsRegistryBody) return;
  const query = String(eventsRegistrySearch || "").trim().toLowerCase();
  const allRows = collectEventRegistryRows();
  const periodRows = allRows.filter(eventMatchesRegistryPeriod);
  eventsRegistryRows = query
    ? periodRows.filter((row) => getEventRegistrySearchBlob(row).includes(query))
    : periodRows;

  const visibleColumns = getEventRegistryColumnDefs().filter((column) => eventsRegistryColumns.has(column.key));
  if (eventsRegistryHeadRow) {
    eventsRegistryHeadRow.innerHTML = `
      ${visibleColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
      <th>${escapeHtml(t("actions"))}</th>
    `;
  }

  eventsRegistryBody.innerHTML = eventsRegistryRows.map((row) => {
    return `
      <tr class="events-registry-row" data-events-registry-row="${escapeHtml(row.key)}">
        ${visibleColumns.map((column) => `<td>${renderEventRegistryCell(row, column.key)}</td>`).join("")}
        <td>
          <button class="ghost-btn events-registry-open-btn" type="button" data-events-registry-open="${escapeHtml(row.key)}">${escapeHtml(t("openEvent"))}</button>
        </td>
      </tr>
    `;
  }).join("");

  if (eventsRegistryCount) {
    const template = t("eventsRegistryCount");
    eventsRegistryCount.textContent = template
      .replace("{count}", String(eventsRegistryRows.length))
      .replace("{total}", String(periodRows.length));
  }
  renderEventsRegistryStats(eventsRegistryRows);
  if (eventsRegistryEmpty) {
    eventsRegistryEmpty.classList.toggle("hidden-section", eventsRegistryRows.length > 0);
    eventsRegistryEmpty.textContent = query ? t("eventsRegistryNoResults") : t("noEvents");
  }
}

function exportEventsRegistryCsv() {
  renderEventsRegistry();
  const columns = getEventRegistryColumnDefs().filter((column) => eventsRegistryColumns.has(column.key));
  const csvRows = [
    columns.map((column) => column.label),
    ...eventsRegistryRows.map((row) => columns.map((column) => getEventRegistryCellText(row, column.key)))
  ];
  const csv = csvRows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fromPart = eventsRegistryFromDate || "all";
  const toPart = eventsRegistryToDate || "all";
  link.href = url;
  link.download = `procal-events-${fromPart}-${toPart}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportEventsRegistryPdf() {
  renderEventsRegistry();
  const columns = getEventRegistryColumnDefs().filter((column) => eventsRegistryColumns.has(column.key));
  const title = t("eventsTitle");
  const periodText = getEventsRegistryPeriodText();
  const searchText = String(eventsRegistrySearch || "").trim();
  const stats = buildEventsRegistryStats(eventsRegistryRows);
  const headHtml = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const rowHtml = eventsRegistryRows.map((row) => `
    <tr>
      ${columns.map((column) => `<td>${escapeHtml(getEventRegistryCellText(row, column.key))}</td>`).join("")}
    </tr>
  `).join("");
  const statsHtml = stats.length
    ? stats.map((item) => `
      <li>${escapeHtml(t("eventsCategoryStat")
        .replace("{count}", String(item.count))
        .replace("{category}", item.name))}</li>
    `).join("")
    : `<li>${escapeHtml(t("eventsStatsEmpty"))}</li>`;

  const popup = window.open("", "_blank", "width=1024,height=768");
  if (!popup) return;
  popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  .meta { margin: 0 0 16px; color: #374151; font-size: 13px; line-height: 1.45; }
  .stats { margin: 0 0 16px; padding: 12px; background: #f3f6f8; border: 1px solid #d6dde5; border-radius: 8px; }
  .stats h2 { margin: 0 0 8px; font-size: 15px; }
  .stats ul { margin: 0; padding-left: 18px; columns: 2; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #d6dde5; padding: 7px 8px; text-align: left; vertical-align: top; }
  th { background: #eef2f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { margin: 12mm; } .stats ul { columns: 2; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">
    ${escapeHtml(periodText)}
    ${searchText ? `<br>${escapeHtml(t("eventsSearchLabel"))}: ${escapeHtml(searchText)}` : ""}
    <br>${escapeHtml(t("eventsStatsSummary").replace("{count}", String(eventsRegistryRows.length)).replace("{categories}", String(stats.length)))}
  </p>
  <section class="stats">
    <h2>${escapeHtml(t("eventsStatsTitle"))}</h2>
    <ul>${statsHtml}</ul>
  </section>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${rowHtml || `<tr><td colspan="${Math.max(columns.length, 1)}">${escapeHtml(t("noEvents"))}</td></tr>`}</tbody>
  </table>
</body>
</html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function getEventsRegistryPeriodText() {
  const from = eventsRegistryFromDate || "-";
  const to = eventsRegistryToDate || "-";
  if (!eventsRegistryFromDate && !eventsRegistryToDate) return `${t("eventsFromLabel")}: - | ${t("eventsToLabel")}: -`;
  return `${t("eventsFromLabel")}: ${from} | ${t("eventsToLabel")}: ${to}`;
}

function buildEventsRegistryStats(rows) {
  const counts = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const evt = row && row.event ? row.event : {};
    const category = getCategoryById(evt.categoryId);
    const key = category && category.id ? category.id : "__unknown";
    const existing = counts.get(key) || {
      name: category && category.name ? category.name : t("unknown"),
      color: category && category.color ? category.color : "#64748b",
      count: 0
    };
    existing.count += 1;
    counts.set(key, existing);
  });
  return Array.from(counts.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return String(a.name || "").localeCompare(String(b.name || ""), getLocale(), { sensitivity: "base" });
  });
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function openEventFromRegistry(rowKey) {
  const key = String(rowKey || "");
  let row = eventsRegistryRows.find((item) => item.key === key);
  if (!row) row = collectEventRegistryRows().find((item) => item.key === key);
  if (!row || !row.event) return;
  const dateKey = isDateKey(row.event.startDate) ? row.event.startDate : selectedDateKey || todayKey;
  selectedDateKey = dateKey;
  if (isDateKey(dateKey)) {
    const date = parseDateKey(dateKey);
    currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  setMainPanel("calendar");
  renderCalendar();
  renderSelectedDayPanel();
  openEventPreview(row.event, dateKey);
}

function updateViewButtons() {
  const mod = window.ProCalModules && window.ProCalModules.calendarMonthGrid;
  if (!mod || typeof mod.updateViewButtons !== "function") return;
  mod.updateViewButtons({
    currentView,
    monthViewBtn,
    yearViewBtn
  });
  if (yearViewBtn) {
    yearViewBtn.style.display = "none";
    yearViewBtn.setAttribute("aria-hidden", "true");
    yearViewBtn.tabIndex = -1;
  }
  if (monthViewBtn) {
    const nextViewLabel = currentView === "year" ? t("monthView") : t("yearView");
    monthViewBtn.textContent = nextViewLabel;
    monthViewBtn.classList.remove("active");
    monthViewBtn.setAttribute("aria-pressed", "false");
    monthViewBtn.title = currentView === "year" ? t("switchToMonthView") : t("switchToYearView");
    monthViewBtn.setAttribute("aria-label", monthViewBtn.title);
  }
}

function renderTwoMonthCalendar() {
  const mod = window.ProCalModules && window.ProCalModules.calendarMonthGrid;
  if (!mod || typeof mod.renderTwoMonthCalendar !== "function") return;
  mod.renderTwoMonthCalendar({
    documentRef: document,
    calendarGrid,
    monthLabel,
    currentMonth,
    singleMonth: isMobileViewport(),
    getLocale,
    renderMonthBlock
  });
}

function renderMonthBlock(monthDate) {
  const mod = window.ProCalModules && window.ProCalModules.calendarMonthGrid;
  if (!mod || typeof mod.renderMonthBlock !== "function") return document.createElement("section");
  return mod.renderMonthBlock({
    documentRef: document,
    monthDate,
    getLocale,
    buildPeopleMap,
    buildEventLaneMap,
    toDateKey,
    createDetailedDayCell
  });
}

function createDetailedDayCell(cellDate, key, inCurrentMonth, peopleMap, laneMap, visibleLanes) {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayCell;
  if (!mod || typeof mod.createDetailedDayCell !== "function") {
    return document.createElement("button");
  }
  return mod.createDetailedDayCell({
    documentRef: document,
    cellDate,
    key,
    inCurrentMonth,
    peopleMap,
    laneMap,
    visibleLanes,
    t,
    getHolidayNamesForDate,
    isDayOffHoliday,
    getEventsForDate,
    matchesEventFilters,
    getAbsencesForDate,
    matchesAbsenceFilters,
    getStandaloneTasksForDate,
    isLinkedStandaloneTask,
    matchesTaskFilters,
    getCategoryBgColor,
    isSharedEventReadOnlyInPersonalMode,
    markSharedOriginVisual,
    addDaysToKey,
    isDateInRange,
    canOpenEventCreateInCurrentCalendar,
    canOpenTaskCreateInCurrentCalendar,
    canCompOverviewAccess,
    closeAllDayQuickAddMenus,
    setSelectedDateKey: (value) => { selectedDateKey = String(value || ""); },
    renderCalendar,
    renderSelectedDayPanel,
    onDaySelected: (key) => {
      if (!isMobileViewport()) return;
      openMobileDayPanel();
    },
    openEventPreview,
    openDayMenu,
    startEventCreateMode,
    hideDayActionChoices,
    setDayMenuSectionMode,
    eventTitleInput,
    renderStandaloneTaskList,
    taskTitleInput,
    openCompensationMenu,
    todayKey,
    selectedDateKey,
    categories
  });
}

function renderSelectedDayPanel() {
  const calendarViews = window.ProCalModules && window.ProCalModules.calendarViews;
  if (!calendarViews || typeof calendarViews.renderSelectedDayPanel !== "function") return;
  calendarViews.renderSelectedDayPanel({
    selectedDateKey,
    selectedDateTitle,
    eventList,
    t,
    parseDateKey,
    getLocale,
    renderSideDayPanel,
    getEventsForDate,
    matchesEventFilters,
    sortEvents,
    getAbsencesForDate,
    matchesAbsenceFilters,
    isTaskViewEnabled,
    getStandaloneTasksForDate,
    isLinkedStandaloneTask,
    matchesTaskFilters,
    renderEventRow,
    renderAbsenceRow,
    renderStandaloneTaskRow
  });
  renderDayTimelinePanel();
  syncDayTimelinePanelHeight();
  syncSidePanelHeights();
}

function shiftSelectedTimelineDay(days) {
  const baseKey = isDateKey(selectedDateKey) ? selectedDateKey : todayKey;
  selectedDateKey = String(addDaysToKey(baseKey, days) || baseKey);
  const nextDate = parseDateKey(selectedDateKey);
  currentMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
  renderCalendar();
  renderSelectedDayPanel();
  queueLeaveAbsenceSync(true);
}

function syncDayTimelinePanelHeight() {
  if (!dayTimelinePanel) return;
  dayTimelinePanel.style.removeProperty("--day-timeline-height");
}

function syncSidePanelHeights() {
  const isMobile = typeof isMobileViewport === "function" && isMobileViewport();
  [dayPanelShell, upcomingPanel].forEach((panel) => {
    if (!panel) return;
    if (isMobile) {
      panel.style.removeProperty("--side-panel-height");
      return;
    }
    const calendarHeight = calendarPanelShell && calendarPanelShell.getBoundingClientRect
      ? Math.round(calendarPanelShell.getBoundingClientRect().height)
      : 0;
    const targetHeight = Math.max(520, calendarHeight || 680);
    panel.style.setProperty("--side-panel-height", `${targetHeight}px`);
  });
}

function attachPanelWheelRouting(panel, getScrollTarget) {
  if (!panel || typeof panel.addEventListener !== "function" || typeof getScrollTarget !== "function") return;
  panel.addEventListener("wheel", (event) => {
    if (typeof isMobileViewport === "function" && isMobileViewport()) return;
    const scrollTarget = getScrollTarget();
    if (!scrollTarget || scrollTarget.scrollHeight <= scrollTarget.clientHeight + 1) return;
    const tagName = event.target && event.target.tagName ? String(event.target.tagName).toLowerCase() : "";
    if (tagName === "select" || tagName === "input" || tagName === "textarea") return;
    scrollTarget.scrollTop += event.deltaY;
    event.preventDefault();
  }, { passive: false });
}

function renderDayTimelinePanel() {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayTimeline;
  if (!mod || typeof mod.renderDayTimeline !== "function" || !dayTimelineContent) return;
  const filteredEvents = selectedDateKey
    ? getEventsForDate(selectedDateKey).filter(matchesEventFilters).slice().sort(sortEvents)
    : [];
  mod.renderDayTimeline({
    documentRef: document,
    container: dayTimelineContent,
    dateLabel: dayTimelineDate,
    selectedDateKey,
    todayKey: toDateKey(new Date()),
    settings: dayTimelinePrefs,
    events: filteredEvents,
    parseDateKey,
    getLocale,
    getCategoryById,
    getCategoryBgColor,
    t,
    onOpenPreview: (evt, dateKey) => {
      openEventPreview(evt, dateKey);
    }
  });
}

function createSideItemMenu(onEdit, onDelete, allowActions = true) {
  const mod = window.ProCalModules && window.ProCalModules.calendarSideMenuHelpers;
  const renderMod = window.ProCalModules && window.ProCalModules.eventsListRender;
  if (!mod || typeof mod.createSideItemMenu !== "function") return null;
  return mod.createSideItemMenu({
    eventsListRenderModule: renderMod,
    documentRef: document,
    readOnly: READ_ONLY,
    allowActions,
    t,
    onEdit,
    onDelete
  });
}

function closeAllSideItemMenus() {
  const mod = window.ProCalModules && window.ProCalModules.calendarSideMenuHelpers;
  if (!mod || typeof mod.closeAllSideItemMenus !== "function") return;
  mod.closeAllSideItemMenus({ documentRef: document });
}

function closeAllDayQuickAddMenus() {
  const helperMod = window.ProCalModules && window.ProCalModules.calendarSideMenuHelpers;
  const dayCellMod = window.ProCalModules && window.ProCalModules.calendarDayCell;
  if (!helperMod || typeof helperMod.closeAllDayQuickAddMenus !== "function") return;
  helperMod.closeAllDayQuickAddMenus({
    calendarDayCellModule: dayCellMod,
    documentRef: document,
    sideDayQuickAddTrigger
  });
}

function toggleSideDayQuickAdd(forceOpen = null) {
  const helperMod = window.ProCalModules && window.ProCalModules.calendarSideMenuHelpers;
  const dayCellMod = window.ProCalModules && window.ProCalModules.calendarDayCell;
  if (!helperMod || typeof helperMod.toggleSideDayQuickAdd !== "function") return;
  helperMod.toggleSideDayQuickAdd({
    calendarDayCellModule: dayCellMod,
    sideDayQuickAdd,
    sideDayQuickAddTrigger,
    forceOpen,
    closeAllDayQuickAddMenus
  });
}
function renderSideDayPanel(events, dayAbsences, dayTasks) {
  const mod = window.ProCalModules && window.ProCalModules.eventsListRender;
  if (!mod || typeof mod.renderSideDayPanel !== "function") return;
  mod.renderSideDayPanel({
    documentRef: document,
    sideSelectedDateTitle,
    sideDayList,
    events,
    dayAbsences,
    dayTasks,
    todayKey,
    readOnly: READ_ONLY,
    t,
    parseDateKey,
    getLocale,
    getSelectedDateKey: () => selectedDateKey,
    setSelectedDateKey: (value) => { selectedDateKey = String(value || ""); },
    isSharedEventReadOnlyInPersonalMode,
    markSharedOriginVisual,
    getCategoryBgColor,
    describeEventPeople,
    renderEventTasksInline,
    canManageEventAndAbsenceChanges,
    getOperationalPeople,
    getPersonDisplayName,
    isSharedStandaloneTaskInPersonalMode,
    categories,
    formatEventTimeLabel: (evt, dateKey) => getEventTimeLabelForDate(evt, dateKey),
    getTaskAssigneeNames,
    getLinkedTaskContextLabel,
    onOpenEventPreview: (evt, dateKey) => {
      openEventPreview(evt, dateKey);
    },
    onEditEvent: (evt, dateKey) => {
      openEventEditModal(evt.seriesId || evt.id, dateKey);
    },
    onDeleteEvent: (evt, dateKey) => {
      deleteEventById(evt.seriesId || evt.id);
      persistState();
      if (editingEventSeriesId === (evt.seriesId || evt.id)) startEventCreateMode(dateKey);
      renderCalendar();
      renderSelectedDayPanel();
      renderUpcomingList();
    },
    onToggleStandaloneTask: (task, dateKey, checked) => {
      toggleStandaloneTaskDone(dateKey, task.id, checked);
    },
    onEditStandaloneTask: (task, dateKey) => {
      openTaskEditDialog(task, ({ title: nextTitle, personIds, categoryId }) => {
        updateStandaloneTask(dateKey, task.id, { title: nextTitle, personIds, categoryId });
      }, { allowCategory: true });
    },
    onDeleteStandaloneTask: (task, dateKey) => {
      tasksByDate[dateKey] = (tasksByDate[dateKey] || []).filter((x) => x.id !== task.id);
      if (!tasksByDate[dateKey].length) delete tasksByDate[dateKey];
      persistState();
      renderCalendar();
      renderSelectedDayPanel();
      renderUpcomingList();
    }
  });
}

function renderAbsenceRow(absence) {
  const mod = window.ProCalModules && window.ProCalModules.eventsListRender;
  if (!mod || typeof mod.renderAbsenceRow !== "function") return;
  mod.renderAbsenceRow({
    documentRef: document,
    absence,
    eventList,
    t,
    getOperationalPeople,
    getPersonDisplayName
  });
}

function closeEventPreview() {
  const flow = window.ProCalModules && window.ProCalModules.eventsPreviewFlow;
  const previewMod = window.ProCalModules && window.ProCalModules.eventsFormPreview;
  if (!flow || typeof flow.closeEventPreview !== "function") return;
  flow.closeEventPreview({
    setPreviewState: ({ seriesId, dateKey, snapshot }) => {
      previewEventSeriesId = seriesId;
      previewEventDateKey = dateKey;
      previewEventSnapshot = snapshot;
    },
    eventsFormPreviewModule: previewMod,
    eventPreviewModal
  });
}

function openEventEditModal(seriesId, dateKey) {
  const flow = window.ProCalModules && window.ProCalModules.eventsPreviewFlow;
  if (!flow || typeof flow.openEventEditModal !== "function") return false;
  return flow.openEventEditModal({
    seriesId,
    dateKey,
    personalMode: isPersonalCalendarMode(),
    findBaseEventById,
    isSharedEventReadOnlyInPersonalMode,
    isDateKey,
    setSelectedDateKey: (value) => { selectedDateKey = String(value || ""); },
    getSelectedDateKey: () => selectedDateKey,
    closeEventPreview,
    openDayMenu,
    hideDayActionChoices,
    startEventEditMode,
    setDayMenuSectionMode,
    showDayActionChoices,
    eventTitleInput,
    todayKey
  });
}

function openEventPreview(evt, dateKey) {
  const flow = window.ProCalModules && window.ProCalModules.eventsPreviewFlow;
  const previewMod = window.ProCalModules && window.ProCalModules.eventsFormPreview;
  if (!flow || typeof flow.openEventPreview !== "function") return;
  flow.openEventPreview({
    documentRef: document,
    event: evt,
    dateKey,
    eventPreviewModal,
    eventPreviewBody,
    eventPreviewAddTaskBtn,
    eventPreviewEditBtn,
    eventPreviewDeleteBtn,
    setPreviewState: ({ seriesId, dateKey: nextDateKey, snapshot }) => {
      previewEventSeriesId = seriesId;
      previewEventDateKey = nextDateKey;
      previewEventSnapshot = snapshot;
    },
    isDateKey,
    personalMode: isPersonalCalendarMode(),
    readOnly: READ_ONLY,
    taskViewEnabled: isTaskViewEnabled(),
    canManageEventAndAbsenceChanges: canManageEventAndAbsenceChanges(),
    isSharedEventReadOnlyInPersonalMode,
    eventsFormPreviewModule: previewMod,
    t,
    people,
    getCategoryById,
    describeEventPeople,
    getLinkedStandaloneTaskRowsForEvent,
    setSelectedDateKey: (value) => { selectedDateKey = String(value || ""); }
  });
}
function renderEventRow(evt) {
  const mod = window.ProCalModules && window.ProCalModules.eventsListRender;
  if (!mod || typeof mod.renderEventRow !== "function") return;
  mod.renderEventRow({
    documentRef: document,
    event: evt,
    eventList,
    selectedDateKey,
    t,
    formatEventTimeLabel: (eventRow, dateKey) => getEventTimeLabelForDate(eventRow, dateKey),
    isSharedEventReadOnlyInPersonalMode,
    markSharedOriginVisual,
    describeEventPeople,
    renderEventTasksInline,
    canManageEventAndAbsenceChanges,
    onOpenPreview: (eventRow, dateKey) => {
      openEventPreview(eventRow, dateKey);
    },
    onEditEvent: (eventRow, dateKey) => {
      openEventEditModal(eventRow.seriesId || eventRow.id, dateKey);
    },
    onDeleteEvent: (eventRow, dateKey) => {
      deleteEventById(eventRow.seriesId || eventRow.id);
      persistState();
      if (editingEventSeriesId === (eventRow.seriesId || eventRow.id)) startEventCreateMode(dateKey);
      renderCalendar();
      renderSelectedDayPanel();
      renderUpcomingList();
    }
  });
}

function renderEventTasksInline(container, evt, dateKeyHint) {
  const mod = window.ProCalModules && window.ProCalModules.eventsListRender;
  if (!mod || typeof mod.renderEventTasksInline !== "function") return;
  mod.renderEventTasksInline({
    documentRef: document,
    container,
    event: evt,
    dateKeyHint,
    t,
    readOnly: READ_ONLY,
    todayKey,
    isTaskViewEnabled,
    getLinkedStandaloneTaskRowsForEvent,
    isSharedEventReadOnlyInPersonalMode,
    markSharedOriginVisual,
    getTaskAssigneeNames,
    getLinkedTaskContextLabel,
    onToggleEventTask: ({ eventId, taskId, checked }) => {
      toggleEventTaskDone(eventId, taskId, checked);
    },
    onToggleLinkedTask: (entry, checked) => {
      if (!entry || !entry.task) return;
      const taskDateKey = String(entry.storageDateKey || entry.dateKey || "");
      if (!taskDateKey) return;
      toggleStandaloneTaskDone(taskDateKey, entry.task.id, checked);
    },
    onEditLinkedTask: (entry) => {
      const task = entry && entry.task;
      const taskDateKey = String((entry && (entry.storageDateKey || entry.dateKey)) || "");
      if (!task || !taskDateKey) return;
      openTaskEditDialog(task, ({ title: nextTitle, personIds, categoryId }) => {
        updateStandaloneTask(taskDateKey, task.id, { title: nextTitle, personIds, categoryId });
      }, { allowCategory: false });
    },
    onDeleteLinkedTask: (entry) => {
      const task = entry && entry.task;
      const taskDateKey = String((entry && (entry.storageDateKey || entry.dateKey)) || "");
      if (!task || !taskDateKey) return;
      tasksByDate[taskDateKey] = (tasksByDate[taskDateKey] || []).filter((x) => x.id !== task.id);
      if (!tasksByDate[taskDateKey].length) delete tasksByDate[taskDateKey];
      persistState();
      renderStandaloneTaskList(taskDateKey);
      renderSelectedDayPanel();
      renderUpcomingList();
      renderCalendar();
    }
  });
}

function renderStandaloneTaskRow(task, dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.eventsListRender;
  if (!mod || typeof mod.renderStandaloneTaskRow !== "function") return;
  mod.renderStandaloneTaskRow({
    documentRef: document,
    task,
    dateKey,
    eventList,
    t,
    readOnly: READ_ONLY,
    todayKey,
    isTaskViewEnabled,
    isSharedStandaloneTaskInPersonalMode,
    markSharedOriginVisual,
    getTaskAssigneeNames,
    getLinkedTaskContextLabel,
    onToggleStandaloneTask: (taskRow, taskDateKey, checked) => {
      toggleStandaloneTaskDone(taskDateKey, taskRow.id, checked);
    },
    onEditStandaloneTask: (taskRow, taskDateKey) => {
      openTaskEditDialog(taskRow, ({ title: nextTitle, personIds, categoryId }) => {
        updateStandaloneTask(taskDateKey, taskRow.id, { title: nextTitle, personIds, categoryId });
      }, { allowCategory: true });
    },
    onDeleteStandaloneTask: (taskRow, taskDateKey) => {
      tasksByDate[taskDateKey] = (tasksByDate[taskDateKey] || []).filter((x) => x.id !== taskRow.id);
      if (!tasksByDate[taskDateKey].length) delete tasksByDate[taskDateKey];
      persistState();
      renderStandaloneTaskList(taskDateKey);
      renderSelectedDayPanel();
      renderUpcomingList();
      renderCalendar();
    }
  });
}

function toggleStandaloneTaskDone(dateKey, taskId, done) {
  const mod = window.ProCalModules && window.ProCalModules.taskMutations;
  if (!mod || typeof mod.toggleStandaloneTaskDone !== "function") return;
  mod.toggleStandaloneTaskDone({
    tasksByDate,
    dateKey,
    taskId,
    done,
    persistState,
    renderStandaloneTaskList,
    renderSelectedDayPanel,
    renderUpcomingList,
    renderCalendar
  });
}

function toggleEventTaskDone(seriesId, taskId, done) {
  const mod = window.ProCalModules && window.ProCalModules.taskMutations;
  if (!mod || typeof mod.toggleEventTaskDone !== "function") return;
  mod.toggleEventTaskDone({
    seriesId,
    taskId,
    done,
    findBaseEventById,
    persistState,
    renderSelectedDayPanel,
    renderUpcomingList
  });
}

function updateEventTask(seriesId, taskId, patch) {
  const mod = window.ProCalModules && window.ProCalModules.taskMutations;
  if (!mod || typeof mod.updateEventTask !== "function") return;
  mod.updateEventTask({
    seriesId,
    taskId,
    patch,
    findBaseEventById,
    normalizeTaskAssigneeIds,
    persistState,
    renderSelectedDayPanel,
    renderUpcomingList,
    renderCalendar
  });
}

function updateStandaloneTask(dateKey, taskId, patch) {
  const mod = window.ProCalModules && window.ProCalModules.taskStandaloneUpdate;
  if (!mod || typeof mod.updateStandaloneTask !== "function") return;
  mod.updateStandaloneTask({
    tasksByDate,
    dateKey,
    taskId,
    patch,
    normalizeTaskAssigneeIds,
    normalizePersonalTaskAssignees,
    isCollaborativePersonalTask,
    getTaskCollabMembers,
    isCollaborativePersonalTaskOwner,
    currentUserId,
    categories,
    persistState,
    isPersonalCalendarMode,
    sendPersonalTaskCollabInvites,
    renderStandaloneTaskList,
    renderSelectedDayPanel,
    renderUpcomingList,
    renderCalendar
  });
}

function openTaskEditDialog(task, onSave, options) {
  const mod = window.ProCalModules && window.ProCalModules.taskDialogs;
  if (!mod || typeof mod.openTaskEditDialog !== "function") return;
  mod.openTaskEditDialog({
    documentRef: document,
    readOnly: READ_ONLY,
    task,
    onSave,
    allowCategory: Boolean(options && options.allowCategory),
    dialogTitleText: options && options.dialogTitleText,
    t,
    currentUserId,
    renderPeopleChecklist,
    getTaskAssigneeIds,
    getSelectedPersonIds,
    isCollaborativePersonalTask,
    isCollaborativePersonalTaskOwner,
    categories
  });
}

function addEventTaskToSeries(seriesId, titleValue, personIdsValue) {
  const mod = window.ProCalModules && window.ProCalModules.taskMutations;
  if (!mod || typeof mod.addEventTaskToSeries !== "function") return;
  mod.addEventTaskToSeries({
    readOnly: READ_ONLY,
    seriesId,
    titleValue,
    personIdsValue,
    normalizeTaskAssigneeIds,
    people,
    findBaseEventById,
    createTaskId,
    persistState,
    renderSelectedDayPanel,
    renderUpcomingList,
    renderCalendar
  });
}

function normalizeTaskAssigneeIds(value) {
  const taskAssignees = window.ProCalModules && window.ProCalModules.taskAssignees;
  if (!taskAssignees || typeof taskAssignees.normalizeTaskAssigneeIds !== "function") return [];
  return taskAssignees.normalizeTaskAssigneeIds(value, filterPeopleIds);
}

function getTaskAssigneeIds(task) {
  const taskAssignees = window.ProCalModules && window.ProCalModules.taskAssignees;
  if (!taskAssignees || typeof taskAssignees.getTaskAssigneeIds !== "function") return [];
  return taskAssignees.getTaskAssigneeIds(task, filterPeopleIds);
}

function taskHasAssignee(task, personId) {
  const taskAssignees = window.ProCalModules && window.ProCalModules.taskAssignees;
  if (!taskAssignees || typeof taskAssignees.taskHasAssignee !== "function") return false;
  return taskAssignees.taskHasAssignee(task, personId, filterPeopleIds);
}

function getTaskAssigneeNames(task) {
  const taskAssignees = window.ProCalModules && window.ProCalModules.taskAssignees;
  if (!taskAssignees || typeof taskAssignees.getTaskAssigneeNames !== "function") return [];
  return taskAssignees.getTaskAssigneeNames(task, getOperationalPeople(), filterPeopleIds);
}

function getSelectedPersonIds(sourceEl) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.getSelectedPersonIds !== "function") return [];
  return mod.getSelectedPersonIds({ sourceEl, filterPeopleIds });
}

function getStandaloneTasksForDate(dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.getStandaloneTasksForDate !== "function") {
    return (tasksByDate[dateKey] || []).slice();
  }
  return mod.getStandaloneTasksForDate({ tasksByDate, dateKey });
}

function isPersonalCalendarMode() {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.isPersonalCalendarMode !== "function") return String(currentCalendarMode || "shared") === "personal";
  return mod.isPersonalCalendarMode({ currentCalendarMode });
}

function normalizePersonalTaskAssignees(personIds) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.normalizePersonalTaskAssignees !== "function") return [];
  return mod.normalizePersonalTaskAssignees({
    personIds,
    filterPeopleIds,
    currentUserId,
    currentCalendarMode
  });
}

function getTaskCollabMembers(task) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.getTaskCollabMembers !== "function") return [];
  return mod.getTaskCollabMembers(task, {
    filterPeopleIds,
    getTaskAssigneeIds,
    normalizePersonalTaskAssignees
  });
}

function isCollaborativePersonalTask(task) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.isCollaborativePersonalTask !== "function") return false;
  return mod.isCollaborativePersonalTask(task, { currentCalendarMode });
}

function isCollaborativePersonalTaskOwner(task) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.isCollaborativePersonalTaskOwner !== "function") return false;
  return mod.isCollaborativePersonalTaskOwner(task, { currentUserId });
}

function getPersonalTaskInviteeUserIds(task, selectedIds) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.getPersonalTaskInviteeUserIds !== "function") return [];
  return mod.getPersonalTaskInviteeUserIds(task, selectedIds, {
    currentCalendarMode,
    currentUserId,
    normalizePersonalTaskAssignees,
    isCollaborativePersonalTask,
    isCollaborativePersonalTaskOwner
  });
}

async function sendPersonalTaskCollabInvites(dateKey, task, selectedIds, allowRetry) {
  const mod = window.ProCalModules && window.ProCalModules.taskInviteApi;
  if (!mod || typeof mod.sendPersonalTaskCollabInvites !== "function") return;
  await mod.sendPersonalTaskCollabInvites({
    dateKey,
    task,
    selectedIds,
    allowRetry,
    isPersonalCalendarMode,
    getPersonalTaskInviteeUserIds,
    ensureAccessToken,
    fetchImpl: fetch,
    retryFn: () => setTimeout(() => { void sendPersonalTaskCollabInvites(dateKey, task, selectedIds, false); }, 350)
  });
}

function matchesTaskFilters(task) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.matchesTaskFilters !== "function") return true;
  return mod.matchesTaskFilters(task, { activeFilters, getTaskAssigneeIds });
}

function renderStandaloneTaskList(dateKey) {
  const taskRender = window.ProCalModules && window.ProCalModules.taskRender;
  if (!taskRender || typeof taskRender.renderStandaloneTaskList !== "function") return;
  taskRender.renderStandaloneTaskList({
    documentRef: document,
    taskFormSection,
    dateKey,
    todayKey,
    readOnly: READ_ONLY,
    t,
    getStandaloneTasksForDate,
    isLinkedStandaloneTask,
    isSharedStandaloneTaskInPersonalMode,
    markSharedOriginVisual,
    toggleStandaloneTaskDone,
    getTaskAssigneeNames,
    getLinkedTaskContextLabel,
    onEditTask: (task, taskDateKey) => {
      openTaskEditDialog(task, ({ title: nextTitle, personIds, categoryId }) => {
        updateStandaloneTask(taskDateKey, task.id, { title: nextTitle, personIds, categoryId });
      }, { allowCategory: true });
    },
    onDeleteTask: (task, taskDateKey) => {
      tasksByDate[taskDateKey] = (tasksByDate[taskDateKey] || []).filter((x) => x.id !== task.id);
      if (!tasksByDate[taskDateKey].length) delete tasksByDate[taskDateKey];
      persistState();
      renderStandaloneTaskList(taskDateKey);
      renderSelectedDayPanel();
      renderUpcomingList();
      renderCalendar();
    }
  });
}

function renderEventDraftTaskList() {
  const taskRender = window.ProCalModules && window.ProCalModules.taskRender;
  if (!taskRender || typeof taskRender.renderEventDraftTaskList !== "function") return;
  taskRender.renderEventDraftTaskList({
    documentRef: document,
    eventTaskList,
    draftEventTasks,
    getTaskAssigneeNames,
    t,
    onDeleteDraftTask: (task) => {
      draftEventTasks = draftEventTasks.filter((x) => x.id !== task.id);
      renderEventDraftTaskList();
    }
  });
}

function renderTaskPersonOptions() {
  const checklist = window.ProCalModules && window.ProCalModules.peopleChecklist;
  if (!checklist || typeof checklist.renderTaskPeopleOptions !== "function") return;
  checklist.renderTaskPeopleOptions({
    taskPersonChecklist,
    eventTaskPeopleChecklist,
    roster: getOperationalPeople(),
    getPersonDisplayName,
    refreshTaskChecklistAvailability,
    refreshEventTaskChecklistAvailability,
    selectedDateKey
  });
}

function renderPeopleChecklist(container, selectedIds) {
  const checklist = window.ProCalModules && window.ProCalModules.peopleChecklist;
  if (!checklist || typeof checklist.renderChecklist !== "function") return;
  checklist.renderChecklist({
    container,
    roster: getOperationalPeople(),
    selectedIds,
    getPersonDisplayName
  });
}

function renderReportPeopleOptions() {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.renderReportPeopleOptions !== "function") return;
  peopleOptions.renderReportPeopleOptions({
    selectEl: reportPerson,
    allowed: getAllowedReportPeople(),
    getPersonDisplayName,
    canReadAllReports: canReadAllReports(),
    currentUserId
  });
}

function renderPeopleSelect(selectEl, includeAny) {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.renderPeopleSelect !== "function") return;
  peopleOptions.renderPeopleSelect({
    selectEl,
    includeAny,
    roster: getOperationalPeople(),
    getPersonDisplayName
  });
}

function openReportsMenu() {
  const reportsPanel = window.ProCalModules && window.ProCalModules.reportsPanel;
  if (!reportsPanel || typeof reportsPanel.openMenu !== "function") return;
  reportsPanel.openMenu({
    canReadOwnReports: canReadOwnReports(),
    renderReportPeopleOptions,
    reportStart,
    reportEnd,
    reportResults,
    selectedDateKey,
    reportsMenu
  });
}

function closeReportsMenu() {
  const reportsPanel = window.ProCalModules && window.ProCalModules.reportsPanel;
  if (!reportsPanel || typeof reportsPanel.closeMenu !== "function") return;
  reportsPanel.closeMenu({ reportsMenu });
}

function closeCompensationMenu() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.closeMenu !== "function") return;
  compFlow.closeMenu({ compensationMenu, closeCompAdjustModal });
}

function openCompAdjustModal() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.openAdjustModal !== "function") return;
  compFlow.openAdjustModal({
    canManageCompensations: canManageCompensations(),
    compAdjustModal,
    compAdjustDate,
    compDate,
    selectedDateKey,
    compAdjustHours,
    compAdjustMinutesPart,
    compAdjustReason,
    compAdjustSign
  });
}

function closeCompAdjustModal() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.closeAdjustModal !== "function") return;
  compFlow.closeAdjustModal({ compAdjustModal });
}

function closeCompLogModal() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.closeLogModal !== "function") return;
  compFlow.closeLogModal({ compLogModal });
}

function openCompLogModal(userId, name, color) {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.openLogModal !== "function") return;
  compFlow.openLogModal({
    userId,
    name,
    color,
    compLogModal,
    compLogSummary,
    compLogEntries,
    setCurrentCompLogPersonId: (value) => { currentCompLogPersonId = value; },
    setCurrentCompLogPersonName: (value) => { currentCompLogPersonName = value; },
    setCurrentCompLogPersonColor: (value) => { currentCompLogPersonColor = value; },
    loadCompLogEntries
  });
}

function renderCompPeopleOptions() {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.renderCompPeopleOptions !== "function") return;
  peopleOptions.renderCompPeopleOptions({
    selectEl: compPerson,
    allowed: getAllowedCompPeople(),
    canCompOverviewAccess: canCompOverviewAccess()
  });
}

function formatCompMinutes(value) {
  const compApi = window.ProCalModules && window.ProCalModules.compApi;
  if (!compApi || typeof compApi.formatCompMinutes !== "function") return String(value || "0");
  return compApi.formatCompMinutes(value);
}

async function fetchCompJson(path, init) {
  const compApi = window.ProCalModules && window.ProCalModules.compApi;
  if (!compApi || typeof compApi.fetchCompJson !== "function") throw new Error("unavailable");
  return compApi.fetchCompJson(path, init, { ensureAccessToken });
}

async function syncOwnCompFromSelectedPerson() {
  const userId = getAllowedCompPersonId();
  if (!userId || String(userId) !== String(currentUserId || "")) return;
  try {
    const body = await fetchCompJson(`/api/compensations/balance?userId=${encodeURIComponent(String(currentUserId || ""))}`);
    currentCompBalanceMinutes = Number(body && body.minutes);
  } catch {
    currentCompBalanceMinutes = null;
  }
  renderCurrentCompBalanceLabel();
}

async function createCompensationEntry() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.createEntry !== "function") return;
  await compFlow.createEntry({
    canManageCompensations: canManageCompensations(),
    userId: getAllowedCompPersonId(),
    compHours,
    compMinutesPart,
    compKind,
    compReason,
    compDate,
    fetchCompJson,
    loadCompOverview,
    refreshCurrentCompBalance,
    onError: (err) => console.warn(err)
  });
}

async function adjustCompensationEntry() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.adjustEntry !== "function") return;
  await compFlow.adjustEntry({
    canManageCompensations: canManageCompensations(),
    userId: getAllowedCompPersonId(),
    compAdjustHours,
    compAdjustMinutesPart,
    compAdjustSign,
    compAdjustReason,
    compAdjustDate,
    fetchCompJson,
    loadCompOverview,
    refreshCurrentCompBalance,
    closeCompAdjustModal,
    onError: (err) => console.warn(err)
  });
}

async function loadCompOverview() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.loadOverview !== "function") return;
  await compFlow.loadOverview({
    compOverviewList,
    compOverviewWrap,
    canCompOverviewAccess: canCompOverviewAccess(),
    allowedPeople: getAllowedCompPeople(),
    fetchCompJson,
    t,
    locale: getLocale(),
    formatCompMinutes,
    openCompLogModal
  });
}

async function loadCompLogEntries() {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.loadLogEntries !== "function") return;
  await compFlow.loadLogEntries({
    compLogEntries,
    compLogSummary,
    currentCompLogPersonId,
    currentCompLogPersonName,
    currentCompLogPersonColor,
    fetchCompJson,
    t,
    formatCompMinutes,
    escapeHtml,
    locale: getLocale()
  });
}

function openCompensationMenu(prefDate) {
  const compFlow = window.ProCalModules && window.ProCalModules.compFlow;
  if (!compFlow || typeof compFlow.openMenu !== "function") return;
  compFlow.openMenu({
    prefDate,
    canCompOverviewAccess: canCompOverviewAccess(),
    renderCompPeopleOptions,
    compDate,
    selectedDateKey,
    compManageWrap,
    canManageCompensations: canManageCompensations(),
    loadCompOverview,
    compensationMenu
  });
}

function renderReportResults() {
  const mod = window.ProCalModules && window.ProCalModules.reportsResults;
  if (!mod || typeof mod.renderResults !== "function") return;
  mod.renderResults({
    documentRef: document,
    reportPerson,
    reportStart,
    reportEnd,
    reportResults,
    canReadAllReports,
    currentUserId,
    isDateKey,
    parseDateKey,
    rangesOverlap,
    t,
    absences,
    getEventsInRange,
    taskHasAssignee,
    addDaysToKey,
    tasksByDate,
    people: getOperationalPeople(),
    getCurrentUserIdentityIds,
    locale: getLocale()
  });
}
function saveReportAsPdf() {
  const mod = window.ProCalModules && window.ProCalModules.reportsResults;
  if (!mod || typeof mod.saveAsPdf !== "function") return;
  mod.saveAsPdf({
    windowRef: window,
    reportResults,
    renderReportResults,
    reportPerson,
    reportStart,
    reportEnd,
    canReadAllReports,
    currentUserId,
    people: getOperationalPeople(),
    getCurrentUserIdentityIds,
    t,
    escapeHtml
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function removePersonFromEvents(personId) {
  Object.keys(eventsByDate).forEach((dateKey) => {
    const events = (eventsByDate[dateKey] || []).map((evt) => ({
      ...evt,
      peopleIds: (evt.peopleIds || []).filter((id) => id !== personId),
      absentIds: (evt.absentIds || []).filter((id) => id !== personId),
      tasks: (evt.tasks || []).map((task) => ({
        ...task,
        personIds: getTaskAssigneeIds(task).filter((id) => id !== personId)
      }))
    }));
    eventsByDate[dateKey] = events;
  });
}

function getEventsForDate(dateKey) {
  const eventQuery = window.ProCalModules && window.ProCalModules.eventQuery;
  if (!eventQuery || typeof eventQuery.getEventsForDate !== "function") return [];
  return eventQuery.getEventsForDate(dateKey, { eventsByDate, expandEventOccurrences });
}

function getEventsInRange(startDate, endDate) {
  const eventQuery = window.ProCalModules && window.ProCalModules.eventQuery;
  if (!eventQuery || typeof eventQuery.getEventsInRange !== "function") return [];
  return eventQuery.getEventsInRange(startDate, endDate, { eventsByDate, expandEventOccurrences });
}

function removePersonFromAbsences(personId) {
  absences = absences.filter((absence) => absence.personId !== personId);
  Object.keys(tasksByDate).forEach((dateKey) => {
    tasksByDate[dateKey] = (tasksByDate[dateKey] || []).map((task) => ({
      ...task,
      personIds: getTaskAssigneeIds(task).filter((id) => id !== personId)
    }));
  });
}

function matchesEventFilters(evt) {
  const eventFilters = window.ProCalModules && window.ProCalModules.eventFilters;
  if (!eventFilters || typeof eventFilters.matchesEventFilters !== "function") return true;
  return eventFilters.matchesEventFilters(evt, { activeFilters, getTaskAssigneeIds });
}

function matchesAbsenceFilters(absence) {
  const eventFilters = window.ProCalModules && window.ProCalModules.eventFilters;
  if (!eventFilters || typeof eventFilters.matchesAbsenceFilters !== "function") return true;
  return eventFilters.matchesAbsenceFilters(absence, { activeFilters });
}

function getCategoryById(categoryId) {
  return categories.find((item) => item.id === categoryId) || categories[0] || null;
}

function getCategoryBgColor(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat ? hexToAlpha(cat.color, 0.26) : "#dbeafe";
}

function reassignCategory(fromId, toId) {
  Object.keys(eventsByDate).forEach((dateKey) => {
    eventsByDate[dateKey] = (eventsByDate[dateKey] || []).map((evt) =>
      evt.categoryId === fromId ? { ...evt, categoryId: toId } : evt
    );
  });
}

function filterKnownIds(list, knownPeople) {
  if (!Array.isArray(list)) return [];
  return dedupeStrings(list.map((v) => String(v))).filter((id) => knownPeople.has(id));
}

function filterPeopleIds(list) {
  const aliases = new Map();
  getOperationalPeople().forEach((person) => {
    const id = String((person && person.id) || "").trim();
    const userId = String((person && person.userId) || "").trim();
    if (!id) return;
    aliases.set(id, id);
    if (userId) aliases.set(userId, id);
  });
  return dedupeStrings((Array.isArray(list) ? list : []).map((value) => aliases.get(String(value || "").trim()) || "").filter(Boolean));
}

function dedupeStrings(list) {
  return [...new Set(list)];
}

function appendDisabledOption(selectEl, text) {
  const option = document.createElement("option");
  option.textContent = text;
  option.disabled = true;
  selectEl.appendChild(option);
}

function normalizePersonColor(color) {
  const value = String(color || "").toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  return "#64748b";
}

function normalizeHexColor(color, fallback) {
  const value = String(color || "").toLowerCase();
  return /^#[0-9a-f]{6}$/.test(value) ? value : fallback;
}

function hexToAlpha(hex, alpha) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(59, 130, 246, ${alpha})`;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isDateInRange(dateKey, startDate, endDate) {
  return dateKey >= startDate && dateKey <= endDate;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDaysToKey(key, days) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map((v) => Number(v));
  return new Date(y, m - 1, d);
}

function createId() {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createPersonId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createAbsenceId() {
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createCategoryId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}































function createTaskId() {
  const mod = window.ProCalModules && window.ProCalModules.taskDialogs;
  if (!mod || typeof mod.createTaskId !== "function") {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  return mod.createTaskId();
}





























































function normalizeCalendarMode(mode) {
  return mode === "personal" ? "personal" : "shared";
}

function getCurrentModeAccentColor() {
  const mod = window.ProCalModules && window.ProCalModules.calendarModeIndicators;
  if (!mod || typeof mod.getAccentColor !== "function") return "#334155";
  return mod.getAccentColor({
    isPersonal: isPersonalCalendarMode(),
    currentUserDisplayColor
  });
}

function getCalendarModeUiCopy() {
  const mod = window.ProCalModules && window.ProCalModules.calendarModeIndicators;
  if (!mod || typeof mod.getUiCopy !== "function") return { badge: "Calendar", sideInfo: "", legend: "" };
  return mod.getUiCopy({
    isPersonal: isPersonalCalendarMode(),
    currentLang,
    t
  });
}

function renderCalendarModeIndicators() {
  try {
    const mod = window.ProCalModules && window.ProCalModules.calendarModeIndicators;
    if (!mod || typeof mod.renderIndicators !== "function") return;
    mod.renderIndicators({
      isPersonal: isPersonalCalendarMode(),
      currentLang,
      t,
      currentUserDisplayColor,
      currentUserCalendarTintOpacity,
      appShellEl,
      calendarModeBadge,
      sideCalendarModeInfo,
      sideCalendarLegendText,
      sideCalendarLegendShared,
      sideCalendarModeLegend,
      dayPanelShell,
      calendarPanelShell
    });
  } catch (error) {
    console.error("[ProCal] renderCalendarModeIndicators failed", error);
  }
}

function getStateStorageKey() {
  return `${STATE_KEY}_${currentCalendarMode}`;
}

function renderCalendarModeUI() {
  if (!calendarModeSelect) return;
  calendarModeSelect.value = currentCalendarMode;
  applyCalendarModePermissions();
  renderCalendarModeIndicators();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
}

function switchCalendarMode(mode) {
  persistUiPrefs();
  const nextMode = normalizeCalendarMode(mode);
  if (nextMode === currentCalendarMode) return;

  currentCalendarMode = nextMode;
  remoteStateBootstrapped = false;
  localStorage.setItem(CALENDAR_MODE_KEY, currentCalendarMode);
  if (window.dataProvider && typeof window.dataProvider.setCalendarMode === "function") {
    window.dataProvider.setCalendarMode(currentCalendarMode);
  }

  const localState = readState();
  applyCleanState(sanitizeState(localState), localState.modifiedAt || new Date().toISOString());
  restoreUiPrefs();
  applyCalendarModePermissions();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
  bootstrapRemoteState();
  scheduleStickyNotesPullFromShared(250);
}
function readState() {
  const fallback = {
    events: {},
    people: [],
    absences: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    tasks: {},
    stickyNotes: [],
    modifiedAt: null
  };

  try {
    const raw = localStorage.getItem(getStateStorageKey());
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const source = parsed && (parsed.events || parsed.people || parsed.absences || parsed.categories || parsed.tasks || parsed.stickyNotes)
      ? parsed
      : { events: parsed, people: [], absences: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), tasks: {}, stickyNotes: [] };
    const cleaned = sanitizeState(source || {});
    return {
      ...fallback,
      ...cleaned,
      modifiedAt: isValidDateTime(parsed && parsed.modifiedAt) ? parsed.modifiedAt : null
    };
  } catch (error) {
    return fallback;
  }
}

function isValidDateTime(value) {
  if (typeof value !== "string" || !value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function buildStatePayload(includeMeta) {
  return {
    events: eventsByDate,
    people,
    absences,
    categories,
    tasks: tasksByDate,
    stickyNotes,
    modifiedAt: includeMeta ? (lastModifiedAt || new Date().toISOString()) : undefined
  };
}

function persistState() {
  if (READ_ONLY) return;
  lastModifiedAt = new Date().toISOString();
  const payload = buildStatePayload(true);
  try {
    localStorage.setItem(getStateStorageKey(), JSON.stringify(payload));
  } catch (error) {
    // ignore quota errors in offline mode
  }
  if (window.dataProvider && typeof window.dataProvider.saveState === "function") {
    if (remoteStateBootstrapped) {
      window.dataProvider.saveState(payload, lastModifiedAt).catch(() => {
        // keep local fallback if remote save fails
      });
    }
  }
  updateLastModifiedLabel();
  scheduleFileSave();
}

function updateLastModifiedLabel() {
  const el = document.getElementById("lastChangeLabel");
  if (!el) return;
  if (!lastModifiedAt || !isValidDateTime(lastModifiedAt)) {
    el.textContent = `${t("lastChange")}: -`;
    return;
  }
  const dt = new Date(lastModifiedAt);
  el.textContent = `${t("lastChange")}: ${formatUiDateTime24(dt)}`;
}

function scheduleFileSave() {
  if (READ_ONLY) return;
  if (storageMode !== "file" || !activeFileHandle) return;
  if (fileSaveTimer) clearTimeout(fileSaveTimer);
  fileSaveTimer = setTimeout(async () => {
    fileSaveTimer = null;
    try {
      const writable = await activeFileHandle.createWritable();
      await writable.write(JSON.stringify(buildStatePayload(true), null, 2));
      await writable.close();
    } catch (error) {
      // keep local state even if file save fails
    }
  }, 500);
}

async function handleOpenDataFile() {
  try {
    if (!window.showOpenFilePicker) {
      storageMode = "local";
      closeStorageStartupMenu();
      return;
    }
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: "ProCal data", accept: { "application/json": [".json"] } }]
    });
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    const cleaned = sanitizeState(parsed || {});
    activeFileHandle = handle;
    storageMode = "file";
    applyCleanState(cleaned, parsed && parsed.modifiedAt);
    persistState();
    closeStorageStartupMenu();
  } catch (error) {
    storageMode = "local";
    closeStorageStartupMenu();
  }
}

async function handleCreateDataFile() {
  try {
    if (!window.showSaveFilePicker) {
      storageMode = "local";
      closeStorageStartupMenu();
      return;
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: "procal-data.json",
      types: [{ description: "ProCal data", accept: { "application/json": [".json"] } }]
    });
    activeFileHandle = handle;
    storageMode = "file";
    persistState();
    closeStorageStartupMenu();
  } catch (error) {
    storageMode = "local";
    closeStorageStartupMenu();
  }
}

function closeStorageStartupMenu() {
  if (!storageStartupMenu) return;
  storageStartupMenu.classList.add("hidden");
  storageStartupMenu.setAttribute("aria-hidden", "true");
}

function applyCleanState(cleaned, modifiedAt) {
  eventsByDate = cleaned.events || {};
  people = cleaned.people || [];
  absences = cleaned.absences || [];
  categories = cleaned.categories || DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  tasksByDate = cleaned.tasks || {};
  stickyNotes = cleaned.stickyNotes || [];
  lastModifiedAt = isValidDateTime(modifiedAt) ? modifiedAt : new Date().toISOString();

  localStorage.setItem(getStateStorageKey(), JSON.stringify(buildStatePayload(true)));

  renderCategoryOptions();
  renderPeopleOptions();
  renderAbsencePersonOptions();
  renderTaskPersonOptions();
  renderReportPeopleOptions();
  renderPeopleManager();
  renderCategoriesManager();
  renderFilters();
  renderNotesPanel();
  renderCalendar();
  renderSelectedDayPanel();
  renderUpcomingList();
  renderMainPanelUI();
  applyTranslations();
  queuePeopleDirectorySync();
}

function queuePeopleDirectorySync() {
  if (peopleDirectorySyncTimer) return;
  peopleDirectorySyncTimer = setTimeout(() => {
    peopleDirectorySyncTimer = null;
    syncPeopleFromDirectory().catch(() => {
      // keep current state if directory sync fails
    });
  }, 200);
}

function remapPersonReferences(fromId, toId) {
  const sourceId = String(fromId || "").trim();
  const targetId = String(toId || "").trim();
  if (!sourceId || !targetId || sourceId === targetId) return false;
  let changed = false;

  Object.entries(eventsByDate || {}).forEach(([dateKey, list]) => {
    if (!Array.isArray(list)) return;
    let dateChanged = false;
    const nextList = list.map((evt) => {
      if (!evt || typeof evt !== "object") return evt;
      const nextPeopleIds = Array.isArray(evt.peopleIds)
        ? evt.peopleIds.map((id) => (String(id || "") === sourceId ? targetId : String(id || "")))
        : [];
      const nextAbsentIds = Array.isArray(evt.absentIds)
        ? evt.absentIds.map((id) => (String(id || "") === sourceId ? targetId : String(id || "")))
        : [];
      const nextTasks = Array.isArray(evt.tasks)
        ? evt.tasks.map((task) => {
          if (!task || typeof task !== "object") return task;
          const taskIds = getTaskAssigneeIds(task).map((id) => (String(id || "") === sourceId ? targetId : String(id || "")));
          return { ...task, personIds: dedupeStrings(taskIds) };
        })
        : [];

      if (
        JSON.stringify(nextPeopleIds) !== JSON.stringify(evt.peopleIds || []) ||
        JSON.stringify(nextAbsentIds) !== JSON.stringify(evt.absentIds || []) ||
        JSON.stringify(nextTasks) !== JSON.stringify(evt.tasks || [])
      ) {
        dateChanged = true;
        return {
          ...evt,
          peopleIds: dedupeStrings(nextPeopleIds),
          absentIds: dedupeStrings(nextAbsentIds),
          tasks: nextTasks
        };
      }
      return evt;
    });
    if (dateChanged) {
      eventsByDate[dateKey] = nextList;
      changed = true;
    }
  });

  Object.entries(tasksByDate || {}).forEach(([dateKey, list]) => {
    if (!Array.isArray(list)) return;
    let dateChanged = false;
    const nextList = list.map((task) => {
      if (!task || typeof task !== "object") return task;
      const nextIds = getTaskAssigneeIds(task).map((id) => (String(id || "") === sourceId ? targetId : String(id || "")));
      if (JSON.stringify(nextIds) !== JSON.stringify(getTaskAssigneeIds(task))) {
        dateChanged = true;
        return { ...task, personIds: dedupeStrings(nextIds) };
      }
      return task;
    });
    if (dateChanged) {
      tasksByDate[dateKey] = nextList;
      changed = true;
    }
  });

  if (Array.isArray(absences)) {
    const nextAbsences = absences.map((item) => {
      if (!item || typeof item !== "object") return item;
      if (String(item.personId || "") !== sourceId) return item;
      changed = true;
      return { ...item, personId: targetId };
    });
    absences = nextAbsences;
  }

  if (Array.isArray(stickyNotes)) {
    const nextNotes = stickyNotes.map((note) => {
      if (!note || typeof note !== "object") return note;
      let noteChanged = false;
      const ownerId = String(note.ownerId || "");
      const shares = getStickyShares(note).map((entry) => {
        const uid = String(entry.userId || "");
        const nextUid = uid === sourceId ? targetId : uid;
        if (nextUid !== uid) noteChanged = true;
        return { ...entry, userId: nextUid };
      });
      const nextOwnerId = ownerId === sourceId ? targetId : ownerId;
      if (nextOwnerId !== ownerId) noteChanged = true;
      if (!noteChanged) return note;
      changed = true;
      return {
        ...note,
        ownerId: nextOwnerId,
        shares: dedupeStrings(shares.map((entry) => entry.userId)).map((userId) => {
          const hit = shares.find((entry) => String(entry.userId) === String(userId));
          return { userId, canView: true, canEdit: Boolean(hit && hit.canEdit) };
        })
      };
    });
    stickyNotes = nextNotes;
  }

  if (activeFilters && activeFilters.peopleIds instanceof Set && activeFilters.peopleIds.has(sourceId)) {
    activeFilters.peopleIds.delete(sourceId);
    activeFilters.peopleIds.add(targetId);
    changed = true;
  }

  return changed;
}

function mergePeopleDirectoryItems(items) {
  if (!Array.isArray(items)) return false;
  let changed = false;
  const activeItems = items.filter((raw) => String((raw && raw.status) || "").toLowerCase() === "active");
  const directoryNameToUserIds = new Map();
  const activeDirectoryNames = new Set();

  activeItems.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const uid = String(raw.userId || raw.id || "").trim();
    const nm = String(raw.name || "").trim().toLowerCase();
    if (!uid || !nm) return;
    if (!directoryNameToUserIds.has(nm)) directoryNameToUserIds.set(nm, new Set());
    directoryNameToUserIds.get(nm).add(uid);
    activeDirectoryNames.add(nm);
  });

  activeItems.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const userId = String(raw.userId || raw.id || "").trim();
    if (!userId) return;
    const name = String(raw.name || "").trim();
    if (!name) return;
    const color = normalizePersonColor(String(raw.color || "#64748b"));

    const idx = people.findIndex((person) => {
      const pid = String((person && person.id) || "").trim();
      const puid = String((person && person.userId) || "").trim();
      return pid === userId || puid === userId;
    });

    let fallbackIdx = -1;
    if (idx < 0) {
      const sameName = people
        .map((person, index) => ({ person, index }))
        .filter(({ person }) => {
          if (!person || typeof person !== "object") return false;
          const puid = String(person.userId || "").trim();
          if (puid) return false;
          return String(person.name || "").trim().toLowerCase() === name.toLowerCase();
        });
      if (sameName.length === 1) fallbackIdx = sameName[0].index;
    }

    const targetIdx = idx >= 0 ? idx : fallbackIdx;
    if (targetIdx >= 0) {
      const prev = people[targetIdx] || {};
      const prevId = String(prev.id || "").trim();
      if (prevId && prevId !== userId) {
        if (remapPersonReferences(prevId, userId)) changed = true;
      }
      const next = { ...prev, id: userId, userId, name, color };
      if (Object.prototype.hasOwnProperty.call(next, "username")) delete next.username;
      if (
        String(prev.id || "") !== String(next.id || "") ||
        String(prev.userId || "") !== String(next.userId || "") ||
        String(prev.name || "") !== String(next.name || "") ||
        String(prev.color || "") !== String(next.color || "") ||
        Object.prototype.hasOwnProperty.call(prev, "username")
      ) {
        people[targetIdx] = next;
        changed = true;
      }
      return;
    }

    people.push({ id: userId, userId, name, color });
    changed = true;
  });

  people.forEach((person) => {
    if (!person || typeof person !== "object") return;
    const pid = String(person.id || "").trim();
    const puid = String(person.userId || "").trim();
    if (!pid || puid) return;
    const nm = String(person.name || "").trim().toLowerCase();
    if (!nm) return;
    const userIds = directoryNameToUserIds.get(nm);
    if (!userIds || userIds.size !== 1) return;
    const targetUserId = Array.from(userIds)[0];
    if (!targetUserId || targetUserId === pid) return;
    if (remapPersonReferences(pid, targetUserId)) changed = true;
    person.id = targetUserId;
    person.userId = targetUserId;
    if (Object.prototype.hasOwnProperty.call(person, "username")) delete person.username;
    changed = true;
  });

  const activeUserIds = new Set(activeItems.map((raw) => String((raw && (raw.userId || raw.id)) || "").trim()).filter(Boolean));
  const directoryUserIds = new Set(items.map((raw) => String((raw && (raw.userId || raw.id)) || "").trim()).filter(Boolean));
  const filteredPeople = [];
  people.forEach((person) => {
    if (!person || typeof person !== "object") return;
    const puid = String(person.userId || "").trim();
    if (!puid) {
      const localName = String(person.name || "").trim().toLowerCase();
      if (localName && activeDirectoryNames.has(localName)) {
        changed = true;
        return;
      }
      filteredPeople.push(person);
      return;
    }
    if (!directoryUserIds.has(puid) || activeUserIds.has(puid)) {
      filteredPeople.push(person);
      return;
    }
    changed = true;
  });
  if (filteredPeople.length !== people.length) {
    people = filteredPeople;
  }

  const seen = new Set();
  const nextPeople = [];
  people.forEach((person) => {
    if (!person || typeof person !== "object") return;
    const key = String(person.userId || person.id || "").trim();
    if (!key) return;
    if (seen.has(key)) {
      changed = true;
      return;
    }
    seen.add(key);
    nextPeople.push(person);
  });
  if (nextPeople.length !== people.length) {
    people = nextPeople;
  }

  return changed;
}

async function syncPeopleFromDirectory() {
  if (peopleDirectorySyncInFlight) return;
  if (!remoteStateBootstrapped && window.dataProvider && typeof window.dataProvider.loadState === "function") {
    queuePeopleDirectorySync();
    return;
  }
  peopleDirectorySyncInFlight = true;
  try {
    const token = await ensureAccessToken();
    if (!token) {
      queuePeopleDirectorySync();
      return;
    }

    const res = await fetch("/api/people/directory", {
      headers: { authorization: `Bearer ${token}` },
      credentials: "include"
    });
    if (!res.ok) return;
    const body = await res.json().catch(() => []);
    peopleDirectoryUsers = Array.isArray(body) ? body.slice() : [];
    const changed = mergePeopleDirectoryItems(Array.isArray(body) ? body : []);
    if (!changed) return;

    persistState();
    renderPeopleOptions();
    renderAbsencePersonOptions();
    renderTaskPersonOptions();
    renderReportPeopleOptions();
    renderPeopleManager();
    renderFilters();
    renderCalendar();
    renderSelectedDayPanel();
    renderUpcomingList();
    renderNotesPanel();
  } finally {
    peopleDirectorySyncInFlight = false;
  }
}


function queueRealtimeSync() {
  if (remoteStateLoading) return;
  if (realtimeSyncTimer) return;
  realtimeSyncTimer = setTimeout(() => {
    realtimeSyncTimer = null;
    bootstrapRemoteState();
  scheduleStickyNotesPullFromShared(250);
  }, 250);
}

function initRealtimeSync() {
  if (!window.dataProvider || typeof window.dataProvider.subscribeRealtime !== "function") return;
  if (typeof realtimeUnsubscribe === "function") realtimeUnsubscribe();
  if (stickyNotesPollTimer) {
    clearInterval(stickyNotesPollTimer);
    stickyNotesPollTimer = null;
  }
  if (peopleDirectoryPollTimer) {
    clearInterval(peopleDirectoryPollTimer);
    peopleDirectoryPollTimer = null;
  }
  if (sharedOverlayPollTimer) {
    clearInterval(sharedOverlayPollTimer);
    sharedOverlayPollTimer = null;
  }
  realtimeConnectionStatus = "disconnected";
  renderConnectionStatus();
  realtimeUnsubscribe = window.dataProvider.subscribeRealtime((payload) => {
    if (!isNewRealtimePayload(payload)) return;
    queueRealtimeSync();
    queueCurrentUserSessionRefresh(true);
    queueAdminUsersRefresh();
    if (shouldShowExternalSyncToast(payload)) {
      showSyncToast(t("externalUpdateNotice"));
    }
  });

  // Keep shared sticky notes fresh even when realtime stream follows personal mode.
  stickyNotesPollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    scheduleStickyNotesPullFromShared(0);
  }, 2500);

  // Pull directory updates (including user color changes from admin panel).
  peopleDirectoryPollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    queuePeopleDirectorySync();
  }, 10000);

  // Personal mode overlays shared state, so poll shared+personal merge to catch
  // shared event/task changes that do not push through the personal realtime stream.
  sharedOverlayPollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (!isPersonalCalendarMode()) return;
    if (remoteStateLoading) return;
    bootstrapRemoteState();
  }, 3000);
}

window.addEventListener("procal-realtime-status", (event) => {
  const status = String((event && event.detail && event.detail.status) || "").toLowerCase();
  const prev = realtimeConnectionStatus;
  realtimeConnectionStatus = status === "connected" ? "connected" : "disconnected";
  renderConnectionStatus();
  if (prev !== "connected" && realtimeConnectionStatus === "connected") {
    queueRealtimeSync();
    queueCurrentUserSessionRefresh(true);
    if (isAdminRole()) queueAdminUsersRefresh();
  }
  if (prev !== realtimeConnectionStatus) {
    initChatPolling();
    if (chatOpen) {
      if (chatOpenPollTimer) {
        clearInterval(chatOpenPollTimer);
        chatOpenPollTimer = null;
      }
      chatOpenPollTimer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void (async () => {
          await loadChatMessages();
          await markChatThreadRead();
          await loadChatThreads();
          await refreshChatUnreadCount();
        })();
      }, getChatOpenPollIntervalMs());
    }
  }
});

window.addEventListener("procal-notification", () => {
  scheduleNotificationsRefresh(60);
});

window.addEventListener("procal-chat", (event) => {
  const detail = event && event.detail ? event.detail : {};
  const eventName = String((detail && detail.event) || "");
  const payload = detail && detail.payload ? detail.payload : {};
  if (eventName === "chat_presence") {
    const online = Array.isArray(payload && payload.onlineUserIds) ? payload.onlineUserIds.map((x) => String(x || "")) : [];
    chatOnlineUserIds = new Set(online);
    scheduleChatRealtimeRefresh("presence");
    return;
  }
  if (eventName !== "chat_message") return;
  const msg = payload && payload.message ? payload.message : null;
  const recipients = Array.isArray(payload && payload.recipients) ? payload.recipients.map((x) => String(x || "")) : [];
  if (currentUserId && recipients.length && !recipients.includes(String(currentUserId))) return;
  const activeHit = chatOpen && chatMessageMatchesActiveThread(msg);
  scheduleChatRealtimeRefresh(activeHit ? "activeThread" : "message");
});

window.addEventListener("beforeunload", () => {
  if (stickyNotesPollTimer) {
    clearInterval(stickyNotesPollTimer);
    stickyNotesPollTimer = null;
  }
  if (peopleDirectoryPollTimer) {
    clearInterval(peopleDirectoryPollTimer);
    peopleDirectoryPollTimer = null;
  }
  if (sharedOverlayPollTimer) {
    clearInterval(sharedOverlayPollTimer);
    sharedOverlayPollTimer = null;
  }
  if (typeof realtimeUnsubscribe === "function") {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }
  if (notificationsRefreshTimer) {
    clearTimeout(notificationsRefreshTimer);
    notificationsRefreshTimer = null;
  }
  if (chatBadgePollTimer) {
    clearInterval(chatBadgePollTimer);
    chatBadgePollTimer = null;
  }
  if (chatOpenPollTimer) {
    clearInterval(chatOpenPollTimer);
    chatOpenPollTimer = null;
  }
  if (chatRealtimeRefreshTimer) {
    clearTimeout(chatRealtimeRefreshTimer);
    chatRealtimeRefreshTimer = null;
  }
});
function bootstrapRemoteState() {
  if (remoteStateLoading) return;
  if (!window.dataProvider || typeof window.dataProvider.loadState !== "function") return;

  remoteStateLoading = true;
  const loadCurrent = window.dataProvider.loadState();
  const loadShared = (isPersonalCalendarMode() && typeof window.dataProvider.loadSharedState === "function")
    ? window.dataProvider.loadSharedState().catch(() => null)
    : Promise.resolve(null);

  Promise.all([loadCurrent, loadShared])
    .then(([remoteEnvelope, sharedEnvelope]) => {
      if (!remoteEnvelope || typeof remoteEnvelope !== "object") return;
      const currentMode = isPersonalCalendarMode() ? "personal" : "shared";
      const envelopeSignature = buildBootstrapEnvelopeSignature(currentMode, remoteEnvelope, sharedEnvelope);
      if (envelopeSignature && lastBootstrapSignatureByMode[currentMode] === envelopeSignature) {
        return;
      }
      const remoteState = remoteEnvelope.state && typeof remoteEnvelope.state === "object"
        ? remoteEnvelope.state
        : remoteEnvelope;
      const cleaned = sanitizeState(remoteState || {});

      if (!isPersonalCalendarMode() || !sharedEnvelope || typeof sharedEnvelope !== "object") {
        personalSharedOverlayEventIds = new Set();
        personalSharedOverlayTaskIds = new Set();
        if (envelopeSignature) lastBootstrapSignatureByMode[currentMode] = envelopeSignature;
        applyCleanState(cleaned, remoteEnvelope.modifiedAt || remoteEnvelope.updatedAt || new Date().toISOString());
        return;
      }

      const sharedStateRaw = sharedEnvelope.state && typeof sharedEnvelope.state === "object"
        ? sharedEnvelope.state
        : sharedEnvelope;
      const sharedCleaned = sanitizeState(sharedStateRaw || {});
      personalSharedOverlayEventIds = collectBaseEventIds(sharedCleaned.events);
      personalSharedOverlayTaskIds = collectStandaloneTaskIds(sharedCleaned.tasks);
      const mergedPersonal = sanitizeState(mergePersonalStateWithShared(cleaned, sharedCleaned));
      if (envelopeSignature) lastBootstrapSignatureByMode.personal = envelopeSignature;
      applyCleanState(mergedPersonal, remoteEnvelope.modifiedAt || remoteEnvelope.updatedAt || new Date().toISOString());
    })
    .catch(() => {
      // keep local state if remote is unavailable
    })
    .finally(() => {
      remoteStateBootstrapped = true;
      remoteStateLoading = false;
    });
}

function buildBootstrapEnvelopeSignature(mode, remoteEnvelope, sharedEnvelope) {
  const baseSig = getEnvelopeVersionSignature(remoteEnvelope);
  if (mode !== "personal") return `shared:${baseSig}`;
  const sharedSig = (sharedEnvelope && typeof sharedEnvelope === "object")
    ? getEnvelopeVersionSignature(sharedEnvelope)
    : "none";
  return `personal:${baseSig}|shared:${sharedSig}`;
}

function getEnvelopeVersionSignature(envelope) {
  if (!envelope || typeof envelope !== "object") return "none";
  const version = Number((envelope && envelope.version) || 0);
  const updatedAt = typeof envelope.updatedAt === "string"
    ? envelope.updatedAt
    : (typeof envelope.modifiedAt === "string" ? envelope.modifiedAt : "");
  return `${version}:${updatedAt}`;
}

function sanitizeState(value) {
  const safeCategories = sanitizeCategories(value && value.categories);
  const safePeople = sanitizePeople(value && value.people);
  const knownPeople = new Set();
  safePeople.forEach((person) => {
    const id = String((person && person.id) || "").trim();
    const userId = String((person && person.userId) || "").trim();
    if (id) knownPeople.add(id);
    if (userId) knownPeople.add(userId);
  });
  const safeEvents = sanitizeEvents(value && value.events, knownPeople, safeCategories);
  const safeAbsences = sanitizeAbsences(value && value.absences, knownPeople);
  const safeTasks = sanitizeStandaloneTasks(value && value.tasks, knownPeople, safeCategories);
  const safeStickyNotes = sanitizeStickyNotes(value && value.stickyNotes);
  return { events: safeEvents, people: safePeople, absences: safeAbsences, categories: safeCategories, tasks: safeTasks, stickyNotes: safeStickyNotes };
}

function sanitizeCategories(list) {
  const fallback = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  if (!Array.isArray(list) || !list.length) return fallback;
  const out = [];
  const seen = new Set();
  list.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const id = typeof item.id === "string" && item.id ? item.id : createCategoryId();
    if (seen.has(id)) return;
    const name = String(item.name || "").trim();
    if (!name) return;
    const color = normalizeHexColor(item.color, "#0ea5e9");
    out.push({ id, name, color });
    seen.add(id);
  });
  return out.length ? out : fallback;
}

function sanitizePeople(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  list.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const id = typeof item.id === "string" && item.id ? item.id : createPersonId();
    if (seen.has(id)) return;
    const name = String(item.name || "").trim();
    if (!name) return;
    const color = normalizePersonColor(String(item.color || ""));
    const userId = String(item.userId || "").trim();
    const username = String(item.username || "").trim();
    if (userId) {
      out.push(username ? { id, name, color, userId, username } : { id, name, color, userId });
    } else {
      out.push({ id, name, color });
    }
    seen.add(id);
  });
  return out;
}

function collectBaseEventIds(eventsByDateInput) {
  const out = new Set();
  const map = eventsByDateInput && typeof eventsByDateInput === "object" ? eventsByDateInput : {};
  Object.values(map).forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((evt) => {
      const id = String((evt && evt.id) || "").trim();
      if (id) out.add(id);
    });
  });
  return out;
}

function collectStandaloneTaskIds(tasksByDateInput) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.collectStandaloneTaskIds !== "function") return new Set();
  return mod.collectStandaloneTaskIds(tasksByDateInput);
}

function mergePersonalStateWithShared(personalState, sharedState) {
  const personal = personalState && typeof personalState === "object" ? personalState : {};
  const shared = sharedState && typeof sharedState === "object" ? sharedState : {};

  return {
    ...personal,
    people: mergePeopleForPersonalOverlay(personal.people, shared.people),
    categories: mergeCategoriesForPersonalOverlay(personal.categories, shared.categories),
    absences: Array.isArray(shared.absences) ? shared.absences.slice() : (Array.isArray(personal.absences) ? personal.absences.slice() : []),
    events: mergeEventsForPersonalOverlay(personal.events, shared.events),
    tasks: mergeStandaloneTasksForPersonalOverlay(personal.tasks, shared.tasks)
  };
}

function getEventBaseId(evt) {
  return String((evt && (evt.seriesId || evt.id)) || "").trim();
}

function isSharedEventReadOnlyInPersonalMode(evt) {
  if (!isPersonalCalendarMode()) return false;
  const key = getEventBaseId(evt);
  if (!key) return false;
  return personalSharedOverlayEventIds.has(key);
}

function isLinkedStandaloneTask(task) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.isLinkedStandaloneTask !== "function") return Boolean(task && String(task.linkedEventId || "").trim());
  return mod.isLinkedStandaloneTask(task);
}

function isSharedStandaloneTaskInPersonalMode(task) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.isSharedStandaloneTaskInPersonalMode !== "function") return false;
  return mod.isSharedStandaloneTaskInPersonalMode(task, {
    currentCalendarMode,
    personalSharedOverlayTaskIds
  });
}

function markSharedOriginVisual(el) {
  if (!el || !el.classList) return;
  el.classList.add("shared-origin-marker");
}

function getLinkedTaskContextLabel(task, includeEventTitle = true) {
  const mod = window.ProCalModules && window.ProCalModules.taskHelpers;
  if (!mod || typeof mod.getLinkedTaskContextLabel !== "function") return "";
  return mod.getLinkedTaskContextLabel(task, {
    includeEventTitle,
    currentLang
  });
}

function getLinkedStandaloneTaskRowsForEvent(evt, dateKeyHint) {
  const mod = window.ProCalModules && window.ProCalModules.taskLinkedFlow;
  if (!mod || typeof mod.getLinkedStandaloneTaskRowsForEvent !== "function") return [];
  return mod.getLinkedStandaloneTaskRowsForEvent({
    event: evt,
    dateKeyHint,
    isPersonalCalendarMode,
    getEventBaseId,
    isDateKey,
    tasksByDate
  });
}

function createLinkedStandaloneTaskForEvent(evt, dateKeyHint, payload) {
  const mod = window.ProCalModules && window.ProCalModules.taskLinkedFlow;
  if (!mod || typeof mod.createLinkedStandaloneTaskForEvent !== "function") return;
  mod.createLinkedStandaloneTaskForEvent({
    readOnly: READ_ONLY,
    event: evt,
    dateKeyHint,
    payload,
    selectedDateKey,
    isPersonalCalendarMode,
    isDateKey,
    getAbsentPersonIdsForRange,
    normalizeTaskAssigneeIds,
    normalizePersonalTaskAssignees,
    people,
    tasksByDate,
    createTaskId,
    currentUserId,
    getEventBaseId,
    persistState,
    sendPersonalTaskCollabInvites,
    renderStandaloneTaskList,
    renderSelectedDayPanel,
    renderUpcomingList,
    renderCalendar
  });
}

function openLinkedTaskCreateForEvent(evt, dateKeyHint) {
  const mod = window.ProCalModules && window.ProCalModules.taskLinkedFlow;
  if (!mod || typeof mod.openLinkedTaskCreateForEvent !== "function") return;
  mod.openLinkedTaskCreateForEvent({
    event: evt,
    dateKeyHint,
    selectedDateKey,
    isPersonalCalendarMode,
    isDateKey,
    normalizePersonalTaskAssignees,
    openTaskEditDialog,
    createLinkedStandaloneTaskForEvent,
    t
  });
}

function suppressDayMenuOpen(ms = 280) {
  suppressDayMenuOpenUntil = Date.now() + Math.max(0, Number(ms) || 0);
}

function mergePeopleForPersonalOverlay(personalList, sharedList) {
  const out = [];
  const seen = new Set();
  const sharedRows = Array.isArray(sharedList) ? sharedList : [];
  const personalRows = Array.isArray(personalList) ? personalList : [];

  const personKey = (row) => String((row && (row.userId || row.id)) || "").trim();
  sharedRows.forEach((row) => {
    const key = personKey(row);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  personalRows.forEach((row) => {
    const key = personKey(row);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  return out;
}

function mergeCategoriesForPersonalOverlay(personalList, sharedList) {
  const out = [];
  const seen = new Set();
  const sharedRows = Array.isArray(sharedList) ? sharedList : [];
  const personalRows = Array.isArray(personalList) ? personalList : [];

  sharedRows.forEach((row) => {
    const key = String((row && row.id) || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  personalRows.forEach((row) => {
    const key = String((row && row.id) || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  return out;
}

function mergeEventTasksForPersonalOverlay(personalTasks, sharedTasks) {
  const mod = window.ProCalModules && window.ProCalModules.taskStateMerge;
  if (!mod || typeof mod.mergeEventTasksForPersonalOverlay !== "function") return [];
  return mod.mergeEventTasksForPersonalOverlay(personalTasks, sharedTasks);
}

function mergeEventsForPersonalOverlay(personalEventsByDate, sharedEventsByDate) {
  const personalMap = personalEventsByDate && typeof personalEventsByDate === "object" ? personalEventsByDate : {};
  const sharedMap = sharedEventsByDate && typeof sharedEventsByDate === "object" ? sharedEventsByDate : {};
  const out = {};
  const personalById = new Map();
  const sharedIds = new Set();

  Object.entries(personalMap).forEach(([dateKey, list]) => {
    if (!Array.isArray(list)) return;
    list.forEach((evt) => {
      const id = String((evt && evt.id) || "").trim();
      if (!id) return;
      personalById.set(id, { dateKey, evt });
    });
  });

  Object.entries(sharedMap).forEach(([dateKey, list]) => {
    if (!Array.isArray(list)) return;
    const mergedList = [];
    list.forEach((sharedEvt) => {
      const sharedId = String((sharedEvt && sharedEvt.id) || "").trim();
      if (!sharedId) return;
      sharedIds.add(sharedId);
      const personalHit = personalById.get(sharedId);
      if (personalHit && personalHit.evt && typeof personalHit.evt === "object") {
        mergedList.push({
          ...personalHit.evt,
          ...sharedEvt,
          tasks: mergeEventTasksForPersonalOverlay(personalHit.evt.tasks, sharedEvt.tasks)
        });
      } else {
        mergedList.push(sharedEvt);
      }
    });
    if (mergedList.length) out[dateKey] = mergedList;
  });

  Object.entries(personalMap).forEach(([dateKey, list]) => {
    if (!Array.isArray(list)) return;
    const extras = list.filter((evt) => {
      const id = String((evt && evt.id) || "").trim();
      return id && !sharedIds.has(id);
    });
    if (!extras.length) return;
    out[dateKey] = Array.isArray(out[dateKey]) ? out[dateKey].concat(extras) : extras.slice();
  });

  return out;
}

function mergeStandaloneTasksForPersonalOverlay(personalTasksByDate, sharedTasksByDate) {
  const mod = window.ProCalModules && window.ProCalModules.taskStateMerge;
  if (!mod || typeof mod.mergeStandaloneTasksForPersonalOverlay !== "function") return {};
  return mod.mergeStandaloneTasksForPersonalOverlay(personalTasksByDate, sharedTasksByDate);
}

function sanitizeAbsences(list, knownPeople) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : createAbsenceId(),
      personId: String(item.personId || ""),
      startDate: String(item.startDate || ""),
      endDate: String(item.endDate || ""),
      note: String(item.note || "").trim()
    }))
    .filter((item) => knownPeople.has(item.personId) && isDateKey(item.startDate) && isDateKey(item.endDate) && item.startDate <= item.endDate);
}

function sanitizeEvents(value, knownPeople, safeCategories) {
  const out = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  const knownCategories = new Set((safeCategories || []).map((cat) => cat.id));
  const timeMeta = window.ProCalModules && window.ProCalModules.eventTimeMeta;

  Object.entries(value).forEach(([dateKey, list]) => {
    if (!isDateKey(dateKey) || !Array.isArray(list)) return;
    const safeList = list
      .filter((evt) => evt && typeof evt === "object")
      .map((evt) => {
        const startDate = isDateKey(String(evt.startDate || "")) ? String(evt.startDate) : dateKey;
        const endDate = isDateKey(String(evt.endDate || "")) ? String(evt.endDate) : startDate;
        const rec = sanitizeRecurrence(evt.recurrence, startDate);
        const timingFields = timeMeta && typeof timeMeta.buildEventTimingFields === "function"
          ? timeMeta.buildEventTimingFields({
            startDate,
            endDate,
            time: String(evt.time || "").trim(),
            startTime: String(evt.startTime || "").trim(),
            endTime: String(evt.endTime || "").trim(),
            isAllDay: Boolean(evt.isAllDay)
          })
          : {
            isAllDay: !String(evt.time || "").trim(),
            startTime: String(evt.time || "").trim(),
            endTime: "",
            time: String(evt.time || "").trim()
          };
        return {
          id: typeof evt.id === "string" ? evt.id : createId(),
          title: String(evt.title || "").trim(),
          description: String(evt.description || "").trim(),
          time: String(timingFields.time || "").trim(),
          startTime: String(timingFields.startTime || "").trim(),
          endTime: String(timingFields.endTime || "").trim(),
          isAllDay: Boolean(timingFields.isAllDay),
          startDate,
          endDate: endDate < startDate ? startDate : endDate,
          categoryId: knownCategories.has(String(evt.categoryId || "")) ? String(evt.categoryId) : fallbackCategoryId,
          peopleIds: filterKnownIds(evt.peopleIds, knownPeople),
          absentIds: filterKnownIds(evt.absentIds, knownPeople),
          filesFolderEnabled: readEventFilesFolderEnabled(evt),
          filesDetached: readEventFilesDetached(evt),
          recurrence: rec,
          tasks: sanitizeTaskList(evt.tasks, knownPeople)
        };
      })
      .filter((evt) => evt.title && isDateKey(evt.startDate) && isDateKey(evt.endDate) && evt.startDate <= evt.endDate)
      .sort(sortEvents);
    if (safeList.length) out[dateKey] = safeList;
  });

  return out;
}

function sanitizeTaskList(list, knownPeopleOrOptions) {
  const mod = window.ProCalModules && window.ProCalModules.taskStateMerge;
  if (!mod || typeof mod.sanitizeTaskList !== "function") return [];
  const options = knownPeopleOrOptions && typeof knownPeopleOrOptions === "object" && !(knownPeopleOrOptions instanceof Set)
    ? knownPeopleOrOptions
    : { knownPeople: knownPeopleOrOptions };
  const knownPeople = options.knownPeople instanceof Set ? options.knownPeople : new Set();
  return mod.sanitizeTaskList(list, {
    knownPeople,
    filterKnownIds: typeof options.filterKnownIds === "function" ? options.filterKnownIds : filterKnownIds,
    createTaskId: typeof options.createTaskId === "function" ? options.createTaskId : createTaskId,
    isDateKey: typeof options.isDateKey === "function" ? options.isDateKey : isDateKey
  });
}

function sanitizeStandaloneTasks(value, knownPeople, safeCategories) {
  const mod = window.ProCalModules && window.ProCalModules.taskStateMerge;
  if (!mod || typeof mod.sanitizeStandaloneTasks !== "function") return {};
  return mod.sanitizeStandaloneTasks(value, {
    knownPeople,
    safeCategories,
    isDateKey,
    sanitizeTaskList,
    filterKnownIds,
    createTaskId
  });
}

function sanitizeRecurrence(value, baseStartDate) {
  if (!value || typeof value !== "object") return null;
  const freq = String(value.freq || "none");
  if (!freq || freq === "none") return null;
  if (!["daily", "weekly", "monthly", "yearly"].includes(freq)) return null;

  const endMode = String(value.endMode || "forever");
  if (endMode === "count") {
    const count = Number.parseInt(String(value.count || "0"), 10);
    if (!Number.isFinite(count) || count < 1) return null;
    return { freq, endMode: "count", count, untilDate: null };
  }

  if (endMode === "until") {
    const untilDate = String(value.untilDate || "");
    if (!isDateKey(untilDate) || untilDate < baseStartDate) return null;
    return { freq, endMode: "until", count: null, untilDate };
  }

  return { freq, endMode: "forever", count: null, untilDate: null };
}

function applyReadOnlyMode() {
  [
    addEventBtn, settingsBtn, exportBtn, importInput, monthViewBtn, yearViewBtn,
    openEventFormBtn, openAbsenceFormBtn, openTaskFormBtn,
    clearFiltersBtn
  ].forEach((el) => {
    if (!el) return;
    el.disabled = true;
  });

  [eventForm, absenceForm, personForm, categoryForm, taskForm, reportsForm].forEach((form) => {
    if (!form) return;
    form.querySelectorAll("input, select, textarea, button").forEach((ctrl) => {
      if (ctrl.id === "closeReportsBtn") return;
      if (ctrl.id === "closeDayMenuBtn") return;
      if (ctrl.id === "closePeopleMenuBtn") return;
      if (ctrl.id === "closeSettingsMenuBtn") return;
      if (ctrl.id === "closeCategoriesMenuBtn") return;
      ctrl.disabled = true;
    });
  });
}

function renderCategoryOptions() {
  if (!eventCategory) return;
  const prev = eventCategory.value;
  eventCategory.innerHTML = "";
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    option.style.color = cat.color;
    if (prev === cat.id) option.selected = true;
    eventCategory.appendChild(option);
  });
  if (!eventCategory.value && categories.length) eventCategory.value = categories[0].id;

  if (taskCategorySelect) {
    const prevTask = taskCategorySelect.value;
    taskCategorySelect.innerHTML = "";
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = t("noCategory");
    if (!prevTask) noneOption.selected = true;
    taskCategorySelect.appendChild(noneOption);
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      option.style.color = cat.color;
      if (prevTask === cat.id) option.selected = true;
      taskCategorySelect.appendChild(option);
    });
  }
}

function getAbsentPersonIdsForRange(startDate, endDate) {
  const mod = window.ProCalModules && window.ProCalModules.peopleAvailability;
  if (!mod || typeof mod.getAbsentPersonIdsForRange !== "function") return new Set();
  return mod.getAbsentPersonIdsForRange(startDate, endDate, {
    isDateKey,
    rangesOverlap,
    absences
  });
}

function applyAbsenceRulesToChecklist(container, startDate, endDate) {
  const mod = window.ProCalModules && window.ProCalModules.peopleAvailability;
  if (!mod || typeof mod.applyAbsenceRulesToChecklist !== "function") return;
  return mod.applyAbsenceRulesToChecklist(container, startDate, endDate, {
    isDateKey,
    rangesOverlap,
    absences,
    t
  });
}

function refreshEventPeopleAvailability() {
  const mod = window.ProCalModules && window.ProCalModules.peopleAvailability;
  if (!mod || typeof mod.refreshEventPeopleAvailability !== "function") return;
  return mod.refreshEventPeopleAvailability({
    isDateKey,
    selectedDateKey,
    eventStart,
    eventEnd,
    eventPeopleChecklist,
    absences,
    rangesOverlap,
    t
  });
}

function refreshTaskChecklistAvailability(dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.peopleAvailability;
  if (!mod || typeof mod.refreshTaskChecklistAvailability !== "function") return;
  return mod.refreshTaskChecklistAvailability(dateKey, {
    isDateKey,
    selectedDateKey,
    taskPersonChecklist,
    absences,
    rangesOverlap,
    t
  });
}

function refreshEventTaskChecklistAvailability() {
  const mod = window.ProCalModules && window.ProCalModules.peopleAvailability;
  if (!mod || typeof mod.refreshEventTaskChecklistAvailability !== "function") return;
  return mod.refreshEventTaskChecklistAvailability({
    isDateKey,
    selectedDateKey,
    eventStart,
    eventEnd,
    eventTaskPeopleChecklist,
    absences,
    rangesOverlap,
    t
  });
}

function renderPeopleOptions() {
  const checklist = window.ProCalModules && window.ProCalModules.peopleChecklist;
  if (!checklist || typeof checklist.renderEventPeopleChecklist !== "function") return;
  checklist.renderEventPeopleChecklist({
    container: eventPeopleChecklist,
    roster: getOperationalPeople(),
    selectedIds: [],
    getPersonDisplayName,
    refreshEventPeopleAvailability
  });
  renderEventReminderCustomPeople(getCheckedIdsFromContainer(eventReminderCustomPeopleChecklist));
}

function getCheckedPeopleIds() {
  const checklist = window.ProCalModules && window.ProCalModules.peopleChecklist;
  if (!checklist || typeof checklist.getCheckedIds !== "function") return [];
  return checklist.getCheckedIds({ container: eventPeopleChecklist });
}

function clearPeopleChecks() {
  const checklist = window.ProCalModules && window.ProCalModules.peopleChecklist;
  if (!checklist || typeof checklist.clearChecks !== "function") return;
  checklist.clearChecks({ container: eventPeopleChecklist });
}

function renderAbsencePersonOptions() {
  const peopleOptions = window.ProCalModules && window.ProCalModules.peopleOptions;
  if (!peopleOptions || typeof peopleOptions.renderAbsencePersonOptions !== "function") return;
  peopleOptions.renderAbsencePersonOptions({
    selectEl: absencePerson,
    roster: getOperationalPeople(),
    getPersonDisplayName,
    renderAbsentOptionsForRange
  });
}

function renderAbsentOptionsForRange() {
  const mod = window.ProCalModules && window.ProCalModules.calendarDayMenuFlow;
  if (!mod || typeof mod.renderAbsentOptionsForRange !== "function") return;
  mod.renderAbsentOptionsForRange({
    eventAbsent,
    roster: getOperationalPeople(),
    eventStart,
    eventEnd,
    selectedDateKey,
    isDateKey,
    absences,
    rangesOverlap,
    getPersonDisplayName,
    t,
    refreshEventPeopleAvailability,
    refreshEventTaskChecklistAvailability
  });
}

function renderPeopleManager() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.renderPeopleManager !== "function") return;
  return mod.renderPeopleManager({
    peopleList,
    people,
    t,
    onEditPerson: (person) => {
      editingPersonId = person.id;
      personNameInput.value = person.name;
      personColorInput.value = person.color;
      applyTranslations();
    },
    onDeletePerson: (person) => {
      people = people.filter((p) => p.id !== person.id);
      removePersonFromEvents(person.id);
      removePersonFromAbsences(person.id);
      persistState();
      renderPeopleOptions();
      renderAbsencePersonOptions();
      renderTaskPersonOptions();
      renderReportPeopleOptions();
      renderPeopleManager();
      renderFilters();
      persistUiPrefs();
      renderCalendar();
      renderSelectedDayPanel();
      renderUpcomingList();
    }
  });
}

function hasPersonName(name) {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.hasPersonName !== "function") return false;
  return mod.hasPersonName(name, { people });
}

function resetPersonEditor() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.resetPersonEditor !== "function") return;
  return mod.resetPersonEditor({
    setEditingPersonId: (value) => { editingPersonId = value; },
    personForm,
    personColorInput,
    defaultPersonColor: PERSON_COLORS[0],
    applyTranslations
  });
}

function renderCategoriesManager() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.renderCategoriesManager !== "function") return;
  return mod.renderCategoriesManager({
    categoriesList,
    categories,
    t,
    onEditCategory: (cat) => {
      editingCategoryId = cat.id;
      categoryNameInput.value = cat.name;
      categoryColorInput.value = cat.color;
      applyTranslations();
    },
    onDeleteCategory: (cat) => {
      if (categories.length <= 1) return;
      const fallback = categories.find((x) => x.id !== cat.id);
      categories = categories.filter((x) => x.id !== cat.id);
      reassignCategory(cat.id, fallback.id);
      activeFilters.categoryIds.delete(cat.id);
      persistState();
      renderCategoryOptions();
      renderCategoriesManager();
      renderFilters();
      persistUiPrefs();
      renderCalendar();
      renderSelectedDayPanel();
      renderUpcomingList();
    }
  });
}

function resetCategoryEditor() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.resetCategoryEditor !== "function") return;
  return mod.resetCategoryEditor({
    setEditingCategoryId: (value) => { editingCategoryId = value; },
    categoryForm,
    categoryColorInput,
    defaultCategoryColor: "#0ea5e9",
    applyTranslations
  });
}

function getActiveFilterCount() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.getActiveFilterCount !== "function") return 0;
  return mod.getActiveFilterCount({ activeFilters });
}

function updateFiltersButtonState() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.updateFiltersButtonState !== "function") return;
  return mod.updateFiltersButtonState({
    filtersBtn,
    activeFilters,
    t
  });
}
function renderFilters() {
  const mod = window.ProCalModules && window.ProCalModules.peopleCategoriesFilters;
  if (!mod || typeof mod.renderFilters !== "function") return;
  return mod.renderFilters({
    categoryFilterList,
    peopleFilterList,
    categories,
    activeFilters,
    getOperationalPeople,
    getPersonDisplayName,
    onFiltersChanged: () => {
      persistUiPrefs();
      updateFiltersButtonState();
      renderCalendar();
      renderSelectedDayPanel();
      renderUpcomingList();
    }
  });
}

function sortEvents(a, b) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.sortEvents !== "function") return 0;
  return mod.sortEvents(a, b, { getLocale });
}

function findBaseEventById(seriesId) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.findBaseEventById !== "function") return null;
  return mod.findBaseEventById(seriesId, { eventsByDate });
}

function deleteEventById(seriesId) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.deleteEventById !== "function") return;
  mod.deleteEventById(seriesId, { eventsByDate });
}

function getAbsencesForDate(dateKey) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.getAbsencesForDate !== "function") return [];
  return mod.getAbsencesForDate(dateKey, {
    absences,
    isDateInRange
  });
}

function buildPeopleMap() {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.buildPeopleMap !== "function") return new Map();
  return mod.buildPeopleMap({ getOperationalPeople });
}

function describeEventPeople(evt) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.describeEventPeople !== "function") return "";
  return mod.describeEventPeople(evt, {
    getOperationalPeople,
    getPersonDisplayName,
    t
  });
}

function buildEventLaneMap(rangeStart, rangeEnd) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.buildEventLaneMap !== "function") return new Map();
  return mod.buildEventLaneMap(rangeStart, rangeEnd, {
    getEventsInRange,
    sortEvents
  });
}

function collectUpcomingRows(limit) {
  const mod = window.ProCalModules && window.ProCalModules.calendarAggregation;
  if (!mod || typeof mod.collectUpcomingRows !== "function") return { activeRows: [], doneTaskRows: [] };
  return mod.collectUpcomingRows(limit, {
    addDaysToKey,
    todayKey,
    t,
    getLocale,
    getEventsInRange,
    matchesEventFilters,
    matchesAbsenceFilters,
    matchesTaskFilters,
    absences,
    tasksByDate,
    isDateKey,
    isLinkedStandaloneTask,
    getTaskAssigneeIds
  });
}

function renderYearCalendar() {
  const mod = window.ProCalModules && window.ProCalModules.calendarYearGrid;
  if (!mod || typeof mod.renderYearCalendar !== "function") return;
  mod.renderYearCalendar({
    documentRef: document,
    calendarGrid,
    monthLabel,
    currentMonth,
    getLocale,
    toDateKey,
    getHolidayNamesForDate,
    isDayOffHoliday,
    getEventsForDate,
    matchesEventFilters,
    getCategoryById,
    hexToAlpha,
    todayKey,
    setCurrentView: (value) => { currentView = String(value || currentView); },
    setCurrentMonth: (value) => { if (value instanceof Date) currentMonth = value; },
    setSelectedDateKey: (value) => { selectedDateKey = String(value || ""); },
    renderCalendar,
    renderSelectedDayPanel
  });
}

function expandEventOccurrences(base, rangeStart, rangeEnd) {
  const mod = window.ProCalModules && window.ProCalModules.calendarOccurrences;
  if (!mod || typeof mod.expandEventOccurrences !== "function") return [];
  return mod.expandEventOccurrences(base, rangeStart, rangeEnd, {
    isDateKey,
    parseDateKey,
    sanitizeRecurrence,
    addDaysToKey,
    rangesOverlap,
    toDateKey
  });
}
















































































































function isAdminRole() {
  return currentUserRole === "system_admin" || currentUserRole === "admin";
}

function applySettingsAccessControls() {
  const mod = window.ProCalModules && window.ProCalModules.adminUsersPanel;
  if (!mod || typeof mod.applySettingsAccessControls !== "function") return;
  mod.applySettingsAccessControls({
    isAdmin: isAdminRole() && canUseAdminPanel(),
    settingsUserSection: null,
    settingsAdminSection,
    userOnlyControls: [],
    menuLogoutBtn,
    menuAdminBtn
  });
}

function renderAdminUsersPanel() {
  const mod = window.ProCalModules && window.ProCalModules.adminUsersPanel;
  if (!mod || typeof mod.renderUsersPanel !== "function") return;
  mod.renderUsersPanel({ adminUsersWrap });
}

function renderAdminUsersList() {
  const mod = window.ProCalModules && window.ProCalModules.adminUsersPanel;
  if (!mod || typeof mod.renderUsersList !== "function") return;
  mod.renderUsersList({
    documentRef: document,
    adminUsersList,
    adminUsersCache,
    onApprove: approveAdminUser,
    onSave: patchAdminUser
  });
}

async function loadAdminUsers() {
  const mod = window.ProCalModules && window.ProCalModules.adminUsersPanel;
  if (!mod || typeof mod.loadUsers !== "function") return;
  await mod.loadUsers({
    isAdmin: isAdminRole(),
    ensureAccessToken,
    fetchRef: fetch,
    setMsg: (text) => { if (adminUsersMsg) adminUsersMsg.textContent = String(text || ""); },
    setCache: (rows) => { adminUsersCache = Array.isArray(rows) ? rows : []; },
    renderUsersList: renderAdminUsersList
  });
}

async function approveAdminUser(userId) {
  const mod = window.ProCalModules && window.ProCalModules.adminUsersPanel;
  if (!mod || typeof mod.approveUser !== "function") return;
  await mod.approveUser({
    userId,
    ensureAccessToken,
    fetchRef: fetch,
    setMsg: (text) => { if (adminUsersMsg) adminUsersMsg.textContent = String(text || ""); },
    reloadUsers: loadAdminUsers
  });
}

async function patchAdminUser(userId, payload) {
  const mod = window.ProCalModules && window.ProCalModules.adminUsersPanel;
  if (!mod || typeof mod.patchUser !== "function") return;
  await mod.patchUser({
    userId,
    payload,
    ensureAccessToken,
    fetchRef: fetch,
    setMsg: (text) => { if (adminUsersMsg) adminUsersMsg.textContent = String(text || ""); },
    reloadUsers: loadAdminUsers
  });
}
















































































































