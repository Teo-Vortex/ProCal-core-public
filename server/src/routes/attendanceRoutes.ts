import { backfillLegacyAttendance } from "../services/attendanceWorkplaceService";
import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import { getSecrets } from "../config/env";
import { getPrisma } from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { writeAudit } from "../services/auditService";
import { hasPermission } from "../services/permissionService";
import { sha256 } from "../utils/crypto";

export const attendanceRouter = Router();

attendanceRouter.use("/api/attendance", requireAuth);

const punchKindSchema = z.enum(["check_in", "check_out"]);
const punchSchema = z.object({
  action: punchKindSchema.optional(),
  userId: z.string().trim().min(1).max(191).optional(),
  workplaceId: z.string().trim().min(1).max(191).optional(),
  note: z.string().trim().max(512).optional()
});
const nfcPunchSchema = punchSchema.extend({
  stationId: z.string().trim().min(1).max(191),
  token: z.string().trim().min(16).max(512)
});
const workplaceSchema = z.object({
  name: z.string().trim().min(1).max(191),
  active: z.boolean().optional()
});
const stationSchema = z.object({
  workplaceId: z.string().trim().min(1).max(191),
  name: z.string().trim().min(1).max(191),
  location: z.string().trim().max(191).optional(),
  active: z.boolean().optional()
});
const stationUpdateSchema = stationSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required"
});
const correctionSchema = z.object({
  action: punchKindSchema,
  occurredAt: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(3).max(512),
  note: z.string().trim().max(512).optional()
});
const voidSchema = z.object({
  reason: z.string().trim().min(3).max(512)
});

function apiError(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

function paramAsString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function canReadAll(permissions: string[]): boolean {
  const set = new Set(permissions || []);
  return hasPermission(set, "attendance.read_all") || hasPermission(set, "*");
}

function parseBoundary(value: unknown, endOfDay: boolean): Date | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : raw;
  const result = new Date(normalized);
  return Number.isNaN(result.getTime()) ? null : result;
}

function stationPayload(stationId: string, token: string): string {
  return `procal://attendance/${encodeURIComponent(stationId)}?token=${encodeURIComponent(token)}`;
}

async function stationQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#071017", light: "#ffffff" }
  });
}

function generateStationSeed(): string {
  return `v2${crypto.randomBytes(31).toString("hex")}`;
}

function stableStationToken(stationId: string, seed: string): string {
  return crypto.createHmac("sha256", getSecrets().jwtSecret).update(`attendance:${stationId}:${seed}`).digest("base64url");
}

function tokenMatches(stationId: string, token: string, storedValue: string): boolean {
  const expectedToken = storedValue.startsWith("v2") ? stableStationToken(stationId, storedValue) : "";
  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedToken || (sha256(token) === storedValue ? token : ""));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const punchInclude = {
  user: { select: { id: true, username: true, nickname: true, displayColor: true } },
  createdBy: { select: { id: true, username: true, nickname: true } },
  station: { select: { id: true, name: true, location: true, workplaceId: true } },
  workplace: { select: { id: true, name: true, active: true } },
  targetPunch: { select: { id: true, kind: true, occurredAt: true } },
  supersededBy: { select: { id: true, kind: true, occurredAt: true, reason: true, createdAt: true } }
} as const;

