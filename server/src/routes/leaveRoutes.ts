import { LeaveRecordStatus, LeaveType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { hasPermission } from "../services/permissionService";
import { writeAudit } from "../services/auditService";
import { loadLeaveTemplate, resolveLeaveTemplateForUser } from "../services/leaveTemplateService";
import { buildHolidayOccurrencesFromConfig, loadHolidayRules } from "../services/holidayRulesService";
import { createNotification, createNotifications, findUsersWithPermission } from "../services/notificationService";

export const leaveRouter = Router();

leaveRouter.use("/api/leave", requireAuth, requireRealmFeature("leave"));

const MIN_TRACK_YEAR = 2022;
const ALLOWANCE_POOL_YEAR = MIN_TRACK_YEAR;
const DAY_MS = 24 * 60 * 60 * 1000;

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalSubstituteUserIdSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}, z.string().min(1).nullable());

const allowanceSchema = z.object({
  userId: z.string().min(1),
  leaveType: z.enum(["paid", "study"]),
  operation: z.enum(["add", "remove", "reset"]),
  days: z.coerce.number().min(0).max(366).optional()
});

const recordSchema = z.object({
  userId: z.string().min(1),
  leaveType: z.enum(["paid", "sick", "unpaid", "study"]),
  startDate: ymdSchema,
  endDate: ymdSchema,
  note: z.string().trim().max(512).optional(),
  sourceYear: z.coerce.number().int().min(MIN_TRACK_YEAR).max(2200).optional(),
  substituteUserId: optionalSubstituteUserIdSchema.optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional()
});

const approveRecordSchema = z.object({
  substituteUserId: optionalSubstituteUserIdSchema.optional()
});

