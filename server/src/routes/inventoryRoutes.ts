import crypto from "crypto";
import { InventoryMovementType, InventoryStockStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { getSecrets } from "../config/env";
import { getPrisma } from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { writeAudit } from "../services/auditService";
import { createNotifications, findUsersWithPermission } from "../services/notificationService";
import { hasPermission } from "../services/permissionService";
import { sha256 } from "../utils/crypto";

export const inventoryRouter = Router();
inventoryRouter.use("/api/inventory", requireAuth);

const optionalQuantity = z.number().finite().min(0).max(999_999_999).nullable().optional();
const itemBaseSchema = z.object({
  sku: z.string().trim().min(1).max(191),
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(191).optional(),
  unit: z.string().trim().min(1).max(32).default("pcs"),
  lowStockThreshold: optionalQuantity,
  criticalStockThreshold: optionalQuantity,
  restockTarget: optionalQuantity,
  notificationsEnabled: z.boolean().optional(),
  active: z.boolean().optional(),
  initialLocationId: z.string().trim().min(1).max(191).optional(),
  initialQuantity: z.number().finite().min(0).max(999_999_999).optional()
});
const itemSchema = itemBaseSchema.superRefine((value, ctx) => {
  if (value.criticalStockThreshold != null && value.lowStockThreshold != null && value.criticalStockThreshold > value.lowStockThreshold) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["criticalStockThreshold"], message: "Critical threshold cannot exceed low threshold" });
  }
  if ((value.initialQuantity || 0) > 0 && !value.initialLocationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["initialLocationId"], message: "Initial location is required" });
  }
});
const itemUpdateSchema = itemBaseSchema.omit({ initialLocationId: true, initialQuantity: true }).partial()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })
  .refine((value) => value.criticalStockThreshold == null || value.lowStockThreshold == null || value.criticalStockThreshold <= value.lowStockThreshold, {
    path: ["criticalStockThreshold"],
    message: "Critical threshold cannot exceed low threshold"
  });
const locationSchema = z.object({
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(512).optional(),
  active: z.boolean().optional()
});
const locationUpdateSchema = locationSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required"
});
const movementSchema = z.object({
  itemId: z.string().trim().min(1).max(191),
  type: z.enum(["receive", "issue", "transfer", "adjustment"]),
  quantity: z.number().finite().min(0).max(999_999_999),
  sourceLocationId: z.string().trim().min(1).max(191).optional(),
  destinationLocationId: z.string().trim().min(1).max(191).optional(),
  direction: z.enum(["in", "out"]).optional(),
  adjustmentMode: z.enum(["delta", "absolute"]).optional(),
  locationId: z.string().trim().min(1).max(191).optional(),
  reason: z.string().trim().max(512).optional(),
  note: z.string().trim().max(1000).optional()
}).superRefine((value, ctx) => {
  const absoluteAdjustment = value.type === "adjustment" && value.adjustmentMode === "absolute";
  if (!absoluteAdjustment && value.quantity <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity must be greater than zero" });
  }
  if (value.type === "receive" && !value.destinationLocationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destinationLocationId"], message: "Destination is required" });
  }
  if (value.type === "issue" && !value.sourceLocationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceLocationId"], message: "Source is required" });
  }
  if (value.type === "transfer" && (!value.sourceLocationId || !value.destinationLocationId || value.sourceLocationId === value.destinationLocationId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destinationLocationId"], message: "Different source and destination are required" });
  }
  if (value.type === "adjustment" && (!value.reason || value.reason.length < 3)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "Adjustment reason is required" });
  }
  if (absoluteAdjustment && !value.locationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["locationId"], message: "Location is required" });
  }
  if (value.type === "adjustment" && !absoluteAdjustment && !value.direction) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["direction"], message: "Adjustment direction is required" });
  }
  if (value.type === "adjustment" && !absoluteAdjustment && value.direction === "in" && !value.destinationLocationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destinationLocationId"], message: "Destination is required" });
  }
  if (value.type === "adjustment" && !absoluteAdjustment && value.direction === "out" && !value.sourceLocationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceLocationId"], message: "Source is required" });
  }
});
const settingsSchema = z.object({
  notificationsEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  notifyManagers: z.boolean(),
  notifyOnRestored: z.boolean(),
  repeatHours: z.number().int().min(0).max(8760),
  recipientUserIds: z.array(z.string().trim().min(1).max(191)).max(500)
});
const scanSchema = z.object({
  itemId: z.string().trim().min(1).max(191),
  token: z.string().trim().min(16).max(512)
});
const reverseSchema = z.object({ reason: z.string().trim().min(3).max(512) });

