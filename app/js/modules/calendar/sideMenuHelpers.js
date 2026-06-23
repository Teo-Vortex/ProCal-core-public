(function initCalendarSideMenuHelpersModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function createSideItemMenu(options) {
    const o = options || {};
    const mod = o.eventsListRenderModule;
    if (!mod || typeof mod.createSideItemMenu !== "function") return null;
    return mod.createSideItemMenu({
      documentRef: o.documentRef || root.document,
      readOnly: Boolean(o.readOnly),
      allowActions: o.allowActions,
      t: o.t,
      onEdit: o.onEdit,
      onDelete: o.onDelete
    });
  }

  function closeAllSideItemMenus(options) {
    const o = options || {};
    const doc = o.documentRef || root.document;
    if (!doc || typeof doc.querySelectorAll !== "function") return;
    doc.querySelectorAll(".side-item-menu[open]").forEach((el) => {
      el.open = false;
    });
  }

  function closeAllDayQuickAddMenus(options) {
    const o = options || {};
    const mod = o.calendarDayCellModule;
    if (!mod || typeof mod.closeAllDayQuickAddMenus !== "function") return;
    mod.closeAllDayQuickAddMenus({
      documentRef: o.documentRef || root.document,
      sideDayQuickAddTrigger: o.sideDayQuickAddTrigger
    });
  }

  function toggleSideDayQuickAdd(options) {
    const o = options || {};
    const mod = o.calendarDayCellModule;
    if (!mod || typeof mod.toggleSideDayQuickAdd !== "function") return;
    mod.toggleSideDayQuickAdd({
      sideDayQuickAdd: o.sideDayQuickAdd,
      sideDayQuickAddTrigger: o.sideDayQuickAddTrigger,
      forceOpen: Object.prototype.hasOwnProperty.call(o, "forceOpen") ? o.forceOpen : null,
      closeAllDayQuickAddMenus: o.closeAllDayQuickAddMenus
    });
  }

  root.ProCalModules.calendarSideMenuHelpers = {
    createSideItemMenu,
    closeAllSideItemMenus,
    closeAllDayQuickAddMenus,
    toggleSideDayQuickAdd
  };
})(window);
