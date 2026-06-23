(function initNotesDrag(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  let stickyDrag = null;
  let onMoveRef = null;
  let onEndRef = null;

  function startDrag(event, note, options) {
    const opts = options || {};
    const readOnly = Boolean(opts.readOnly);
    const canMoveStickyNote = typeof opts.canMoveStickyNote === "function" ? opts.canMoveStickyNote : (() => false);
    const listEl = opts.listEl;
    const getStickyNoteOffset = typeof opts.getStickyNoteOffset === "function" ? opts.getStickyNoteOffset : (() => ({ x: 0, y: 0 }));
    const normalizeNoteOffset = typeof opts.normalizeNoteOffset === "function" ? opts.normalizeNoteOffset : ((v) => Number(v) || 0);
    const setStickyNoteOffset = typeof opts.setStickyNoteOffset === "function" ? opts.setStickyNoteOffset : null;

    if (readOnly) return false;
    if (!event || event.button !== 0) return false;
    if (!note || !canMoveStickyNote(note)) return false;
    if (event.target instanceof Element && event.target.closest("button")) return false;
    const id = String((note && note.id) || "");
    if (!id || !listEl) return false;

    const card = listEl.querySelector(`[data-note-id="${id}"]`);
    if (!card) return false;

    event.preventDefault();
    const noteOffset = getStickyNoteOffset(note);
    stickyDrag = {
      id,
      baseX: Number(noteOffset.x || 0),
      baseY: Number(noteOffset.y || 0),
      startX: Number(event.clientX || 0),
      startY: Number(event.clientY || 0),
      card
    };
    card.classList.add("dragging");

    onMoveRef = (moveEvent) => {
      if (!stickyDrag || !stickyDrag.card) return;
      const dx = Number(moveEvent.clientX || 0) - stickyDrag.startX;
      const dy = Number(moveEvent.clientY || 0) - stickyDrag.startY;
      const nextX = normalizeNoteOffset(stickyDrag.baseX + dx);
      const nextY = normalizeNoteOffset(stickyDrag.baseY + dy);
      stickyDrag.card.style.transform = `translate(${nextX}px, ${nextY}px)`;
    };

    onEndRef = (endEvent) => {
      if (!stickyDrag) return;
      const dx = Number((endEvent && endEvent.clientX) || stickyDrag.startX) - stickyDrag.startX;
      const dy = Number((endEvent && endEvent.clientY) || stickyDrag.startY) - stickyDrag.startY;
      const nextX = normalizeNoteOffset(stickyDrag.baseX + dx);
      const nextY = normalizeNoteOffset(stickyDrag.baseY + dy);
      if (setStickyNoteOffset) setStickyNoteOffset(stickyDrag.id, nextX, nextY);
      if (stickyDrag.card) stickyDrag.card.classList.remove("dragging");
      stickyDrag = null;
      document.removeEventListener("pointermove", onMoveRef);
      document.removeEventListener("pointerup", onEndRef);
      document.removeEventListener("pointercancel", onEndRef);
      onMoveRef = null;
      onEndRef = null;
    };

    document.addEventListener("pointermove", onMoveRef);
    document.addEventListener("pointerup", onEndRef);
    document.addEventListener("pointercancel", onEndRef);
    return true;
  }

  root.ProCalModules.notesDrag = {
    startDrag
  };
})(window);
