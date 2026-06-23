import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { getPrisma } from "../db/prisma";
import { eventCreateSchema, eventPatchSchema } from "../utils/schemas";
import { etagFromVersion, parseIfMatchVersion } from "../utils/http";
import { writeAudit } from "../services/auditService";
import { postWebhook } from "../webhooks/webhookClient";
import { storeIdempotency, tryIdempotency } from "../services/idempotencyService";
import { hasPermission } from "../services/permissionService";

export const eventRouter = Router();

eventRouter.use(requireAuth);

eventRouter.get("/api/events", requirePermission("events.read"), async (req, res) => {
  const prisma = getPrisma();
  const from = req.query.from ? new Date(String(req.query.from)) : new Date("1970-01-01T00:00:00.000Z");
  const to = req.query.to ? new Date(String(req.query.to)) : new Date("2100-01-01T00:00:00.000Z");
  const updatedSince = req.query.updatedSince ? new Date(String(req.query.updatedSince)) : null;
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

  const permissions = new Set(req.auth!.permissions || []);
  const canReadAll = hasPermission(permissions, "events.read_all") || hasPermission(permissions, "*");

  const items = await prisma.event.findMany({
    where: {
      isDeleted: false,
      date: { gte: from, lte: to },
      ...(updatedSince ? { updatedAt: { gt: updatedSince } } : {}),
      ...(canReadAll ? {} : { OR: [{ createdById: req.auth!.userId }, { scope: { in: ["team", "global"] } }] })
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit
  });

  const etagSeed = items.map((e) => `${e.id}:${e.version}`).join("|");
  const etag = `"${Buffer.from(etagSeed).toString("base64") || "empty"}"`;
  if (req.header("if-none-match") === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader("ETag", etag);
  res.json({
    items,
    nextCursor: items.length === limit ? items[items.length - 1].id : null
  });
});

eventRouter.post("/api/events", requirePermission("events.create"), async (req, res) => {
  const idempotencyKey = req.header("idempotency-key");
  if (idempotencyKey) {
    const hit = await tryIdempotency(idempotencyKey, "/api/events", req.auth!.userId, req.body);
    if (hit.hit) {
      res.status(hit.statusCode || 200).json(hit.responseBody);
      return;
    }
  }

  const parsed = eventCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const created = await prisma.event.create({
    data: {
      date: new Date(parsed.data.date),
      title: parsed.data.title,
      description: parsed.data.description,
      scope: parsed.data.scope || "global",
      createdById: req.auth!.userId
    }
  });

  await writeAudit(req.auth!.userId, "event.create", "event", created.id);
  await postWebhook("event.created", created);

  const response = { ...created, etag: etagFromVersion(created.version) };
  if (idempotencyKey) {
    await storeIdempotency(idempotencyKey, "/api/events", req.auth!.userId, req.body, 201, response);
  }

  res.status(201).setHeader("ETag", etagFromVersion(created.version)).json(response);
});

eventRouter.patch("/api/events/:id", requirePermission("events.update"), async (req, res) => {
  const parsed = eventPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const expected = parsed.data.version ?? parseIfMatchVersion(req.header("if-match"));
  if (!expected) {
    res.status(428).json({ error: "Missing version (body.version or If-Match)" });
    return;
  }

  const prisma = getPrisma();
  const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing.version !== expected) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description === null ? null : parsed.data.description,
      scope: parsed.data.scope,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      version: { increment: 1 }
    }
  });

  await writeAudit(req.auth!.userId, "event.update", "event", updated.id);
  await postWebhook("event.updated", updated);
  res.setHeader("ETag", etagFromVersion(updated.version)).json(updated);
});

eventRouter.delete("/api/events/:id", requirePermission("events.delete"), async (req, res) => {
  const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const expected = Number(req.query.version) || parseIfMatchVersion(req.header("if-match"));
  if (!expected) {
    res.status(428).json({ error: "Missing version" });
    return;
  }

  const prisma = getPrisma();
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing.version !== expected) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  const deleted = await prisma.event.update({
    where: { id: eventId },
    data: { isDeleted: true, version: { increment: 1 } }
  });

  await writeAudit(req.auth!.userId, "event.delete", "event", deleted.id);
  await postWebhook("event.deleted", { id: deleted.id });
  res.json({ ok: true, version: deleted.version });
});
