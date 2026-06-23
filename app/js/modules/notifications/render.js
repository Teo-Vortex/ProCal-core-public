(function initNotificationsRender(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderList(options) {
    const opts = options || {};
    const listEl = opts.notificationsList;
    const rows = Array.isArray(opts.notificationsRows) ? opts.notificationsRows : [];
    const t = typeof opts.t === "function" ? opts.t : ((key) => key);
    const currentLang = String(opts.currentLang || "en");
    const formatDateTime = typeof opts.formatNotificationDateTime === "function"
      ? opts.formatNotificationDateTime
      : ((v) => String(v || ""));
    const formatActor = typeof opts.formatNotificationActor === "function"
      ? opts.formatNotificationActor
      : (() => "");
    const isImportant = typeof opts.isImportantNotificationType === "function"
      ? opts.isImportantNotificationType
      : (() => false);
    const isInvite = typeof opts.isPersonalTaskCollabInviteNotification === "function"
      ? opts.isPersonalTaskCollabInviteNotification
      : (() => false);
    const onInviteRespond = typeof opts.onInviteRespond === "function" ? opts.onInviteRespond : null;
    const onMarkRead = typeof opts.onMarkRead === "function" ? opts.onMarkRead : null;
    const doc = opts.documentRef || root.document;
    if (!listEl || !doc) return;

    listEl.innerHTML = "";
    if (!rows.length) {
      const li = doc.createElement("li");
      li.className = "empty";
      li.textContent = t("notificationsEmpty");
      listEl.appendChild(li);
      return;
    }

    rows.forEach((item) => {
      const li = doc.createElement("li");
      li.className = "event-item notification-item";
      if (!item.readAt) li.classList.add("unread");
      if (isImportant(item && item.type)) li.classList.add("notification-important");

      const top = doc.createElement("div");
      top.className = "event-main";
      const title = doc.createElement("strong");
      title.textContent = String(item.title || "-");
      const meta = doc.createElement("span");
      meta.className = "event-meta";
      meta.textContent = formatDateTime(item.createdAt);
      top.append(title, meta);
      li.appendChild(top);

      if (item.body) {
        const body = doc.createElement("div");
        body.className = "notification-body";
        body.textContent = String(item.body || "");
        li.appendChild(body);
      }

      const actorName = formatActor(item);
      if (actorName) {
        const actor = doc.createElement("div");
        actor.className = "event-meta";
        actor.textContent = `${t("notificationsActor")}: ${actorName}`;
        li.appendChild(actor);
      }

      const actions = doc.createElement("div");
      actions.className = "person-actions";
      if (!item.readAt && isInvite(item)) {
        const acceptBtn = doc.createElement("button");
        acceptBtn.type = "button";
        acceptBtn.className = "accent-btn";
        acceptBtn.textContent = currentLang === "bg" ? "Приеми" : "Accept";
        acceptBtn.addEventListener("click", async () => {
          if (onInviteRespond) await onInviteRespond(item.id, "accept");
        });

        const declineBtn = doc.createElement("button");
        declineBtn.type = "button";
        declineBtn.className = "ghost-btn";
        declineBtn.textContent = currentLang === "bg" ? "Откажи" : "Decline";
        declineBtn.addEventListener("click", async () => {
          if (onInviteRespond) await onInviteRespond(item.id, "decline");
        });
        actions.append(acceptBtn, declineBtn);
      } else if (item.readAt) {
        const readBadge = doc.createElement("span");
        readBadge.className = "event-meta";
        readBadge.textContent = t("notificationsRead");
        actions.appendChild(readBadge);
      } else {
        const readBtn = doc.createElement("button");
        readBtn.type = "button";
        readBtn.className = "ghost-btn";
        readBtn.textContent = t("notificationsRead");
        readBtn.addEventListener("click", async () => {
          if (onMarkRead) await onMarkRead(item.id);
        });
        actions.appendChild(readBtn);
      }
      li.appendChild(actions);
      listEl.appendChild(li);
    });
  }

  root.ProCalModules.notificationsRender = { renderList };
})(window);

