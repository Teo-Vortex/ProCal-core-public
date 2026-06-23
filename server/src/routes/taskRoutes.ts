import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { taskCreateSchema, taskPatchSchema } from "../utils/schemas";
import { parseIfMatchVersion } from "../utils/http";
import { writeAudit } from "../services/auditService";
import { postWebhook } from "../webhooks/webhookClient";
import { storeIdempotency, tryIdempotency } from "../services/idempotencyService";
import { hasPermission } from "../services/permissionService";
import { createNotification } from "../services/notificationService";

export const taskRouter = Router();

taskRouter.use("/api/events", requireAuth, requireRealmFeature("tasks"));
taskRouter.use("/api/tasks", requireAuth, requireRealmFeature("tasks"));

const paramAsString = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

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
      eventId,
      isDeleted: false,
      ...(status ? { status: status as never } : {}),
      ...(updatedSince ? { updatedAt: { gt: updatedSince } } : {})
    },
    include: { members: true },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit
  });

  res.json({ items, nextCursor: items.length === limit ? items[items.length - 1].id : null });
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
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      remindAt: parsed.data.remindAt ? new Date(parsed.data.remindAt) : undefined,
      ownerId: parsed.data.ownerId || req.auth!.userId
    }
  });

  await prisma.taskMember.create({ data: { taskId: created.id, userId: req.auth!.userId } }).catch(() => undefined);

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

  const response = created;
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

  const prisma = getPrisma();
  await prisma.taskMember.upsert({
    where: { taskId_userId: { taskId, userId: req.auth!.userId } },
    update: {},
    create: { taskId, userId: req.auth!.userId }
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

  const prisma = getPrisma();
  await prisma.taskMember.deleteMany({ where: { taskId, userId: req.auth!.userId } });
  await writeAudit(req.auth!.userId, "task.leave", "task", taskId);
  res.json({ ok: true });
});

taskRouter.patch("/api/tasks/:taskId", async (req, res) => {
  const taskId = paramAsString(req.params.taskId);
  if (!taskId) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const parsed = taskPatchSchema.safeParse(req.body);
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
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  const canUpdateAny = hasPermission(permissions, "tasks.update_any");
  const canUpdateOwn = hasPermission(permissions, "tasks.update_own") && existing.ownerId === req.auth!.userId;
  if (!canUpdateAny && !canUpdateOwn) {
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
      status: parsed.data.status,
      dueAt: parsed.data.dueAt === null ? null : parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      remindAt: parsed.data.remindAt === null ? null : parsed.data.remindAt ? new Date(parsed.data.remindAt) : undefined,
      ownerId: parsed.data.ownerId === null ? null : parsed.data.ownerId,
      version: { increment: 1 }
    }
  });

  await writeAudit(req.auth!.userId, "task.update", "task", updated.id);
  await postWebhook("task.updated", updated);

  if (updated.ownerId && updated.ownerId !== req.auth!.userId && updated.ownerId !== existing.ownerId) {
    const parentEvent = await prisma.event.findUnique({
      where: { id: updated.eventId },
      select: { id: true, title: true }
    });
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
  res.json(updated);
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
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  const canDeleteAny = hasPermission(permissions, "tasks.delete_any");
  const canDeleteOwn = hasPermission(permissions, "tasks.delete_own") && existing.ownerId === req.auth!.userId;
  if (!canDeleteAny && !canDeleteOwn) {
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
