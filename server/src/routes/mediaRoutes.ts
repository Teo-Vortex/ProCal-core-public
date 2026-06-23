import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { writeAudit } from "../services/auditService";

export const mediaRouter = Router();

mediaRouter.use("/api/media", requireAuth, requireRealmFeature("media"));

function parseDateInput(value: string): Date {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00.000Z`);
  }
  return new Date(text);
}

function toIso(date: Date): string {
  return date.toISOString();
}

function normalizeQ(value: unknown): string {
  return String(value || "").trim();
}

function escCsv(v: unknown): string {
  return `"${String(v == null ? "" : v).replace(/"/g, "\"\"")}"`;
}

async function ensureLinkRule(linkedOwnedId: string | null, mentionPublishedAt: Date): Promise<void> {
  void mentionPublishedAt;
  if (!linkedOwnedId) return;
  const prisma = getPrisma();
  const owned = await prisma.mediaOwnedPublication.findUnique({
    where: { id: linkedOwnedId },
    select: { id: true, publishedAt: true }
  });
  if (!owned) {
    throw new Error("Linked owned publication not found");
  }
}

mediaRouter.get("/api/media/owned", requirePermission("media.read"), async (req, res) => {
  const q = normalizeQ(req.query.q);
  const fromRaw = normalizeQ(req.query.from);
  const toRaw = normalizeQ(req.query.to);
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { url: { contains: q } },
      { createdByName: { contains: q } }
    ];
  }
  if (fromRaw || toRaw) {
    const dateFilter: Record<string, Date> = {};
    if (fromRaw) {
      const from = parseDateInput(fromRaw);
      if (!Number.isNaN(from.getTime())) dateFilter.gte = from;
    }
    if (toRaw) {
      const to = parseDateInput(toRaw);
      if (!Number.isNaN(to.getTime())) dateFilter.lte = to;
    }
    if (Object.keys(dateFilter).length) where.publishedAt = dateFilter;
  }
  const prisma = getPrisma();
  const rows = await prisma.mediaOwnedPublication.findMany({
    where,
    include: {
      _count: { select: { mentions: true } }
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: toIso(row.publishedAt),
      createdById: row.createdById || "",
      createdByName: row.createdByName,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      mentionsCount: Number(row._count?.mentions || 0)
    }))
  });
});

mediaRouter.post("/api/media/owned", requirePermission("media.create"), async (req, res) => {
  const parsed = z.object({
    title: z.string().trim().min(2).max(300),
    url: z.string().trim().url().max(1000),
    publishedAt: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const publishedAt = parseDateInput(parsed.data.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) {
    res.status(400).json({ error: "Invalid publishedAt" });
    return;
  }
  const prisma = getPrisma();
  const me = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, username: true, nickname: true }
  });
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const created = await prisma.mediaOwnedPublication.create({
    data: {
      title: parsed.data.title,
      url: parsed.data.url,
      publishedAt,
      createdById: me.id,
      createdByName: (me.nickname || me.username || "").trim() || me.username
    }
  });
  await writeAudit(req.auth!.userId, "media.owned.create", "mediaOwnedPublication", created.id, {
    title: created.title,
    url: created.url
  });
  res.status(201).json({ ok: true, id: created.id });
});

mediaRouter.patch("/api/media/owned/:id", requirePermission("media.update"), async (req, res) => {
  const id = normalizeQ(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = z.object({
    title: z.string().trim().min(2).max(300).optional(),
    url: z.string().trim().url().max(1000).optional(),
    publishedAt: z.string().min(1).optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (typeof parsed.data.title === "string") patch.title = parsed.data.title;
  if (typeof parsed.data.url === "string") patch.url = parsed.data.url;
  if (typeof parsed.data.publishedAt === "string") {
    const publishedAt = parseDateInput(parsed.data.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) {
      res.status(400).json({ error: "Invalid publishedAt" });
      return;
    }
    patch.publishedAt = publishedAt;
  }
  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const prisma = getPrisma();
  const existing = await prisma.mediaOwnedPublication.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  const updated = await prisma.mediaOwnedPublication.update({
    where: { id },
    data: patch
  });
  await writeAudit(req.auth!.userId, "media.owned.update", "mediaOwnedPublication", updated.id);
  res.json({ ok: true, id: updated.id });
});

mediaRouter.delete("/api/media/owned/:id", requirePermission("media.delete"), async (req, res) => {
  const id = normalizeQ(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const prisma = getPrisma();
  const existing = await prisma.mediaOwnedPublication.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  await prisma.mediaOwnedPublication.delete({ where: { id } });
  await writeAudit(req.auth!.userId, "media.owned.delete", "mediaOwnedPublication", id);
  res.json({ ok: true, id });
});

mediaRouter.get("/api/media/mentions", requirePermission("media.read"), async (req, res) => {
  const q = normalizeQ(req.query.q);
  const fromRaw = normalizeQ(req.query.from);
  const toRaw = normalizeQ(req.query.to);
  const linked = normalizeQ(req.query.linked).toLowerCase();
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { url: { contains: q } },
      { createdByName: { contains: q } }
    ];
  }
  if (fromRaw || toRaw) {
    const dateFilter: Record<string, Date> = {};
    if (fromRaw) {
      const from = parseDateInput(fromRaw);
      if (!Number.isNaN(from.getTime())) dateFilter.gte = from;
    }
    if (toRaw) {
      const to = parseDateInput(toRaw);
      if (!Number.isNaN(to.getTime())) dateFilter.lte = to;
    }
    if (Object.keys(dateFilter).length) where.publishedAt = dateFilter;
  }
  if (linked === "1" || linked === "true") where.NOT = { linkedOwnedId: null };
  if (linked === "0" || linked === "false") where.linkedOwnedId = null;

  const prisma = getPrisma();
  const rows = await prisma.mediaObservedMention.findMany({
    where,
    include: {
      linkedOwned: { select: { id: true, title: true, url: true, publishedAt: true } }
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: toIso(row.publishedAt),
      linkedOwnedId: row.linkedOwnedId || "",
      linkedOwned: row.linkedOwned ? {
        id: row.linkedOwned.id,
        title: row.linkedOwned.title,
        url: row.linkedOwned.url,
        publishedAt: toIso(row.linkedOwned.publishedAt)
      } : null,
      createdById: row.createdById || "",
      createdByName: row.createdByName,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt)
    }))
  });
});