function parseYmdAtNoonUtc(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function clampToDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function daysInclusive(start: Date, end: Date): number {
  const from = clampToDay(start);
  const to = clampToDay(end);
  if (to < from) return 0;
  return Math.floor((to - from) / DAY_MS) + 1;
}

function overlapDaysInclusive(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const from = Math.max(clampToDay(aStart), clampToDay(bStart));
  const to = Math.min(clampToDay(aEnd), clampToDay(bEnd));
  if (to < from) return 0;
  return Math.floor((to - from) / DAY_MS) + 1;
}

function isWeekendUtc(dayUtcMs: number): boolean {
  const d = new Date(dayUtcMs);
  const weekday = d.getUTCDay();
  return weekday === 0 || weekday === 6;
}

function toDateKeyFromUtcMs(dayUtcMs: number): string {
  return new Date(dayUtcMs).toISOString().slice(0, 10);
}

function collectDayOffHolidaySet(from: Date, to: Date): Set<string> {
  if (to < from) return new Set();
  const cfg = loadHolidayRules();
  const items = buildHolidayOccurrencesFromConfig(cfg, toYmdUtc(from), toYmdUtc(to));
  const out = new Set<string>();
  items.forEach((row) => {
    if (!row || !row.dayOff) return;
    if (!ymdSchema.safeParse(row.dateKey).success) return;
    out.add(String(row.dateKey));
  });
  return out;
}

function workingDaysInclusive(start: Date, end: Date, dayOffHolidaySet: Set<string>): number {
  const from = clampToDay(start);
  const to = clampToDay(end);
  if (to < from) return 0;
  let count = 0;
  for (let day = from; day <= to; day += DAY_MS) {
    if (isWeekendUtc(day)) continue;
    if (dayOffHolidaySet.has(toDateKeyFromUtcMs(day))) continue;
    count += 1;
  }
  return count;
}

function overlapWorkingDaysInclusive(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date, dayOffHolidaySet: Set<string>): number {
  const from = Math.max(clampToDay(aStart), clampToDay(bStart));
  const to = Math.min(clampToDay(aEnd), clampToDay(bEnd));
  if (to < from) return 0;
  return workingDaysInclusive(new Date(from), new Date(to), dayOffHolidaySet);
}

function hasReadAll(permissions: Set<string>): boolean {
  return hasPermission(permissions, "leave.read_all") || hasPermission(permissions, "leave.manage") || hasPermission(permissions, "*");
}

function hasReadSelf(permissions: Set<string>): boolean {
  return hasReadAll(permissions) || hasPermission(permissions, "leave.read_self");
}

function hasManage(permissions: Set<string>): boolean {
  return hasPermission(permissions, "leave.manage") || hasPermission(permissions, "*");
}

type SubstituteResolution = {
  ok: true;
  user: {
    id: string;
    username: string;
    nickname: string | null;
  } | null;
} | {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

async function resolveSubstituteUser(
  substituteUserId: string | null | undefined,
  targetUserId: string,
  start: Date,
  end: Date
): Promise<SubstituteResolution> {
  const id = String(substituteUserId || "").trim();
  if (!id) {
    return { ok: true, user: null };
  }
  if (id === targetUserId) {
    return { ok: false, status: 400, body: { error: "Substitute cannot be the absent user" } };
  }

  const prisma = getPrisma();
  const substitute = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, nickname: true, isDeleted: true, status: true }
  });
  if (!substitute || substitute.isDeleted || substitute.status !== "active") {
    return { ok: false, status: 404, body: { error: "Substitute user not found or inactive" } };
  }

  const overlap = await prisma.leaveRecord.findFirst({
    where: {
      userId: id,
      status: { in: ["pending", "approved"] },
      startDate: { lte: end },
      endDate: { gte: start }
    },
    orderBy: { startDate: "asc" }
  });
  if (overlap) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "Substitute has overlapping leave in the selected period",
        existing: {
          id: overlap.id,
          status: overlap.status,
          leaveType: overlap.leaveType,
          startDate: toYmdUtc(overlap.startDate),
          endDate: toYmdUtc(overlap.endDate)
        }
      }
    };
  }

  return {
    ok: true,
    user: {
      id: substitute.id,
      username: substitute.username,
      nickname: substitute.nickname
    }
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type BalanceSnapshot = {
  paid: { allowancesByYear: Record<number, number>; usedByYear: Record<number, number>; totalAllowance: number; totalUsed: number; totalAvailable: number };
  leave: { allowancesByYear: Record<number, number>; usedByYear: Record<number, number>; totalAllowance: number; totalUsed: number; totalAvailable: number };
  study: { allowancesByYear: Record<number, number>; usedByYear: Record<number, number>; totalAllowance: number; totalUsed: number; totalAvailable: number };
  sick: { totalUsed: number };
  unpaid: { totalUsed: number };
};

async function buildBalances(userId: string): Promise<BalanceSnapshot> {
  const prisma = getPrisma();

  const [allowances, records] = await Promise.all([
    prisma.leaveAllowance.findMany({
      where: { userId, year: { gte: MIN_TRACK_YEAR } }
    }),
    prisma.leaveRecord.findMany({
      where: {
        userId,
        status: "approved",
        startDate: { gte: new Date(`${MIN_TRACK_YEAR}-01-01T00:00:00.000Z`) }
      }
    })
  ]);

  const allowanceByTypeYear = {
    paid: {} as Record<number, number>,
    study: {} as Record<number, number>
  };
  for (const row of allowances) {
    if (row.leaveType !== "paid" && row.leaveType !== "study") continue;
    allowanceByTypeYear[row.leaveType][row.year] = round2(Number(row.days || 0));
  }

  const usedByTypeYear = {
    paid: {} as Record<number, number>,
    study: {} as Record<number, number>
  };
  let sickUsed = 0;
  let unpaidUsed = 0;
  let recordsHolidaySet = new Set<string>();
  if (records.length) {
    let minStart = records[0].startDate;
    let maxEnd = records[0].endDate;
    for (const row of records) {
      if (row.startDate < minStart) minStart = row.startDate;
      if (row.endDate > maxEnd) maxEnd = row.endDate;
    }
    recordsHolidaySet = collectDayOffHolidaySet(minStart, maxEnd);
  }

  for (const row of records) {
    const days = round2(workingDaysInclusive(row.startDate, row.endDate, recordsHolidaySet));
    if (row.leaveType === "sick") {
      sickUsed += days;
      continue;
    }
    if (row.leaveType === "unpaid") {
      unpaidUsed += days;
      continue;
    }
    if (row.leaveType !== "paid" && row.leaveType !== "study") continue;

    const targetYear = ALLOWANCE_POOL_YEAR;
    if (!usedByTypeYear[row.leaveType][targetYear]) usedByTypeYear[row.leaveType][targetYear] = 0;
    usedByTypeYear[row.leaveType][targetYear] = round2(usedByTypeYear[row.leaveType][targetYear] + days);
  }

  function pack(type: "paid" | "study") {
    const allowancesByYear = allowanceByTypeYear[type];
    const usedByYear = usedByTypeYear[type];
    const years = new Set<number>([
      ...Object.keys(allowancesByYear).map((x) => Number(x)),
      ...Object.keys(usedByYear).map((x) => Number(x))
    ]);
    let totalAllowance = 0;
    let totalUsed = 0;
    for (const year of years) {
      totalAllowance += Number(allowancesByYear[year] || 0);
      totalUsed += Number(usedByYear[year] || 0);
    }
    return {
      allowancesByYear,
      usedByYear,
      totalAllowance: round2(totalAllowance),
      totalUsed: round2(totalUsed),
      totalAvailable: round2(totalAllowance - totalUsed)
    };
  }

  return {
    paid: pack("paid"),
    leave: pack("paid"),
    study: pack("study"),
    sick: { totalUsed: round2(sickUsed) },
    unpaid: { totalUsed: round2(unpaidUsed) }
  };
}

leaveRouter.get("/api/leave/users", requirePermission("leave.read_self"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasReadSelf(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.read_self" });
    return;
  }

  const prisma = getPrisma();
  const readAll = hasReadAll(permissions);
  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      status: "active",
      ...(readAll ? {} : { id: req.auth!.userId })
    },
    orderBy: [{ nickname: "asc" }, { username: "asc" }],
    select: { id: true, username: true, nickname: true, displayColor: true, role: true }
  });

  res.json(users.map((u) => ({
    id: u.id,
    username: u.username,
    nickname: (u.nickname || u.username || "").trim() || u.username,
    role: u.role,
    color: /^#[0-9a-fA-F]{6}$/.test(String(u.displayColor || "")) ? String(u.displayColor) : "#64748b"
  })));
});

