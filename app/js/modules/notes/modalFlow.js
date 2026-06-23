(function initNotesModalFlow(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function updateStickyNoteModalTitle(options) {
    const o = options || {};
    if (!o.stickyNoteModalTitle) return;
    const t = typeof o.t === "function" ? o.t : ((key) => key);
    o.stickyNoteModalTitle.textContent = o.editingStickyNoteId ? t("edit") : t("addNote");
  }

  function setStickyNoteColor(options) {
    const o = options || {};
    const paletteModule = o.paletteModule;
    if (!paletteModule || typeof paletteModule.setColor !== "function") return;
    paletteModule.setColor(o.value, {
      normalizeHexColor: o.normalizeHexColor,
      input: o.stickyNoteColorInput,
      palette: o.stickyNotePalette
    });
  }

  function renderStickyNotePalette(options) {
    const o = options || {};
    const paletteModule = o.paletteModule;
    if (!paletteModule || typeof paletteModule.renderPalette !== "function") return;
    paletteModule.renderPalette({
      palette: o.stickyNotePalette,
      colors: o.colors,
      onPick: (color) => {
        if (typeof o.setStickyNoteColor === "function") o.setStickyNoteColor(color);
      }
    });
    if (typeof o.setStickyNoteColor === "function") {
      o.setStickyNoteColor(o.stickyNoteColorInput ? o.stickyNoteColorInput.value : "#fde68a");
    }
  }

  function resetStickyNoteForm(options) {
    const o = options || {};
    if (typeof o.setEditingStickyNoteId === "function") o.setEditingStickyNoteId("");
    if (o.stickyNoteForm && typeof o.stickyNoteForm.reset === "function") o.stickyNoteForm.reset();
    if (typeof o.setStickyNoteColor === "function") o.setStickyNoteColor("#fde68a");
    if (o.stickyNoteModal) {
      o.stickyNoteModal.classList.add("hidden");
      o.stickyNoteModal.setAttribute("aria-hidden", "true");
    }
    if (typeof o.updateStickyNoteModalTitle === "function") o.updateStickyNoteModalTitle();
  }

  function openStickyNoteForm(options) {
    const o = options || {};
    if (!o.stickyNoteForm) return;
    const note = o.note;
    if (note && typeof note === "object") {
      if (typeof o.setEditingStickyNoteId === "function") o.setEditingStickyNoteId(String(note.id || ""));
      if (o.stickyNoteTitleInput) o.stickyNoteTitleInput.value = String(note.title || "");
      if (o.stickyNoteTextInput) o.stickyNoteTextInput.value = String(note.text || "");
      if (typeof o.setStickyNoteColor === "function") o.setStickyNoteColor(o.normalizeHexColor(note.color, "#fde68a"));
    } else {
      if (typeof o.setEditingStickyNoteId === "function") o.setEditingStickyNoteId("");
      o.stickyNoteForm.reset();
      if (typeof o.setStickyNoteColor === "function") o.setStickyNoteColor("#fde68a");
    }
    if (typeof o.updateStickyNoteModalTitle === "function") o.updateStickyNoteModalTitle();
    if (o.stickyNoteModal) {
      o.stickyNoteModal.classList.remove("hidden");
      o.stickyNoteModal.setAttribute("aria-hidden", "false");
    }
    if (o.stickyNoteTitleInput && typeof o.stickyNoteTitleInput.focus === "function") o.stickyNoteTitleInput.focus();
  }

  function closeStickyShareModal(options) {
    const o = options || {};
    if (typeof o.setStickyShareNoteId === "function") o.setStickyShareNoteId("");
    if (o.stickyShareModal) {
      o.stickyShareModal.classList.add("hidden");
      o.stickyShareModal.setAttribute("aria-hidden", "true");
    }
  }

  function openStickyShareModal(options) {
    const o = options || {};
    const stickyShareNoteId = String(o.noteId || "");
    if (typeof o.setStickyShareNoteId === "function") o.setStickyShareNoteId(stickyShareNoteId);
    const stickyNotes = Array.isArray(o.stickyNotes) ? o.stickyNotes : [];
    const note = stickyNotes.find((x) => String((x && x.id) || "") === stickyShareNoteId);
    const isStickyOwner = typeof o.isStickyOwner === "function" ? o.isStickyOwner : (() => false);
    if (!note || !isStickyOwner(note)) return false;
    if (o.stickyShareMode) o.stickyShareMode.value = "copy";
    const getStickyShares = typeof o.getStickyShares === "function" ? o.getStickyShares : (() => []);
    if (typeof o.renderStickySharePeopleChecklist === "function") {
      o.renderStickySharePeopleChecklist(getStickyShares(note).map((entry) => entry.userId));
    }
    if (o.stickyShareModal) {
      o.stickyShareModal.classList.remove("hidden");
      o.stickyShareModal.setAttribute("aria-hidden", "false");
    }
    return true;
  }

  root.ProCalModules.notesModalFlow = {
    updateStickyNoteModalTitle,
    setStickyNoteColor,
    renderStickyNotePalette,
    resetStickyNoteForm,
    openStickyNoteForm,
    closeStickyShareModal,
    openStickyShareModal
  };
})(window);