async function createPunch(input: {
  userId: string;
  actorUserId: string;
  requestedAction?: "check_in" | "check_out";
  source: "web" | "nfc";
  stationId?: string;
  workplaceId?: string;
  note?: string;
}) {
  const prisma = getPrisma();
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    // Serialize actions for one person, including concurrent web/NFC requests.
    const target = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM User WHERE id = ${input.userId} AND isDeleted = false AND status = 'active' FOR UPDATE`;
    if (!target.length) throw apiError(404, "Employee not found");
    await backfillLegacyAttendance(tx);
    const latest = await tx.attendancePunch.findFirst({
      where: {
        userId: input.userId,
        kind: { in: ["check_in", "check_out"] },
        supersededBy: { none: {} }
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }]
    });
    const expectedAction = latest?.kind === "check_in" ? "check_out" : "check_in";
    if (input.requestedAction && input.requestedAction !== expectedAction) {
      throw apiError(409, expectedAction === "check_in" ? "Check-in is required next" : "Check-out is required next");
    }
    if (latest && now.getTime() - latest.occurredAt.getTime() < 30_000) {
      throw apiError(429, "Please wait before recording another attendance action");
    }
    let workplaceId = latest?.workplaceId || null;
    let workplaceName = latest?.workplaceName || null;
    if (expectedAction === "check_in") {
      const workplace = input.workplaceId
        ? await tx.attendanceWorkplace.findUnique({ where: { id: input.workplaceId } })
        // Older clients without a workplace picker continue using the first active place.
        : await tx.attendanceWorkplace.findFirst({ where: { active: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      if (!workplace || !workplace.active) throw apiError(400, "Choose an active workplace");
      workplaceId = workplace.id;
      workplaceName = workplace.name;
    }
    return tx.attendancePunch.create({
      data: {
        userId: input.userId,
        kind: expectedAction,
        occurredAt: now,
        source: input.source,
        stationId: input.stationId || null,
        workplaceId,
        workplaceName,
        note: input.note || null,
        createdById: input.actorUserId
      },
      include: punchInclude
    });
  });
}

attendanceRouter.get("/api/attendance/status", requirePermission("attendance.read_self"), async (req, res) => {
  const prisma = getPrisma();
  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : req.auth!.userId;
  if (userId !== req.auth!.userId && !canReadAll(req.auth!.permissions || []) && !hasPermission(new Set(req.auth!.permissions), "attendance.manage")) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await backfillLegacyAttendance();
  const latest = await prisma.attendancePunch.findFirst({
    where: {
      userId,
      kind: { in: ["check_in", "check_out"] },
      supersededBy: { none: {} }
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: punchInclude
  });
  res.json({
    state: latest?.kind === "check_in" ? "checked_in" : "checked_out",
    nextAction: latest?.kind === "check_in" ? "check_out" : "check_in",
    latest: latest || null,
    workplaces: await prisma.attendanceWorkplace.findMany({ where: { active: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true } })
  });
});

attendanceRouter.get("/api/attendance/entries", requirePermission("attendance.read_self"), async (req, res) => {
  const prisma = getPrisma();
  await backfillLegacyAttendance();
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  const readAll = canReadAll(req.auth!.permissions || []);
  const userId = requestedUserId || (readAll ? "" : req.auth!.userId);
  if (userId && userId !== req.auth!.userId && !readAll) {
    res.status(403).json({ error: "Forbidden", missingPermission: "attendance.read_all" });
    return;
  }

  const from = parseBoundary(req.query.from, false);
  const to = parseBoundary(req.query.to, true);
  if ((req.query.from && !from) || (req.query.to && !to) || (from && to && from > to)) {
    res.status(400).json({ error: "Invalid date range" });
    return;
  }
  if (from && to && to.getTime() - from.getTime() > 370 * 24 * 60 * 60 * 1000) {
    res.status(400).json({ error: "Date range cannot exceed 370 days" });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 250), 1), 1000);
  const items = await prisma.attendancePunch.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(from || to ? {
        occurredAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {})
        }
      } : {})
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: punchInclude
  });
  res.json({
    items: items.map((item) => ({
      ...item,
      effective: item.kind !== "void" && item.supersededBy.length === 0
    }))
  });
});

attendanceRouter.post("/api/attendance/punch", requirePermission("attendance.punch"), async (req, res) => {
  const parsed = punchSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = parsed.data.userId || req.auth!.userId;
  if (userId !== req.auth!.userId && !hasPermission(new Set(req.auth!.permissions), "attendance.manage")) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const punch = await createPunch({
      userId,
      actorUserId: req.auth!.userId,
      requestedAction: parsed.data.action,
      source: "web",
      workplaceId: parsed.data.workplaceId,
      note: parsed.data.note
    });
    await writeAudit(req.auth!.userId, `attendance.${punch.kind}`, "attendancePunch", punch.id, {
      source: "web",
      occurredAt: punch.occurredAt.toISOString()
    });
    res.status(201).json({ ok: true, punch });
  } catch (error) {
    res.status((error as { statusCode?: number }).statusCode || 500).json({
      error: error instanceof Error ? error.message : "Attendance action failed"
    });
  }
});

attendanceRouter.post("/api/attendance/nfc-punch", requirePermission("attendance.punch"), async (req, res) => {
  const parsed = nfcPunchSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  await backfillLegacyAttendance();
  const station = await prisma.attendanceStation.findUnique({ where: { id: parsed.data.stationId } });
  if (!station || !station.active || !tokenMatches(station.id, parsed.data.token, station.tokenHash)) {
    res.status(403).json({ error: "Invalid or inactive attendance station" });
    return;
  }
  try {
    const punch = await createPunch({
      userId: req.auth!.userId,
      actorUserId: req.auth!.userId,
      requestedAction: parsed.data.action,
      source: "nfc",
      stationId: station.id,
      workplaceId: station.workplaceId || undefined,
      note: parsed.data.note
    });
    await writeAudit(req.auth!.userId, `attendance.${punch.kind}`, "attendancePunch", punch.id, {
      source: "nfc",
      stationId: station.id,
      occurredAt: punch.occurredAt.toISOString()
    });
    res.status(201).json({ ok: true, punch });
  } catch (error) {
    res.status((error as { statusCode?: number }).statusCode || 500).json({
      error: error instanceof Error ? error.message : "NFC attendance action failed"
    });
  }
});

attendanceRouter.get("/api/attendance/workplaces", requirePermission("attendance.read_self"), async (req, res) => {
  await backfillLegacyAttendance();
  const manage = hasPermission(new Set(req.auth!.permissions), "attendance.manage");
  res.json({ items: await getPrisma().attendanceWorkplace.findMany({ where: manage ? {} : { active: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }) });
});

attendanceRouter.post("/api/attendance/workplaces", requirePermission("attendance.manage"), async (req, res) => {
  const parsed = workplaceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a workplace name" }); return; }
  try {
    const workplace = await getPrisma().$transaction(async tx => {
      // First-place creation and legacy backfill must be atomic and deterministic.
      await tx.$queryRaw`SELECT id FROM AppMeta WHERE id = 1 FOR UPDATE`;
      const last = await tx.attendanceWorkplace.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      // Maintain creation order even for same-millisecond requests or a clock adjustment.
      const createdAt = new Date(Math.max(Date.now(), (last?.createdAt.getTime() || 0) + 1));
      const created = await tx.attendanceWorkplace.create({ data: { ...parsed.data, createdAt, createdById: req.auth!.userId } });
      await backfillLegacyAttendance(tx);
      return created;
    });
    await writeAudit(req.auth!.userId, "attendance.workplace.create", "attendanceWorkplace", workplace.id, { name: workplace.name });
    res.status(201).json({ ok: true, workplace });
  } catch (error) {
    res.status((error as { code?: string }).code === "P2002" ? 409 : 500).json({ error: "Workplace could not be created; names must be unique" });
  }
});

attendanceRouter.patch("/api/attendance/workplaces/:id", requirePermission("attendance.manage"), async (req, res) => {
  const parsed = workplaceSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid workplace" }); return; }
  try {
    const workplace = await getPrisma().attendanceWorkplace.update({ where: { id: paramAsString(req.params.id) }, data: parsed.data });
    await writeAudit(req.auth!.userId, "attendance.workplace.update", "attendanceWorkplace", workplace.id, parsed.data);
    res.json({ ok: true, workplace });
  } catch (error) {
    const code = (error as { code?: string }).code;
    res.status(code === "P2025" ? 404 : code === "P2002" ? 409 : 500).json({ error: "Workplace could not be updated" });
  }
});

attendanceRouter.get("/api/attendance/stations", requirePermission("attendance.read_self"), async (req, res) => {
  const prisma = getPrisma();
  const manage = hasPermission(new Set(req.auth!.permissions || []), "attendance.manage");
  const items = await prisma.attendanceStation.findMany({
    where: manage ? {} : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, location: true, active: true, workplaceId: true, createdAt: true, updatedAt: true }
  });
  res.json({ items });
});

attendanceRouter.post("/api/attendance/stations", requirePermission("attendance.manage"), async (req, res) => {
  const parsed = stationSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const workplace = await prisma.attendanceWorkplace.findUnique({ where: { id: parsed.data.workplaceId } });
  if (!workplace || !workplace.active) { res.status(400).json({ error: "Choose an active workplace" }); return; }
  const tokenSeed = generateStationSeed();
  const station = await prisma.attendanceStation.create({
    data: {
      name: parsed.data.name,
      workplaceId: parsed.data.workplaceId,
      location: parsed.data.location || null,
      active: parsed.data.active ?? true,
      tokenHash: tokenSeed,
      createdById: req.auth!.userId
    }
  });
  await writeAudit(req.auth!.userId, "attendance.station.create", "attendanceStation", station.id, {
    name: station.name,
    location: station.location
  });
  const nfcPayload = stationPayload(station.id, stableStationToken(station.id, tokenSeed));
  res.status(201).json({
    ok: true,
    station: { ...station, tokenHash: undefined },
    nfcPayload,
    qrDataUrl: await stationQrDataUrl(nfcPayload)
  });
});

attendanceRouter.get("/api/attendance/stations/:id/code", requirePermission("attendance.manage"), async (req, res) => {
  const stationId = paramAsString(req.params.id);
  const station = await getPrisma().attendanceStation.findUnique({
    where: { id: stationId },
    select: { id: true, name: true, location: true, active: true, tokenHash: true }
  });
  if (!station) {
    res.status(404).json({ error: "Attendance station not found" });
    return;
  }
  if (!station.tokenHash.startsWith("v2")) {
    res.status(409).json({ error: "This legacy station code cannot be displayed again. Create a new reusable code once." });
    return;
  }
  const nfcPayload = stationPayload(station.id, stableStationToken(station.id, station.tokenHash));
  res.json({
    station: { id: station.id, name: station.name, location: station.location, active: station.active },
    nfcPayload,
    qrDataUrl: await stationQrDataUrl(nfcPayload)
  });
});

attendanceRouter.patch("/api/attendance/stations/:id", requirePermission("attendance.manage"), async (req, res) => {
  const parsed = stationUpdateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const stationId = paramAsString(req.params.id);
  const existing = await prisma.attendanceStation.findUnique({ where: { id: stationId } });
  if (!existing) {
    res.status(404).json({ error: "Attendance station not found" });
    return;
  }
  if (parsed.data.workplaceId !== undefined) {
    const workplace = await prisma.attendanceWorkplace.findUnique({ where: { id: parsed.data.workplaceId } });
    if (!workplace || !workplace.active) { res.status(400).json({ error: "Choose an active workplace" }); return; }
  }
  const station = await prisma.attendanceStation.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.workplaceId !== undefined ? { workplaceId: parsed.data.workplaceId } : {}),
      ...(parsed.data.location !== undefined ? { location: parsed.data.location || null } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
    },
    select: { id: true, name: true, location: true, active: true, workplaceId: true, createdAt: true, updatedAt: true }
  });
  await writeAudit(req.auth!.userId, "attendance.station.update", "attendanceStation", station.id, parsed.data);
  res.json({ ok: true, station });
});

attendanceRouter.post("/api/attendance/stations/:id/rotate-token", requirePermission("attendance.manage"), async (req, res) => {
  const prisma = getPrisma();
  const stationId = paramAsString(req.params.id);
  const existing = await prisma.attendanceStation.findUnique({ where: { id: stationId } });
  if (!existing) {
    res.status(404).json({ error: "Attendance station not found" });
    return;
  }
  const tokenSeed = generateStationSeed();
  await prisma.attendanceStation.update({ where: { id: existing.id }, data: { tokenHash: tokenSeed } });
  await writeAudit(req.auth!.userId, "attendance.station.token.rotate", "attendanceStation", existing.id);
  const nfcPayload = stationPayload(existing.id, stableStationToken(existing.id, tokenSeed));
  res.json({ ok: true, nfcPayload, qrDataUrl: await stationQrDataUrl(nfcPayload) });
});

attendanceRouter.post("/api/attendance/entries/:id/correct", requirePermission("attendance.manage"), async (req, res) => {
  const parsed = correctionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const targetPunchId = paramAsString(req.params.id);
  try {
    const replacement = await prisma.$transaction(async (tx) => {
      const target = await tx.attendancePunch.findUnique({
        where: { id: targetPunchId },
        include: { supersededBy: { select: { id: true } } }
      });
      if (!target || target.kind === "void") throw apiError(404, "Attendance entry not found");
      if (target.supersededBy.length > 0) throw apiError(409, "Attendance entry was already corrected");
      return tx.attendancePunch.create({
        data: {
          userId: target.userId,
          kind: parsed.data.action,
          occurredAt: new Date(parsed.data.occurredAt),
          source: "admin",
          stationId: target.stationId,
          workplaceId: target.workplaceId,
          workplaceName: target.workplaceName,
          note: parsed.data.note || target.note,
          reason: parsed.data.reason,
          createdById: req.auth!.userId,
          targetPunchId: target.id
        },
        include: punchInclude
      });
    });
    await writeAudit(req.auth!.userId, "attendance.entry.correct", "attendancePunch", replacement.id, {
      targetPunchId,
      action: parsed.data.action,
      occurredAt: parsed.data.occurredAt,
      reason: parsed.data.reason
    });
    res.status(201).json({ ok: true, punch: replacement });
  } catch (error) {
    res.status((error as { statusCode?: number }).statusCode || 500).json({
      error: error instanceof Error ? error.message : "Attendance correction failed"
    });
  }
});

attendanceRouter.post("/api/attendance/entries/:id/void", requirePermission("attendance.manage"), async (req, res) => {
  const parsed = voidSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const targetPunchId = paramAsString(req.params.id);
  try {
    const voidPunch = await prisma.$transaction(async (tx) => {
      const target = await tx.attendancePunch.findUnique({
        where: { id: targetPunchId },
        include: { supersededBy: { select: { id: true } } }
      });
      if (!target || target.kind === "void") throw apiError(404, "Attendance entry not found");
      if (target.supersededBy.length > 0) throw apiError(409, "Attendance entry was already corrected");
      return tx.attendancePunch.create({
        data: {
          userId: target.userId,
          kind: "void",
          workplaceId: target.workplaceId,
          workplaceName: target.workplaceName,
          occurredAt: target.occurredAt,
          source: "admin",
          reason: parsed.data.reason,
          createdById: req.auth!.userId,
          targetPunchId: target.id
        },
        include: punchInclude
      });
    });
    await writeAudit(req.auth!.userId, "attendance.entry.void", "attendancePunch", voidPunch.id, {
      targetPunchId,
      reason: parsed.data.reason
    });
    res.status(201).json({ ok: true, punch: voidPunch });
  } catch (error) {
    res.status((error as { statusCode?: number }).statusCode || 500).json({
      error: error instanceof Error ? error.message : "Attendance void failed"
    });
  }
});