leaveRouter.get("/api/leave/template", requirePermission("leave.read_self"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasReadSelf(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.read_self" });
    return;
  }
  const template = loadLeaveTemplate();
  const merged = resolveLeaveTemplateForUser(template, req.auth!.userId);
  res.json(merged || { backgroundDataUrl: "", fields: [], updatedAt: null });
});

leaveRouter.get("/api/leave/pending-summary", requirePermission("leave.manage"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasManage(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.manage" });
    return;
  }

  const prisma = getPrisma();
  const [count, oldest] = await Promise.all([
    prisma.leaveRecord.count({ where: { status: "pending" } }),
    prisma.leaveRecord.findFirst({
      where: { status: "pending" },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        userId: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        days: true
      }
    })
  ]);

  res.json({
    count,
    oldest: oldest ? {
      id: oldest.id,
      userId: oldest.userId,
      leaveType: oldest.leaveType,
      startDate: toYmdUtc(oldest.startDate),
      endDate: toYmdUtc(oldest.endDate),
      days: round2(Number(oldest.days || 0))
    } : null
  });
});

leaveRouter.get("/api/leave/matrix", requirePermission("leave.read_self"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasReadSelf(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.read_self" });
    return;
  }

  const now = new Date();
  const yearRaw = Number(req.query.year || now.getUTCFullYear());
  const monthRaw = Number(req.query.month || now.getUTCMonth() + 1);
  const requestedUserIdRaw = typeof req.query.userId === "string" && req.query.userId.trim() ? req.query.userId.trim() : "";
  const requestedUserId = hasReadAll(permissions) ? requestedUserIdRaw : req.auth!.userId;
  const requestedLeaveType = typeof req.query.leaveType === "string" ? req.query.leaveType.trim() : "";
  const requestedStatus = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const leaveTypeFilter = ["paid", "sick", "unpaid", "study"].includes(requestedLeaveType) ? (requestedLeaveType as LeaveType) : null;
  const statusFilter = ["pending", "approved", "rejected"].includes(requestedStatus) ? (requestedStatus as LeaveRecordStatus) : null;
  const year = Number.isFinite(yearRaw) ? Math.min(Math.max(Math.trunc(yearRaw), MIN_TRACK_YEAR), 2200) : now.getUTCFullYear();
  const month = Number.isFinite(monthRaw) ? Math.min(Math.max(Math.trunc(monthRaw), 1), 12) : now.getUTCMonth() + 1;

  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth(year, month), 23, 59, 59, 999));

  const prisma = getPrisma();
  const [users, records, compBalances, workdayRecords] = await Promise.all([
    prisma.user.findMany({
      where: {
        isDeleted: false,
        status: "active",
        ...(requestedUserId ? { id: requestedUserId } : {})
      },
      orderBy: [{ nickname: "asc" }, { username: "asc" }],
      select: { id: true, username: true, nickname: true, displayColor: true }
    }),
    prisma.leaveRecord.findMany({
      where: {
        ...(requestedUserId ? { userId: requestedUserId } : {}),
        ...(leaveTypeFilter ? { leaveType: leaveTypeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart }
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }]
    }),
    prisma.compensationBalance.findMany({
      where: requestedUserId ? { userId: requestedUserId } : undefined,
      select: { userId: true, minutes: true }
    }),
    prisma.leaveRecord.findMany({
      where: {
        ...(requestedUserId ? { userId: requestedUserId } : {}),
        status: { in: ["pending", "approved"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart }
      },
      select: {
        userId: true,
        startDate: true,
        endDate: true
      }
    })
  ]);

  const compByUser = new Map<string, number>();
  for (const row of compBalances) {
    compByUser.set(row.userId, Number(row.minutes || 0));
  }

  const monthHolidaySet = collectDayOffHolidaySet(monthStart, monthEnd);
  const monthWorkingDaysBase = round2(workingDaysInclusive(monthStart, monthEnd, monthHolidaySet));
  const summary: Record<string, Record<LeaveType, number>> = {};
  for (const row of records) {
    const overlap = overlapWorkingDaysInclusive(row.startDate, row.endDate, monthStart, monthEnd, monthHolidaySet);
    if (!overlap) continue;
    if (!summary[row.userId]) {
      summary[row.userId] = { paid: 0, sick: 0, unpaid: 0, study: 0 };
    }
    summary[row.userId][row.leaveType] = round2((summary[row.userId][row.leaveType] || 0) + overlap);
  }

  const absentWorkdaysByUser: Record<string, number> = {};
  for (const row of workdayRecords) {
    const overlap = overlapWorkingDaysInclusive(row.startDate, row.endDate, monthStart, monthEnd, monthHolidaySet);
    if (overlap <= 0) continue;
    absentWorkdaysByUser[row.userId] = round2(Number(absentWorkdaysByUser[row.userId] || 0) + overlap);
  }

  res.json({
    year,
    month,
    daysInMonth: daysInMonth(year, month),
    workingDaysInMonth: monthWorkingDaysBase,
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: (u.nickname || u.username || "").trim() || u.username,
      color: /^#[0-9a-fA-F]{6}$/.test(String(u.displayColor || "")) ? String(u.displayColor) : "#64748b",
      summary: {
        leave: Number((summary[u.id] && summary[u.id].paid) || 0),
        paid: Number((summary[u.id] && summary[u.id].paid) || 0),
        sick: Number((summary[u.id] && summary[u.id].sick) || 0),
        unpaid: Number((summary[u.id] && summary[u.id].unpaid) || 0),
        study: Number((summary[u.id] && summary[u.id].study) || 0)
      },
      workingDaysMonth: Math.max(0, round2(monthWorkingDaysBase - Number(absentWorkdaysByUser[u.id] || 0))),
      compMinutes: Number(compByUser.get(u.id) || 0)
    })),
    records: records.map((r) => ({
      id: r.id,
      userId: r.userId,
      leaveType: r.leaveType,
      status: r.status,
      startDate: toYmdUtc(r.startDate),
      endDate: toYmdUtc(r.endDate),
      days: round2(Number(r.days || 0)),
      sourceYear: r.sourceYear,
      substituteUserId: r.substituteUserId || null,
      note: r.note || ""
    }))
  });
});

