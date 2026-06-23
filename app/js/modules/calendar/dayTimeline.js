(function initCalendarDayTimelineModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function renderDayTimeline(options) {
    const o = options || {};
    const doc = o.documentRef || root.document;
    const content = o.container;
    const dateLabel = o.dateLabel;
    if (!doc || !content) return false;

    const t = typeof o.t === "function" ? o.t : ((key) => key);
    const timeMeta = root.ProCalModules && root.ProCalModules.eventTimeMeta;
    if (!timeMeta) {
      content.innerHTML = `<p class="muted">${t("timelineUnavailable")}</p>`;
      return false;
    }

    const selectedDateKey = String(o.selectedDateKey || "");
    if (!selectedDateKey) {
      if (dateLabel) dateLabel.textContent = "-";
      content.innerHTML = `<p class="muted">${t("timelineSelectDay")}</p>`;
      return true;
    }

    const parseDateKey = typeof o.parseDateKey === "function" ? o.parseDateKey : ((value) => new Date(value));
    const getLocale = typeof o.getLocale === "function" ? o.getLocale : (() => "en-US");
    const date = parseDateKey(selectedDateKey);
    if (dateLabel) {
      dateLabel.textContent = date.toLocaleDateString(getLocale(), {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }

    const events = Array.isArray(o.events) ? o.events : [];
    const settings = o.settings || {};
    const parseTimeToMinutes = timeMeta.parseTimeToMinutes;
    const minutesToTime = timeMeta.minutesToTime;
    const roundDownMinutes = timeMeta.roundDownMinutes;
    const roundUpMinutes = timeMeta.roundUpMinutes;
    const getTimelineSegment = timeMeta.getTimelineSegment;

    let visibleStart = parseTimeToMinutes(settings.visibleStart);
    let visibleEnd = parseTimeToMinutes(settings.visibleEnd);
    let workingStart = parseTimeToMinutes(settings.workingStart);
    let workingEnd = parseTimeToMinutes(settings.workingEnd);
    if (visibleStart == null) visibleStart = 7 * 60 + 30;
    if (visibleEnd == null) visibleEnd = 17 * 60 + 30;
    if (workingStart == null) workingStart = 8 * 60;
    if (workingEnd == null) workingEnd = 17 * 60;
    if (visibleEnd <= visibleStart) visibleEnd = visibleStart + 60;
    if (workingEnd <= workingStart) workingEnd = workingStart + 60;

    const timelineRows = [];
    const allDayEvents = [];
    events.forEach((evt) => {
      const segment = getTimelineSegment(evt, selectedDateKey);
      if (!segment) return;
      const entry = { event: evt, segment };
      if (segment.isAllDay) allDayEvents.push(entry);
      else timelineRows.push(entry);
    });

    if (settings.autoFit && timelineRows.length) {
      const minMinute = Math.min.apply(null, timelineRows.map((entry) => entry.segment.startMinutes));
      const maxMinute = Math.max.apply(null, timelineRows.map((entry) => entry.segment.endMinutes));
      visibleStart = Math.max(0, roundDownMinutes(Math.max(0, minMinute - 30), 30));
      visibleEnd = Math.min(timeMeta.DAY_MINUTES, roundUpMinutes(Math.min(timeMeta.DAY_MINUTES, maxMinute + 30), 30));
      if (visibleEnd <= visibleStart) visibleEnd = Math.min(timeMeta.DAY_MINUTES, visibleStart + 60);
    }

    const visibleDuration = Math.max(60, visibleEnd - visibleStart);
    const laneEnds = [];
    const laneRows = timelineRows
      .slice()
      .sort((a, b) => {
        if (a.segment.startMinutes !== b.segment.startMinutes) return a.segment.startMinutes - b.segment.startMinutes;
        if (a.segment.endMinutes !== b.segment.endMinutes) return a.segment.endMinutes - b.segment.endMinutes;
        return String((a.event && a.event.title) || "").localeCompare(String((b.event && b.event.title) || ""));
      })
      .map((entry) => {
        let lane = 0;
        while (lane < laneEnds.length && laneEnds[lane] > entry.segment.startMinutes) lane += 1;
        laneEnds[lane] = entry.segment.endMinutes;
        return { ...entry, lane };
      });

    const laneCount = laneRows.length ? Math.max.apply(null, laneRows.map((entry) => entry.lane)) + 1 : 1;
    const rowHeight = 48;
    const trackHeight = laneCount * rowHeight;
    const getLeftPercent = (minute) => ((minute - visibleStart) / visibleDuration) * 100;
    const getWidthPercent = (startMinute, endMinute) => ((endMinute - startMinute) / visibleDuration) * 100;
    const clipMinute = (minute) => Math.min(visibleEnd, Math.max(visibleStart, minute));
    const hourTicks = [visibleStart];
    const firstFullHour = Math.ceil(visibleStart / 60) * 60;
    for (let minute = firstFullHour; minute < visibleEnd; minute += 60) hourTicks.push(minute);
    if (hourTicks[hourTicks.length - 1] !== visibleEnd) hourTicks.push(visibleEnd);

    content.innerHTML = "";

    if (!timelineRows.length && !allDayEvents.length) {
      const empty = doc.createElement("p");
      empty.className = "muted";
      empty.textContent = t("timelineNoEvents");
      content.appendChild(empty);
      return true;
    }

    const buildChip = (entry) => {
      const evt = entry.event;
      const category = typeof o.getCategoryById === "function" ? o.getCategoryById(evt.categoryId) : null;
      const chip = doc.createElement("button");
      chip.type = "button";
      chip.className = "timeline-chip";
      chip.textContent = String((evt && evt.title) || t("eventsTitle"));
      chip.style.borderColor = category && category.color ? category.color : "rgba(15,23,42,0.12)";
      chip.style.background = typeof o.getCategoryBgColor === "function"
        ? o.getCategoryBgColor(evt.categoryId)
        : "rgba(255,255,255,0.88)";
      if (entry.segment.continuesPrevDay) chip.classList.add("timeline-chip-fade-left");
      if (entry.segment.continuesNextDay) chip.classList.add("timeline-chip-fade-right");
      chip.addEventListener("click", () => {
        if (typeof o.onOpenPreview === "function") o.onOpenPreview(evt, selectedDateKey);
      });
      return chip;
    };

    if (allDayEvents.length) {
      const allDayWrap = doc.createElement("section");
      allDayWrap.className = "timeline-all-day";
      const label = doc.createElement("span");
      label.className = "timeline-strip-label";
      label.textContent = t("allDay");
      const chips = doc.createElement("div");
      chips.className = "timeline-all-day-chips";
      allDayEvents.forEach((entry) => chips.appendChild(buildChip(entry)));
      allDayWrap.append(label, chips);
      content.appendChild(allDayWrap);
    }

    const frame = doc.createElement("section");
    frame.className = "timeline-frame";

    const header = doc.createElement("div");
    header.className = "timeline-hour-header";
    hourTicks.forEach((minute) => {
      const tick = doc.createElement("div");
      tick.className = "timeline-hour-tick";
      tick.style.left = `${getLeftPercent(Math.min(minute, visibleEnd))}%`;
      tick.textContent = minutesToTime(minute);
      header.appendChild(tick);
    });

    const track = doc.createElement("div");
    track.className = "timeline-track";
    track.style.height = `${trackHeight}px`;

    const workingBand = doc.createElement("div");
    workingBand.className = "timeline-working-band";
    const workingBandStart = clipMinute(workingStart);
    const workingBandEnd = clipMinute(workingEnd);
    if (workingBandEnd > workingBandStart) {
      workingBand.style.left = `${getLeftPercent(workingBandStart)}%`;
      workingBand.style.width = `${getWidthPercent(workingBandStart, workingBandEnd)}%`;
    } else {
      workingBand.style.display = "none";
    }
    track.appendChild(workingBand);

    hourTicks.forEach((minute) => {
      const line = doc.createElement("div");
      line.className = "timeline-grid-line";
      line.style.left = `${getLeftPercent(Math.min(minute, visibleEnd))}%`;
      track.appendChild(line);
    });

    let nowLine = null;
    const now = new Date();
    const todayKey = String(o.todayKey || "");
    if (selectedDateKey === todayKey) {
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      if (currentMinute >= visibleStart && currentMinute <= visibleEnd) {
        nowLine = doc.createElement("div");
        nowLine.className = "timeline-now-line";
        nowLine.style.left = `${getLeftPercent(currentMinute)}%`;
        const nowDot = doc.createElement("span");
        nowDot.className = "timeline-now-dot";
        const nowLabel = doc.createElement("span");
        nowLabel.className = "timeline-now-label";
        nowLabel.textContent = minutesToTime(currentMinute);
        nowLine.append(nowDot, nowLabel);
      }
    }

    laneRows.forEach((entry) => {
      const evt = entry.event;
      const segment = entry.segment;
      const startMinute = clipMinute(segment.startMinutes);
      const endMinute = clipMinute(segment.endMinutes);
      if (endMinute <= visibleStart || startMinute >= visibleEnd) return;
      const block = doc.createElement("button");
      block.type = "button";
      block.className = "timeline-event-block";
      if (segment.continuesPrevDay || segment.startMinutes < visibleStart) block.classList.add("timeline-event-fade-left");
      if (segment.continuesNextDay || segment.endMinutes > visibleEnd) block.classList.add("timeline-event-fade-right");
      const category = typeof o.getCategoryById === "function" ? o.getCategoryById(evt.categoryId) : null;
      block.style.top = `${entry.lane * rowHeight + 6}px`;
      block.style.left = `${getLeftPercent(startMinute)}%`;
      block.style.width = `${Math.max(3, getWidthPercent(startMinute, Math.max(startMinute + 15, endMinute)))}%`;
      block.style.borderColor = category && category.color ? category.color : "rgba(15,23,42,0.18)";
      block.style.background = typeof o.getCategoryBgColor === "function"
        ? o.getCategoryBgColor(evt.categoryId)
        : "rgba(255,255,255,0.92)";
      block.addEventListener("click", () => {
        if (typeof o.onOpenPreview === "function") o.onOpenPreview(evt, selectedDateKey);
      });

      const title = doc.createElement("strong");
      title.className = "timeline-event-title";
      title.textContent = String(evt.title || "");
      const meta = doc.createElement("span");
      meta.className = "timeline-event-meta";
      meta.textContent = timeMeta.getEventTimeLabelForDate(evt, selectedDateKey, { t });
      block.append(title, meta);
      track.appendChild(block);
    });

    if (nowLine) track.appendChild(nowLine);

    const legend = doc.createElement("div");
    legend.className = "timeline-legend";
    legend.textContent = `${t("timelineVisibleRange")}: ${minutesToTime(visibleStart)} - ${minutesToTime(visibleEnd)} • ${t("timelineWorkingRange")}: ${minutesToTime(workingStart)} - ${minutesToTime(workingEnd)}`;

    frame.append(header, track, legend);
    content.appendChild(frame);
    return true;
  }

  root.ProCalModules.calendarDayTimeline = {
    renderDayTimeline
  };
})(window);
