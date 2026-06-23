(function initNotesRender(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderPanel(options) {
    const opts = options || {};
    const container = opts.container;
    if (!container) return;

    const rows = Array.isArray(opts.rows) ? opts.rows : [];
    const t = typeof opts.t === "function" ? opts.t : ((k) => String(k || ""));
    const myIds = opts.myIds instanceof Set ? opts.myIds : new Set();
    const normalizeHexColor = typeof opts.normalizeHexColor === "function"
      ? opts.normalizeHexColor
      : ((v, fallback) => String(v || fallback || "#fde68a"));
    const isStickyOwner = typeof opts.isStickyOwner === "function" ? opts.isStickyOwner : (() => false);
    const canEditStickyNote = typeof opts.canEditStickyNote === "function" ? opts.canEditStickyNote : (() => false);
    const canDeleteStickyNote = typeof opts.canDeleteStickyNote === "function" ? opts.canDeleteStickyNote : (() => false);
    const canMoveStickyNote = typeof opts.canMoveStickyNote === "function" ? opts.canMoveStickyNote : (() => false);
    const getStickyNoteOffset = typeof opts.getStickyNoteOffset === "function" ? opts.getStickyNoteOffset : (() => ({ x: 0, y: 0 }));
    const getPersonNameById = typeof opts.getPersonNameById === "function" ? opts.getPersonNameById : ((id) => String(id || ""));
    const getStickyShares = typeof opts.getStickyShares === "function" ? opts.getStickyShares : (() => []);
    const dedupeStrings = typeof opts.dedupeStrings === "function" ? opts.dedupeStrings : ((list) => Array.from(new Set(Array.isArray(list) ? list : [])));
    const onEdit = typeof opts.onEdit === "function" ? opts.onEdit : (() => {});
    const onShare = typeof opts.onShare === "function" ? opts.onShare : (() => {});
    const onDelete = typeof opts.onDelete === "function" ? opts.onDelete : (() => {});
    const onStartDrag = typeof opts.onStartDrag === "function" ? opts.onStartDrag : (() => {});

    container.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = t("noNotes");
      container.appendChild(empty);
      return;
    }

    const ownRows = rows.filter((note) => myIds.has(String((note && note.ownerId) || "")));
    const sharedRows = rows.filter((note) => !myIds.has(String((note && note.ownerId) || "")));

    const renderSection = (titleText, sectionRows) => {
      if (!sectionRows.length) return;
      const sectionTitle = document.createElement("h4");
      sectionTitle.className = "side-caption";
      sectionTitle.textContent = titleText;
      container.appendChild(sectionTitle);

      const sectionGrid = document.createElement("div");
      sectionGrid.className = "sticky-notes-grid";
      container.appendChild(sectionGrid);

      sectionRows.forEach((note) => {
        const card = document.createElement("article");
        card.className = "sticky-note-card";
        card.classList.add(isStickyOwner(note) ? "sticky-note-owned" : "sticky-note-shared");
        card.dataset.noteId = String((note && note.id) || "");
        card.style.setProperty("--sticky-color", normalizeHexColor(note && note.color, "#fde68a"));
        const noteOffset = getStickyNoteOffset(note);
        card.style.transform = `translate(${noteOffset.x}px, ${noteOffset.y}px)`;

        const header = document.createElement("div");
        header.className = "sticky-note-head";

        const title = document.createElement("strong");
        title.className = "sticky-note-title";
        title.textContent = (note && note.title) || t("notesTitle");

        const menuWrap = document.createElement("div");
        menuWrap.className = "sticky-note-menu-wrap";
        const menuBtn = document.createElement("button");
        menuBtn.type = "button";
        menuBtn.className = "ghost-btn sticky-note-menu-btn";
        menuBtn.textContent = "...";

        const menuList = document.createElement("div");
        menuList.className = "sticky-note-menu hidden";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "ghost-btn";
        editBtn.textContent = t("edit");
        editBtn.disabled = !canEditStickyNote(note);
        editBtn.addEventListener("click", () => {
          menuList.classList.add("hidden");
          onEdit(note);
        });

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "ghost-btn";
        shareBtn.textContent = t("noteShare");
        const ownerCanShare = isStickyOwner(note);
        shareBtn.disabled = !ownerCanShare;
        shareBtn.title = ownerCanShare ? t("noteShare") : t("noteShareOwnerOnly");
        shareBtn.addEventListener("click", () => {
          menuList.classList.add("hidden");
          onShare(note);
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "ghost-btn";
        delBtn.textContent = t("delete");
        delBtn.disabled = !canDeleteStickyNote(note);
        delBtn.addEventListener("click", () => {
          menuList.classList.add("hidden");
          onDelete(note);
        });

        menuList.append(editBtn, shareBtn, delBtn);
        menuBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          document.querySelectorAll(".sticky-note-menu").forEach((m) => {
            if (m !== menuList) m.classList.add("hidden");
          });
          menuList.classList.toggle("hidden");
        });

        menuWrap.append(menuBtn, menuList);
        header.append(title, menuWrap);
        card.appendChild(header);

        if (note && note.text) {
          const body = document.createElement("p");
          body.className = "sticky-note-text";
          body.textContent = note.text;
          card.appendChild(body);
        }

        const footer = document.createElement("div");
        footer.className = "sticky-note-footer";

        const metaModule = root.ProCalModules && root.ProCalModules.notesMeta;
        const metaLines = metaModule && typeof metaModule.buildMetaLines === "function"
          ? metaModule.buildMetaLines(note, { t, getPersonNameById, getStickyShares, dedupeStrings })
          : (() => {
            const ownerName = (note && note.ownerName) || getPersonNameById(note && note.ownerId) || String((note && note.ownerId) || "");
            const lines = [{ text: `${t("noteOwnerLabel")}: ${ownerName}` }];
            const shares = getStickyShares(note);
            const readonlyAudience = dedupeStrings(
              shares.filter((entry) => !entry.canEdit).map((entry) => getPersonNameById(entry.userId))
            );
            const editableAudience = dedupeStrings(
              shares.filter((entry) => entry.canEdit).map((entry) => getPersonNameById(entry.userId))
            );
            if (readonlyAudience.length) lines.push({ text: `${t("noteSharedReadonlyWith")}: ${readonlyAudience.join(", ")}` });
            if (editableAudience.length) lines.push({ text: `${t("noteSharedEditableWith")}: ${editableAudience.join(", ")}` });
            return lines;
          })();

        metaLines.forEach((line) => {
          if (!line || !line.text) return;
          const el = document.createElement("span");
          el.className = "sticky-note-meta";
          el.textContent = String(line.text);
          footer.appendChild(el);
        });
        card.appendChild(footer);

        if (canMoveStickyNote(note)) {
          header.addEventListener("pointerdown", (event) => onStartDrag(event, note));
        }

        sectionGrid.appendChild(card);
      });
    };

    renderSection(t("myNotes"), ownRows);
    renderSection(t("sharedWithMe"), sharedRows);
  }

  root.ProCalModules.notesRender = {
    renderPanel
  };
})(window);
