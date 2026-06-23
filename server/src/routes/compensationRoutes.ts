import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { hasPermission } from "../services/permissionService";
import { writeAudit } from "../services/auditService";
import { createNotification } from "../services/notificationService";

export const compensationRouter = Router();

compensationRouter.use("/api/compensations", requireAuth, requireRealmFeature("compensations"));

const kindSchema = z.enum(["overtime", "absence", "adjustment"]);

const createEntrySchema = z.object({
  userId: z.string().min(1),
  minutesDelta: z.coerce.number().int().min(-100000).max(100000),
  reason: z.string().trim().max(191).optional(),
  kind: kindSchema.default("adjustment"),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function canReadAllComp(permissions: Set<string>): boolean {
  return hasPermission(permissions, "comp.read_all") || hasPermission(permissions, "*");
}

function targetUserIdOrSelf(input: unknown, selfUserId: string): string {
  const raw = typeof input === "string" ? input.trim() : "";
  return raw || selfUserId;
}

function parseDateStartUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function parseDateEndUtc(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

function parseDateNoonUtc(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

compensationRouter.get("/api/compensations/balance", requirePermission("comp.read_self"), async (req, res) => {
  const prisma = getPrisma();
  const permissions = new Set(req.auth!.permissions || []);
  const userId = targetUserIdOrSelf(req.query.userId, req.auth!.userId);

  if (userId !== req.auth!.userId && !canReadAllComp(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "comp.read_all" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, nickname: true, role: true, isDeleted: true }
  });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const balance = await prisma.compensationBalance.findUnique({ where: { userId } });
  res.json({
    user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role },
    minutes: balance?.minutes || 0,
    updatedAt: balance?.updatedAt || null
  });
});

compensationRouter.get("/api/compensations/entries", requirePermission("comp.read_self"), async (req, res) => {
  const prisma = getPrisma();
  const permissions = new Set(req.auth!.permissions || []);
  const userId = targetUserIdOrSelf(req.query.userId, req.auth!.userId);

  const dateRaw = typeof req.query.date === "string" ? req.query.date.trim() : "";
  const fromRaw = typeof req.query.from === "string" ? req.query.from.trim() : "";
  const toRaw = typeof req.query.to === "string" ? req.query.to.trim() : "";
  const isYmd = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  let gte: Date | null = null;
  let lte: Date | null = null;
  if (isYmd(dateRaw)) {
    gte = parseDateStartUtc(dateRaw);
    lte = parseDateEndUtc(dateRaw);
  } else {
    if (isYmd(fromRaw)) gte = parseDateStartUtc(fromRaw);
    if (isYmd(toRaw)) lte = parseDateEndUtc(toRaw);
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);

  if (userId !== req.auth!.userId && !canReadAllComp(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "comp.read_all" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, nickname: true, role: true, isDeleted: true }
  });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const items = await prisma.compensationEntry.findMany({
    where: {
      userId,
      ...(gte || lte
        ? {
            createdAt: {
              ...(gte ? { gte } : {}),
              ...(lte ? { lte } : {})
            }
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: {
      createdBy: {
        select: { id: true, username: true, nickname: true, role: true }
      }
    }
  });

  res.json({
    user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role },
    items
  });
});

compensationRouter.post("/api/compensations/entries", requirePermission("comp.manage"), async (req, res) => {
  const parsed = createEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, isDeleted: true } });
  if (!target || target.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const reason = (parsed.data.reason || "").trim() || null;
  const entryDate = parsed.data.entryDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.entryDate)
    ? parseDateNoonUtc(parsed.data.entryDate)
    : new Date();

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.compensationEntry.create({
      data: {
        userId: parsed.data.userId,
        createdById: req.auth!.userId,
        minutesDelta: parsed.data.minutesDelta,
        reason,
        kind: parsed.data.kind,
        createdAt: entryDate
      },
      include: {
        createdBy: { select: { id: true, username: true, nickname: true, role: true } }
      }
    });

    const current = await tx.compensationBalance.findUnique({ where: { userId: parsed.data.userId } });
    const nextMinutes = (current?.minutes || 0) + parsed.data.minutesDelta;

    const balance = await tx.compensationBalance.upsert({
      where: { userId: parsed.data.userId },
      create: {
        userId: parsed.data.userId,
        minutes: nextMinutes
      },
      update: {
        minutes: nextMinutes
      }
    });

    return { entry, balance };
  });

  await writeAudit(req.auth!.userId, "comp.entry.create", "compensationEntry", result.entry.id, {
    userId: parsed.data.userId,
    minutesDelta: parsed.data.minutesDelta,
    kind: parsed.data.kind,
    reason,
    entryDate: parsed.data.entryDate || null
  });

  if (parsed.data.userId !== req.auth!.userId) {
    const sign = parsed.data.minutesDelta > 0 ? "+" : "";
    const hours = Math.trunc(Math.abs(parsed.data.minutesDelta) / 60);
    const minutes = Math.abs(parsed.data.minutesDelta) % 60;
    const span = `${sign}${parsed.data.minutesDelta} мин (${sign}${hours}ч ${minutes}м)`;
    await createNotification({
      userId: parsed.data.userId,
      type: "comp.entry.created",
      title: "Добавена компенсация",
      body: `${span}, тип: ${parsed.data.kind}.`,
      entityType: "compensationEntry",
      entityId: result.entry.id,
      metaJson: {
        minutesDelta: parsed.data.minutesDelta,
        kind: parsed.data.kind,
        reason,
        createdAt: result.entry.createdAt.toISOString(),
        actorUserId: req.auth!.userId
      }
    });
  }

  res.status(201).json({ ok: true, entry: result.entry, balance: result.balance });
});

