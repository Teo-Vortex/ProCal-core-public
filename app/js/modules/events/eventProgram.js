(function initEventsEventProgram(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  let eventProgramPendingFile = null;
  let eventProgramExistingFile = null;
  let eventProgramRemoveExisting = false;
  let handlersAttached = false;

  function getTranslator(options) {
    return typeof options.t === "function" ? options.t : ((key) => key);
  }

  function getSummaryElements(options) {
    return [options.eventProgramSummary, options.eventProgramModalSummary].filter(Boolean);
  }

  function setEventProgramStatus(options, text, danger) {
    const statusEl = options.eventProgramStatus;
    if (!statusEl) return;
    statusEl.textContent = String(text || "");
    statusEl.style.color = danger ? "#b91c1c" : "#64748b";
  }

  function updateEventProgramSummaryUI(options) {
    const summaryEls = getSummaryElements(options || {});
    if (!summaryEls.length) return;
    const t = getTranslator(options || {});
    const formatBytes = typeof options.formatBytes === "function"
      ? options.formatBytes
      : ((value) => String(value || 0));

    let text = t("eventProgramNone");
    if (eventProgramPendingFile) {
      const size = formatBytes(eventProgramPendingFile.size || 0);
      text = `${t("eventProgramPending")}: ${String(eventProgramPendingFile.name || "program.pdf")} • ${size}`;
    } else if (eventProgramExistingFile && !eventProgramRemoveExisting) {
      const size = formatBytes(eventProgramExistingFile.sizeBytes || 0);
      text = `${t("eventProgramCurrent")}: ${String(eventProgramExistingFile.fileName || "program.pdf")} • ${size}`;
    } else if (eventProgramExistingFile && eventProgramRemoveExisting) {
      text = t("eventProgramWillRemove");
    }

    summaryEls.forEach((el) => {
      el.textContent = text;
    });
  }

  function resetEventProgramState(options, config) {
    const opts = options || {};
    const next = config && typeof config === "object" ? config : {};
    const clearPending = next.clearPending !== false;
    const clearExisting = next.clearExisting !== false;
    const clearRemove = next.clearRemove !== false;
    const clearInput = next.clearInput !== false;
    const clearStatus = next.clearStatus !== false;
    const closeModal = Boolean(next.closeModal);

    if (clearPending) eventProgramPendingFile = null;
    if (clearExisting) eventProgramExistingFile = null;
    if (clearRemove) eventProgramRemoveExisting = false;
    if (clearInput && opts.eventProgramInput) opts.eventProgramInput.value = "";
    if (closeModal && typeof opts.closeModalElement === "function" && opts.eventProgramModal) {
      opts.closeModalElement(opts.eventProgramModal);
    }
    if (clearStatus) setEventProgramStatus(opts, "", false);
    updateEventProgramSummaryUI(opts);
  }

  function isSupportedProgramFile(file) {
    if (!(file instanceof File)) return false;
    return /\.pdf$/i.test(String(file.name || ""))
      || String(file.type || "").toLowerCase() === "application/pdf";
  }

  function buildProgramUploadFormData(file, fields) {
    const formData = new FormData();
    formData.append("file", file, String(file && file.name || "program.pdf"));
    Object.entries(fields || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const text = String(value).trim();
      if (!text) return;
      formData.append(key, text);
    });
    return formData;
  }

  function attachEventProgramHandlers(options) {
    if (handlersAttached) return;
    const opts = options || {};
    const t = getTranslator(opts);

    if (opts.openEventProgramModalBtn) {
      opts.openEventProgramModalBtn.addEventListener("click", () => {
        if (typeof opts.openModalElement === "function" && opts.eventProgramModal) {
          opts.openModalElement(opts.eventProgramModal);
        }
      });
    }
    if (opts.closeEventProgramModalBtn) {
      opts.closeEventProgramModalBtn.addEventListener("click", () => {
        if (typeof opts.closeModalElement === "function" && opts.eventProgramModal) {
          opts.closeModalElement(opts.eventProgramModal);
        }
      });
    }
    if (opts.eventProgramModal) {
      opts.eventProgramModal.addEventListener("click", (event) => {
        if (event.target === opts.eventProgramModal && typeof opts.closeModalElement === "function") {
          opts.closeModalElement(opts.eventProgramModal);
        }
      });
    }
    if (opts.eventProgramInput) {
      opts.eventProgramInput.addEventListener("change", () => {
        const next = Array.from(opts.eventProgramInput.files || [])[0] || null;
        if (next && !isSupportedProgramFile(next)) {
          eventProgramPendingFile = null;
          opts.eventProgramInput.value = "";
          setEventProgramStatus(opts, t("eventProgramUnsupported"), true);
          updateEventProgramSummaryUI(opts);
          return;
        }
        eventProgramPendingFile = next;
        eventProgramRemoveExisting = false;
        setEventProgramStatus(opts, "", false);
        updateEventProgramSummaryUI(opts);
      });
    }
    if (opts.eventProgramClearBtn) {
      opts.eventProgramClearBtn.addEventListener("click", () => {
        const hadPending = Boolean(eventProgramPendingFile);
        eventProgramPendingFile = null;
        if (opts.eventProgramInput) opts.eventProgramInput.value = "";
        if (!hadPending && eventProgramExistingFile) {
          eventProgramRemoveExisting = true;
        } else if (hadPending) {
          eventProgramRemoveExisting = false;
        }
        updateEventProgramSummaryUI(opts);
      });
    }
    if (opts.eventProgramPreviewBtn) {
      opts.eventProgramPreviewBtn.addEventListener("click", async () => {
        if (eventProgramPendingFile && typeof opts.openFilePreviewForLocalFile === "function") {
          await opts.openFilePreviewForLocalFile(eventProgramPendingFile);
          return;
        }
        if (eventProgramExistingFile && !eventProgramRemoveExisting && typeof opts.openFilePreviewForRemoteFile === "function") {
          await opts.openFilePreviewForRemoteFile(eventProgramExistingFile);
          return;
        }
        setEventProgramStatus(opts, t("eventProgramMissing"), true);
      });
    }

    handlersAttached = true;
  }

  async function loadEventProgramForEvent(options, eventKey, config) {
    const opts = options || {};
    const t = getTranslator(opts);
    const fetchFilesJson = opts.fetchFilesJson;
    const key = String(eventKey || "").trim();
    const next = config && typeof config === "object" ? config : {};
    if (typeof fetchFilesJson !== "function") return;

    if (!key) {
      eventProgramExistingFile = null;
      eventProgramRemoveExisting = false;
      updateEventProgramSummaryUI(opts);
      if (!next.silent) setEventProgramStatus(opts, "", false);
      return;
    }

    try {
      const body = await fetchFilesJson(`/api/files/events/${encodeURIComponent(key)}`);
      eventProgramExistingFile = body && body.program ? body.program : null;
      eventProgramRemoveExisting = false;
      updateEventProgramSummaryUI(opts);
      if (!next.silent) setEventProgramStatus(opts, eventProgramExistingFile ? t("eventProgramLoaded") : "", false);
    } catch (_) {
      eventProgramExistingFile = null;
      eventProgramRemoveExisting = false;
      updateEventProgramSummaryUI(opts);
      if (!next.silent) setEventProgramStatus(opts, t("eventProgramLoadFailed"), true);
    }
  }

  async function syncEventProgramForEvent(options, eventKey) {
    const opts = options || {};
    const t = getTranslator(opts);
    const key = String(eventKey || "").trim();
    if (!key) return true;
    if (typeof opts.fetchFilesJson !== "function") return true;

    try {
      const eventFolderName = typeof opts.getEventFolderNameHintForFiles === "function"
        ? opts.getEventFolderNameHintForFiles(key)
        : "";
      const eventFilesSettings = typeof opts.getEventFilesSettingsForEvent === "function"
        ? opts.getEventFilesSettingsForEvent(key)
        : null;
      const detachedFromCalendar = Boolean(
        eventFilesSettings && (eventFilesSettings.filesDetached || !eventFilesSettings.filesFolderEnabled)
      );

      if (eventProgramPendingFile) {
        const formData = buildProgramUploadFormData(eventProgramPendingFile, {
          kind: "program",
          eventFolderName,
          detachedFromCalendar: detachedFromCalendar ? "true" : "false"
        });
        await opts.fetchFilesJson(`/api/files/events/${encodeURIComponent(key)}/upload`, {
          method: "POST",
          body: formData
        });
        eventProgramPendingFile = null;
        if (opts.eventProgramInput) opts.eventProgramInput.value = "";
        await loadEventProgramForEvent(opts, key, { silent: true });
        setEventProgramStatus(opts, t("eventProgramSaved"), false);
        return true;
      }

      if (eventProgramRemoveExisting && eventProgramExistingFile && eventProgramExistingFile.id) {
        await opts.fetchFilesJson(`/api/files/events/${encodeURIComponent(key)}/${encodeURIComponent(String(eventProgramExistingFile.id || ""))}`, {
          method: "DELETE",
          body: JSON.stringify({})
        });
        eventProgramExistingFile = null;
        eventProgramRemoveExisting = false;
        updateEventProgramSummaryUI(opts);
        setEventProgramStatus(opts, t("eventProgramRemoved"), false);
        return true;
      }

      setEventProgramStatus(opts, "", false);
      return true;
    } catch (_) {
      setEventProgramStatus(opts, t("eventProgramSaveFailed"), true);
      return false;
    }
  }

  async function previewCurrentEventProgram(options) {
    const opts = options || {};
    const t = getTranslator(opts);
    const getCurrentEventKey = typeof opts.getCurrentEventKey === "function"
      ? opts.getCurrentEventKey
      : (() => "");
    const eventKey = String(getCurrentEventKey() || "").trim();
    if (!eventKey || typeof opts.fetchFilesJson !== "function" || typeof opts.fetchProtectedFileBlob !== "function") {
      return;
    }

    try {
      const body = await opts.fetchFilesJson(`/api/files/events/${encodeURIComponent(eventKey)}`);
      const program = body && body.program ? body.program : null;
      if (!program) {
        if (typeof opts.alertFn === "function") opts.alertFn(t("eventProgramMissing"));
        return;
      }
      const fetched = await opts.fetchProtectedFileBlob(String(program.id || ""));
      const opened = typeof opts.openBlobInNewTab === "function"
        ? opts.openBlobInNewTab(fetched.blob, String(fetched.fileName || program.fileName || "program.pdf"))
        : false;
      if (!opened) {
        setEventProgramStatus(opts, t("filesPreviewPopupBlocked"), true);
      }
    } catch (_) {
      if (typeof opts.alertFn === "function") opts.alertFn(t("eventProgramLoadFailed"));
    }
  }

  root.ProCalModules.eventsEventProgram = {
    attachEventProgramHandlers,
    setEventProgramStatus,
    updateEventProgramSummaryUI,
    resetEventProgramState,
    loadEventProgramForEvent,
    syncEventProgramForEvent,
    previewCurrentEventProgram
  };
})(window);