function apiError(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  const result = Number(value == null ? 0 : value);
  return Number.isFinite(result) ? result : 0;
}

function normalizeNullableNumber(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

function generateQrSeed(): string {
  return `v2${crypto.randomBytes(31).toString("hex")}`;
}

function stableQrToken(itemId: string, seed: string): string {
  return crypto.createHmac("sha256", getSecrets().jwtSecret).update(`inventory:${itemId}:${seed}`).digest("base64url");
}

function inventoryPayload(itemId: string, token: string): string {
  return `procal://inventory/${encodeURIComponent(itemId)}?token=${encodeURIComponent(token)}`;
}

async function qrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#071017", light: "#ffffff" }
  });
}

function tokenMatches(itemId: string, token: string, storedValue: string): boolean {
  const expectedToken = storedValue.startsWith("v2") ? stableQrToken(itemId, storedValue) : "";
  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedToken || (sha256(token) === storedValue ? token : ""));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function abilities(permissions: string[]) {
  const set = new Set(permissions || []);
  const can = (permission: string) => hasPermission(set, permission) || hasPermission(set, "*");
  return {
    read: can("inventory.read"),
    receive: can("inventory.receive"),
    issue: can("inventory.issue"),
    transfer: can("inventory.transfer"),
    count: can("inventory.count"),
    manageItems: can("inventory.items.manage"),
    manageSettings: can("inventory.settings.manage"),
    reports: can("inventory.reports")
  };
}

async function ensureDefaultLocation() {
  const prisma = getPrisma();
  const existing = await prisma.inventoryLocation.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.inventoryLocation.create({ data: { name: "Основен склад", description: "Главна складова локация" } });
}

async function loadSettings() {
  const prisma = getPrisma();
  return prisma.inventorySettings.upsert({
    where: { id: 1 },
    create: { id: 1, recipientUserIds: [] },
    update: {}
  });
}

function recipientIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
}

function stockKey(itemId: string, locationId: string): string {
  return `${itemId}::${locationId}`;
}

async function buildBalanceMap(itemIds?: string[]): Promise<Map<string, number>> {
  const prisma = getPrisma();
  const movements = await prisma.inventoryMovement.findMany({
    where: itemIds && itemIds.length ? { itemId: { in: itemIds } } : undefined,
    select: { itemId: true, quantity: true, sourceLocationId: true, destinationLocationId: true }
  });
  const balances = new Map<string, number>();
  const add = (itemId: string, locationId: string | null, delta: number) => {
    if (!locationId) return;
    const key = stockKey(itemId, locationId);
    balances.set(key, (balances.get(key) || 0) + delta);
  };
  movements.forEach((movement) => {
    const quantity = decimalNumber(movement.quantity);
    add(movement.itemId, movement.sourceLocationId, -quantity);
    add(movement.itemId, movement.destinationLocationId, quantity);
  });
  return balances;
}

async function balanceForTransaction(tx: Prisma.TransactionClient, itemId: string, locationId: string): Promise<number> {
  const [incoming, outgoing] = await Promise.all([
    tx.inventoryMovement.aggregate({ where: { itemId, destinationLocationId: locationId }, _sum: { quantity: true } }),
    tx.inventoryMovement.aggregate({ where: { itemId, sourceLocationId: locationId }, _sum: { quantity: true } })
  ]);
  return decimalNumber(incoming._sum.quantity) - decimalNumber(outgoing._sum.quantity);
}

