(function (global) {
  "use strict";
  const text = (lang, bg, en) => lang === "bg" ? bg : en;
  const path = value => global.PROCAL_RUNTIME?.resolvePath ? global.PROCAL_RUNTIME.resolvePath(value) : value;
  async function request(url, options = {}) {
    const run = () => fetch(path(url), { ...options, credentials: "include", headers: { "content-type": "application/json", authorization: `Bearer ${localStorage.getItem("procal_access_token") || ""}` } });
    let response = await run();
    if (response.status === 401) {
      const refresh = await fetch(path("/api/auth/refresh"), { method: "POST", credentials: "include" });
      if (refresh.ok) {
        const body = await refresh.json();
        if (body.accessToken) { localStorage.setItem("procal_access_token", body.accessToken); response = await run(); }
      }
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Attendance action failed");
    return body;
  }
  function renderActions(container, status, options) {
    const lang = options.lang;
    container.replaceChildren();
    if (!options.canPunch) return;
    const checkedIn = status.state === "checked_in";
    const choices = checkedIn ? [{ id: null, name: text(lang, "Тръгване", "Check out") }] : (status.workplaces || []);
    if (!choices.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = text(lang, "Няма активни работни места. Добавете ги в Работно време.", "No active workplaces. Add them in Working time.");
      container.append(empty);
    }
    for (const place of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "attendance-action-btn";
      button.textContent = checkedIn ? place.name : `${text(lang, "Пристигане", "Check in")} · ${place.name}`;
      button.addEventListener("click", async () => {
        container.querySelectorAll("button").forEach(b => { b.disabled = true; });
        try {
          await options.onPunch({ action: checkedIn ? "check_out" : "check_in", ...(place.id ? { workplaceId: place.id } : {}) });
        } catch (error) { options.onError?.(error); }
        finally { container.querySelectorAll("button").forEach(b => { b.disabled = false; }); }
      });
      container.append(button);
    }
  }
  async function open(options = {}) {
    const lang = options.lang || localStorage.getItem("procal_lang") || "en";
    const dialog = document.createElement("div");
    dialog.className = "attendance-quick-overlay";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const card = document.createElement("div"); card.className = "attendance-quick-card";
    const head = document.createElement("div"); head.className = "attendance-quick-head";
    const title = document.createElement("h3");
    title.textContent = `${text(lang, "Работно време", "Working time")}${options.name ? ` · ${options.name}` : ""}`;
    dialog.setAttribute("aria-label", title.textContent);
    const close = document.createElement("button"); close.type = "button"; close.className = "attendance-action-btn"; close.textContent = text(lang, "Затвори", "Close");
    const trigger = document.activeElement;
    const dismiss = () => { dialog.remove(); trigger?.focus(); };
    close.addEventListener("click", dismiss);
    dialog.addEventListener("click", e => { if (e.target === dialog) dismiss(); });
    dialog.addEventListener("keydown", e => { if (e.key === "Escape") dismiss(); });
    const info = document.createElement("p");
    const actions = document.createElement("div"); actions.className = "attendance-quick-actions";
    const message = document.createElement("p"); message.setAttribute("role", "status"); message.className = "attendance-quick-message";
    head.append(title, close); card.append(head, info, actions, message); dialog.append(card); document.body.append(dialog); close.focus();
    const load = async () => {
      const query = options.userId ? `?userId=${encodeURIComponent(options.userId)}` : "";
      const status = await request(`/api/attendance/status${query}`);
      if (!dialog.isConnected) return;
      const place = status.latest?.workplaceName || status.latest?.workplace?.name;
      info.textContent = status.state === "checked_in"
        ? `${text(lang, "На работа", "At work")}${place ? ` · ${place}` : ""}`
        : text(lang, "Не е на работа. Изберете работно място:", "Not checked in. Choose a workplace:");
      renderActions(actions, status, { lang, canPunch: options.canPunch !== false, onError: e => { message.textContent = e.message; }, onPunch: async payload => {
        await request("/api/attendance/punch", { method: "POST", body: JSON.stringify({ ...payload, ...(options.userId ? { userId: options.userId } : {}) }) });
        await load();
        message.textContent = text(lang, "Запазено.", "Saved.");
        global.dispatchEvent(new CustomEvent("procal-attendance-changed"));
        await options.onChange?.();
      } });
    };
    try { info.textContent = text(lang, "Зареждане…", "Loading…"); await load(); }
    catch (error) { message.textContent = error.message; }
  }
  global.ProCalAttendanceQuick = { request, renderActions, open };
})(window);