leaveRouter.get("/api/leave/balances", requirePermission("leave.read_self"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  const requestedUserId = typeof req.query.userId === "string" && req.query.userId.trim() ? req.query.userId.trim() : req.auth!.userId;

  if (requestedUserId !== req.auth!.userId && !hasReadAll(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.read_all" });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: requestedUserId },
    select: { id: true, username: true, nickname: true, isDeleted: true }
  });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const balances = await buildBalances(user.id);

  const yearRaw = Number(req.query.year || new Date().getUTCFullYear());
  const year = Number.isFinite(yearRaw) ? Math.min(Math.max(Math.trunc(yearRaw), MIN_TRACK_YEAR), 2200) : new Date().getUTCFullYear();

  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const monthRows = await prisma.leaveRecord.findMany({
    where: {
      userId: user.id,
      leaveType: "sick",
      status: "approved",
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart }
    }
  });

  const sickByMonth: Record<number, number> = {};
  for (let i = 1; i <= 12; i += 1) sickByMonth[i] = 0;
  const yearHolidaySet = collectDayOffHolidaySet(yearStart, yearEnd);
  for (const row of monthRows) {
    for (let month = 1; month <= 12; month += 1) {
      const mStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const mEnd = new Date(Date.UTC(year, month - 1, daysInMonth(year, month), 23, 59, 59, 999));
      const overlap = overlapWorkingDaysInclusive(row.startDate, row.endDate, mStart, mEnd, yearHolidaySet);
      if (overlap > 0) sickByMonth[month] = round2(sickByMonth[month] + overlap);
    }
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username
    },
    startYear: MIN_TRACK_YEAR,
    year,
    balances,
    sickByMonth
  });
});