function effectiveThreshold(item: {
  lowStockThreshold: Prisma.Decimal | null;
  criticalStockThreshold: Prisma.Decimal | null;
  restockTarget: Prisma.Decimal | null;
  locationSettings: Array<{
    locationId: string;
    lowStockThreshold: Prisma.Decimal | null;
    criticalStockThreshold: Prisma.Decimal | null;
    restockTarget: Prisma.Decimal | null;
  }>;
}, locationId: string) {
  const override = item.locationSettings.find((row) => row.locationId === locationId);
  return {
    low: override?.lowStockThreshold != null ? decimalNumber(override.lowStockThreshold) : (item.lowStockThreshold != null ? decimalNumber(item.lowStockThreshold) : null),
    critical: override?.criticalStockThreshold != null ? decimalNumber(override.criticalStockThreshold) : (item.criticalStockThreshold != null ? decimalNumber(item.criticalStockThreshold) : null),
    restock: override?.restockTarget != null ? decimalNumber(override.restockTarget) : (item.restockTarget != null ? decimalNumber(item.restockTarget) : null)
  };
}

function stockStatus(balance: number, thresholds: { low: number | null; critical: number | null }): InventoryStockStatus {
  if (thresholds.critical != null && balance <= thresholds.critical) return "critical";
  if (thresholds.low != null && balance <= thresholds.low) return "low";
  return "normal";
}

async function evaluateStockAlert(itemId: string, locationId: string): Promise<void> {
  const prisma = getPrisma();
  const [item, location, settings, balances, previous] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: itemId }, include: { locationSettings: true } }),
    prisma.inventoryLocation.findUnique({ where: { id: locationId } }),
    loadSettings(),
    buildBalanceMap([itemId]),
    prisma.inventoryStockAlertState.findUnique({ where: { itemId_locationId: { itemId, locationId } } })
  ]);
  if (!item || !location) return;

  const balance = balances.get(stockKey(itemId, locationId)) || 0;
  const thresholds = effectiveThreshold(item, locationId);
  const nextStatus = stockStatus(balance, thresholds);
  const now = new Date();
  const repeatMs = Math.max(0, settings.repeatHours) * 3600_000;
  const repeatedAlertDue = nextStatus !== "normal" && repeatMs > 0 && previous?.lastNotifiedAt
    ? now.getTime() - previous.lastNotifiedAt.getTime() >= repeatMs
    : false;
  const changed = !previous || previous.status !== nextStatus;
  const shouldNotifyStatus = nextStatus === "normal" ? Boolean(previous && previous.status !== "normal" && settings.notifyOnRestored) : (changed || repeatedAlertDue);
  const canNotify = settings.notificationsEnabled && item.notificationsEnabled && (settings.inAppEnabled || settings.pushEnabled);
  const notify = shouldNotifyStatus && canNotify;

  await prisma.inventoryStockAlertState.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    create: { itemId, locationId, status: nextStatus, lastNotifiedAt: notify ? now : null },
    update: { status: nextStatus, ...(notify ? { lastNotifiedAt: now } : {}) }
  });
  if (!notify) return;

  const targets = new Set(recipientIds(settings.recipientUserIds));
  if (settings.notifyManagers) {
    const managers = await findUsersWithPermission("inventory.settings.manage");
    managers.forEach((userId) => targets.add(userId));
  }
  if (!targets.size) return;

  const title = nextStatus === "normal"
    ? `Възстановена наличност: ${item.name}`
    : nextStatus === "critical"
      ? `Критична наличност: ${item.name}`
      : `Ниска наличност: ${item.name}`;
  const threshold = nextStatus === "critical" ? thresholds.critical : thresholds.low;
  const body = nextStatus === "normal"
    ? `${location.name}: ${balance} ${item.unit}`
    : `${location.name}: ${balance} ${item.unit}${threshold != null ? ` (праг ${threshold})` : ""}`;
  await createNotifications(Array.from(targets).map((userId) => ({
    userId,
    type: nextStatus === "normal" ? "inventory.stock_restored" : `inventory.${nextStatus}_stock`,
    title,
    body,
    entityType: "inventory_item",
    entityId: item.id,
    metaJson: { itemId: item.id, locationId: location.id, balance, status: nextStatus },
    persist: settings.inAppEnabled,
    sendPush: settings.pushEnabled
  })));
}