mediaRouter.post("/api/media/mentions", requirePermission("media.create"), async (req, res) => {
  const parsed = z.object({
    title: z.string().trim().min(2).max(300),
    url: z.string().trim().url().max(1000),
    publishedAt: z.string().min(1),
    linkedOwnedId: z.string().trim().min(1).max(191).optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const publishedAt = parseDateInput(parsed.data.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) {
    res.status(400).json({ error: "Invalid publishedAt" });
    return;
  }
  const linkedOwnedId = parsed.data.linkedOwnedId ? parsed.data.linkedOwnedId : null;
  try {
    await ensureLinkRule(linkedOwnedId, publishedAt);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid link rule" });
    return;
  }
  const prisma = getPrisma();
  const me = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, username: true, nickname: true }
  });
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const created = await prisma.mediaObservedMention.create({
    data: {
      title: parsed.data.title,
      url: parsed.data.url,
      publishedAt,
      linkedOwnedId,
      createdById: me.id,
      createdByName: (me.nickname || me.username || "").trim() || me.username
    }
  });
  await writeAudit(req.auth!.userId, "media.mention.create", "mediaObservedMention", created.id, {
    title: created.title,
    linkedOwnedId: created.linkedOwnedId || null
  });
  res.status(201).json({ ok: true, id: created.id });
});

