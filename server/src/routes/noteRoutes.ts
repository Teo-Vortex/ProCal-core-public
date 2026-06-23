import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { noteCreateSchema, notePatchSchema } from "../utils/schemas";
import { parseIfMatchVersion } from "../utils/http";
import { writeAudit } from "../services/auditService";

export const noteRouter = Router();

noteRouter.use("/api/events", requireAuth, requireRealmFeature("notes"));
noteRouter.use("/api/notes", requireAuth, requireRealmFeature("notes"));

noteRouter.get("/api/events/:eventId/notes", async (req, res) => {
  const scope = String(req.query.scope || "me");
  const prisma = getPrisma();

  const whereBase = { eventId: req.params.eventId, isDeleted: false } as const;
  if (req.auth!.role === "system_admin" || req.auth!.role === "admin" || req.auth!.role === "boss") {
    const items = await prisma.note.findMany({ where: whereBase, orderBy: { createdAt: "desc" } });
    res.json(items);
    return;
  }

  if (scope === "all") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (scope === "team") {
    const items = await prisma.note.findMany({ where: { ...whereBase, visibility: "team" }, orderBy: { createdAt: "desc" } });
    res.json(items);
    return;
  }

  const items = await prisma.note.findMany({
    where: {
      ...whereBase,
      OR: [
        { visibility: "team" },
        { visibility: "private", authorId: req.auth!.userId }
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  res.json(items);
});

noteRouter.post("/api/events/:eventId/notes", async (req, res) => {
  const parsed = noteCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const created = await prisma.note.create({
    data: {
      eventId: req.params.eventId,
      authorId: req.auth!.userId,
      text: parsed.data.text,
      visibility: parsed.data.visibility
    }
  });

  await writeAudit(req.auth!.userId, "note.create", "note", created.id);
  res.status(201).json(created);
});

noteRouter.patch("/api/notes/:id", async (req, res) => {
  const parsed = notePatchSchema.safeParse(req.body);
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
  const existing = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const canEdit = req.auth!.role === "system_admin" || req.auth!.role === "admin" || req.auth!.role === "boss" || existing.authorId === req.auth!.userId;
  if (!canEdit) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (existing.version !== expected) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  const updated = await prisma.note.update({
    where: { id: req.params.id },
    data: {
      text: parsed.data.text,
      visibility: parsed.data.visibility,
      version: { increment: 1 }
    }
  });

  await writeAudit(req.auth!.userId, "note.update", "note", updated.id);
  res.json(updated);
});

noteRouter.delete("/api/notes/:id", async (req, res) => {
  const expected = Number(req.query.version) || parseIfMatchVersion(req.header("if-match"));
  if (!expected) {
    res.status(428).json({ error: "Missing version" });
    return;
  }

  const prisma = getPrisma();
  const existing = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.isDeleted) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const canEdit = req.auth!.role === "system_admin" || req.auth!.role === "admin" || req.auth!.role === "boss" || existing.authorId === req.auth!.userId;
  if (!canEdit) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (existing.version !== expected) {
    res.status(409).json({ error: "Version conflict", currentVersion: existing.version });
    return;
  }

  await prisma.note.update({ where: { id: req.params.id }, data: { isDeleted: true, version: { increment: 1 } } });
  await writeAudit(req.auth!.userId, "note.delete", "note", req.params.id);
  res.json({ ok: true });
});