leaveRouter.get("/api/leave/records", requirePermission("leave.read_self"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  const requestedUserId = typeof req.query.userId === "string" && req.query.userId.trim() ? req.query.userId.trim() : req.auth!.userId;

  if (requestedUserId !== req.auth!.userId && !hasReadAll(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.read_all" });
    return;
  }

  const fromRaw = typeof req.query.from === "string" ? req.query.from.trim() : "";
  const toRaw = typeof req.query.to === "string" ? req.query.to.trim() : "";
  const requestedLeaveType = typeof req.query.leaveType === "string" ? req.query.leaveType.trim() : "";
  const requestedStatus = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const leaveTypeFilter = ["paid", "sick", "unpaid", "study"].includes(requestedLeaveType) ? (requestedLeaveType as LeaveType) : null;
  const statusFilter = ["pending", "approved", "rejected"].includes(requestedStatus) ? (requestedStatus as LeaveRecordStatus) : null;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? parseYmdAtNoonUtc(fromRaw) : new Date(`${MIN_TRACK_YEAR}-01-01T12:00:00.000Z`);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? parseYmdAtNoonUtc(toRaw) : new Date();

  const prisma = getPrisma();
  const rows = await prisma.leaveRecord.findMany({
    where: {
      userId: requestedUserId,
      ...(leaveTypeFilter ? { leaveType: leaveTypeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      startDate: { lte: to },
      endDate: { gte: from }
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }]
  });

  res.json(rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    leaveType: r.leaveType,
    status: r.status,
    startDate: toYmdUtc(r.startDate),
    endDate: toYmdUtc(r.endDate),
    days: round2(Number(r.days || 0)),
    sourceYear: r.sourceYear,
    substituteUserId: r.substituteUserId || null,
    note: r.note || "",
    createdAt: r.createdAt.toISOString()
  })));
});

