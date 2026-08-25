import { Router } from "express";
import { Prisma, TaskInvitationStatus, TaskMemberStatus } from "@prisma/client";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import {
  taskCreateSchema,
  workspaceTaskCreateSchema,
  workspaceTaskInviteResponseSchema,
  workspaceTaskMemberStatusSchema,
  workspaceTaskMembersSchema,
  workspaceTaskPatchSchema
} from "../utils/schemas";
import { parseIfMatchVersion } from "../utils/http";
import { writeAudit } from "../services/auditService";
import { postWebhook } from "../webhooks/webhookClient";
import { storeIdempotency, tryIdempotency } from "../services/idempotencyService";
import { hasPermission } from "../services/permissionService";
import { createNotification } from "../services/notificationService";
import {
  canManageTaskMembers,
  canManageTaskMetadata,
  canReadTaskRecord,
  canUpdateTaskMemberStatus,
  visibleTaskWhere
} from "../services/taskAccessService";

export const taskRouter = Router();

taskRouter.use("/api/events", requireAuth, requireRealmFeature("tasks"));
taskRouter.use("/api/tasks", requireAuth, requireRealmFeature("tasks"));

const paramAsString = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const taskInclude = {
  event: { select: { id: true, title: true, scope: true, date: true } },
  members: {
    include: {
      user: { select: { id: true, username: true, nickname: true, displayColor: true } }
    },
    orderBy: { createdAt: "asc" as const }
  }
} satisfies Prisma.TaskInclude;

