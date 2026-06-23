(function initFilesPreviewModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  let filePreviewObjectUrl = "";
  let filePreviewCurrent = null;
  let handlersAttached = false;

  function getTranslator(options) {
    return typeof options.t === "function" ? options.t : ((key) => key);
  }

  function getWindow(options) {
    return (options && options.windowObj) || root;
  }

  function getDocument(options) {
    const win = getWindow(options);
    return (options && options.documentRef) || win.document;
  }

  function getFetch(options) {
    const win = getWindow(options);
    return (options && options.fetchImpl) || win.fetch.bind(win);
  }

  function revokeFilePreviewUrl() {
    if (filePreviewObjectUrl) {
      URL.revokeObjectURL(filePreviewObjectUrl);
      filePreviewObjectUrl = "";
    }
  }

  function getPreviewBodyElement(options) {
    const opts = options || {};
    return opts.filePreviewFrame && opts.filePreviewFrame.parentElement
      ? opts.filePreviewFrame.parentElement
      : null;
  }

  function setFilePreviewMode(options, mode) {
    const body = getPreviewBodyElement(options);
    if (!body) return;
    body.classList.toggle("is-frame", mode === "frame");
  }

  function getFilePreviewKind(fileName, mimeType) {
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

  function resetFilePreviewContent(options) {
    const opts = options || {};
    setFilePreviewMode(opts, "");
    if (opts.filePreviewImage) {
      opts.filePreviewImage.classList.add("hidden-section");
      opts.filePreviewImage.removeAttribute("src");
      opts.filePreviewImage.alt = "";
    }
    if (opts.filePreviewFrame) {
      opts.filePreviewFrame.src = "about:blank";
      opts.filePreviewFrame.classList.add("hidden-section");
    }
    if (opts.filePreviewText) {
      opts.filePreviewText.textContent = "";
      opts.filePreviewText.classList.add("hidden-section");
    }
    if (opts.filePreviewFallbackText) {
      opts.filePreviewFallbackText.textContent = getTranslator(opts)("filePreviewUnavailable");
      opts.filePreviewFallbackText.classList.add("hidden-section");
    }
  }

  function closeFilePreviewModal(options) {
    const opts = options || {};
    revokeFilePreviewUrl();
    filePreviewCurrent = null;
    resetFilePreviewContent(opts);
    if (opts.filePreviewDownloadBtn) opts.filePreviewDownloadBtn.disabled = true;
    if (opts.filePreviewModal) {
      opts.filePreviewModal.classList.add("hidden");
      opts.filePreviewModal.setAttribute("aria-hidden", "true");
    }
  }

  async function downloadProtectedFile(options, fileId, suggestedName) {
    const opts = options || {};
    const token = typeof opts.ensureAccessToken === "function"
      ? await opts.ensureAccessToken()
      : "";
    if (!token) throw new Error("auth");
    const fetchImpl = getFetch(opts);
    const response = await fetchImpl(`/api/files/download/${encodeURIComponent(String(fileId || ""))}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error(`download:${response.status}`);
    const blob = await response.blob();
    const header = String(response.headers.get("content-disposition") || "");
    const match = header.match(/filename="([^"]+)"/i);
    const fileName = (match && match[1]) ? match[1] : String(suggestedName || "file.bin");
    const url = URL.createObjectURL(blob);
    const doc = getDocument(opts);
    const link = doc.createElement("a");
    link.href = url;
    link.download = fileName;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadBackupFile(options, fileName) {
    const opts = options || {};
    const token = typeof opts.ensureAccessToken === "function"
      ? await opts.ensureAccessToken()
      : "";
    if (!token) throw new Error("auth");
    const fetchImpl = getFetch(opts);
    const response = await fetchImpl(`/api/files/backups/${encodeURIComponent(String(fileName || ""))}/download`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error(`download:${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const doc = getDocument(opts);
    const link = doc.createElement("a");
    link.href = url;
    link.download = String(fileName || "backup.json");
    doc.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function openFilePreviewBlob(options, blob, fileName, config) {
    const opts = options || {};
    const t = getTranslator(opts);
    const next = config && typeof config === "object" ? config : {};
    revokeFilePreviewUrl();
    resetFilePreviewContent(opts);
    if (!(blob instanceof Blob)) return;
    if (opts.filePreviewTitle) {
      opts.filePreviewTitle.textContent = `${t("filePreviewTitle")} - ${String(fileName || "file.bin")}`;
    }
    if (opts.filePreviewDownloadBtn) {
      const downloadable = next.downloadable !== false;
      opts.filePreviewDownloadBtn.disabled = !downloadable;
      opts.filePreviewDownloadBtn.classList.toggle("hidden-section", !downloadable);
    }

    const previewKind = getFilePreviewKind(fileName, blob.type);
    if (previewKind === "image" && opts.filePreviewImage) {
      filePreviewObjectUrl = URL.createObjectURL(blob);
      opts.filePreviewImage.src = filePreviewObjectUrl;
      opts.filePreviewImage.alt = String(fileName || "file");
      opts.filePreviewImage.classList.remove("hidden-section");
    } else if (previewKind === "frame" && opts.filePreviewFrame) {
      filePreviewObjectUrl = URL.createObjectURL(blob);
      opts.filePreviewFrame.src = filePreviewObjectUrl;
      opts.filePreviewFrame.classList.remove("hidden-section");
      setFilePreviewMode(opts, "frame");
    } else if (previewKind === "text" && opts.filePreviewText) {
      try {
        opts.filePreviewText.textContent = await blob.text();
        opts.filePreviewText.classList.remove("hidden-section");
      } catch (_) {
        if (opts.filePreviewFallbackText) {
          opts.filePreviewFallbackText.classList.remove("hidden-section");
        }
      }
    } else if (opts.filePreviewFallbackText) {
      opts.filePreviewFallbackText.classList.remove("hidden-section");
    }

    if (opts.filePreviewModal) {
      opts.filePreviewModal.classList.remove("hidden");
      opts.filePreviewModal.setAttribute("aria-hidden", "false");
    }
  }

  async function fetchProtectedFileBlob(options, fileId) {
    const opts = options || {};
    const token = typeof opts.ensureAccessToken === "function"
      ? await opts.ensureAccessToken()
      : "";
    if (!token) throw new Error("auth");
    const fetchImpl = getFetch(opts);
    const response = await fetchImpl(`/api/files/download/${encodeURIComponent(String(fileId || ""))}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error(`download:${response.status}`);
    const blob = await response.blob();
    const header = String(response.headers.get("content-disposition") || "");
    const match = header.match(/filename="([^"]+)"/i);
    return {
      blob,
      fileName: (match && match[1]) ? match[1] : "file.bin"
    };
  }

  async function fetchBackupFileBlob(options, fileName) {
    const opts = options || {};
    const token = typeof opts.ensureAccessToken === "function"
      ? await opts.ensureAccessToken()
      : "";
    if (!token) throw new Error("auth");
    const fetchImpl = getFetch(opts);
    const response = await fetchImpl(`/api/files/backups/${encodeURIComponent(String(fileName || ""))}/download`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error(`download:${response.status}`);
    const blob = await response.blob();
    return {
      blob,
      fileName: String(fileName || "backup.json")
    };
  }

  async function openFilePreviewForRemoteFile(options, row) {
    const fileId = String(row && row.id || "").trim();
    const fallbackName = String(row && (row.name || row.fileName) || "file.bin");
    if (!fileId) return;
    const fetched = await fetchProtectedFileBlob(options, fileId);
    const safeName = String(fetched.fileName || fallbackName || "file.bin");
    filePreviewCurrent = { kind: "remote", fileId, fileName: safeName };
    await openFilePreviewBlob(options, fetched.blob, safeName, { downloadable: true });
  }

  async function openFilePreviewForBackupFile(options, fileName) {
    const safeName = String(fileName || "backup.json");
    const fetched = await fetchBackupFileBlob(options, safeName);
    filePreviewCurrent = { kind: "backup", fileName: safeName };
    await openFilePreviewBlob(options, fetched.blob, safeName, { downloadable: true });
  }

  async function openFilePreviewForLocalFile(options, file) {
    if (!(file instanceof File)) return;
    filePreviewCurrent = { kind: "local", fileName: String(file.name || "program.pdf") };
    await openFilePreviewBlob(options, file, String(file.name || "program.pdf"), { downloadable: false });
  }

  function openBlobInNewTab(options, blob, _fallbackFileName) {
    const win = getWindow(options || {});
    if (!(blob instanceof Blob)) return false;
    const url = URL.createObjectURL(blob);
    const tab = win.open(url, "_blank", "noopener,noreferrer");
    if (tab) {
      win.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
      return true;
    }
    URL.revokeObjectURL(url);
    return false;
  }

  function attachFilePreviewHandlers(options) {
    if (handlersAttached) return;
    const opts = options || {};
    const t = getTranslator(opts);
    const setFilesStatus = typeof opts.setFilesStatus === "function" ? opts.setFilesStatus : (() => {});

    if (opts.filePreviewModal) {
      opts.filePreviewModal.addEventListener("click", (event) => {
        if (event.target === opts.filePreviewModal) closeFilePreviewModal(opts);
      });
    }
    if (opts.closeFilePreviewBtn) {
      opts.closeFilePreviewBtn.addEventListener("click", () => {
        closeFilePreviewModal(opts);
      });
    }
    if (opts.filePreviewDownloadBtn) {
      opts.filePreviewDownloadBtn.addEventListener("click", async () => {
        if (!filePreviewCurrent) return;
        if (filePreviewCurrent.kind === "remote") {
          try {
            await downloadProtectedFile(opts, filePreviewCurrent.fileId, filePreviewCurrent.fileName);
          } catch (_) {
            setFilesStatus(t("filesDownloadFailed"), true);
          }
          return;
        }
        if (filePreviewCurrent.kind === "backup") {
          try {
            await downloadBackupFile(opts, filePreviewCurrent.fileName);
          } catch (_) {
            setFilesStatus(t("filesDownloadFailed"), true);
          }
        }
      });
    }

    handlersAttached = true;
  }

  root.ProCalModules.filesPreview = {
    attachFilePreviewHandlers,
    closeFilePreviewModal,
    downloadProtectedFile,
    downloadBackupFile,
    fetchProtectedFileBlob,
    fetchBackupFileBlob,
    openFilePreviewForRemoteFile,
    openFilePreviewForBackupFile,
    openFilePreviewForLocalFile,
    openBlobInNewTab
  };
})(window);