leaveRouter.post("/api/leave/allowances", requirePermission("leave.manage"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasManage(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.manage" });
    return;
  }

  const parsed = allowanceSchema.safeParse(req.body);
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

  const existing = await prisma.leaveAllowance.findUnique({
    where: {
      userId_leaveType_year: {
        userId: parsed.data.userId,
        leaveType: parsed.data.leaveType,
        year: ALLOWANCE_POOL_YEAR
      }
    }
  });
  const currentDays = round2(Number((existing && existing.days) || 0));
  const stepDays = round2(Number(parsed.data.days || 0));
  if ((parsed.data.operation === "add" || parsed.data.operation === "remove") && stepDays <= 0) {
    res.status(400).json({ error: "days must be greater than 0 for add/remove" });
    return;
  }
  let nextDays = currentDays;
  if (parsed.data.operation === "add") nextDays = round2(currentDays + stepDays);
  if (parsed.data.operation === "remove") nextDays = round2(Math.max(0, currentDays - stepDays));
  if (parsed.data.operation === "reset") nextDays = 0;

  const row = await prisma.leaveAllowance.upsert({
    where: {
      userId_leaveType_year: {
        userId: parsed.data.userId,
        leaveType: parsed.data.leaveType,
        year: ALLOWANCE_POOL_YEAR
      }
    },
    create: {
      userId: parsed.data.userId,
      leaveType: parsed.data.leaveType,
      year: ALLOWANCE_POOL_YEAR,
      days: nextDays,
      createdById: req.auth!.userId
    },
    update: {
      days: nextDays,
      createdById: req.auth!.userId
    }
  });

  await writeAudit(req.auth!.userId, "leave.allowance.adjust", "leaveAllowance", row.id, {
    userId: row.userId,
    leaveType: row.leaveType,
    operation: parsed.data.operation,
    deltaDays: stepDays,
    previousDays: currentDays,
    nextDays
  });

  res.status(201).json({
    id: row.id,
    userId: row.userId,
    leaveType: row.leaveType,
    days: round2(Number(row.days || 0))
  });
});

leaveRouter.post("/api/leave/records", requirePermission("leave.read_self"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasReadSelf(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.read_self" });
    return;
  }

  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const manage = hasManage(permissions);
  if (!manage && parsed.data.userId !== req.auth!.userId) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.manage" });
    return;
  }
  if (!manage && parsed.data.status && parsed.data.status !== "pending") {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.manage" });
    return;
  }

  const start = parseYmdAtNoonUtc(parsed.data.startDate);
  const end = parseYmdAtNoonUtc(parsed.data.endDate);
  if (end < start) {
    res.status(400).json({ error: "End date must be after start date" });
    return;
  }
  if (start.getUTCFullYear() < MIN_TRACK_YEAR) {
    res.status(400).json({ error: `Leave tracking starts from ${MIN_TRACK_YEAR}` });
    return;
  }

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, isDeleted: true } });
  if (!target || target.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const overlapExisting = await prisma.leaveRecord.findFirst({
    where: {
      userId: parsed.data.userId,
      status: { in: ["pending", "approved"] },
      startDate: { lte: end },
      endDate: { gte: start }
    },
    orderBy: { startDate: "asc" }
  });
  if (overlapExisting) {
    res.status(409).json({
      error: "Overlapping leave already exists for this user in the selected period",
      existing: {
        id: overlapExisting.id,
        status: overlapExisting.status,
        leaveType: overlapExisting.leaveType,
        startDate: toYmdUtc(overlapExisting.startDate),
        endDate: toYmdUtc(overlapExisting.endDate)
      }
    });
    return;
  }

  const holidaySet = collectDayOffHolidaySet(start, end);
  const totalDays = round2(workingDaysInclusive(start, end, holidaySet));
  if (totalDays <= 0) {
    res.status(400).json({ error: "Selected period does not contain working days" });
    return;
  }
  const requestedStatusValue = parsed.data.status;
  const normalizedStatus: LeaveRecordStatus = requestedStatusValue && ["pending", "approved", "rejected"].includes(requestedStatusValue)
    ? (requestedStatusValue as LeaveRecordStatus)
    : "pending";
  let substituteUserId: string | null = null;
  if (normalizedStatus === "approved") {
    const substituteResult = await resolveSubstituteUser(parsed.data.substituteUserId, parsed.data.userId, start, end);
    if (!substituteResult.ok) {
      res.status(substituteResult.status).json(substituteResult.body);
      return;
    }
    substituteUserId = substituteResult.user ? substituteResult.user.id : null;
  }
  if (parsed.data.leaveType === "paid" || parsed.data.leaveType === "study") {
    const balances = await buildBalances(parsed.data.userId);
    const pool = parsed.data.leaveType === "paid" ? balances.leave : balances.study;
    if (round2(Number(pool.totalAvailable || 0)) < totalDays) {
      res.status(400).json({ error: "Insufficient leave allowance" });
      return;
    }
  }

  const created = await prisma.leaveRecord.create({
    data: {
      userId: parsed.data.userId,
      leaveType: parsed.data.leaveType,
      status: normalizedStatus,
      startDate: start,
      endDate: end,
      days: totalDays,
      sourceYear: null,
      note: (parsed.data.note || "").trim() || null,
      substituteUserId,
      createdById: req.auth!.userId
    }
  });

  await writeAudit(req.auth!.userId, "leave.record.create", "leaveRecord", created.id, {
    userId: created.userId,
    leaveType: created.leaveType,
    status: created.status,
    startDate: toYmdUtc(created.startDate),
    endDate: toYmdUtc(created.endDate),
    days: round2(Number(created.days || 0)),
    sourceYear: created.sourceYear,
    substituteUserId: created.substituteUserId || null,
    note: created.note || null
  });

  if (created.status === "pending") {
    const managerIds = await findUsersWithPermission("leave.manage");
    const targets = managerIds.filter((userId) => userId && userId !== req.auth!.userId);
    await createNotifications(targets.map((userId) => ({
      userId,
      type: "leave.pending",
      title: "Нова заявка за отсъствие",
      body: `${parsed.data.leaveType}: ${toYmdUtc(created.startDate)} - ${toYmdUtc(created.endDate)} (${totalDays}d)`,
      entityType: "leaveRecord",
      entityId: created.id,
      metaJson: {
        leaveType: created.leaveType,
        status: created.status,
        startDate: toYmdUtc(created.startDate),
        endDate: toYmdUtc(created.endDate),
        days: totalDays,
        userId: created.userId,
        actorUserId: req.auth!.userId
      }
    })));
  }

  res.status(201).json({
    id: created.id,
    userId: created.userId,
    leaveType: created.leaveType,
    status: created.status,
    startDate: toYmdUtc(created.startDate),
    endDate: toYmdUtc(created.endDate),
    days: round2(Number(created.days || 0)),
    sourceYear: created.sourceYear,
    substituteUserId: created.substituteUserId || null,
    note: created.note || ""
  });
});

