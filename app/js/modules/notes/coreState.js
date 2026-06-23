(function initNotesCoreStateModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function createStickyNoteId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeNoteOffset(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n > 2500) return 2500;
    if (n < -2500) return -2500;
    return Math.round(n);
  }

  function getStickyLayoutStorageKey(options) {
    const o = options || {};
    return `${String(o.stickyLayoutKey || "sticky_layout")}_${String(o.currentUserId || "anon")}`;
  }

  function readStickyLayoutMap(options) {
    const o = options || {};
    const storageRef = o.storageRef || localStorage;
    const key = String(o.storageKey || "");
    const normalize = typeof o.normalizeNoteOffset === "function" ? o.normalizeNoteOffset : normalizeNoteOffset;
    try {
      const raw = storageRef.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const out = {};
      Object.entries(parsed).forEach(([id, value]) => {
        if (!id || !value || typeof value !== "object") return;
        out[String(id)] = {
          x: normalize(value.x),
          y: normalize(value.y)
        };
      });
      return out;
    } catch {
      return {};
    }
  }

  function saveStickyLayoutMap(options) {
    const o = options || {};
    const storageRef = o.storageRef || localStorage;
    const key = String(o.storageKey || "");
    const map = o.stickyLayoutById || {};
    try {
      storageRef.setItem(key, JSON.stringify(map));
    } catch {
      // ignore storage errors
    }
  }

  function clampStickyOffsetY(value, options) {
    const o = options || {};
    const normalize = typeof o.normalizeNoteOffset === "function" ? o.normalizeNoteOffset : normalizeNoteOffset;
    const y = normalize(value);
    return y < 0 ? 0 : y;
  }

  function getStickyNoteOffset(note, options) {
    const o = options || {};
    const normalize = typeof o.normalizeNoteOffset === "function" ? o.normalizeNoteOffset : normalizeNoteOffset;
    const clampY = typeof o.clampStickyOffsetY === "function"
      ? o.clampStickyOffsetY
      : ((v) => clampStickyOffsetY(v, { normalizeNoteOffset: normalize }));
    const stickyLayoutById = o.stickyLayoutById || {};
    const id = String(note && note.id ? note.id : "");
    const local = id ? stickyLayoutById[id] : null;
    if (local && typeof local === "object") {
      return { x: normalize(local.x), y: clampY(local.y) };
    }
    return {
      x: normalize(note && note.offsetX),
      y: clampY(note && note.offsetY)
    };
  }

  function setStickyNoteOffset(options) {
    const o = options || {};
    const id = String(o.noteId || "");
    if (!id) return false;
    const stickyLayoutById = o.stickyLayoutById || {};
    const normalize = typeof o.normalizeNoteOffset === "function" ? o.normalizeNoteOffset : normalizeNoteOffset;
    const clampY = typeof o.clampStickyOffsetY === "function"
      ? o.clampStickyOffsetY
      : ((v) => clampStickyOffsetY(v, { normalizeNoteOffset: normalize }));
    stickyLayoutById[id] = { x: normalize(o.x), y: clampY(o.y) };
    return true;
  }

  function deleteStickyNoteOffset(options) {
    const o = options || {};
    const id = String(o.noteId || "");
    if (!id) return false;
    const stickyLayoutById = o.stickyLayoutById || {};
    if (!Object.prototype.hasOwnProperty.call(stickyLayoutById, id)) return false;
    delete stickyLayoutById[id];
    return true;
  }

  function pruneStickyNoteOffsets(options) {
    const o = options || {};
    const stickyLayoutById = o.stickyLayoutById || {};
    const valid = new Set(Array.isArray(o.validNoteIds) ? o.validNoteIds.map((x) => String(x || "")).filter(Boolean) : []);
    let changed = false;
    Object.keys(stickyLayoutById).forEach((id) => {
      if (!valid.has(id)) {
        delete stickyLayoutById[id];
        changed = true;
      }
    });
    return changed;
  }

  function normalizeStickyShareEntries(note) {
    const notesShareModel = root.ProCalModules && root.ProCalModules.notesShareModel;
    if (notesShareModel && typeof notesShareModel.normalizeShareEntries === "function") {
      return notesShareModel.normalizeShareEntries(note);
    }
    if (note && Array.isArray(note.shares)) {
      return note.shares
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          userId: String(entry.userId || entry.id || "").trim(),
          canView: true,
          canEdit: Boolean(entry.canEdit)
        }))
        .filter((entry) => entry.userId);
    }
    return [];
  }

  function getStickyShares(note) {
    const notesShareModel = root.ProCalModules && root.ProCalModules.notesShareModel;
    if (notesShareModel && typeof notesShareModel.getStickyShares === "function") {
      return notesShareModel.getStickyShares(note);
    }
    return normalizeStickyShareEntries(note);
  }

  function sanitizeStickyNotes(list, options) {
    const o = options || {};
    const createId = typeof o.createStickyNoteId === "function" ? o.createStickyNoteId : createStickyNoteId;
    const normalizeColor = typeof o.normalizeHexColor === "function"
      ? o.normalizeHexColor
      : ((value, fallback) => String(value || fallback || "#fde68a"));
    const isValidDateTime = typeof o.isValidDateTime === "function" ? o.isValidDateTime : (() => false);
    const normalize = typeof o.normalizeNoteOffset === "function" ? o.normalizeNoteOffset : normalizeNoteOffset;
    const normalizeShares = typeof o.normalizeStickyShareEntries === "function"
      ? o.normalizeStickyShareEntries
      : normalizeStickyShareEntries;

    if (!Array.isArray(list)) return [];
    return list
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const id = String(x.id || createId());
        const shares = normalizeShares(x);
        return {
          id,
          ownerId: String(x.ownerId || ""),
          ownerName: String(x.ownerName || "").trim(),
          title: String(x.title || "").trim(),
          text: String(x.text || "").trim(),
          color: normalizeColor(String(x.color || ""), "#fde68a"),
          shares,
          cloneRootId: String(x.cloneRootId || id),
          sourceNoteId: String(x.sourceNoteId || ""),
          sourceOwnerId: String(x.sourceOwnerId || ""),
          createdAt: isValidDateTime(x.createdAt) ? String(x.createdAt) : new Date().toISOString(),
          updatedAt: isValidDateTime(x.updatedAt) ? String(x.updatedAt) : new Date().toISOString(),
          offsetX: normalize(x.offsetX),
          offsetY: normalize(x.offsetY)
        };
      })
      .filter((x) => x.title || x.text);
  }

  function isStickyOwner(note, options) {
    const o = options || {};
    const ids = o.identityIds instanceof Set ? o.identityIds : new Set();
    const ownership = root.ProCalModules && root.ProCalModules.notesOwnership;
    if (ownership && typeof ownership.isOwner === "function") {
      return ownership.isOwner(note, ids);
    }
    if (!note || !ids.size) return false;
    return ids.has(String(note.ownerId || ""));
  }

  function canViewStickyNote(note, options) {
    const o = options || {};
    if (!note) return false;
    const ids = o.identityIds instanceof Set ? o.identityIds : new Set();
    if (!ids.size) return false;
    const ownerId = String(note.ownerId || "");
    if (ids.has(ownerId)) return true;
    const getShares = typeof o.getStickyShares === "function" ? o.getStickyShares : getStickyShares;
    return getShares(note).some((entry) => ids.has(String(entry.userId || "")));
  }

  function canEditStickyNote(note, options) {
    const o = options || {};
    if (!note) return false;
    const ids = o.identityIds instanceof Set ? o.identityIds : new Set();
    if (!ids.size) return false;
    if (isStickyOwner(note, { identityIds: ids })) return true;
    const getShares = typeof o.getStickyShares === "function" ? o.getStickyShares : getStickyShares;
    return getShares(note).some((entry) => entry.canEdit && ids.has(String(entry.userId || "")));
  }

  function canDeleteStickyNote(note, options) {
    const o = options || {};
    if (!note) return false;
    const ids = o.identityIds instanceof Set ? o.identityIds : new Set();
    if (!ids.size) return false;
    if (isStickyOwner(note, { identityIds: ids })) return true;
    const getShares = typeof o.getStickyShares === "function" ? o.getStickyShares : getStickyShares;
    return getShares(note).some((entry) => ids.has(String(entry.userId || "")));
  }

  function getVisibleStickyNotes(options) {
    const o = options || {};
    const rows = Array.isArray(o.stickyNotes) ? o.stickyNotes : [];
    const canView = typeof o.canViewStickyNote === "function" ? o.canViewStickyNote : (() => false);
    return rows
      .filter((note) => canView(note))
      .sort((a, b) => String((a && a.createdAt) || "").localeCompare(String((b && b.createdAt) || "")));
  }

  function getStickySharedAudienceNames(note, options) {
    const o = options || {};
    if (!note) return [];
    const ownerId = String(note.ownerId || "");
    const getShares = typeof o.getStickyShares === "function" ? o.getStickyShares : getStickyShares;
    const getPersonNameById = typeof o.getPersonNameById === "function" ? o.getPersonNameById : ((id) => String(id || ""));
    const dedupeStrings = typeof o.dedupeStrings === "function"
      ? o.dedupeStrings
      : ((list) => Array.from(new Set(Array.isArray(list) ? list : [])));
    const shares = getShares(note);
    return dedupeStrings(
      shares
        .map((entry) => String((entry && entry.userId) || ""))
        .filter((id) => id && id !== ownerId)
        .map((id) => getPersonNameById(id) || id)
    );
  }

  function canMoveStickyNote(note, options) {
    const o = options || {};
    const canView = typeof o.canViewStickyNote === "function" ? o.canViewStickyNote : (() => false);
    return canView(note);
  }

  root.ProCalModules.notesCoreState = {
    createStickyNoteId,
    normalizeNoteOffset,
    getStickyLayoutStorageKey,
    readStickyLayoutMap,
    saveStickyLayoutMap,
    clampStickyOffsetY,
    getStickyNoteOffset,
    setStickyNoteOffset,
    deleteStickyNoteOffset,
    pruneStickyNoteOffsets,
    normalizeStickyShareEntries,
    getStickyShares,
    sanitizeStickyNotes,
    isStickyOwner,
    canViewStickyNote,
    canEditStickyNote,
    canDeleteStickyNote,
    getVisibleStickyNotes,
    getStickySharedAudienceNames,
    canMoveStickyNote
  };
})(window);