const itemInclude = {
  locationSettings: true,
  createdBy: { select: { id: true, username: true, nickname: true } }
} as const;

function serializeItem(item: Prisma.InventoryItemGetPayload<{ include: typeof itemInclude }>, locations: Array<{ id: string; name: string; active: boolean }>, balances: Map<string, number>) {
  const stockByLocation = locations.map((location) => {
    const balance = balances.get(stockKey(item.id, location.id)) || 0;
    const thresholds = effectiveThreshold(item, location.id);
    const tracked = balance !== 0 || item.locationSettings.some((row) => row.locationId === location.id);
    return { locationId: location.id, locationName: location.name, locationActive: location.active, tracked, balance, ...thresholds, status: stockStatus(balance, thresholds) };
  });
  return {
    ...item,
    lowStockThreshold: item.lowStockThreshold == null ? null : decimalNumber(item.lowStockThreshold),
    criticalStockThreshold: item.criticalStockThreshold == null ? null : decimalNumber(item.criticalStockThreshold),
    restockTarget: item.restockTarget == null ? null : decimalNumber(item.restockTarget),
    locationSettings: item.locationSettings.map((row) => ({
      ...row,
      lowStockThreshold: row.lowStockThreshold == null ? null : decimalNumber(row.lowStockThreshold),
      criticalStockThreshold: row.criticalStockThreshold == null ? null : decimalNumber(row.criticalStockThreshold),
      restockTarget: row.restockTarget == null ? null : decimalNumber(row.restockTarget)
    })),
    stockByLocation,
    totalBalance: stockByLocation.reduce((sum, row) => sum + row.balance, 0),
    qrTokenHash: undefined
  };
}

function serializeMovement<T extends { quantity: Prisma.Decimal }>(movement: T) {
  return { ...movement, quantity: decimalNumber(movement.quantity) };
}