type TaskWithMembers = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function parseDateKey(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function serializeTask(task: TaskWithMembers, currentUserId: string) {
  const myMembership = task.members.find((member) => member.userId === currentUserId && member.removedAt == null) || null;
  return {
    ...task,
    scheduledOn: toDateKey(task.scheduledOn),
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    remindAt: task.remindAt ? task.remindAt.toISOString() : null,
    members: task.members.map((member) => ({
      taskId: member.taskId,
      userId: member.userId,
      assignmentMode: member.assignmentMode,
      invitationStatus: member.invitationStatus,
      status: member.status,
      startedOn: toDateKey(member.startedOn),
      completedOn: toDateKey(member.completedOn),
      respondedAt: member.respondedAt,
      removedAt: member.removedAt,
      assignedById: member.assignedById,
      version: member.version,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user
    })),
    myMembership: myMembership ? {
      userId: myMembership.userId,
      invitationStatus: myMembership.invitationStatus,
      status: myMembership.status,
      startedOn: toDateKey(myMembership.startedOn),
      completedOn: toDateKey(myMembership.completedOn),
      version: myMembership.version
    } : null
  };
}

async function loadTask(taskId: string): Promise<TaskWithMembers | null> {
  return getPrisma().task.findUnique({ where: { id: taskId }, include: taskInclude });
}

async function validateActiveUsers(userIds: string[]): Promise<string[]> {
  const ids = Array.from(new Set(userIds.map((value) => String(value || "").trim()).filter(Boolean)));
  if (!ids.length) return [];
  const rows = await getPrisma().user.findMany({
    where: { id: { in: ids }, status: "active", isDeleted: false },
    select: { id: true }
  });
  const found = new Set(rows.map((row) => row.id));
  return ids.filter((id) => found.has(id));
}

async function recomputeTaskStatus(taskId: string): Promise<void> {
  const prisma = getPrisma();
  const members = await prisma.taskMember.findMany({ where: { taskId } });
  const active = members.filter((member) => member.removedAt == null
    && (member.invitationStatus === TaskInvitationStatus.not_required
      || member.invitationStatus === TaskInvitationStatus.accepted));
  const status = active.length > 0 && active.every((member) => member.status === TaskMemberStatus.done)
    ? "done"
    : active.some((member) => member.status === TaskMemberStatus.in_progress)
      ? "in_progress"
      : "open";
  await prisma.task.update({ where: { id: taskId }, data: { status, version: { increment: 1 } } });
}

taskRouter.get("/api/tasks", requirePermission("tasks.read"), async (req, res) => {
  const prisma = getPrisma();
  const permissions = new Set(req.auth!.permissions || []);
  const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const scope = req.query.scope === "personal" || req.query.scope === "shared" ? req.query.scope : undefined;
  const source = req.query.source === "standalone" || req.query.source === "event" ? req.query.source : undefined;
  const kind = req.query.kind === "dated" || req.query.kind === "ongoing" ? req.query.kind : undefined;
  const status = ["open", "in_progress", "done", "archived"].includes(String(req.query.status || ""))
    ? String(req.query.status)
    : undefined;
  const from = parseDateKey(req.query.from ? String(req.query.from) : null);
  const to = parseDateKey(req.query.to ? String(req.query.to) : null);

  const items = await prisma.task.findMany({
    where: {
      AND: [
        visibleTaskWhere(req.auth!.userId, permissions),
        scope ? { scope } : {},
        source ? { source } : {},
        kind ? { kind } : {},
        status ? { status: status as never } : {},
        from || to ? { scheduledOn: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}
      ]
    },
    include: taskInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit
  });

  res.json({
    items: items.map((item) => serializeTask(item, req.auth!.userId)),
    nextCursor: items.length === limit ? items[items.length - 1].id : null
  });
});

taskRouter.get("/api/tasks/invitations", requirePermission("tasks.read"), async (req, res) => {
  const rows = await getPrisma().taskMember.findMany({
    where: {
      userId: req.auth!.userId,
      invitationStatus: TaskInvitationStatus.pending,
      removedAt: null,
      task: { scope: "personal", isDeleted: false }
    },
    include: {
      task: {
        include: {
          owner: { select: { id: true, username: true, nickname: true, displayColor: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({
    items: rows.map((row) => ({
      taskId: row.taskId,
      title: row.task.title,
      kind: row.task.kind,
      source: row.task.source,
      scheduledOn: toDateKey(row.task.scheduledOn),
      owner: row.task.owner,
      invitedAt: row.createdAt
    }))
  });
});

taskRouter.post("/api/tasks", requirePermission("tasks.create"), async (req, res) => {
  const parsed = workspaceTaskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const permissions = new Set(req.auth!.permissions || []);
  const requestedMemberIds = await validateActiveUsers(input.memberIds);
  const otherMemberIds = requestedMemberIds.filter((id) => id !== req.auth!.userId);
  if (input.scope === "shared" && otherMemberIds.length && !hasPermission(permissions, "tasks.assign")) {
    res.status(403).json({ error: "Forbidden", missingPermission: "tasks.assign" });
    return;
  }

  if (input.eventId) {
    const event = await getPrisma().event.findFirst({ where: { id: input.eventId, isDeleted: false }, select: { id: true } });
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
  }

  const scheduledOn = parseDateKey(input.scheduledOn || input.legacyDateKey || null);
  const ownerStatus = input.kind === "ongoing" ? TaskMemberStatus.in_progress : TaskMemberStatus.open;
  const memberIds = Array.from(new Set([req.auth!.userId, ...requestedMemberIds]));
  const created = await getPrisma().task.create({
    data: {
      eventId: input.eventId,
      legacyKey: input.legacyKey,
      legacyEventId: input.legacyEventId,
      legacyDateKey: input.legacyDateKey || input.scheduledOn,
      scope: input.scope,
      kind: input.kind,
      source: input.source,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      scheduledOn,
      status: input.kind === "ongoing" ? "in_progress" : "open",
      ownerId: req.auth!.userId,
      members: {
        create: memberIds.map((userId) => {
          const owner = userId === req.auth!.userId;
          const invited = input.scope === "personal" && !owner;
          return {
            userId,
            assignmentMode: invited ? "invite" : "direct",
            invitationStatus: invited ? "pending" : "not_required",
            status: owner ? ownerStatus : "open",
            startedOn: owner && input.kind === "ongoing" ? (scheduledOn || new Date()) : null,
            assignedById: req.auth!.userId
          };
        })
      }
    },
    include: taskInclude
  });

  for (const userId of otherMemberIds) {
    const personalInvite = input.scope === "personal";
    await createNotification({
      userId,
      type: personalInvite ? "task.personal_invite" : "task.assigned",
      title: personalInvite ? `Покана за лична задача: ${created.title}` : `Добавени сте в задача: ${created.title}`,
      body: personalInvite ? "Приемете поканата, за да се появи задачата в личния ви календар." : "Задачата е добавена в общия календар.",
      entityType: "task",
      entityId: created.id,
      metaJson: { taskId: created.id, actorUserId: req.auth!.userId, scope: created.scope }
    });
  }

  await writeAudit(req.auth!.userId, "task.workspace.create", "task", created.id, {
    scope: created.scope,
    kind: created.kind,
    source: created.source,
    memberIds
  });
  res.status(201).json(serializeTask(created, req.auth!.userId));
});

taskRouter.put("/api/tasks/:taskId/members", requirePermission("tasks.read"), async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  const parsed = workspaceTaskMembersSchema.safeParse(req.body);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await loadTask(taskId);
  if (!task || task.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  if (!canReadTaskRecord(task, req.auth!.userId, permissions) || !canManageTaskMembers(task, req.auth!.userId, permissions)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const valid = await validateActiveUsers(parsed.data.userIds);
  const desired = new Set([task.ownerId || req.auth!.userId, ...valid]);
  const existing = new Map(task.members.map((member) => [member.userId, member]));
  const newlyAdded: string[] = [];
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    for (const userId of desired) {
      const current = existing.get(userId);
      if (current && current.removedAt == null && current.invitationStatus !== TaskInvitationStatus.declined) continue;
      const personalInvite = task.scope === "personal" && userId !== task.ownerId;
      await tx.taskMember.upsert({
        where: { taskId_userId: { taskId, userId } },
        create: {
          taskId,
          userId,
          assignmentMode: personalInvite ? "invite" : "direct",
          invitationStatus: personalInvite ? "pending" : "not_required",
          assignedById: req.auth!.userId
        },
        update: {
          assignmentMode: personalInvite ? "invite" : "direct",
          invitationStatus: personalInvite ? "pending" : "not_required",
          status: "open",
          startedOn: null,
          completedOn: null,
          respondedAt: null,
          removedAt: null,
          assignedById: req.auth!.userId,
          version: { increment: 1 }
        }
      });
      if (userId !== task.ownerId) newlyAdded.push(userId);
    }
    for (const member of task.members) {
      if (member.userId === task.ownerId || desired.has(member.userId) || member.removedAt) continue;
      await tx.taskMember.update({
        where: { taskId_userId: { taskId, userId: member.userId } },
        data: { invitationStatus: "removed", removedAt: new Date(), version: { increment: 1 } }
      });
    }
  });

  for (const userId of newlyAdded) {
    const personalInvite = task.scope === "personal";
    await createNotification({
      userId,
      type: personalInvite ? "task.personal_invite" : "task.assigned",
      title: personalInvite ? `Покана за лична задача: ${task.title}` : `Добавени сте в задача: ${task.title}`,
      body: personalInvite ? "Приемете поканата, за да се появи задачата в личния ви календар." : "Задачата е добавена в общия календар.",
      entityType: "task",
      entityId: task.id,
      metaJson: { taskId: task.id, actorUserId: req.auth!.userId, scope: task.scope }
    });
  }
  await recomputeTaskStatus(taskId);
  await writeAudit(req.auth!.userId, "task.members.update", "task", taskId, { userIds: Array.from(desired) });
  const updated = await loadTask(taskId);
  res.json(updated ? serializeTask(updated, req.auth!.userId) : { ok: true });
});

taskRouter.post("/api/tasks/:taskId/respond", requirePermission("tasks.read"), async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  const parsed = workspaceTaskInviteResponseSchema.safeParse(req.body);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await loadTask(taskId);
  const member = task?.members.find((row) => row.userId === req.auth!.userId);
  if (!task || task.isDeleted || task.scope !== "personal" || !member || member.invitationStatus !== "pending" || member.removedAt) {
    res.status(404).json({ error: "Pending invitation not found" });
    return;
  }
  const accepted = parsed.data.action === "accept";
  await getPrisma().taskMember.update({
    where: { taskId_userId: { taskId, userId: req.auth!.userId } },
    data: {
      invitationStatus: accepted ? "accepted" : "declined",
      respondedAt: new Date(),
      removedAt: accepted ? null : new Date(),
      version: { increment: 1 }
    }
  });
  await createNotification({
    userId: task.ownerId || "",
    type: accepted ? "task.personal_invite_accepted" : "task.personal_invite_declined",
    title: accepted ? `Приета покана: ${task.title}` : `Отказана покана: ${task.title}`,
    entityType: "task",
    entityId: task.id,
    metaJson: { taskId: task.id, actorUserId: req.auth!.userId }
  });
  await writeAudit(req.auth!.userId, accepted ? "task.invite.accept" : "task.invite.decline", "task", taskId);
  const updated = accepted ? await loadTask(taskId) : null;
  res.json(updated ? serializeTask(updated, req.auth!.userId) : { ok: true, action: "decline" });
});

taskRouter.patch("/api/tasks/:taskId/member-status", requirePermission("tasks.read"), async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  const parsed = workspaceTaskMemberStatusSchema.safeParse(req.body);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await loadTask(taskId);
  if (!task || task.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  if (!canReadTaskRecord(task, req.auth!.userId, permissions)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const targetUserId = parsed.data.userId || req.auth!.userId;
  if (!canUpdateTaskMemberStatus(targetUserId, req.auth!.userId, permissions)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const member = task.members.find((row) => row.userId === targetUserId && row.removedAt == null
    && (row.invitationStatus === "not_required" || row.invitationStatus === "accepted"));
  if (!member) {
    res.status(404).json({ error: "Active task member not found" });
    return;
  }
  if (parsed.data.version && parsed.data.version !== member.version) {
    res.status(409).json({ error: "Version conflict", currentVersion: member.version });
    return;
  }

  const today = parseDateKey(new Date().toISOString().slice(0, 10))!;
  let startedOn = parseDateKey(parsed.data.startedOn || null);
  let completedOn = parseDateKey(parsed.data.completedOn || null);
  if (parsed.data.status === "open") {
    startedOn = null;
    completedOn = null;
  } else if (parsed.data.status === "in_progress") {
    startedOn = startedOn || member.startedOn || task.scheduledOn || today;
    completedOn = null;
  } else {
    startedOn = startedOn || member.startedOn || task.scheduledOn || today;
    completedOn = completedOn || today;
    if (completedOn < startedOn) {
      res.status(400).json({ error: "Completion date cannot be before start date" });
      return;
    }
  }

  await getPrisma().taskMember.update({
    where: { taskId_userId: { taskId, userId: targetUserId } },
    data: {
      status: parsed.data.status,
      startedOn,
      completedOn,
      version: { increment: 1 }
    }
  });
  await recomputeTaskStatus(taskId);
  await writeAudit(req.auth!.userId, "task.member.status", "task", taskId, { targetUserId, status: parsed.data.status });
  const updated = await loadTask(taskId);
  res.json(updated ? serializeTask(updated, req.auth!.userId) : { ok: true });
});

taskRouter.get("/api/events/:eventId/tasks", requirePermission("tasks.read"), async (req, res) => {
  const eventId = paramAsString(req.params.eventId);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const prisma = getPrisma();
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const updatedSince = req.query.updatedSince ? new Date(String(req.query.updatedSince)) : undefined;

  const items = await prisma.task.findMany({
    where: {
      AND: [
        { eventId },
        visibleTaskWhere(req.auth!.userId, new Set(req.auth!.permissions || []))
      ],
      ...(status ? { status: status as never } : {}),
      ...(updatedSince ? { updatedAt: { gt: updatedSince } } : {})
    },
    include: taskInclude,
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit
  });

  res.json({
    items: items.map((item) => serializeTask(item, req.auth!.userId)),
    nextCursor: items.length === limit ? items[items.length - 1].id : null
  });
});

taskRouter.post("/api/events/:eventId/tasks", requirePermission("tasks.create"), async (req, res) => {
  const eventId = paramAsString(req.params.eventId);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const idempotencyKey = req.header("idempotency-key");
  if (idempotencyKey) {
    const hit = await tryIdempotency(idempotencyKey, "/api/tasks", req.auth!.userId, req.body);
    if (hit.hit) {
      res.status(hit.statusCode || 200).json(hit.responseBody);
      return;
    }
  }

  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  if (parsed.data.ownerId && parsed.data.ownerId !== req.auth!.userId && !hasPermission(permissions, "tasks.assign")) {
    res.status(403).json({ error: "Forbidden", missingPermission: "tasks.assign" });
    return;
  }

  const prisma = getPrisma();
  const parentEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true }
  });
  const created = await prisma.task.create({
    data: {
      eventId,
      scope: "shared",
      kind: parsed.data.dueAt ? "ongoing" : "dated",
      source: "event",
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      remindAt: parsed.data.remindAt ? new Date(parsed.data.remindAt) : undefined,
      ownerId: parsed.data.ownerId || req.auth!.userId,
      members: {
        create: {
          userId: parsed.data.ownerId || req.auth!.userId,
          assignmentMode: "direct",
          invitationStatus: "not_required",
          assignedById: req.auth!.userId
        }
      }
    },
    include: taskInclude
  });

  await writeAudit(req.auth!.userId, "task.create", "task", created.id, { eventId });
  await postWebhook("task.created", created);

  if (created.ownerId && created.ownerId !== req.auth!.userId) {
    await createNotification({
      userId: created.ownerId,
      type: "task.assigned",
      title: `Добавени сте в задача: ${created.title || "(без име)"}`,
      body: parentEvent && parentEvent.title
        ? `В събитие: ${parentEvent.title}.`
        : "Задача без събитие.",
      entityType: "task",
      entityId: created.id,
      metaJson: { taskId: created.id, eventId: eventId, eventTitle: parentEvent ? parentEvent.title : "", actorUserId: req.auth!.userId }
    });
  }

  if (created.dueAt && created.dueAt.getTime() - Date.now() <= 24 * 3600 * 1000) {
    await postWebhook("task.dueSoon", created);
  }

  const response = serializeTask(created, req.auth!.userId);
  if (idempotencyKey) {
    await storeIdempotency(idempotencyKey, "/api/tasks", req.auth!.userId, req.body, 201, response);
  }

  res.status(201).json(response);
});

taskRouter.post("/api/tasks/:taskId/join", requirePermission("tasks.read"), async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const task = await loadTask(taskId);
  const permissions = new Set(req.auth!.permissions || []);
  if (!task || task.isDeleted || task.scope !== "shared" || task.source !== "event"
    || !canReadTaskRecord(task, req.auth!.userId, permissions)) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const prisma = getPrisma();
  await prisma.taskMember.upsert({
    where: { taskId_userId: { taskId, userId: req.auth!.userId } },
    update: {
      assignmentMode: "direct",
      invitationStatus: "not_required",
      status: "open",
      removedAt: null,
      assignedById: req.auth!.userId,
      version: { increment: 1 }
    },
    create: { taskId, userId: req.auth!.userId, assignedById: req.auth!.userId }
  });
  await writeAudit(req.auth!.userId, "task.join", "task", taskId);
  res.json({ ok: true });
});

taskRouter.post("/api/tasks/:taskId/leave", requirePermission("tasks.read"), async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const task = await loadTask(taskId);
  if (!task || task.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (task.ownerId === req.auth!.userId) {
    res.status(409).json({ error: "Task owner cannot leave the task" });
    return;
  }
  const prisma = getPrisma();
  await prisma.taskMember.updateMany({
    where: { taskId, userId: req.auth!.userId, removedAt: null },
    data: { invitationStatus: "removed", removedAt: new Date(), version: { increment: 1 } }
  });
  await recomputeTaskStatus(taskId);
  await writeAudit(req.auth!.userId, "task.leave", "task", taskId);
  res.json({ ok: true });
});

taskRouter.patch("/api/tasks/:taskId", async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const parsed = workspaceTaskPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const expected = parsed.data.version ?? parseIfMatchVersion(req.header("if-match"));
  if (!expected) {
    res.status(428).json({ error: "Missing version" });
    return;
  }

  const prisma = getPrisma();
  const existing = await loadTask(taskId);
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  if (!canReadTaskRecord(existing, req.auth!.userId, permissions)
    || !canManageTaskMetadata(existing, req.auth!.userId, permissions)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (parsed.data.ownerId && parsed.data.ownerId !== req.auth!.userId && !hasPermission(permissions, "tasks.assign")) {
    res.status(403).json({ error: "Forbidden", missingPermission: "tasks.assign" });
    return;
  }

  if (existing.version !== expected) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description === null ? null : parsed.data.description,
      categoryId: parsed.data.categoryId === null ? null : parsed.data.categoryId,
      scheduledOn: parsed.data.scheduledOn === null ? null : parseDateKey(parsed.data.scheduledOn),
      status: parsed.data.status,
      dueAt: parsed.data.dueAt === null ? null : parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      remindAt: parsed.data.remindAt === null ? null : parsed.data.remindAt ? new Date(parsed.data.remindAt) : undefined,
      ownerId: parsed.data.ownerId === null ? null : parsed.data.ownerId,
      version: { increment: 1 }
    },
    include: taskInclude
  });

  if (parsed.data.ownerId && parsed.data.ownerId !== existing.ownerId) {
    await prisma.taskMember.upsert({
      where: { taskId_userId: { taskId, userId: parsed.data.ownerId } },
      create: {
        taskId,
        userId: parsed.data.ownerId,
        assignmentMode: "direct",
        invitationStatus: "not_required",
        assignedById: req.auth!.userId
      },
      update: {
        assignmentMode: "direct",
        invitationStatus: "not_required",
        removedAt: null,
        assignedById: req.auth!.userId,
        version: { increment: 1 }
      }
    });
  }

  if (parsed.data.status === "done") {
    const completedOn = parseDateKey(new Date().toISOString().slice(0, 10))!;
    await prisma.taskMember.updateMany({
      where: {
        taskId,
        removedAt: null,
        invitationStatus: { in: ["not_required", "accepted"] }
      },
      data: { status: "done", completedOn, version: { increment: 1 } }
    });
  }

  await writeAudit(req.auth!.userId, "task.update", "task", updated.id);
  await postWebhook("task.updated", updated);

  if (updated.ownerId && updated.ownerId !== req.auth!.userId && updated.ownerId !== existing.ownerId) {
    const parentEvent = updated.eventId ? await prisma.event.findUnique({
      where: { id: updated.eventId },
      select: { id: true, title: true }
    }) : null;
    await createNotification({
      userId: updated.ownerId,
      type: "task.assigned",
      title: `Добавени сте в задача: ${updated.title || "(без име)"}`,
      body: parentEvent && parentEvent.title
        ? `В събитие: ${parentEvent.title}.`
        : "Задача без събитие.",
      entityType: "task",
      entityId: updated.id,
      metaJson: { taskId: updated.id, eventId: updated.eventId, eventTitle: parentEvent ? parentEvent.title : "", actorUserId: req.auth!.userId }
    });
  }
  const finalTask = await loadTask(taskId);
  res.json(finalTask ? serializeTask(finalTask, req.auth!.userId) : serializeTask(updated, req.auth!.userId));
});

taskRouter.delete("/api/tasks/:taskId", async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const expected = Number(req.query.version) || parseIfMatchVersion(req.header("if-match"));
  if (!expected) {
    res.status(428).json({ error: "Missing version" });
    return;
  }

  const prisma = getPrisma();
  const existing = await loadTask(taskId);
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  const canDeleteAny = hasPermission(permissions, "tasks.delete_any");
  const canDeleteOwn = existing.ownerId === req.auth!.userId
    && (existing.scope === "personal" || hasPermission(permissions, "tasks.delete_own"));
  if (!canReadTaskRecord(existing, req.auth!.userId, permissions) || (!canDeleteAny && !canDeleteOwn)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (existing.version !== expected) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  await prisma.task.update({ where: { id: taskId }, data: { isDeleted: true, status: "archived", version: { increment: 1 } } });
  await writeAudit(req.auth!.userId, "task.delete", "task", taskId);
  res.json({ ok: true });
});