leaveRouter.delete("/api/leave/records/:id", requirePermission("leave.manage"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasManage(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.manage" });
    return;
  }

  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid leave record id" });
    return;
  }

  const prisma = getPrisma();
  const row = await prisma.leaveRecord.findUnique({ where: { id } });
  if (!row) {
    res.status(404).json({ error: "Leave record not found" });
    return;
  }

  await prisma.leaveRecord.delete({ where: { id: row.id } });
  await writeAudit(req.auth!.userId, "leave.record.delete", "leaveRecord", row.id, {
    userId: row.userId,
    leaveType: row.leaveType,
    startDate: toYmdUtc(row.startDate),
    endDate: toYmdUtc(row.endDate),
    days: round2(Number(row.days || 0)),
    sourceYear: row.sourceYear
  });
  if (row.userId !== req.auth!.userId) {
    await createNotification({
      userId: row.userId,
      type: "leave.deleted",
      title: "Заявката за отсъствие е изтрита",
      body: `${row.leaveType}: ${toYmdUtc(row.startDate)} - ${toYmdUtc(row.endDate)}`,
      entityType: "leaveRecord",
      entityId: row.id,
      metaJson: {
        leaveType: row.leaveType,
        startDate: toYmdUtc(row.startDate),
        endDate: toYmdUtc(row.endDate),
        days: round2(Number(row.days || 0)),
        actorUserId: req.auth!.userId
      }
    });
  }

  res.json({ ok: true, id: row.id });
});