inventoryRouter.get("/api/inventory/bootstrap", requirePermission("inventory.read"), async (req, res) => {
  const prisma = getPrisma();
  await ensureDefaultLocation();
  const [locations, items, settings, users] = await Promise.all([
    prisma.inventoryLocation.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.inventoryItem.findMany({ include: itemInclude, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    loadSettings(),
    prisma.user.findMany({ where: { isDeleted: false, status: "active" }, orderBy: [{ nickname: "asc" }, { username: "asc" }], select: { id: true, username: true, nickname: true, role: true } })
  ]);
  const balances = await buildBalanceMap(items.map((item) => item.id));
  const access = abilities(req.auth!.permissions || []);
  res.json({
    abilities: access,
    locations,
    items: items.map((item) => serializeItem(item, locations, balances)),
    settings: access.manageSettings ? { ...settings, recipientUserIds: recipientIds(settings.recipientUserIds) } : null,
    users: access.manageSettings ? users : []
  });
});

inventoryRouter.post("/api/inventory/items", requirePermission("inventory.items.manage"), async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const prisma = getPrisma();
  const qrSeed = generateQrSeed();
  try {
    const item = await prisma.$transaction(async (tx) => {
      if (parsed.data.initialLocationId) {
        const location = await tx.inventoryLocation.findFirst({ where: { id: parsed.data.initialLocationId, active: true } });
        if (!location) throw apiError(404, "Location not found");
      }
      const created = await tx.inventoryItem.create({
        data: {
          sku: parsed.data.sku,
          name: parsed.data.name,
          description: parsed.data.description || null,
          category: parsed.data.category || null,
          unit: parsed.data.unit,
          lowStockThreshold: normalizeNullableNumber(parsed.data.lowStockThreshold),
          criticalStockThreshold: normalizeNullableNumber(parsed.data.criticalStockThreshold),
          restockTarget: normalizeNullableNumber(parsed.data.restockTarget),
          notificationsEnabled: parsed.data.notificationsEnabled ?? true,
          active: parsed.data.active ?? true,
          qrTokenHash: qrSeed,
          createdById: req.auth!.userId
        },
        include: itemInclude
      });
      if (parsed.data.initialLocationId) {
        await tx.inventoryItemLocation.upsert({
          where: { itemId_locationId: { itemId: created.id, locationId: parsed.data.initialLocationId } },
          create: { itemId: created.id, locationId: parsed.data.initialLocationId },
          update: {}
        });
      }
      if ((parsed.data.initialQuantity || 0) > 0 && parsed.data.initialLocationId) {
        await tx.inventoryMovement.create({
          data: {
            itemId: created.id,
            type: "receive",
            quantity: parsed.data.initialQuantity!,
            destinationLocationId: parsed.data.initialLocationId,
            reason: "Initial stock",
            createdById: req.auth!.userId
          }
        });
      }
      return (await tx.inventoryItem.findUnique({ where: { id: created.id }, include: itemInclude }))!;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await writeAudit(req.auth!.userId, "inventory.item.create", "inventoryItem", item.id, { sku: item.sku, name: item.name });
    if (parsed.data.initialLocationId) await evaluateStockAlert(item.id, parsed.data.initialLocationId);
    const payload = inventoryPayload(item.id, stableQrToken(item.id, qrSeed));
    const locations = await prisma.inventoryLocation.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
    const balances = await buildBalanceMap([item.id]);
    res.status(201).json({ item: serializeItem(item, locations, balances), qrPayload: payload, qrDataUrl: await qrDataUrl(payload) });
  } catch (error) {
    const status = (error as { statusCode?: number; code?: string }).statusCode || ((error as { code?: string }).code === "P2002" ? 409 : 500);
    res.status(status).json({ error: error instanceof Error ? error.message : "Item creation failed" });
  }
});

inventoryRouter.patch("/api/inventory/items/:id", requirePermission("inventory.items.manage"), async (req, res) => {
  const parsed = itemUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const id = String(req.params.id || "").trim();
  const data = parsed.data;
  try {
    const current = await getPrisma().inventoryItem.findUnique({ where: { id }, select: { lowStockThreshold: true, criticalStockThreshold: true } });
    if (!current) { res.status(404).json({ error: "Item not found" }); return; }
    const nextLow = data.lowStockThreshold !== undefined ? data.lowStockThreshold : (current.lowStockThreshold == null ? null : decimalNumber(current.lowStockThreshold));
    const nextCritical = data.criticalStockThreshold !== undefined ? data.criticalStockThreshold : (current.criticalStockThreshold == null ? null : decimalNumber(current.criticalStockThreshold));
    if (nextLow != null && nextCritical != null && nextCritical > nextLow) {
      res.status(400).json({ error: "Critical threshold cannot exceed low threshold" });
      return;
    }
    const item = await getPrisma().inventoryItem.update({
      where: { id },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.category !== undefined ? { category: data.category || null } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: normalizeNullableNumber(data.lowStockThreshold) } : {}),
        ...(data.criticalStockThreshold !== undefined ? { criticalStockThreshold: normalizeNullableNumber(data.criticalStockThreshold) } : {}),
        ...(data.restockTarget !== undefined ? { restockTarget: normalizeNullableNumber(data.restockTarget) } : {}),
        ...(data.notificationsEnabled !== undefined ? { notificationsEnabled: data.notificationsEnabled } : {}),
        ...(data.active !== undefined ? { active: data.active } : {})
      },
      include: itemInclude
    });
    await writeAudit(req.auth!.userId, "inventory.item.update", "inventoryItem", item.id, data);
    const touchedLocations = await getPrisma().inventoryMovement.findMany({
      where: { itemId: item.id },
      select: { sourceLocationId: true, destinationLocationId: true }
    });
    const relevantLocationIds = Array.from(new Set(touchedLocations.flatMap((movement) => [movement.sourceLocationId, movement.destinationLocationId]).filter(Boolean))) as string[];
    await Promise.all(relevantLocationIds.map((locationId) => evaluateStockAlert(item.id, locationId)));
    const balances = await buildBalanceMap([item.id]);
    const allLocations = await getPrisma().inventoryLocation.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
    res.json({ ok: true, item: serializeItem(item, allLocations, balances) });
  } catch (error) {
    const code = (error as { code?: string }).code;
    res.status(code === "P2025" ? 404 : code === "P2002" ? 409 : 500).json({ error: error instanceof Error ? error.message : "Item update failed" });
  }
});

