import { getPrisma } from "../db/prisma";
import { logger } from "../utils/logger";
import { createNotification, NotificationInput } from "./notificationService";

const TICK_MS = 60 * 1000;
const LOOKBACK_MS = 2 * 60 * 1000;
const MAX_OFFSET_MINUTES = 30 * 24 * 60;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

let timer: NodeJS.Timeout | null = null;
let running = false;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function isDateKey(value: unknown): value is string {
  return DATE_KEY_RE.test(asString(value));
}

function normalizeIdList(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  asArray(value).forEach((item) => {
    const id = asString(item);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  });
  return out;
}

function parseTimeToMinutes(value: unknown): number | null {
  const text = asString(value);
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function dateKeyToLocalDate(dateKey: string, minutes: number): Date {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function diffDays(startKey: string, endKey: string): number {
  const start = dateKeyToLocalDate(startKey, 0).getTime();
  const end = dateKeyToLocalDate(endKey, 0).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function buildPeopleMap(state: Record<string, unknown>, knownUserIds: Set<string>): Map<string, string> {
  const map = new Map<string, string>();
  asArray(state.people).forEach((raw) => {
    const person = asRecord(raw);
    const id = asString(person.id);
    const userId = asString(person.userId || person.id);
    if (id && userId && knownUserIds.has(userId)) map.set(id, userId);
    if (userId && knownUserIds.has(userId)) map.set(userId, userId);
  });
  knownUserIds.forEach((id) => map.set(id, id));
  return map;
}

function toKnownUserIds(rawIds: string[], peopleMap: Map<string, string>, knownUserIds: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  rawIds.forEach((raw) => {
    const mapped = peopleMap.get(raw) || "";
    if (!mapped || !knownUserIds.has(mapped) || seen.has(mapped)) return;
    seen.add(mapped);
    out.push(mapped);
  });
  return out;
}

function getEventTaskAssigneeIds(event: Record<string, unknown>, peopleMap: Map<string, string>, knownUserIds: Set<string>): string[] {
  const ids: string[] = [];
  asArray(event.tasks).forEach((raw) => {
    const task = asRecord(raw);
    ids.push(...toKnownUserIds(normalizeIdList(task.personIds), peopleMap, knownUserIds));
  });
  return Array.from(new Set(ids));
}

function getRecipients(
  event: Record<string, unknown>,
  config: Record<string, unknown>,
  peopleMap: Map<string, string>,
  knownUserIds: Set<string>
): string[] {
  const scope = asString(config.recipientScope) || "participants_tasks";
  const participants = toKnownUserIds(normalizeIdList(event.peopleIds), peopleMap, knownUserIds);
  const assignees = getEventTaskAssigneeIds(event, peopleMap, knownUserIds);
  if (scope === "all") return Array.from(knownUserIds);
  if (scope === "custom") return toKnownUserIds(normalizeIdList(config.customRecipientIds), peopleMap, knownUserIds);
  if (scope === "participants") return participants;
  if (scope === "task_assignees") return assignees;
  return Array.from(new Set([...participants, ...assignees]));
}

function normalizeRecurrence(value: unknown, baseStartDate: string): Record<string, unknown> | null {
  const rec = asRecord(value);
  const freq = asString(rec.freq);
  if (!["daily", "weekly", "monthly", "yearly"].includes(freq)) return null;
  const endMode = asString(rec.endMode) || "forever";
  if (endMode === "count") {
    const count = Number(rec.count);
    if (!Number.isFinite(count) || count < 1) return null;
    return { freq, endMode, count: Math.floor(count), untilDate: null };
  }
  if (endMode === "until") {
    const untilDate = asString(rec.untilDate);
    if (!isDateKey(untilDate) || untilDate < baseStartDate) return null;
    return { freq, endMode, count: null, untilDate };
  }
  return { freq, endMode: "forever", count: null, untilDate: null };
}

function expandOccurrenceStarts(event: Record<string, unknown>, rangeStart: string, rangeEnd: string): Array<{ dateKey: string; index: number }> {
  const start = asString(event.startDate);
  const end = asString(event.endDate) || start;
  if (!isDateKey(start) || !isDateKey(end) || start > end) return [];
  const duration = diffDays(start, end);
  const recurrence = normalizeRecurrence(event.recurrence, start);
  const overlaps = (occStart: string) => {
    const occEnd = addDaysToKey(occStart, duration);
    return rangeStart <= occEnd && occStart <= rangeEnd;
  };
  if (!recurrence) return overlaps(start) ? [{ dateKey: start, index: 0 }] : [];

  const out: Array<{ dateKey: string; index: number }> = [];
  const startDate = dateKeyToLocalDate(start, 0);
  for (let i = 0; i < 5000; i += 1) {
    const occ = new Date(startDate);
    if (recurrence.freq === "daily") occ.setDate(startDate.getDate() + i);
    if (recurrence.freq === "weekly") occ.setDate(startDate.getDate() + i * 7);
    if (recurrence.freq === "monthly") occ.setMonth(startDate.getMonth() + i);
    if (recurrence.freq === "yearly") occ.setFullYear(startDate.getFullYear() + i);
    const occKey = toDateKey(occ);
    if (recurrence.endMode === "count" && i >= Number(recurrence.count || 0)) break;
    if (recurrence.endMode === "until" && asString(recurrence.untilDate) && occKey > asString(recurrence.untilDate)) break;
    if (overlaps(occKey)) out.push({ dateKey: occKey, index: i });
    if (occKey > rangeEnd) break;
  }
  return out;
}

function getEventStartMinutes(event: Record<string, unknown>, config: Record<string, unknown>): number {
  if (event.isAllDay === true) return parseTimeToMinutes(config.allDayTime) ?? 9 * 60;
  return parseTimeToMinutes(event.startTime) ?? parseTimeToMinutes(event.time) ?? parseTimeToMinutes(config.allDayTime) ?? 9 * 60;
}

async function deliverReminder(input: {
  userId: string;
  reminderKey: string;
  eventId: string;
  dueAt: Date;
  notification: NotificationInput;
}): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.eventReminderDelivery.create({
      data: {
        userId: input.userId,
        reminderKey: input.reminderKey,
        eventId: input.eventId,
        dueAt: input.dueAt
      }
    });
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
    if (code === "P2002") return false;
    throw error;
  }
  await createNotification(input.notification);
  return true;
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const prisma = getPrisma();
    const now = new Date();
    const dueAfter = new Date(now.getTime() - LOOKBACK_MS);
    const rangeStart = toDateKey(new Date(now.getTime() - 2 * 86400000));
    const rangeEnd = toDateKey(new Date(now.getTime() + (MAX_OFFSET_MINUTES + 2880) * 60000));
    const [sharedState, users] = await Promise.all([
      prisma.sharedLegacyState.findUnique({ where: { id: 1 }, select: { dataJson: true } }),
      prisma.user.findMany({ where: { isDeleted: false, status: "active" }, select: { id: true } })
    ]);
    const state = asRecord(sharedState?.dataJson);
    const knownUserIds = new Set(users.map((row) => asString(row.id)).filter(Boolean));
    if (!knownUserIds.size) return;
    const peopleMap = buildPeopleMap(state, knownUserIds);
    const deliveries: Array<Promise<boolean>> = [];

    Object.values(asRecord(state.events)).forEach((list) => {
      asArray(list).forEach((raw) => {
        const event = asRecord(raw);
        const eventId = asString(event.id);
        const title = asString(event.title) || "(без име)";
        const config = asRecord(event.reminders);
        if (!eventId || config.enabled !== true) return;
        const repeatMode = asString(config.repeatMode) === "first_only" ? "first_only" : "each_occurrence";
        const offsetMinutes = Math.max(0, Math.min(MAX_OFFSET_MINUTES, Number(config.offsetMinutes) || 0));
        const startMinutes = getEventStartMinutes(event, config);
        const recipients = getRecipients(event, config, peopleMap, knownUserIds);
        if (!recipients.length) return;

        expandOccurrenceStarts(event, rangeStart, rangeEnd).forEach((occ) => {
          if (repeatMode === "first_only" && occ.index > 0) return;
          const startAt = dateKeyToLocalDate(occ.dateKey, startMinutes);
          const dueAt = new Date(startAt.getTime() - offsetMinutes * 60000);
          if (dueAt > now || dueAt < dueAfter) return;
          const reminderKey = `${eventId}:${occ.index}:${occ.dateKey}:${offsetMinutes}`;
          recipients.forEach((userId) => {
            deliveries.push(deliverReminder({
              userId,
              reminderKey,
              eventId,
              dueAt,
              notification: {
                userId,
                type: "event.reminder",
                title: `Ремайндер: ${title}`,
                body: `Събитие на ${occ.dateKey}.`,
                entityType: "event",
                entityId: eventId,
                metaJson: {
                  eventId,
                  title,
                  occurrenceDate: occ.dateKey,
                  occurrenceIndex: occ.index,
                  dueAt: dueAt.toISOString(),
                  startAt: startAt.toISOString(),
                  offsetMinutes
                }
              }
            }));
          });
        });
      });
    });

    const results = deliveries.length ? await Promise.all(deliveries) : [];
    const sent = results.filter(Boolean).length;
    if (sent) logger.info({ sent }, "Event reminders delivered");
  } catch (error) {
    logger.error({ err: error }, "Event reminder scheduler tick failed");
  } finally {
    running = false;
  }
}

export function startEventReminderScheduler(): void {
  if (timer) return;
  void tick();
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);
}

export function stopEventReminderScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
