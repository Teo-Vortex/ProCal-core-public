(function initPeopleRoster(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function resolveShareId(person) {
    if (!person || typeof person !== "object") return "";
    const userId = String(person.userId || "").trim();
    if (userId) return userId;
    return String(person.id || "").trim();
  }

  function getOperationalPeople(options) {
    const opts = options || {};
    const peopleDirectoryUsers = Array.isArray(opts.peopleDirectoryUsers) ? opts.peopleDirectoryUsers : [];
    const people = Array.isArray(opts.people) ? opts.people : [];
    const normalizePersonColor = typeof opts.normalizePersonColor === "function"
      ? opts.normalizePersonColor
      : ((color) => String(color || "#64748b"));

    const directory = peopleDirectoryUsers.filter((u) => String((u && u.status) || "").toLowerCase() === "active");
    const source = directory.length
      ? directory.map((u) => ({
        id: String(u.userId || u.id || ""),
        userId: String(u.userId || u.id || ""),
        name: String(u.name || "").trim(),
        color: normalizePersonColor(String(u.color || "#64748b")),
        username: String(u.username || "").trim()
      }))
      : people;

    const out = [];
    const seen = new Set();
    source.forEach((p) => {
      if (!p || typeof p !== "object") return;
      const key = String(p.userId || p.id || "").trim() || String(p.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      const id = String(p.id || p.userId || "").trim();
      const name = String(p.name || "").trim();
      if (!id || !name) return;
      out.push({
        ...p,
        id,
        userId: String(p.userId || id).trim(),
        name,
        color: normalizePersonColor(String(p.color || ""))
      });
      seen.add(key);
    });
    return out;
  }

  function getPersonDisplayName(person, roster) {
    if (!person || typeof person !== "object") return "-";
    const list = Array.isArray(roster) ? roster : [];
    const name = String(person.name || "").trim() || "-";
    const sameName = list.filter((x) => String((x && x.name) || "").trim().toLowerCase() === name.toLowerCase());
    const username = String(person.username || "").trim();
    if (sameName.length > 1 && username) return `${name} (@${username})`;
    return name;
  }

  function getPersonNameById(id, roster) {
    const target = String(id || "");
    const list = Array.isArray(roster) ? roster : [];
    const item = list.find((x) => String((x && x.id) || "") === target || String((x && x.userId) || "") === target);
    return item ? String(item.name || target || "") : target;
  }

  function getCurrentUserIdentityIds(currentUserId, roster) {
    const ids = new Set();
    const me = String(currentUserId || "").trim();
    if (me) ids.add(me);
    (Array.isArray(roster) ? roster : []).forEach((p) => {
      const pid = String((p && p.id) || "").trim();
      const puid = String((p && p.userId) || "").trim();
      if (puid && puid === me && pid) ids.add(pid);
      if (!puid && pid === me) ids.add(pid);
    });
    return ids;
  }

  function isCurrentUserShareId(shareId, options) {
    const opts = options || {};
    const target = String(shareId || "").trim();
    if (!target) return false;
    const me = String(opts.currentUserId || "").trim();
    const myIds = opts.myIds instanceof Set ? opts.myIds : new Set();
    const roster = Array.isArray(opts.roster) ? opts.roster : [];
    const resolve = typeof opts.resolveShareId === "function" ? opts.resolveShareId : resolveShareId;

    if ((me && target === me) || myIds.has(target)) return true;
    const person = roster.find((p) => {
      const sid = resolve(p);
      if (sid && sid === target) return true;
      if (String((p && p.id) || "").trim() === target) return true;
      if (String((p && p.userId) || "").trim() === target) return true;
      return false;
    });
    if (!person) return false;

    const pid = String(person.id || "").trim();
    const puid = String(person.userId || "").trim();
    if (me && puid && puid === me) return true;
    if (pid && myIds.has(pid)) return true;
    if (puid && myIds.has(puid)) return true;
    return false;
  }

  function getShareRecipients(options) {
    const opts = options || {};
    const roster = Array.isArray(opts.roster) ? opts.roster : [];
    const ids = opts.ids instanceof Set ? opts.ids : new Set();
    const resolve = typeof opts.resolveShareId === "function" ? opts.resolveShareId : resolveShareId;
    const isCurrent = typeof opts.isCurrentUserShareId === "function" ? opts.isCurrentUserShareId : (() => false);
    return roster.filter((p) => {
      const sid = resolve(p);
      return sid && !ids.has(String(sid)) && !isCurrent(sid);
    });
  }

  root.ProCalModules.peopleRoster = {
    resolveShareId,
    getOperationalPeople,
    getPersonDisplayName,
    getPersonNameById,
    getCurrentUserIdentityIds,
    isCurrentUserShareId,
    getShareRecipients
  };
})(window);
