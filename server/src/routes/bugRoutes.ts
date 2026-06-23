import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { getPrisma } from "../db/prisma";
import { writeAudit } from "../services/auditService";
import { createNotifications, findUsersWithPermission } from "../services/notificationService";

export const bugRouter = Router();

bugRouter.use(requireAuth);

bugRouter.post("/api/bugs/report", async (req, res) => {
  const schema = z.object({
    title: z.string().min(3).max(191),
    description: z.string().min(5).max(4000),
    pageUrl: z.string().max(1000).optional(),
    appVersion: z.string().max(40).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, username: true, nickname: true }
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const resolvedUserName = (user.nickname || user.username || "").trim() || user.username;
  const normalizedPageUrl = (parsed.data.pageUrl || "").trim() || null;
  const fallbackVersion = String(process.env.PROCAL_APP_VERSION || process.env.REALM_APP_VERSION || "").trim();
  const normalizedAppVersion = (parsed.data.appVersion || "").trim() || fallbackVersion || null;
  const normalizedContainerName = String(process.env.PROCAL_CONTAINER_NAME || process.env.HOSTNAME || "").trim() || null;

  const created = await prisma.bugReport.create({
    data: {
      userId: user.id,
      userName: resolvedUserName,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      pageUrl: normalizedPageUrl,
      appVersion: normalizedAppVersion
    }
  });

  await writeAudit(req.auth!.userId, "bug.report.create", "bugReport", created.id, {
    title: created.title,
    pageUrl: created.pageUrl || null
  });
  const admins = await findUsersWithPermission("users.read");
  if (admins.length) {
    await createNotifications(admins.map((adminUserId) => ({
      userId: adminUserId,
      type: "admin.bug_reported",
      title: "Нов bug report",
      body: `${created.userName}: ${created.title}`,
      entityType: "bugReport",
      entityId: created.id,
      metaJson: {
        actorUserId: req.auth!.userId,
        reportUserId: created.userId,
        reportUserName: created.userName,
        pageUrl: created.pageUrl || "",
        appVersion: created.appVersion || ""
      }
    })));
  }
  res.status(201).json({
    ok: true,
    id: created.id,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  });
});

bugRouter.get("/api/admin/bugs", requirePermission("users.read"), async (req, res) => {
  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 300) : 100;
  const status = String(req.query.status || "").trim().toLowerCase();
  const q = String(req.query.q || "").trim();
  const cursor = String(req.query.cursor || "").trim();
  const where = {
    ...(status && status !== "all" ? { status: status as "open" | "triaged" | "resolved" | "dismissed" } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { userName: { contains: q } },
        { pageUrl: { contains: q } }
      ]
    } : {})
  };

  const prisma = getPrisma();
  const rows = await prisma.bugReport.findMany({
    where,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && page.length ? page[page.length - 1].id : null;

  res.json({
    items: page.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      title: row.title,
      description: row.description,
      pageUrl: row.pageUrl || "",
      appVersion: row.appVersion || "",
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    })),
    hasMore,
    nextCursor
  });
});

bugRouter.patch("/api/admin/bugs/:id/status", requirePermission("users.update"), async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid bug id" });
    return;
  }
  const parsed = z.object({
    status: z.enum(["open", "triaged", "resolved", "dismissed"])
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const existing = await prisma.bugReport.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Bug report not found" });
    return;
  }

  const updated = await prisma.bugReport.update({
    where: { id },
    data: { status: parsed.data.status }
  });
  await writeAudit(req.auth!.userId, "bug.report.status.update", "bugReport", updated.id, {
    status: updated.status
  });
  res.json({ ok: true, id: updated.id, status: updated.status });
});