inventoryRouter.post("/api/inventory/items/:id/rotate-qr", requirePermission("inventory.items.manage"), async (req, res) => {
  const id = String(req.params.id || "").trim();
  const qrSeed = generateQrSeed();
  try {
    const item = await getPrisma().inventoryItem.update({ where: { id }, data: { qrTokenHash: qrSeed }, select: { id: true, name: true, sku: true } });
    const payload = inventoryPayload(item.id, stableQrToken(item.id, qrSeed));
    await writeAudit(req.auth!.userId, "inventory.item.qr.rotate", "inventoryItem", item.id);
    res.json({ item, qrPayload: payload, qrDataUrl: await qrDataUrl(payload) });
  } catch (error) {
    res.status((error as { code?: string }).code === "P2025" ? 404 : 500).json({ error: "Item not found" });
  }
});

inventoryRouter.get("/api/inventory/items/:id/qr", requirePermission("inventory.items.manage"), async (req, res) => {
  const id = String(req.params.id || "").trim();
  const item = await getPrisma().inventoryItem.findUnique({ where: { id }, select: { id: true, name: true, sku: true, qrTokenHash: true } });
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  if (!item.qrTokenHash.startsWith("v2")) {
    res.status(409).json({ error: "This legacy QR cannot be displayed again. Create a new reusable code once." });
    return;
  }
  const payload = inventoryPayload(item.id, stableQrToken(item.id, item.qrTokenHash));
  res.json({ item: { id: item.id, name: item.name, sku: item.sku }, qrPayload: payload, qrDataUrl: await qrDataUrl(payload) });
});

inventoryRouter.post("/api/inventory/scan", requirePermission("inventory.read"), async (req, res) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const prisma = getPrisma();
  const item = await prisma.inventoryItem.findFirst({ where: { id: parsed.data.itemId, active: true }, include: itemInclude });
  if (!item || !tokenMatches(item.id, parsed.data.token, item.qrTokenHash)) { res.status(404).json({ error: "Inventory item not found" }); return; }
  const locations = await prisma.inventoryLocation.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const balances = await buildBalanceMap([item.id]);
  res.json({ item: serializeItem(item, locations, balances), abilities: abilities(req.auth!.permissions || []) });
});

inventoryRouter.post("/api/inventory/locations", requirePermission("inventory.items.manage"), async (req, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  try {
    const location = await getPrisma().inventoryLocation.create({ data: { ...parsed.data, description: parsed.data.description || null, createdById: req.auth!.userId } });
    await writeAudit(req.auth!.userId, "inventory.location.create", "inventoryLocation", location.id, { name: location.name });
    res.status(201).json({ location });
  } catch (error) {
    res.status((error as { code?: string }).code === "P2002" ? 409 : 500).json({ error: error instanceof Error ? error.message : "Location creation failed" });
  }
});

inventoryRouter.patch("/api/inventory/locations/:id", requirePermission("inventory.items.manage"), async (req, res) => {
  const parsed = locationUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  try {
    const location = await getPrisma().inventoryLocation.update({ where: { id: String(req.params.id || "") }, data: { ...parsed.data, ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}) } });
    await writeAudit(req.auth!.userId, "inventory.location.update", "inventoryLocation", location.id, parsed.data);
    res.json({ ok: true, location });
  } catch (error) {
    const code = (error as { code?: string }).code;
    res.status(code === "P2025" ? 404 : code === "P2002" ? 409 : 500).json({ error: error instanceof Error ? error.message : "Location update failed" });
  }
});

function requiredMovementPermission(type: InventoryMovementType): string {
  if (type === "receive") return "inventory.receive";
  if (type === "issue") return "inventory.issue";
  if (type === "transfer") return "inventory.transfer";
  return "inventory.count";
}

