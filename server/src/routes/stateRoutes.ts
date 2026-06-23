import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getPrisma } from "../db/prisma";
import { writeAudit } from "../services/auditService";
import { publishLegacyStateChange } from "../services/realtimeSyncService";
import { createNotifications, NotificationInput } from "../services/notificationService";
import { syncEventFoldersFromCalendarEvents } from "../services/filesService";

const stateSchema = z.object({
  state: z.record(z.any()),
  modifiedAt: z.string().datetime().optional(),
  version: z.number().int().positive().optional()
});

const modeSchema = z.enum(["personal", "shared"]);
const personalTaskCollabInviteSchema = z.object({
  taskId: z.string().min(1),
  dateKey: z.string().min(1).optional(),
  inviteeUserIds: z.array(z.string().min(1)).max(20).default([])
});
const personalTaskCollabRespondSchema = z.object({
  action: z.enum(["accept", "decline"])
});

export const stateRouter = Router();
stateRouter.use(requireAuth);

function readMode(raw: unknown): "personal" | "shared" {
  const parsed = modeSchema.safeParse(raw);
  return parsed.success ? parsed.data : "personal";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

type SharedUser = {
  id: string;
  username: string;
  nickname: string | null;
  displayColor: string | null;
};

function normalizeSharedNickname(nickname: string | null, username: string): string {
  const value = String(nickname || "").trim();
  return value || String(username || "").trim();
}

function normalizeSharedColor(color: string | null): string {
  const value = String(color || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#64748b";
}

function mergeUsersIntoSharedPeople(state: Record<string, unknown>, users: SharedUser[]): Record<string, unknown> {
  const people = users.map((user) => {
    const userId = String(user.id);
    const name = normalizeSharedNickname(user.nickname, user.username);
    const color = normalizeSharedColor(user.displayColor);
    return { id: userId, userId, name, color };
  });

  return { ...state, people };
}

function isAdminLikeRole(role: string | undefined): boolean {
  return role === "system_admin" || role === "admin";
}

function restrictSharedStateForUser(
  incomingState: unknown,
  existingState: unknown
): Record<string, unknown> {
  const incoming = asRecord(incomingState);
  const existing = asRecord(existingState);

  return {
    ...existing,
    tasks: incoming.tasks ?? existing.tasks ?? {},
    stickyNotes: incoming.stickyNotes ?? existing.stickyNotes ?? []
  };
}

function restrictSharedStateForNonAdmin(
  incomingState: unknown,
  existingState: unknown
): Record<string, unknown> {
  const incoming = asRecord(incomingState);
  const existing = asRecord(existingState);

  return {
    ...existing,
    events: incoming.events ?? existing.events ?? {},
    absences: incoming.absences ?? existing.absences ?? [],
    tasks: incoming.tasks ?? existing.tasks ?? {},
    stickyNotes: incoming.stickyNotes ?? existing.stickyNotes ?? [],
    people: existing.people ?? [],
    categories: existing.categories ?? []
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return String(value == null ? "" : value).trim();
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

type LegacyTaskLite = {
  id: string;
  title: string;
  personIds: string[];
};

type LegacyEventLite = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  peopleIds: string[];
  tasks: LegacyTaskLite[];
};

type StandaloneTaskLite = {
  id: string;
  title: string;
  dateKey: string;
  personIds: string[];
};

type PersonalStandaloneTask = {
  id: string;
  title: string;
  personIds: string[];
  categoryId?: string;
  done?: boolean;
  createdByUserId?: string;
  collabGroupId?: string;
  collabOwnerUserId?: string;
  collabMemberUserIds?: string[];
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function readTasksByDate(state: Record<string, unknown>): Record<string, unknown> {
  return asRecord(state.tasks);
}

function iterStandaloneTasks(state: Record<string, unknown>): Array<{ dateKey: string; task: Record<string, unknown>; index: number; list: unknown[] }> {
  const out: Array<{ dateKey: string; task: Record<string, unknown>; index: number; list: unknown[] }> = [];
  const tasksByDate = readTasksByDate(state);
  Object.entries(tasksByDate).forEach(([dateKey, listRaw]) => {
    const list = asArray(listRaw);
    list.forEach((raw, index) => {
      const task = asRecord(raw);
      if (!asString(task.id)) return;
      out.push({ dateKey, task, index, list });
    });
  });
  return out;
}

function findStandaloneTaskInState(state: Record<string, unknown>, taskId: string, preferredDateKey?: string): { dateKey: string; task: Record<string, unknown> } | null {
  const wantedId = asString(taskId);
  const preferredDate = asString(preferredDateKey);
  if (!wantedId) return null;
  const tasksByDate = readTasksByDate(state);
  if (preferredDate) {
    const hit = asArray(tasksByDate[preferredDate])
      .map((raw) => asRecord(raw))
      .find((task) => asString(task.id) === wantedId);
    if (hit) return { dateKey: preferredDate, task: hit };
  }
  for (const [dateKey, listRaw] of Object.entries(tasksByDate)) {
    const hit = asArray(listRaw).map((raw) => asRecord(raw)).find((task) => asString(task.id) === wantedId);
    if (hit) return { dateKey, task: hit };
  }
  return null;
}

function findTaskByCollabGroup(state: Record<string, unknown>, groupId: string): { dateKey: string; task: Record<string, unknown>; index: number } | null {
  const wanted = asString(groupId);
  if (!wanted) return null;
  for (const row of iterStandaloneTasks(state)) {
    if (asString(row.task.collabGroupId) === wanted) {
      return { dateKey: row.dateKey, task: row.task, index: row.index };
    }
  }
  return null;
}

function ensureTaskListForDate(state: Record<string, unknown>, dateKey: string): unknown[] {
  const nextState = state;
  const tasksByDate = asRecord(nextState.tasks);
  if (!Array.isArray(tasksByDate[dateKey])) {
    tasksByDate[dateKey] = [];
  }
  nextState.tasks = tasksByDate;
  return asArray(tasksByDate[dateKey]);
}

function removeTaskByCollabGroup(state: Record<string, unknown>, groupId: string): boolean {
  const wanted = asString(groupId);
  if (!wanted) return false;
  const tasksByDate = asRecord(state.tasks);
  let changed = false;
  Object.entries(tasksByDate).forEach(([dateKey, listRaw]) => {
    const list = asArray(listRaw);
    const next = list.filter((raw) => asString(asRecord(raw).collabGroupId) !== wanted);
    if (next.length !== list.length) {
      changed = true;
      if (next.length) tasksByDate[dateKey] = next;
      else delete tasksByDate[dateKey];
    }
  });
  state.tasks = tasksByDate;
  return changed;
}

function normalizeCollabMembers(raw: unknown, fallbackOwnerId: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const id = asString(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };
  normalizeIdList(raw).forEach(push);
  push(fallbackOwnerId);
  return out;
}

function ensurePersonalTaskCollabMeta(task: Record<string, unknown>, ownerUserId: string, groupId?: string): void {
  const ownerId = asString(task.collabOwnerUserId) || asString(ownerUserId);
  const nextGroupId = asString(task.collabGroupId) || asString(groupId) || `ptc:${ownerId}:${asString(task.id)}`;
  const members = normalizeCollabMembers(task.collabMemberUserIds, ownerId);
  task.collabOwnerUserId = ownerId;
  task.collabGroupId = nextGroupId;
  task.collabMemberUserIds = members;
  task.personIds = members.slice();
  if (!asString(task.createdByUserId)) task.createdByUserId = ownerId;
}

type ExistingCollabTaskMeta = {
  collabGroupId: string;
  collabOwnerUserId: string;
  collabMemberUserIds: string[];
  createdByUserId: string;
};

function buildExistingCollabMetaByTaskId(stateInput: Record<string, unknown>): Map<string, ExistingCollabTaskMeta> {
  const map = new Map<string, ExistingCollabTaskMeta>();
  for (const row of iterStandaloneTasks(asRecord(stateInput))) {
    const taskId = asString(row.task.id);
    const collabGroupId = asString(row.task.collabGroupId);
    if (!taskId || !collabGroupId) continue;
    const collabOwnerUserId = asString(row.task.collabOwnerUserId) || asString(row.task.createdByUserId);
    if (!collabOwnerUserId) continue;
    map.set(taskId, {
      collabGroupId,
      collabOwnerUserId,
      collabMemberUserIds: normalizeCollabMembers(row.task.collabMemberUserIds, collabOwnerUserId),
      createdByUserId: asString(row.task.createdByUserId) || collabOwnerUserId
    });
  }
  return map;
}

function normalizePersonalCollaborativeTasksState(
  stateInput: Record<string, unknown>,
  actorUserId: string,
  existingStateInput?: Record<string, unknown>
): Record<string, unknown> {
  const state = cloneJson(stateInput || {});
  const existingByTaskId = buildExistingCollabMetaByTaskId(asRecord(existingStateInput));
  const tasksByDate = asRecord(state.tasks);
  Object.entries(tasksByDate).forEach(([dateKey, listRaw]) => {
    if (!Array.isArray(listRaw)) return;
    const nextList = asArray(listRaw).map((raw) => {
      const task = asRecord(raw);
      if (!asString(task.id) || !asString(task.title)) return raw;
      if (!asString(task.createdByUserId)) task.createdByUserId = actorUserId;
      const existingMeta = existingByTaskId.get(asString(task.id));
      if (!asString(task.collabGroupId) && existingMeta) {
        task.collabGroupId = existingMeta.collabGroupId;
        task.collabOwnerUserId = existingMeta.collabOwnerUserId;
        task.createdByUserId = asString(task.createdByUserId) || existingMeta.createdByUserId;
        task.collabMemberUserIds = existingMeta.collabMemberUserIds.slice();
      }
      const groupId = asString(task.collabGroupId);
      if (groupId) {
        ensurePersonalTaskCollabMeta(task, asString(task.collabOwnerUserId) || actorUserId, groupId);
        if (existingMeta && existingMeta.collabGroupId === groupId) {
          const ownerUserId = asString(existingMeta.collabOwnerUserId);
          if (actorUserId === ownerUserId) {
            const ownerScopedMembers = normalizeCollabMembers(task.collabMemberUserIds, ownerUserId);
            task.collabMemberUserIds = ownerScopedMembers;
            task.personIds = ownerScopedMembers.slice();
          } else {
            const requested = normalizeIdList(Array.isArray(task.collabMemberUserIds) ? task.collabMemberUserIds : task.personIds);
            const actorWantsToLeave = !requested.includes(actorUserId);
            const nextMembers = actorWantsToLeave
              ? existingMeta.collabMemberUserIds.filter((id) => id !== actorUserId)
              : existingMeta.collabMemberUserIds.slice();
            task.collabOwnerUserId = ownerUserId;
            task.createdByUserId = existingMeta.createdByUserId || ownerUserId;
            task.collabMemberUserIds = nextMembers;
            task.personIds = nextMembers.slice();
          }
        }
        if (!normalizeIdList(task.collabMemberUserIds).includes(actorUserId)) {
          return null;
        }
      } else {
        const personIds = normalizeIdList(task.personIds);
        if (actorUserId && !personIds.includes(actorUserId)) task.personIds = [actorUserId, ...personIds];
      }
      return task;
    }).filter((task) => Boolean(task));
    if (nextList.length) tasksByDate[dateKey] = nextList;
    else delete tasksByDate[dateKey];
  });
  state.tasks = tasksByDate;
  return state;
}

type CollabTaskSnapshot = {
  groupId: string;
  ownerUserId: string;
  memberUserIds: string[];
  sourceDateKey: string;
  task: Record<string, unknown>;
};

function collectCollabTaskSnapshots(state: Record<string, unknown>): Map<string, CollabTaskSnapshot> {
  const map = new Map<string, CollabTaskSnapshot>();
  for (const row of iterStandaloneTasks(state)) {
    const groupId = asString(row.task.collabGroupId);
    if (!groupId) continue;
    const ownerUserId = asString(row.task.collabOwnerUserId);
    if (!ownerUserId) continue;
    const memberUserIds = normalizeCollabMembers(row.task.collabMemberUserIds, ownerUserId);
    const linkedEventDateKey = asString(row.task.linkedEventDateKey);
    const sourceDateKey = /^\d{4}-\d{2}-\d{2}$/.test(linkedEventDateKey) ? linkedEventDateKey : row.dateKey;
    row.task.personIds = memberUserIds.slice();
    map.set(groupId, {
      groupId,
      ownerUserId,
      memberUserIds,
      sourceDateKey,
      task: row.task
    });
  }
  return map;
}

function buildPersonalCollabMembershipNotifications(
  previousStateInput: Record<string, unknown>,
  nextStateInput: Record<string, unknown>,
  actorUserId: string
): NotificationInput[] {
  const prevMap = collectCollabTaskSnapshots(asRecord(previousStateInput));
  const nextMap = collectCollabTaskSnapshots(asRecord(nextStateInput));
  const notifications: NotificationInput[] = [];
  const allGroupIds = new Set<string>([...prevMap.keys(), ...nextMap.keys()]);

  const push = (userId: string, type: string, title: string, body: string, meta: Record<string, unknown>) => {
    const target = asString(userId);
    if (!target) return;
    notifications.push({
      userId: target,
      type,
      title,
      body,
      entityType: "task",
      entityId: asString(meta.collabGroupId) || asString(meta.taskId) || null,
      metaJson: { ...meta, actorUserId }
    });
  };

  allGroupIds.forEach((groupId) => {
    const prev = prevMap.get(groupId);
    const next = nextMap.get(groupId);
    if (!prev || !next) return;
    const prevMembers = new Set(prev.memberUserIds);
    const nextMembers = new Set(next.memberUserIds);
    const added = Array.from(nextMembers).filter((id) => !prevMembers.has(id));
    const removed = Array.from(prevMembers).filter((id) => !nextMembers.has(id));
    if (!added.length && !removed.length) return;

    const taskTitle = asString(next.task.title) || asString(prev.task.title) || "(без име)";
    const dateKey = asString(next.sourceDateKey) || asString(prev.sourceDateKey) || "-";
    const ownerUserId = asString(next.ownerUserId || prev.ownerUserId);
    const commonMeta = {
      collabGroupId: groupId,
      taskId: asString(next.task.id) || asString(prev.task.id),
      taskTitle,
      dateKey,
      ownerUserId
    };

    added.forEach((addedUserId) => {
      const otherMembers = Array.from(nextMembers).filter((id) => id && id !== addedUserId);
      otherMembers.forEach((targetUserId) => {
        push(
          targetUserId,
          "task.personal_collab_member_added",
          `Добавен участник в съвместна задача: ${taskTitle}`,
          `Нов участник е добавен/приет. Дата: ${dateKey}.`,
          { ...commonMeta, affectedUserId: addedUserId }
        );
      });
    });

    removed.forEach((removedUserId) => {
      const actorIsRemovedSelf = asString(actorUserId) === removedUserId;
      if (actorIsRemovedSelf && removedUserId !== ownerUserId) {
        const remainingTargets = Array.from(nextMembers).filter((id) => id && id !== removedUserId);
        remainingTargets.forEach((targetUserId) => {
          push(
            targetUserId,
            "task.personal_collab_member_left",
            `Участник напусна съвместна задача: ${taskTitle}`,
            `Участник се е отделил от задачата. Дата: ${dateKey}.`,
            { ...commonMeta, affectedUserId: removedUserId }
          );
        });
      } else {
        push(
          removedUserId,
          "task.personal_collab_member_removed",
          `Премахнати сте от съвместна задача: ${taskTitle}`,
          `Вече не участвате в задачата. Дата: ${dateKey}.`,
          { ...commonMeta, affectedUserId: removedUserId }
        );
        const remainingTargets = Array.from(nextMembers).filter((id) => id && id !== removedUserId);
        remainingTargets.forEach((targetUserId) => {
          push(
            targetUserId,
            "task.personal_collab_member_removed",
            `Премахнат участник от съвместна задача: ${taskTitle}`,
            `Участник е премахнат от задачата. Дата: ${dateKey}.`,
            { ...commonMeta, affectedUserId: removedUserId }
          );
        });
      }
    });
  });

  return notifications;
}

function buildMirroredTaskFromSource(sourceTask: Record<string, unknown>, targetUserId: string): Record<string, unknown> {
  const ownerUserId = asString(sourceTask.collabOwnerUserId) || asString(sourceTask.createdByUserId) || targetUserId;
  const groupId = asString(sourceTask.collabGroupId) || `ptc:${ownerUserId}:${asString(sourceTask.id)}`;
  const members = normalizeCollabMembers(sourceTask.collabMemberUserIds, ownerUserId);
  const linkedEventDateKeyRaw = asString(sourceTask.linkedEventDateKey);
  return {
    id: asString(sourceTask.id) || `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: asString(sourceTask.title),
    personIds: members.slice(),
    categoryId: asString(sourceTask.categoryId),
    done: Boolean(sourceTask.done),
    createdByUserId: asString(sourceTask.createdByUserId) || ownerUserId,
    collabGroupId: groupId,
    collabOwnerUserId: ownerUserId,
    collabMemberUserIds: members.slice(),
    linkedEventId: asString(sourceTask.linkedEventId),
    linkedEventDateKey: /^\d{4}-\d{2}-\d{2}$/.test(linkedEventDateKeyRaw) ? linkedEventDateKeyRaw : "",
    linkedEventTitle: asString(sourceTask.linkedEventTitle)
  };
}

async function syncPersonalCollaborativeTasksForActor(
  prisma: ReturnType<typeof getPrisma>,
  actorUserId: string,
  previousStateInput: Record<string, unknown>,
  nextStateInput: Record<string, unknown>
): Promise<string[]> {
  const previousState = asRecord(previousStateInput);
  const nextState = asRecord(nextStateInput);
  const prevCollab = collectCollabTaskSnapshots(previousState);
  const nextCollab = collectCollabTaskSnapshots(nextState);
  const targetUserIds = new Set<string>();

  nextCollab.forEach((snap) => {
    if (!snap.memberUserIds.includes(actorUserId)) return;
    snap.memberUserIds.forEach((id) => { if (id && id !== actorUserId) targetUserIds.add(id); });
  });
  prevCollab.forEach((snap) => {
    if (!snap.memberUserIds.includes(actorUserId)) return;
    snap.memberUserIds.forEach((id) => { if (id && id !== actorUserId) targetUserIds.add(id); });
  });
  if (!targetUserIds.size) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(targetUserIds) }, isDeleted: false, status: "active" },
    select: { id: true }
  });
  const existingUserIds = new Set(users.map((u) => u.id));
  const changedUsers: string[] = [];

  for (const targetUserId of Array.from(targetUserIds)) {
    if (!existingUserIds.has(targetUserId)) continue;
    const targetRec = await prisma.legacyState.findUnique({ where: { userId: targetUserId } });
    const targetState = normalizePersonalCollaborativeTasksState(asRecord(targetRec?.dataJson), targetUserId);
    let changed = false;

    nextCollab.forEach((snap) => {
      if (!snap.memberUserIds.includes(actorUserId)) return;
      const shouldHave = snap.memberUserIds.includes(targetUserId);
      if (!shouldHave) {
        if (removeTaskByCollabGroup(targetState, snap.groupId)) changed = true;
        return;
      }
      const mirrored = buildMirroredTaskFromSource(snap.task, targetUserId);
      const found = findTaskByCollabGroup(targetState, snap.groupId);
      if (found) {
        const tasksByDate = asRecord(targetState.tasks);
        if (found.dateKey !== snap.sourceDateKey) {
          const oldList = asArray(tasksByDate[found.dateKey]).filter((raw) => asString(asRecord(raw).collabGroupId) !== snap.groupId);
          if (oldList.length) tasksByDate[found.dateKey] = oldList; else delete tasksByDate[found.dateKey];
          const newList = ensureTaskListForDate(targetState, snap.sourceDateKey);
          newList.push(mirrored);
          changed = true;
        } else {
          const list = ensureTaskListForDate(targetState, found.dateKey);
          const idx = list.findIndex((raw) => asString(asRecord(raw).collabGroupId) === snap.groupId);
          if (idx >= 0) {
            const prevJson = JSON.stringify(list[idx]);
            const nextJson = JSON.stringify(mirrored);
            if (prevJson !== nextJson) {
              list[idx] = mirrored;
              changed = true;
            }
          }
        }
      } else {
        const list = ensureTaskListForDate(targetState, snap.sourceDateKey);
        list.push(mirrored);
        changed = true;
      }
    });

    prevCollab.forEach((snap) => {
      if (!snap.memberUserIds.includes(actorUserId)) return;
      if (nextCollab.has(snap.groupId)) return;
      if (!snap.memberUserIds.includes(targetUserId)) return;
      if (removeTaskByCollabGroup(targetState, snap.groupId)) changed = true;
    });

    if (!changed) continue;
    const saved = await prisma.legacyState.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId, dataJson: targetState as object },
      update: { dataJson: targetState as object, version: { increment: 1 } }
    });
    publishLegacyStateChange({
      mode: "personal",
      userId: targetUserId,
      version: saved.version,
      updatedAt: saved.updatedAt.toISOString(),
      actorUserId
    });
    changedUsers.push(targetUserId);
  }

  return changedUsers;
}

function dateLabel(startDate: string, endDate: string): string {
  if (startDate && endDate && startDate !== endDate) return `${startDate} to ${endDate}`;
  return startDate || endDate || "-";
}

function buildUserIdMapFromPeople(state: Record<string, unknown>, knownUserIds: Set<string>): Map<string, string> {
  const map = new Map<string, string>();
  asArray(state.people).forEach((row) => {
    const rec = asRecord(row);
    const id = asString(rec.id);
    const userId = asString(rec.userId) || id;
    if (!id || !userId || !knownUserIds.has(userId)) return;
    map.set(id, userId);
    map.set(userId, userId);
  });
  knownUserIds.forEach((id) => map.set(id, id));
  return map;
}

function toKnownUserIds(rawIds: string[], peopleMap: Map<string, string>, knownUserIds: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  rawIds.forEach((raw) => {
    const direct = knownUserIds.has(raw) ? raw : "";
    const mapped = peopleMap.get(raw) || "";
    const value = direct || mapped;
    if (!value || seen.has(value) || !knownUserIds.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
}

function collectLegacyEvents(state: Record<string, unknown>, peopleMap: Map<string, string>, knownUserIds: Set<string>): LegacyEventLite[] {
  const eventsByDate = asRecord(state.events);
  const out: LegacyEventLite[] = [];
  Object.values(eventsByDate).forEach((list) => {
    asArray(list).forEach((raw) => {
      const rec = asRecord(raw);
      const id = asString(rec.id);
      if (!id) return;
      const startDate = asString(rec.startDate);
      const endDate = asString(rec.endDate) || startDate;
      const peopleIds = toKnownUserIds(normalizeIdList(rec.peopleIds), peopleMap, knownUserIds);
      const tasks = asArray(rec.tasks).map((taskRaw) => {
        const task = asRecord(taskRaw);
        return {
          id: asString(task.id),
          title: asString(task.title),
          personIds: toKnownUserIds(normalizeIdList((task as Record<string, unknown>).personIds), peopleMap, knownUserIds)
        };
      }).filter((task) => task.id);
      out.push({
        id,
        title: asString(rec.title),
        startDate,
        endDate,
        peopleIds,
        tasks
      });
    });
  });
  return out;
}

function collectEventsForFolderSync(state: Record<string, unknown>): Array<{
  eventKey: string;
  title: string;
  startDate: string;
  endDate: string;
  filesFolderEnabled: boolean;
  filesDetached: boolean;
}> {
  const out = new Map<string, {
    eventKey: string;
    title: string;
    startDate: string;
    endDate: string;
    filesFolderEnabled: boolean;
    filesDetached: boolean;
  }>();
  const eventsByDate = asRecord(state.events);
  Object.values(eventsByDate).forEach((list) => {
    asArray(list).forEach((raw) => {
      const rec = asRecord(raw);
      const eventKey = asString(rec.id);
      if (!eventKey) return;
      const title = asString(rec.title);
      const startDate = asString(rec.startDate);
      const endDate = asString(rec.endDate) || startDate;
      const filesFolderEnabled = rec.filesFolderEnabled !== false;
      const filesDetached = rec.filesDetached === true;
      const previous = out.get(eventKey);
      if (!previous) {
        out.set(eventKey, { eventKey, title, startDate, endDate, filesFolderEnabled, filesDetached });
        return;
      }
      const next = { ...previous };
      if (!next.title && title) next.title = title;
      if (!next.startDate && startDate) next.startDate = startDate;
      if (!next.endDate && endDate) next.endDate = endDate;
      if (!filesFolderEnabled) next.filesFolderEnabled = false;
      if (filesDetached) next.filesDetached = true;
      out.set(eventKey, next);
    });
  });
  return Array.from(out.values());
}

function collectStandaloneTasks(state: Record<string, unknown>, peopleMap: Map<string, string>, knownUserIds: Set<string>): StandaloneTaskLite[] {
  const tasksByDate = asRecord(state.tasks);
  const out: StandaloneTaskLite[] = [];
  Object.entries(tasksByDate).forEach(([dateKey, list]) => {
    asArray(list).forEach((raw) => {
      const rec = asRecord(raw);
      const id = asString(rec.id);
      if (!id) return;
      out.push({
        id,
        title: asString(rec.title),
        dateKey: asString(dateKey),
        personIds: toKnownUserIds(normalizeIdList((rec as Record<string, unknown>).personIds), peopleMap, knownUserIds)
      });
    });
  });
  return out;
}

function setDiff(nextValues: string[], prevValues: string[]): string[] {
  const prev = new Set(prevValues || []);
  return (nextValues || []).filter((value) => value && !prev.has(value));
}

type TaskIndexRow = {
  key: string;
  taskId: string;
  taskTitle: string;
  assignees: string[];
  eventId: string;
  eventTitle: string;
  dateKey: string;
};

function buildTaskIndex(events: LegacyEventLite[], standaloneTasks: StandaloneTaskLite[]): Map<string, TaskIndexRow> {
  const map = new Map<string, TaskIndexRow>();
  events.forEach((event) => {
    event.tasks.forEach((task) => {
      if (!task.id) return;
      const key = `event:${event.id}:task:${task.id}`;
      map.set(key, {
        key,
        taskId: task.id,
        taskTitle: task.title,
        assignees: task.personIds.slice(),
        eventId: event.id,
        eventTitle: event.title,
        dateKey: event.startDate
      });
    });
  });
  standaloneTasks.forEach((task) => {
    const key = `standalone:${task.dateKey}:${task.id}`;
    map.set(key, {
      key,
      taskId: task.id,
      taskTitle: task.title,
      assignees: task.personIds.slice(),
      eventId: "",
      eventTitle: "",
      dateKey: task.dateKey
    });
  });
  return map;
}

function eventSignature(event: LegacyEventLite): string {
  return JSON.stringify({
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    peopleIds: event.peopleIds.slice().sort()
  });
}

type TaskAssigneeIndex = Map<string, { assignees: Set<string>; taskTitle: string; eventId: string; eventTitle: string; dateKey: string }>;

function buildTaskAssigneeIndex(events: LegacyEventLite[], standaloneTasks: StandaloneTaskLite[]): TaskAssigneeIndex {
  const rows = buildTaskIndex(events, standaloneTasks);
  const out: TaskAssigneeIndex = new Map();
  rows.forEach((row, key) => {
    out.set(key, {
      assignees: new Set(row.assignees || []),
      taskTitle: row.taskTitle,
      eventId: row.eventId,
      eventTitle: row.eventTitle,
      dateKey: row.dateKey
    });
  });
  return out;
}

type StickyShareLite = {
  userId: string;
  canEdit: boolean;
};

type StickyNoteLite = {
  id: string;
  ownerId: string;
  title: string;
  shares: StickyShareLite[];
};

function normalizeStickyShares(rec: Record<string, unknown>, peopleMap: Map<string, string>, knownUserIds: Set<string>): StickyShareLite[] {
  const seen = new Set<string>();
  const out: StickyShareLite[] = [];
  const directShares = asArray(rec.shares)
    .filter((row) => row && typeof row === "object")
    .map((row) => asRecord(row))
    .map((row) => ({
      userId: asString(row.userId || row.id),
      canEdit: Boolean(row.canEdit)
    }));
  const legacyShared = normalizeIdList(rec.sharedWith);
  const legacyEditable = new Set(normalizeIdList(rec.sharedEditableWith));
  const fallbackMode = asString(rec.sharedMode);
  const legacyShares = legacyShared.map((userId) => ({
    userId,
    canEdit: legacyEditable.has(userId) || fallbackMode === "sync_edit"
  }));
  const merged = directShares.length ? directShares : legacyShares;

  merged.forEach((row) => {
    const mapped = peopleMap.get(row.userId) || row.userId;
    if (!mapped || !knownUserIds.has(mapped) || seen.has(mapped)) return;
    seen.add(mapped);
    out.push({ userId: mapped, canEdit: Boolean(row.canEdit) });
  });
  return out;
}

function collectStickyNotes(state: Record<string, unknown>, peopleMap: Map<string, string>, knownUserIds: Set<string>): StickyNoteLite[] {
  const out: StickyNoteLite[] = [];
  asArray(state.stickyNotes).forEach((raw) => {
    const rec = asRecord(raw);
    const id = asString(rec.id);
    if (!id) return;
    const rawOwner = asString(rec.ownerId);
    const mappedOwner = peopleMap.get(rawOwner) || rawOwner;
    const ownerId = knownUserIds.has(mappedOwner) ? mappedOwner : "";
    if (!ownerId) return;
    out.push({
      id,
      ownerId,
      title: asString(rec.title),
      shares: normalizeStickyShares(rec, peopleMap, knownUserIds)
    });
  });
  return out;
}

function shareModeLabel(canEdit: boolean): string {
  return canEdit ? "с редакция" : "само четене";
}

function buildLegacySharedNotifications(
  previousState: Record<string, unknown>,
  nextState: Record<string, unknown>,
  actorUserId: string,
  knownUserIds: Set<string>
): NotificationInput[] {
  const prevPeopleMap = buildUserIdMapFromPeople(previousState, knownUserIds);
  const nextPeopleMap = buildUserIdMapFromPeople(nextState, knownUserIds);
  const prevEvents = collectLegacyEvents(previousState, prevPeopleMap, knownUserIds);
  const nextEvents = collectLegacyEvents(nextState, nextPeopleMap, knownUserIds);
  const prevStandaloneTasks = collectStandaloneTasks(previousState, prevPeopleMap, knownUserIds);
  const nextStandaloneTasks = collectStandaloneTasks(nextState, nextPeopleMap, knownUserIds);
  const allUserIds = Array.from(knownUserIds).filter(Boolean);
  const notifications: NotificationInput[] = [];

  const prevEventsById = new Map(prevEvents.map((row) => [row.id, row]));
  const nextEventsById = new Map(nextEvents.map((row) => [row.id, row]));

  nextEvents.forEach((event) => {
    const prev = prevEventsById.get(event.id);
    if (!prev) {
      allUserIds.forEach((userId) => {
        notifications.push({
          userId,
          type: "event.created",
          title: `Създадено събитие: ${event.title || "(без име)"}`,
          body: `Дата: ${dateLabel(event.startDate, event.endDate)}.`,
          entityType: "event",
          entityId: event.id,
          metaJson: { eventId: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, actorUserId }
        });
      });
      event.peopleIds.forEach((userId) => {
        notifications.push({
          userId,
          type: "event.participant_added",
          title: `Добавени сте в събитие: ${event.title || "(без име)"}`,
          body: `Дата: ${dateLabel(event.startDate, event.endDate)}.`,
          entityType: "event",
          entityId: event.id,
          metaJson: { eventId: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, actorUserId }
        });
      });
      return;
    }

    if (eventSignature(prev) !== eventSignature(event)) {
      allUserIds.forEach((userId) => {
        notifications.push({
          userId,
          type: "event.updated",
          title: `Променено събитие: ${event.title || "(без име)"}`,
          body: `Период: ${dateLabel(event.startDate, event.endDate)}.`,
          entityType: "event",
          entityId: event.id,
          metaJson: { eventId: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, actorUserId }
        });
      });
    }

    const addedParticipants = setDiff(event.peopleIds, prev.peopleIds);
    addedParticipants.forEach((userId) => {
      notifications.push({
        userId,
        type: "event.participant_added",
        title: `Добавени сте в събитие: ${event.title || "(без име)"}`,
        body: `Дата: ${dateLabel(event.startDate, event.endDate)}.`,
        entityType: "event",
        entityId: event.id,
        metaJson: { eventId: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, actorUserId }
      });
    });

    const removedParticipants = setDiff(prev.peopleIds, event.peopleIds);
    removedParticipants.forEach((userId) => {
      notifications.push({
        userId,
        type: "event.participant_removed",
        title: `Премахнати сте от събитие: ${event.title || "(без име)"}`,
        body: `Период: ${dateLabel(event.startDate, event.endDate)}.`,
        entityType: "event",
        entityId: event.id,
        metaJson: { eventId: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, actorUserId }
      });
    });
  });

  prevEvents.forEach((event) => {
    if (nextEventsById.has(event.id)) return;
    allUserIds.forEach((userId) => {
      notifications.push({
        userId,
        type: "event.deleted",
        title: `Изтрито събитие: ${event.title || "(без име)"}`,
        body: `Период: ${dateLabel(event.startDate, event.endDate)}.`,
        entityType: "event",
        entityId: event.id,
        metaJson: { eventId: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, actorUserId }
      });
    });
  });

  const prevTaskIndex = buildTaskAssigneeIndex(prevEvents, prevStandaloneTasks);
  const nextTaskIndex = buildTaskAssigneeIndex(nextEvents, nextStandaloneTasks);

  nextTaskIndex.forEach((nextRow, key) => {
    const prevRow = prevTaskIndex.get(key);
    const prevSet = prevRow ? prevRow.assignees : new Set<string>();

    if (!prevRow) {
      allUserIds.forEach((userId) => {
        notifications.push({
          userId,
          type: "task.created",
          title: `Създадена задача: ${nextRow.taskTitle || "(без име)"}`,
          body: nextRow.eventTitle
            ? `В събитие: ${nextRow.eventTitle}. Дата: ${nextRow.dateKey || "-"}.`
            : `Задача без събитие. Дата: ${nextRow.dateKey || "-"}.`,
          entityType: "task",
          entityId: key,
          metaJson: { key, taskTitle: nextRow.taskTitle, eventId: nextRow.eventId, eventTitle: nextRow.eventTitle, dateKey: nextRow.dateKey, actorUserId }
        });
      });
    } else if (
      prevRow.taskTitle !== nextRow.taskTitle ||
      prevRow.eventTitle !== nextRow.eventTitle ||
      prevRow.dateKey !== nextRow.dateKey
    ) {
      allUserIds.forEach((userId) => {
        notifications.push({
          userId,
          type: "task.updated",
          title: `Променена задача: ${nextRow.taskTitle || "(без име)"}`,
          body: nextRow.eventTitle
            ? `В събитие: ${nextRow.eventTitle}. Дата: ${nextRow.dateKey || "-"}.`
            : `Задача без събитие. Дата: ${nextRow.dateKey || "-"}.`,
          entityType: "task",
          entityId: key,
          metaJson: { key, taskTitle: nextRow.taskTitle, eventId: nextRow.eventId, eventTitle: nextRow.eventTitle, dateKey: nextRow.dateKey, actorUserId }
        });
      });
    }

    const added = Array.from(nextRow.assignees).filter((userId) => !prevSet.has(userId));
    added.forEach((userId) => {
      const inEvent = nextRow.eventTitle ? `В събитие: ${nextRow.eventTitle}` : "Задача без събитие";
      notifications.push({
        userId,
        type: "task.assigned",
        title: `Добавени сте в задача: ${nextRow.taskTitle || "(без име)"}`,
        body: `${inEvent}. Дата: ${nextRow.dateKey || "-"}.`,
        entityType: "task",
        entityId: key,
        metaJson: { key, taskTitle: nextRow.taskTitle, eventId: nextRow.eventId, eventTitle: nextRow.eventTitle, dateKey: nextRow.dateKey, actorUserId }
      });
    });

    if (prevRow) {
      const removed = Array.from(prevRow.assignees).filter((userId) => !nextRow.assignees.has(userId));
      removed.forEach((userId) => {
        const inEventRemoved = nextRow.eventTitle ? `Премахнати сте от задача в събитие: ${nextRow.eventTitle}` : "Премахнати сте от задача без събитие";
        notifications.push({
          userId,
          type: "task.unassigned",
          title: `Премахнати сте от задача: ${nextRow.taskTitle || "(без име)"}`,
          body: `${inEventRemoved}. Дата: ${nextRow.dateKey || "-"}.`,
          entityType: "task",
          entityId: key,
          metaJson: { key, taskTitle: nextRow.taskTitle, eventId: nextRow.eventId, eventTitle: nextRow.eventTitle, dateKey: nextRow.dateKey, actorUserId }
        });
      });
    }
  });

  prevTaskIndex.forEach((prevRow, key) => {
    if (nextTaskIndex.has(key)) return;
    allUserIds.forEach((userId) => {
      notifications.push({
        userId,
        type: "task.deleted",
        title: `Изтрита задача: ${prevRow.taskTitle || "(без име)"}`,
        body: prevRow.eventTitle
          ? `От събитие: ${prevRow.eventTitle}. Дата: ${prevRow.dateKey || "-"}.`
          : `Задача без събитие. Дата: ${prevRow.dateKey || "-"}.`,
        entityType: "task",
        entityId: key,
        metaJson: { key, taskTitle: prevRow.taskTitle, eventId: prevRow.eventId, eventTitle: prevRow.eventTitle, dateKey: prevRow.dateKey, actorUserId }
      });
    });
  });

  const prevSticky = collectStickyNotes(previousState, prevPeopleMap, knownUserIds);
  const nextSticky = collectStickyNotes(nextState, nextPeopleMap, knownUserIds);
  const prevStickyById = new Map(prevSticky.map((row) => [row.id, row]));
  const nextStickyById = new Map(nextSticky.map((row) => [row.id, row]));

  nextSticky.forEach((note) => {
    const prev = prevStickyById.get(note.id);
    const noteTitle = note.title || "(без име)";
    const nextShareMap = new Map(note.shares.map((row) => [row.userId, row.canEdit]));

    if (!prev) {
      if (note.ownerId && note.ownerId !== actorUserId) {
        notifications.push({
          userId: note.ownerId,
          type: "note.received",
          title: `Получихте бележка: ${noteTitle}`,
          body: "Бележката е добавена към вашите бележки.",
          entityType: "stickyNote",
          entityId: note.id,
          metaJson: { noteId: note.id, title: note.title, ownerId: note.ownerId, actorUserId }
        });
      }
      note.shares.forEach((share) => {
        if (share.userId === actorUserId) return;
        notifications.push({
          userId: share.userId,
          type: "note.shared_with_you",
          title: `Споделена бележка: ${noteTitle}`,
          body: `Имате достъп (${shareModeLabel(share.canEdit)}).`,
          entityType: "stickyNote",
          entityId: note.id,
          metaJson: { noteId: note.id, title: note.title, ownerId: note.ownerId, canEdit: share.canEdit, actorUserId }
        });
      });
      return;
    }

    if (prev.ownerId !== note.ownerId && note.ownerId && note.ownerId !== actorUserId) {
      notifications.push({
        userId: note.ownerId,
        type: "note.received",
        title: `Получихте бележка: ${noteTitle}`,
        body: "Бележката ви беше изпратена.",
        entityType: "stickyNote",
        entityId: note.id,
        metaJson: { noteId: note.id, title: note.title, ownerId: note.ownerId, previousOwnerId: prev.ownerId, actorUserId }
      });
    }

    const prevShareMap = new Map(prev.shares.map((row) => [row.userId, row.canEdit]));
    note.shares.forEach((share) => {
      const prevCanEdit = prevShareMap.get(share.userId);
      if (prevCanEdit === undefined) {
        notifications.push({
          userId: share.userId,
          type: "note.shared_with_you",
          title: `Споделена бележка: ${noteTitle}`,
          body: `Имате достъп (${shareModeLabel(share.canEdit)}).`,
          entityType: "stickyNote",
          entityId: note.id,
          metaJson: { noteId: note.id, title: note.title, ownerId: note.ownerId, canEdit: share.canEdit, actorUserId }
        });
        return;
      }
      if (Boolean(prevCanEdit) !== Boolean(share.canEdit)) {
        notifications.push({
          userId: share.userId,
          type: "note.share_permission_changed",
          title: `Променени права за бележка: ${noteTitle}`,
          body: `Нов режим: ${shareModeLabel(share.canEdit)}.`,
          entityType: "stickyNote",
          entityId: note.id,
          metaJson: { noteId: note.id, title: note.title, ownerId: note.ownerId, canEdit: share.canEdit, actorUserId }
        });
      }
    });

    prev.shares.forEach((share) => {
      if (nextShareMap.has(share.userId)) return;
      notifications.push({
        userId: share.userId,
        type: "note.unshared_from_you",
        title: `Премахнат достъп до бележка: ${noteTitle}`,
        body: "Бележката вече не е споделена с вас.",
        entityType: "stickyNote",
        entityId: note.id,
        metaJson: { noteId: note.id, title: note.title, ownerId: prev.ownerId, actorUserId }
      });
    });
  });

  prevSticky.forEach((note) => {
    if (nextStickyById.has(note.id)) return;
    const noteTitle = note.title || "(без име)";
    note.shares.forEach((share) => {
      notifications.push({
        userId: share.userId,
        type: "note.unshared_from_you",
        title: `Премахнат достъп до бележка: ${noteTitle}`,
        body: "Бележката е изтрита или достъпът ви е премахнат.",
        entityType: "stickyNote",
        entityId: note.id,
        metaJson: { noteId: note.id, title: note.title, ownerId: note.ownerId, actorUserId }
      });
    });
  });

  return notifications;
}

stateRouter.post("/api/legacy/personal-task-collab/invite", async (req, res) => {
  const parsed = personalTaskCollabInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const actorUserId = req.auth!.userId;
  const actorStateRec = await prisma.legacyState.findUnique({ where: { userId: actorUserId } });
  const actorState = normalizePersonalCollaborativeTasksState(asRecord(actorStateRec?.dataJson), actorUserId, asRecord(actorStateRec?.dataJson));
  const found = findStandaloneTaskInState(actorState, parsed.data.taskId, parsed.data.dateKey);
  if (!found) {
    res.status(404).json({ error: "Task not found in personal state" });
    return;
  }
  const task = found.task;
  const ownerUserId = asString(task.collabOwnerUserId) || asString(task.createdByUserId) || actorUserId;
  if (ownerUserId !== actorUserId) {
    res.status(403).json({ error: "Only task owner can invite collaborators" });
    return;
  }
  const inviteeUserIds = Array.from(new Set(parsed.data.inviteeUserIds.map((id) => asString(id)).filter((id) => id && id !== actorUserId)));
  if (!inviteeUserIds.length) {
    res.json({ ok: true, sent: 0 });
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: inviteeUserIds }, isDeleted: false, status: "active" },
    select: { id: true }
  });
  const validIds = new Set(users.map((u) => u.id));
  const groupId = asString(task.collabGroupId) || `ptc:${actorUserId}:${asString(task.id)}`;
  const notifications: NotificationInput[] = [];
  for (const userId of inviteeUserIds) {
    if (!validIds.has(userId)) continue;
    notifications.push({
      userId,
      type: "task.personal_collab_invite",
      title: `Покана за съвместна лична задача: ${asString(task.title) || "(без име)"}`,
      body: `Дата: ${found.dateKey || "-"}.`,
      entityType: "task",
      entityId: asString(task.id),
      metaJson: {
        actorUserId,
        ownerUserId: actorUserId,
        ownerTaskId: asString(task.id),
        ownerTaskDateKey: found.dateKey,
        collabGroupId: groupId,
        taskTitle: asString(task.title),
        categoryId: asString(task.categoryId),
        done: Boolean(task.done)
      }
    });
  }
  const created = await createNotifications(notifications);
  await writeAudit(actorUserId, "task.personal_collab.invite", "task", asString(task.id), {
    dateKey: found.dateKey,
    inviteeUserIds: inviteeUserIds,
    createdCount: created.length
  });
  res.status(201).json({ ok: true, sent: created.length });
});

stateRouter.post("/api/legacy/personal-task-collab/respond/:notificationId", async (req, res) => {
  const notificationId = asString(req.params.notificationId);
  const parsed = personalTaskCollabRespondSchema.safeParse(req.body);
  if (!notificationId) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const recipientUserId = req.auth!.userId;
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId: recipientUserId, userHiddenAt: null },
    select: { id: true, type: true, readAt: true, metaJson: true }
  });
  if (!notif || String(notif.type) !== "task.personal_collab_invite") {
    res.status(404).json({ error: "Invite notification not found" });
    return;
  }
  const meta = (notif.metaJson && typeof notif.metaJson === "object") ? (notif.metaJson as Record<string, unknown>) : {};
  const ownerUserId = asString(meta.ownerUserId);
  const ownerTaskId = asString(meta.ownerTaskId);
  const ownerTaskDateKey = asString(meta.ownerTaskDateKey);
  const collabGroupId = asString(meta.collabGroupId) || `ptc:${ownerUserId}:${ownerTaskId}`;
  if (!ownerUserId || !ownerTaskId) {
    res.status(400).json({ error: "Invalid invite metadata" });
    return;
  }

  const action = parsed.data.action;
  const ownerRec = await prisma.legacyState.findUnique({ where: { userId: ownerUserId } });
  const ownerState = normalizePersonalCollaborativeTasksState(asRecord(ownerRec?.dataJson), ownerUserId, asRecord(ownerRec?.dataJson));
  const ownerFound = findStandaloneTaskInState(ownerState, ownerTaskId, ownerTaskDateKey);
  if (!ownerFound) {
    await prisma.notification.update({ where: { id: notif.id }, data: { readAt: new Date() } });
    res.status(410).json({ error: "Source task not found anymore" });
    return;
  }

  if (action === "decline") {
    await prisma.notification.update({ where: { id: notif.id }, data: { readAt: new Date() } });
    await createNotifications([{
      userId: ownerUserId,
      type: "task.personal_collab_declined",
      title: `Отказана покана за задача: ${asString(ownerFound.task.title) || "(без име)"}`,
      body: `Потребителят отказа поканата.`,
      entityType: "task",
      entityId: ownerTaskId,
      metaJson: { actorUserId: recipientUserId, ownerUserId, ownerTaskId, collabGroupId }
    }]);
    res.json({ ok: true, action });
    return;
  }

  const ownerTask = ownerFound.task;
  ownerTask.createdByUserId = asString(ownerTask.createdByUserId) || ownerUserId;
  ensurePersonalTaskCollabMeta(ownerTask, ownerUserId, collabGroupId);
  const members = normalizeCollabMembers(ownerTask.collabMemberUserIds, ownerUserId);
  if (!members.includes(recipientUserId)) members.push(recipientUserId);
  ownerTask.collabMemberUserIds = members;
  ownerTask.personIds = members.slice();

  const recipientRec = await prisma.legacyState.findUnique({ where: { userId: recipientUserId } });
  const recipientState = normalizePersonalCollaborativeTasksState(asRecord(recipientRec?.dataJson), recipientUserId, asRecord(recipientRec?.dataJson));
  const mirror = buildMirroredTaskFromSource(ownerTask, recipientUserId);
  const existingMirror = findTaskByCollabGroup(recipientState, collabGroupId);
  if (existingMirror) {
    removeTaskByCollabGroup(recipientState, collabGroupId);
  }
  ensureTaskListForDate(recipientState, ownerFound.dateKey).push(mirror);

  const [savedOwner, savedRecipient] = await prisma.$transaction([
    prisma.legacyState.upsert({
      where: { userId: ownerUserId },
      create: { userId: ownerUserId, dataJson: ownerState as object },
      update: { dataJson: ownerState as object, version: { increment: 1 } }
    }),
    prisma.legacyState.upsert({
      where: { userId: recipientUserId },
      create: { userId: recipientUserId, dataJson: recipientState as object },
      update: { dataJson: recipientState as object, version: { increment: 1 } }
    }),
    prisma.notification.update({
      where: { id: notif.id },
      data: { readAt: new Date() }
    })
  ]);

  publishLegacyStateChange({
    mode: "personal",
    userId: ownerUserId,
    version: savedOwner.version,
    updatedAt: savedOwner.updatedAt.toISOString(),
    actorUserId: recipientUserId
  });
  publishLegacyStateChange({
    mode: "personal",
    userId: recipientUserId,
    version: savedRecipient.version,
    updatedAt: savedRecipient.updatedAt.toISOString(),
    actorUserId: recipientUserId
  });

  await createNotifications([{
    userId: ownerUserId,
    type: "task.personal_collab_accepted",
    title: `Приета покана за задача: ${asString(ownerTask.title) || "(без име)"}`,
    body: "Задачата е синхронизирана в личните календари.",
    entityType: "task",
    entityId: ownerTaskId,
    metaJson: { actorUserId: recipientUserId, ownerUserId, ownerTaskId, collabGroupId }
  }]);
  const memberAddedTargets = Array.from(new Set(normalizeCollabMembers(ownerTask.collabMemberUserIds, ownerUserId)))
    .filter((userId) => userId && userId !== ownerUserId && userId !== recipientUserId);
  if (memberAddedTargets.length) {
    const activeTargets = new Set((await prisma.user.findMany({
      where: { id: { in: memberAddedTargets }, isDeleted: false, status: "active" },
      select: { id: true }
    })).map((row) => String(row.id)));
    const taskTitle = asString(ownerTask.title) || "(без име)";
    const dateKey = asString(ownerFound.dateKey) || "-";
    const memberAddedNotifications: NotificationInput[] = memberAddedTargets
      .filter((userId) => activeTargets.has(userId))
      .map((userId) => ({
        userId,
        type: "task.personal_collab_member_added",
        title: `Добавен участник в съвместна задача: ${taskTitle}`,
        body: `Нов участник е добавен/приет. Дата: ${dateKey}.`,
        entityType: "task",
        entityId: ownerTaskId,
        metaJson: {
          actorUserId: recipientUserId,
          ownerUserId,
          ownerTaskId,
          collabGroupId,
          affectedUserId: recipientUserId,
          taskTitle,
          dateKey
        }
      }));
    if (memberAddedNotifications.length) {
      await createNotifications(memberAddedNotifications);
    }
  }
  await writeAudit(recipientUserId, "task.personal_collab.accept", "task", ownerTaskId, { ownerUserId, collabGroupId });
  res.json({ ok: true, action: "accept" });
});

stateRouter.get("/api/legacy/state", async (req, res) => {
  const mode = readMode(req.query.mode);
  const prisma = getPrisma();

  if (mode === "shared") {
    const state = await prisma.sharedLegacyState.findUnique({ where: { id: 1 } });
    if (!state) {
      res.json({ mode, state: null, version: 0, updatedAt: null });
      return;
    }
    res.setHeader("ETag", `"${state.version}"`);
    res.json({ mode, state: state.dataJson, version: state.version, updatedAt: state.updatedAt });
    return;
  }

  const state = await prisma.legacyState.findUnique({ where: { userId: req.auth!.userId } });
  if (!state) {
    res.json({ mode, state: null, version: 0, updatedAt: null });
    return;
  }
  res.setHeader("ETag", `"${state.version}"`);
  res.json({ mode, state: state.dataJson, version: state.version, updatedAt: state.updatedAt });
});

stateRouter.put("/api/legacy/state", async (req, res) => {
  const mode = readMode(req.query.mode);
  const parsed = stateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();

  if (mode === "shared") {
    const existing = await prisma.sharedLegacyState.findUnique({ where: { id: 1 } });
    if (existing && parsed.data.version && existing.version !== parsed.data.version) {
      res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
      return;
    }

    const role = req.auth?.role;
    const nextState = role === "user"
      ? restrictSharedStateForUser(parsed.data.state, existing?.dataJson)
      : isAdminLikeRole(role)
        ? (parsed.data.state as object)
        : restrictSharedStateForNonAdmin(parsed.data.state, existing?.dataJson);

    const usersForPeople = await prisma.user.findMany({
      where: { isDeleted: false },
      select: { id: true, username: true, nickname: true, displayColor: true }
    });

    const nextStateWithPeople = mergeUsersIntoSharedPeople(asRecord(nextState), usersForPeople);
    const knownUserIds = new Set(usersForPeople.map((user) => String(user.id)));
    const pendingNotifications = buildLegacySharedNotifications(
      asRecord(existing?.dataJson),
      asRecord(nextStateWithPeople),
      req.auth!.userId,
      knownUserIds
    );
    const folderSyncEvents = collectEventsForFolderSync(asRecord(nextStateWithPeople));

    const saved = await prisma.sharedLegacyState.upsert({
      where: { id: 1 },
      create: { id: 1, dataJson: nextStateWithPeople as object },
      update: {
        dataJson: nextStateWithPeople as object,
        version: { increment: 1 }
      }
    });

    await writeAudit(req.auth!.userId, "legacy.save.shared", "sharedLegacyState", String(saved.id));
    try {
      syncEventFoldersFromCalendarEvents(folderSyncEvents);
    } catch (error) {
      console.warn("[files] failed to sync event folders after shared state save", error);
    }
    if (pendingNotifications.length) {
      await createNotifications(pendingNotifications);
    }
    publishLegacyStateChange({
      mode: "shared",
      version: saved.version,
      updatedAt: saved.updatedAt.toISOString(),
      actorUserId: req.auth!.userId
    });
    res.setHeader("ETag", `"${saved.version}"`);
    res.json({ ok: true, mode, version: saved.version, updatedAt: saved.updatedAt });
    return;
  }

  const existing = await prisma.legacyState.findUnique({ where: { userId: req.auth!.userId } });
  if (existing && parsed.data.version && existing.version !== parsed.data.version) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  const normalizedPersonalState = normalizePersonalCollaborativeTasksState(asRecord(parsed.data.state), req.auth!.userId, asRecord(existing?.dataJson));
  const membershipNotificationsRaw = buildPersonalCollabMembershipNotifications(
    asRecord(existing?.dataJson),
    normalizedPersonalState,
    req.auth!.userId
  );
  let membershipNotifications: NotificationInput[] = [];
  if (membershipNotificationsRaw.length) {
    const membershipTargetIds = Array.from(new Set(
      membershipNotificationsRaw.map((row) => asString(row.userId)).filter(Boolean)
    ));
    if (membershipTargetIds.length) {
      const activeUsers = await prisma.user.findMany({
        where: { id: { in: membershipTargetIds }, isDeleted: false, status: "active" },
        select: { id: true }
      });
      const activeUserIds = new Set(activeUsers.map((row) => String(row.id)));
      membershipNotifications = membershipNotificationsRaw.filter((row) => activeUserIds.has(asString(row.userId)));
    }
  }

  const saved = await prisma.legacyState.upsert({
    where: { userId: req.auth!.userId },
    create: { userId: req.auth!.userId, dataJson: normalizedPersonalState as object },
    update: {
      dataJson: normalizedPersonalState as object,
      version: { increment: 1 }
    }
  });

  const syncChangedUsers = await syncPersonalCollaborativeTasksForActor(
    prisma,
    req.auth!.userId,
    asRecord(existing?.dataJson),
    normalizedPersonalState
  );

  await writeAudit(req.auth!.userId, "legacy.save.personal", "legacyState", saved.id);
  if (syncChangedUsers.length) {
    await writeAudit(req.auth!.userId, "task.personal_collab.sync", "legacyState", saved.id, { syncedUsers: syncChangedUsers });
  }
  if (membershipNotifications.length) {
    await createNotifications(membershipNotifications);
  }
  publishLegacyStateChange({
    mode: "personal",
    userId: req.auth!.userId,
    version: saved.version,
    updatedAt: saved.updatedAt.toISOString(),
    actorUserId: req.auth!.userId
  });
  res.setHeader("ETag", `"${saved.version}"`);
  res.json({ ok: true, mode, version: saved.version, updatedAt: saved.updatedAt });
});