mediaRouter.patch("/api/media/mentions/:id", requirePermission("media.update"), async (req, res) => {
  const id = normalizeQ(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = z.object({
    title: z.string().trim().min(2).max(300).optional(),
    url: z.string().trim().url().max(1000).optional(),
    publishedAt: z.string().min(1).optional(),
    linkedOwnedId: z.string().trim().max(191).nullable().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const existing = await prisma.mediaObservedMention.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  const patch: Record<string, unknown> = {};
  let publishedAt = existing.publishedAt;
  let linkedOwnedId = existing.linkedOwnedId;
  if (typeof parsed.data.title === "string") patch.title = parsed.data.title;
  if (typeof parsed.data.url === "string") patch.url = parsed.data.url;
  if (typeof parsed.data.publishedAt === "string") {
    const dt = parseDateInput(parsed.data.publishedAt);
    if (Number.isNaN(dt.getTime())) {
      res.status(400).json({ error: "Invalid publishedAt" });
      return;
    }
    publishedAt = dt;
    patch.publishedAt = dt;
  }
  if (parsed.data.linkedOwnedId !== undefined) {
    linkedOwnedId = parsed.data.linkedOwnedId ? String(parsed.data.linkedOwnedId).trim() : null;
    patch.linkedOwnedId = linkedOwnedId;
  }
  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  try {
    await ensureLinkRule(linkedOwnedId || null, publishedAt);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid link rule" });
    return;
  }
  const updated = await prisma.mediaObservedMention.update({
    where: { id },
    data: patch
  });
  await writeAudit(req.auth!.userId, "media.mention.update", "mediaObservedMention", updated.id);
  res.json({ ok: true, id: updated.id });
});

mediaRouter.delete("/api/media/mentions/:id", requirePermission("media.delete"), async (req, res) => {
  const id = normalizeQ(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const prisma = getPrisma();
  const existing = await prisma.mediaObservedMention.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  await prisma.mediaObservedMention.delete({ where: { id } });
  await writeAudit(req.auth!.userId, "media.mention.delete", "mediaObservedMention", id);
  res.json({ ok: true, id });
});

mediaRouter.get("/api/media/stats", requirePermission("media.read"), async (req, res) => {
  const fromRaw = normalizeQ(req.query.from);
  const toRaw = normalizeQ(req.query.to);
  const from = fromRaw ? parseDateInput(fromRaw) : null;
  const to = toRaw ? parseDateInput(toRaw) : null;
  const ownedWhere: Record<string, unknown> = {};
  const mentionWhere: Record<string, unknown> = {};
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from && !Number.isNaN(from.getTime())) dateFilter.gte = from;
    if (to && !Number.isNaN(to.getTime())) dateFilter.lte = to;
    if (Object.keys(dateFilter).length) {
      ownedWhere.publishedAt = dateFilter;
      mentionWhere.publishedAt = dateFilter;
    }
  }
  const prisma = getPrisma();
  const [ownedCount, mentionCount, linkedCount, mentions, owned] = await Promise.all([
    prisma.mediaOwnedPublication.count({ where: ownedWhere }),
    prisma.mediaObservedMention.count({ where: mentionWhere }),
    prisma.mediaObservedMention.count({ where: { ...mentionWhere, NOT: { linkedOwnedId: null } } }),
    prisma.mediaObservedMention.findMany({
      where: mentionWhere,
      select: { publishedAt: true, linkedOwnedId: true }
    }),
    prisma.mediaOwnedPublication.findMany({
      where: ownedWhere,
      select: { publishedAt: true }
    })
  ]);
  const byDate = new Map<string, { owned: number; mentions: number; linkedMentions: number }>();
  owned.forEach((row) => {
    const key = row.publishedAt.toISOString().slice(0, 10);
    const current = byDate.get(key) || { owned: 0, mentions: 0, linkedMentions: 0 };
    current.owned += 1;
    byDate.set(key, current);
  });
  mentions.forEach((row) => {
    const key = row.publishedAt.toISOString().slice(0, 10);
    const current = byDate.get(key) || { owned: 0, mentions: 0, linkedMentions: 0 };
    current.mentions += 1;
    if (row.linkedOwnedId) current.linkedMentions += 1;
    byDate.set(key, current);
  });
  res.json({
    totals: {
      ownedCount,
      mentionCount,
      linkedCount,
      unlinkedCount: Math.max(mentionCount - linkedCount, 0)
    },
    heatmap: Array.from(byDate.entries())
      .map(([dateKey, counts]) => ({ dateKey, ...counts }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  });
});

mediaRouter.get("/api/media/export", requirePermission("media.export"), async (req, res) => {
  const format = String(req.query.format || "csv").trim().toLowerCase();
  const fromRaw = normalizeQ(req.query.from);
  const toRaw = normalizeQ(req.query.to);
  const from = fromRaw ? parseDateInput(fromRaw) : null;
  const to = toRaw ? parseDateInput(toRaw) : null;
  const ownedWhere: Record<string, unknown> = {};
  const mentionWhere: Record<string, unknown> = {};
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from && !Number.isNaN(from.getTime())) dateFilter.gte = from;
    if (to && !Number.isNaN(to.getTime())) dateFilter.lte = to;
    if (Object.keys(dateFilter).length) {
      ownedWhere.publishedAt = dateFilter;
      mentionWhere.publishedAt = dateFilter;
    }
  }
  const prisma = getPrisma();
  const [owned, mentions] = await Promise.all([
    prisma.mediaOwnedPublication.findMany({ where: ownedWhere, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] }),
    prisma.mediaObservedMention.findMany({ where: mentionWhere, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] })
  ]);

  if (format === "json") {
    res.json({
      exportedAt: new Date().toISOString(),
      owned: owned.map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        publishedAt: toIso(row.publishedAt),
        createdById: row.createdById || "",
        createdByName: row.createdByName,
        createdAt: toIso(row.createdAt)
      })),
      mentions: mentions.map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        publishedAt: toIso(row.publishedAt),
        linkedOwnedId: row.linkedOwnedId || "",
        createdById: row.createdById || "",
        createdByName: row.createdByName,
        createdAt: toIso(row.createdAt)
      }))
    });
    return;
  }

  const lines = [
    ["kind", "id", "title", "url", "publishedAt", "linkedOwnedId", "createdById", "createdByName", "createdAt", "updatedAt"].map(escCsv).join(",")
  ];
  owned.forEach((row) => {
    lines.push([
      "owned",
      row.id,
      row.title,
      row.url,
      toIso(row.publishedAt),
      "",
      row.createdById || "",
      row.createdByName,
      toIso(row.createdAt),
      toIso(row.updatedAt)
    ].map(escCsv).join(","));
  });
  mentions.forEach((row) => {
    lines.push([
      "mention",
      row.id,
      row.title,
      row.url,
      toIso(row.publishedAt),
      row.linkedOwnedId || "",
      row.createdById || "",
      row.createdByName,
      toIso(row.createdAt),
      toIso(row.updatedAt)
    ].map(escCsv).join(","));
  });
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename=\"media-monitoring-${Date.now()}.csv\"`);
  res.status(200).send(lines.join("\n"));
});
