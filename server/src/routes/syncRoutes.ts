import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { getPrisma } from "../db/prisma";
import { hasPermission } from "../services/permissionService";
import { registerSyncStreamClient } from "../services/realtimeSyncService";

export const syncRouter = Router();

syncRouter.use(requireAuth, requirePermission("sync.read"));

syncRouter.get("/api/sync/stream", (req, res) => {
  const mode = req.query.mode === "shared" ? "shared" : "personal";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const unregister = registerSyncStreamClient(mode, req.auth!.userId, res);
  req.on("close", unregister);
});

syncRouter.get("/api/sync", async (req, res) => {
  const prisma = getPrisma();
  const sinceRaw = req.query.since ? String(req.query.since) : null;
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const now = new Date();

  const permissions = new Set(req.auth!.permissions || []);
  const canReadAllEvents = hasPermission(permissions, "events.read_all") || hasPermission(permissions, "*");
  const canReadAllTasks = hasPermission(permissions, "tasks.read_all") || hasPermission(permissions, "*");

  const eventWhere = {
    ...(since ? { updatedAt: { gt: since } } : {}),
    ...(canReadAllEvents ? {} : { createdById: req.auth!.userId })
  };

  const taskWhere = {
    ...(since ? { updatedAt: { gt: since } } : {}),
    ...(canReadAllTasks
      ? {}
      : {
          OR: [
            { ownerId: req.auth!.userId },
            { members: { some: { userId: req.auth!.userId } } },
            { event: { createdById: req.auth!.userId } }
          ]
        })
  };

  const [eventUpserts, eventDeletes, taskUpserts, taskDeletes] = await Promise.all([
    prisma.event.findMany({ where: { ...eventWhere, isDeleted: false }, orderBy: { updatedAt: "asc" } }),
    prisma.event.findMany({ where: { ...eventWhere, isDeleted: true }, select: { id: true, updatedAt: true, version: true }, orderBy: { updatedAt: "asc" } }),
    prisma.task.findMany({ where: { ...taskWhere, isDeleted: false }, include: { members: true }, orderBy: { updatedAt: "asc" } }),
    prisma.task.findMany({ where: { ...taskWhere, isDeleted: true }, select: { id: true, updatedAt: true, version: true }, orderBy: { updatedAt: "asc" } })
  ]);

  res.json({
    serverTime: now.toISOString(),
    since: since ? since.toISOString() : null,
    events: {
      upserts: eventUpserts,
      deletes: eventDeletes
    },
    tasks: {
      upserts: taskUpserts,
      deletes: taskDeletes
    }
  });
});