leaveRouter.post("/api/leave/records/:id/approve", requirePermission("leave.manage"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!hasManage(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "leave.manage" });
    return;
  }
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid leave record id" });
    return;
  }
  const prisma = getPrisma();
  const row = await prisma.leaveRecord.findUnique({ where: { id } });
  if (!row) {
    res.status(404).json({ error: "Leave record not found" });
    return;
  }
  if (row.status === "approved") {
    res.json({
      id: row.id,
      status: row.status,
      substituteUserId: row.substituteUserId || null
    });
    return;
  }
  const parsed = approveRecordSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid approval payload" });
    return;
  }
  const substituteResult = await resolveSubstituteUser(parsed.data.substituteUserId, row.userId, row.startDate, row.endDate);
  if (!substituteResult.ok) {
    res.status(substituteResult.status).json(substituteResult.body);
    return;
  }
  const overlapApproved = await prisma.leaveRecord.findFirst({
    where: {
      userId: row.userId,
      id: { not: row.id },
      status: "approved",
      startDate: { lte: row.endDate },
      endDate: { gte: row.startDate }
    },
    orderBy: { startDate: "asc" }
  });
  if (overlapApproved) {
    res.status(409).json({
      error: "Cannot approve due to overlap with existing approved leave",
      existing: {
        id: overlapApproved.id,
        status: overlapApproved.status,
        leaveType: overlapApproved.leaveType,
        startDate: toYmdUtc(overlapApproved.startDate),
        endDate: toYmdUtc(overlapApproved.endDate)
      }
    });
    return;
  }
  const holidaySet = collectDayOffHolidaySet(row.startDate, row.endDate);
  const rowWorkingDays = round2(workingDaysInclusive(row.startDate, row.endDate, holidaySet));
  if (rowWorkingDays <= 0) {
    res.status(400).json({ error: "Selected period does not contain working days" });
    return;
  }
  if (row.leaveType === "paid" || row.leaveType === "study") {
    const balances = await buildBalances(row.userId);
    const pool = row.leaveType === "paid" ? balances.leave : balances.study;
    if (round2(Number(pool.totalAvailable || 0)) < rowWorkingDays) {
      res.status(400).json({ error: "Insufficient leave allowance" });
      return;
    }
  }
  const updated = await prisma.leaveRecord.update({
    where: { id: row.id },
    data: { status: "approved", days: rowWorkingDays, substituteUserId: substituteResult.user ? substituteResult.user.id : null }
  });
  await writeAudit(req.auth!.userId, "leave.record.approve", "leaveRecord", updated.id, {
    userId: updated.userId,
    substituteUserId: updated.substituteUserId || null,
    leaveType: updated.leaveType,
    status: updated.status,
    startDate: toYmdUtc(updated.startDate),
    endDate: toYmdUtc(updated.endDate),
    days: round2(Number(updated.days || 0))
  });
  await createNotification({
    userId: updated.userId,
    type: "leave.approved",
    title: "Заявката за отсъствие е одобрена",
    body: `${updated.leaveType}: ${toYmdUtc(updated.startDate)} - ${toYmdUtc(updated.endDate)} (${round2(Number(updated.days || 0))}d)`,
    entityType: "leaveRecord",
    entityId: updated.id,
    metaJson: {
      leaveType: updated.leaveType,
      status: updated.status,
      startDate: toYmdUtc(updated.startDate),
      endDate: toYmdUtc(updated.endDate),
      days: round2(Number(updated.days || 0)),
      substituteUserId: updated.substituteUserId || null,
      actorUserId: req.auth!.userId
    }
  });
  if (substituteResult.user) {
    await createNotification({
      userId: substituteResult.user.id,
      type: "leave.substitution.assigned",
      title: "Leave substitution assigned",
      body: `You are substituting a teammate: ${toYmdUtc(updated.startDate)} - ${toYmdUtc(updated.endDate)}`,
      entityType: "leaveRecord",
      entityId: updated.id,
      metaJson: {
        leaveType: updated.leaveType,
        startDate: toYmdUtc(updated.startDate),
        endDate: toYmdUtc(updated.endDate),
        days: round2(Number(updated.days || 0)),
        absentUserId: updated.userId,
        substituteUserId: updated.substituteUserId || null,
        actorUserId: req.auth!.userId
      }
    });
  }
  res.json({
    id: updated.id,
    status: updated.status,
    substituteUserId: updated.substituteUserId || null
  });
});