inventoryRouter.post("/api/inventory/movements", requirePermission("inventory.read"), async (req, res) => {
  const parsed = movementSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const permission = requiredMovementPermission(parsed.data.type);
  const permissionSet = new Set(req.auth!.permissions || []);
  if (!hasPermission(permissionSet, permission) && !hasPermission(permissionSet, "*")) {
    res.status(403).json({ error: "Forbidden", missingPermission: permission });
    return;
  }
  const prisma = getPrisma();
  try {
    const movement = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({ where: { id: parsed.data.itemId, active: true } });
      if (!item) throw apiError(404, "Item not found");
      const absoluteAdjustment = parsed.data.type === "adjustment" && parsed.data.adjustmentMode === "absolute";
      let sourceLocationId = parsed.data.type === "receive" || (parsed.data.type === "adjustment" && parsed.data.direction === "in") ? null : parsed.data.sourceLocationId || null;
      let destinationLocationId = parsed.data.type === "issue" || (parsed.data.type === "adjustment" && parsed.data.direction === "out") ? null : parsed.data.destinationLocationId || null;
      let movementQuantity = parsed.data.quantity;
      let movementNote = parsed.data.note || null;
      if (absoluteAdjustment) {
        const locationId = parsed.data.locationId!;
        const currentBalance = await balanceForTransaction(tx, item.id, locationId);
        const difference = parsed.data.quantity - currentBalance;
        if (Math.abs(difference) < 1e-9) throw apiError(409, `Stock is already ${currentBalance} ${item.unit}`);
        movementQuantity = Math.abs(difference);
        sourceLocationId = difference < 0 ? locationId : null;
        destinationLocationId = difference > 0 ? locationId : null;
        const revisionNote = `Absolute stock revision: ${currentBalance} -> ${parsed.data.quantity} ${item.unit}`;
        movementNote = [revisionNote, parsed.data.note].filter(Boolean).join(" | ").slice(0, 1000);
      }
      const locationIds = Array.from(new Set([sourceLocationId, destinationLocationId].filter(Boolean))) as string[];
      const locations = await tx.inventoryLocation.findMany({ where: { id: { in: locationIds }, active: true }, select: { id: true } });
      if (locations.length !== locationIds.length) throw apiError(404, "Location not found");
      if (sourceLocationId) {
        const balance = await balanceForTransaction(tx, item.id, sourceLocationId);
        if (balance + 1e-9 < movementQuantity) throw apiError(409, `Insufficient stock. Available: ${balance} ${item.unit}`);
      }
      await Promise.all(locationIds.map((locationId) => tx.inventoryItemLocation.upsert({
        where: { itemId_locationId: { itemId: item.id, locationId } },
        create: { itemId: item.id, locationId },
        update: {}
      })));
      return tx.inventoryMovement.create({
        data: {
          itemId: item.id,
          type: parsed.data.type,
          quantity: movementQuantity,
          sourceLocationId,
          destinationLocationId,
          reason: parsed.data.reason || null,
          note: movementNote,
          createdById: req.auth!.userId
        },
        include: {
          item: { select: { id: true, sku: true, name: true, unit: true } },
          sourceLocation: { select: { id: true, name: true } },
          destinationLocation: { select: { id: true, name: true } },
          createdBy: { select: { id: true, username: true, nickname: true } }
        }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await writeAudit(req.auth!.userId, "inventory.movement.create", "inventoryMovement", movement.id, { itemId: movement.itemId, type: movement.type, quantity: decimalNumber(movement.quantity), sourceLocationId: movement.sourceLocationId, destinationLocationId: movement.destinationLocationId, adjustmentMode: parsed.data.adjustmentMode || null });
    await Promise.all(Array.from(new Set([movement.sourceLocationId, movement.destinationLocationId].filter(Boolean))).map((locationId) => evaluateStockAlert(movement.itemId, String(locationId))));
    res.status(201).json({ movement: serializeMovement(movement) });
  } catch (error) {
    res.status((error as { statusCode?: number }).statusCode || 500).json({ error: error instanceof Error ? error.message : "Movement creation failed" });
  }
});

inventoryRouter.get("/api/inventory/movements", requirePermission("inventory.read"), async (req, res) => {
  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 500) : 100;
  const itemId = String(req.query.itemId || "").trim();
  const locationId = String(req.query.locationId || "").trim();
  const movements = await getPrisma().inventoryMovement.findMany({
    where: {
      ...(itemId ? { itemId } : {}),
      ...(locationId ? { OR: [{ sourceLocationId: locationId }, { destinationLocationId: locationId }] } : {})
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: {
      item: { select: { id: true, sku: true, name: true, unit: true } },
      sourceLocation: { select: { id: true, name: true } },
      destinationLocation: { select: { id: true, name: true } },
      createdBy: { select: { id: true, username: true, nickname: true } },
      reversedBy: { select: { id: true, createdAt: true } }
    }
  });
  res.json({ items: movements.map(serializeMovement) });
});

inventoryRouter.post("/api/inventory/movements/:id/reverse", requirePermission("inventory.count"), async (req, res) => {
  const parsed = reverseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const prisma = getPrisma();
  try {
    const reversal = await prisma.$transaction(async (tx) => {
      const target = await tx.inventoryMovement.findUnique({ where: { id: String(req.params.id || "") }, include: { item: true, reversedBy: { select: { id: true } } } });
      if (!target) throw apiError(404, "Movement not found");
      if (target.reversedBy.length) throw apiError(409, "Movement is already reversed");
      const sourceLocationId = target.destinationLocationId;
      const destinationLocationId = target.sourceLocationId;
      if (sourceLocationId) {
        const balance = await balanceForTransaction(tx, target.itemId, sourceLocationId);
        if (balance + 1e-9 < decimalNumber(target.quantity)) throw apiError(409, `Insufficient stock to reverse. Available: ${balance} ${target.item.unit}`);
      }
      const locationIds = Array.from(new Set([sourceLocationId, destinationLocationId].filter(Boolean))) as string[];
      await Promise.all(locationIds.map((locationId) => tx.inventoryItemLocation.upsert({
        where: { itemId_locationId: { itemId: target.itemId, locationId } },
        create: { itemId: target.itemId, locationId },
        update: {}
      })));
      return tx.inventoryMovement.create({
        data: {
          itemId: target.itemId,
          type: "adjustment",
          quantity: target.quantity,
          sourceLocationId,
          destinationLocationId,
          reason: parsed.data.reason,
          note: `Reversal of ${target.id}`,
          createdById: req.auth!.userId,
          reversesMovementId: target.id
        }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await writeAudit(req.auth!.userId, "inventory.movement.reverse", "inventoryMovement", reversal.id, { reversesMovementId: reversal.reversesMovementId, reason: parsed.data.reason });
    await Promise.all(Array.from(new Set([reversal.sourceLocationId, reversal.destinationLocationId].filter(Boolean))).map((locationId) => evaluateStockAlert(reversal.itemId, String(locationId))));
    res.status(201).json({ movement: serializeMovement(reversal) });
  } catch (error) {
    res.status((error as { statusCode?: number }).statusCode || 500).json({ error: error instanceof Error ? error.message : "Movement reversal failed" });
  }
});

inventoryRouter.get("/api/inventory/settings", requirePermission("inventory.settings.manage"), async (_req, res) => {
  const settings = await loadSettings();
  res.json({ ...settings, recipientUserIds: recipientIds(settings.recipientUserIds) });
});

inventoryRouter.put("/api/inventory/settings", requirePermission("inventory.settings.manage"), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const prisma = getPrisma();
  const validUsers = await prisma.user.findMany({ where: { id: { in: parsed.data.recipientUserIds }, isDeleted: false, status: "active" }, select: { id: true } });
  if (validUsers.length !== new Set(parsed.data.recipientUserIds).size) { res.status(400).json({ error: "One or more notification recipients are invalid" }); return; }
  const settings = await prisma.inventorySettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data, recipientUserIds: parsed.data.recipientUserIds },
    update: { ...parsed.data, recipientUserIds: parsed.data.recipientUserIds }
  });
  await writeAudit(req.auth!.userId, "inventory.settings.update", "inventorySettings", "1", parsed.data);
  res.json({ ok: true, settings: { ...settings, recipientUserIds: recipientIds(settings.recipientUserIds) } });
});
