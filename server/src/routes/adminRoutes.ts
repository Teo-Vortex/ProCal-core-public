import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { adminUserPatchSchema, createTokenSchema } from "../utils/schemas";
import { randomToken, sha256 } from "../utils/crypto";
import { writeAudit } from "../services/auditService";
import { upsertUserInSharedPersonnel } from "../services/personnelSyncService";
import { convertUserToFormerMember } from "../services/formerMemberService";
import { invalidateHostedRealmAccessStateCache } from "../middleware/hostedRealmReadOnly";
import {
  cancelHostedRealmInvitation,
  createHostedRealmInvitation,
  getHostedRealmPromoState,
  hostedKickRealmUser,
  listHostedRealmInvitations,
  hostedUpdateRealmUser,
  isHostedIdentityEnabled,
  mirrorHostedUserToLocal,
  redeemHostedRealmPromo,
  syncHostedRealmUsers
} from "../services/hostedIdentityService";
import { z } from "zod";
import {
  getEffectivePermissions,
  getRoleDisplayName,
  getRolePermissions,
  KNOWN_PERMISSIONS,
  listDefaultRoleNames,
  listDefaultRolePermissions,
  resetRolePermissions,
  setUserPermissionOverrides,
  upsertRoleDisplayName,
  upsertRolePermissions
} from "../services/permissionService";
import { loadLeaveTemplate, saveLeaveTemplate } from "../services/leaveTemplateService";
import { EasterHolidayConfig, HolidayRule, loadHolidayRules, saveHolidayRules } from "../services/holidayRulesService";

export const adminRouter = Router();

adminRouter.use("/api/admin", requireAuth, requireRealmFeature("admin_panel"));

const paramAsString = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const roleSchema = z.enum(["system_admin", "admin", "boss", "hr", "pr", "user", "role_a", "role_b", "role_c", "role_d"]);

function isFormerMemberPlaceholder(u: {
  username?: string | null;
  jobTitle?: string | null;
  status?: "pending" | "active" | "suspended" | string | null;
}): boolean {
  const username = String(u.username || "").trim().toLowerCase();
  const jobTitle = String(u.jobTitle || "").trim().toLowerCase();
  const status = String(u.status || "").trim().toLowerCase();
  return status === "suspended" && (username.startsWith("former-") || jobTitle === "former member");
}

const toUserDto = (u: {
  id: string;
  username: string;
  role: UserRole;
  status: "pending" | "active" | "suspended";
  viewMode: "simple" | "tasks";
  displayColor: string | null;
  calendarTintOpacity: number;
  nickname: string | null;
  fullName: string | null;
  workplace: string | null;
  jobTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  status: u.status,
  viewMode: u.viewMode,
  displayColor: u.displayColor,
  calendarTintOpacity: Number.isFinite(Number(u.calendarTintOpacity)) ? Number(u.calendarTintOpacity) : 10,
  nickname: u.nickname || u.username,
  fullName: (u.fullName || "").trim() || null,
  workplace: (u.workplace || "").trim() || null,
  jobTitle: (u.jobTitle || "").trim() || null,
  isFormerMember: isFormerMemberPlaceholder(u),
  createdAt: u.createdAt,
  updatedAt: u.updatedAt
});

async function hardDeleteUserCompletely(userId: string): Promise<void> {
  const prisma = getPrisma();
  const events = await prisma.event.findMany({ where: { createdById: userId }, select: { id: true } });
  const eventIds = events.map((e) => e.id);

  const ownedTasks = await prisma.task.findMany({ where: { ownerId: userId }, select: { id: true } });
  const ownedTaskIds = ownedTasks.map((t) => t.id);

  const ownedPublications = await prisma.mediaOwnedPublication.findMany({
    where: { createdById: userId },
    select: { id: true }
  });
  const ownedPublicationIds = ownedPublications.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    if (eventIds.length) {
      const eventTasks = await tx.task.findMany({ where: { eventId: { in: eventIds } }, select: { id: true } });
      const eventTaskIds = eventTasks.map((t) => t.id);
      const allTaskIds = Array.from(new Set([...ownedTaskIds, ...eventTaskIds]));

      if (allTaskIds.length) {
        await tx.taskMember.deleteMany({ where: { taskId: { in: allTaskIds } } });
      }

      await tx.note.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.task.deleteMany({ where: { id: { in: allTaskIds } } });
      await tx.event.deleteMany({ where: { id: { in: eventIds } } });
    }

    if (ownedTaskIds.length) {
      await tx.taskMember.deleteMany({ where: { taskId: { in: ownedTaskIds } } });
      await tx.task.deleteMany({ where: { id: { in: ownedTaskIds } } });
    }

    if (ownedPublicationIds.length) {
      await tx.mediaObservedMention.updateMany({
        where: { linkedOwnedId: { in: ownedPublicationIds } },
        data: { linkedOwnedId: null }
      });
      await tx.mediaOwnedPublication.deleteMany({ where: { id: { in: ownedPublicationIds } } });
    }

    await tx.taskMember.deleteMany({ where: { userId } });
    await tx.note.deleteMany({ where: { authorId: userId } });
    await tx.compensationEntry.deleteMany({ where: { userId } });
    await tx.compensationEntry.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.compensationBalance.deleteMany({ where: { userId } });
    await tx.leaveRecord.deleteMany({ where: { userId } });
    await tx.leaveRecord.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.leaveRecord.updateMany({ where: { substituteUserId: userId }, data: { substituteUserId: null } });
    await tx.leaveAllowance.deleteMany({ where: { userId } });
    await tx.leaveAllowance.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    const attendancePunches = await tx.attendancePunch.findMany({ where: { userId }, select: { id: true } });
    const attendancePunchIds = attendancePunches.map((item) => item.id);
    await tx.attendancePunch.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    if (attendancePunchIds.length) {
      await tx.attendancePunch.deleteMany({ where: { targetPunchId: { in: attendancePunchIds } } });
      await tx.attendancePunch.deleteMany({ where: { id: { in: attendancePunchIds } } });
    }
    await tx.attendanceStation.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.inventoryMovement.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.inventoryItem.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.inventoryLocation.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    const inventorySettings = await tx.inventorySettings.findUnique({ where: { id: 1 }, select: { recipientUserIds: true } });
    if (Array.isArray(inventorySettings?.recipientUserIds)) {
      const recipientUserIds = inventorySettings.recipientUserIds.map(String).filter((id) => id !== userId);
      if (recipientUserIds.length !== inventorySettings.recipientUserIds.length) {
        await tx.inventorySettings.update({ where: { id: 1 }, data: { recipientUserIds } });
      }
    }
    await tx.eventReminderDelivery.deleteMany({ where: { userId } });
    await tx.pushDevice.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.notificationPreference.deleteMany({ where: { userId } });
    await tx.bugReport.deleteMany({ where: { userId } });
    await tx.mediaObservedMention.deleteMany({ where: { createdById: userId } });
    await tx.chatMessage.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientUserId: userId }
        ]
      }
    });
    await tx.chatThreadRead.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.serviceToken.deleteMany({ where: { userId } });
    await tx.idempotencyRecord.deleteMany({ where: { userId } });
    await tx.legacyState.deleteMany({ where: { userId } });
    await tx.userPermissionOverride.deleteMany({ where: { userId } });
    await tx.auditLog.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } });

    await tx.user.delete({ where: { id: userId } });
  });
}

adminRouter.post("/api/admin/users", requirePermission("users.create"), async (req, res) => {
  res.status(410).json({
    error: "User creation is disabled. New users should register from /register and wait for admin approval."
  });
});

adminRouter.get("/api/admin/users", requirePermission("users.read"), async (_req, res) => {
  const prisma = getPrisma();
  if (isHostedIdentityEnabled()) {
    try {
      await syncHostedRealmUsers(prisma);
      const users = await prisma.user.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      });
      res.json(users.map(toUserDto));
      return;
    } catch (error) {
      res.status((error as { statusCode?: number }).statusCode || 500).json({
        error: error instanceof Error ? error.message : "Failed to sync hosted users"
      });
      return;
    }
  }

  const users = await prisma.user.findMany({ where: { isDeleted: false }, orderBy: { createdAt: "desc" } });
  res.json(users.map(toUserDto));
});

adminRouter.post("/api/admin/users/:id/approve", requirePermission("users.approve"), async (req, res) => {
  const userId = paramAsString(req.params.id);
  if (!userId) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const prisma = getPrisma();
  if (isHostedIdentityEnabled()) {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    try {
      const updatedHosted = await hostedUpdateRealmUser(target.username, {
        username: target.username,
        nickname: target.nickname,
        fullName: target.fullName,
        workplace: target.workplace,
        jobTitle: target.jobTitle,
        role: target.role,
        status: "active",
        viewMode: target.viewMode,
        displayColor: target.displayColor,
        calendarTintOpacity: Number(target.calendarTintOpacity ?? 10)
      });
      if (!updatedHosted.user) {
        throw new Error("Hosted identity did not return a user.");
      }

      const user = await mirrorHostedUserToLocal(prisma, updatedHosted.user, {
        existingUserId: target.id,
        lookupUsername: updatedHosted.previousLocalUsername || target.username
      });

      await writeAudit(req.auth!.userId, "user.approve", "user", user.id, { status: user.status, hosted: true });
      res.json({ ok: true, id: user.id, status: user.status });
      return;
    } catch (error) {
      res.status((error as { statusCode?: number }).statusCode || 500).json({
        error: error instanceof Error ? error.message : "Hosted user approve failed"
      });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "active" }
  });

  await writeAudit(req.auth!.userId, "user.approve", "user", user.id, { status: user.status });
  res.json({ ok: true, id: user.id, status: user.status });
});

adminRouter.patch("/api/admin/users/:id", requirePermission("users.update"), async (req, res) => {
  const userId = paramAsString(req.params.id);
  if (!userId) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = adminUserPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isSelf = target.id === req.auth!.userId;
    const nextRole = parsed.data.role ?? target.role;
    const nextStatus = parsed.data.status ?? target.status;

    if (isSelf && parsed.data.role && parsed.data.role !== target.role) {
      res.status(400).json({ error: "You cannot change your own role" });
      return;
    }
    if (isSelf && parsed.data.status && parsed.data.status !== "active") {
      res.status(400).json({ error: "You cannot deactivate your own account" });
      return;
    }

    if (target.role === "system_admin" && (nextRole !== "system_admin" || nextStatus !== "active")) {
      const activeSystemAdmins = await prisma.user.count({
        where: { role: "system_admin", status: "active", isDeleted: false }
      });
      if (activeSystemAdmins <= 1) {
        res.status(400).json({ error: "Cannot downgrade or deactivate the last active system_admin" });
        return;
      }
    }

    if (isHostedIdentityEnabled()) {
      const updatedHosted = await hostedUpdateRealmUser(target.username, {
        username: parsed.data.username ?? target.username,
        nickname: parsed.data.nickname !== undefined ? parsed.data.nickname : target.nickname,
        fullName: parsed.data.fullName !== undefined ? parsed.data.fullName : target.fullName,
        workplace: parsed.data.workplace !== undefined ? parsed.data.workplace : target.workplace,
        jobTitle: parsed.data.jobTitle !== undefined ? parsed.data.jobTitle : target.jobTitle,
        role: nextRole,
        status: nextStatus,
        viewMode: parsed.data.viewMode ?? target.viewMode,
        displayColor: parsed.data.displayColor !== undefined ? parsed.data.displayColor : target.displayColor,
        calendarTintOpacity: parsed.data.calendarTintOpacity ?? Number(target.calendarTintOpacity ?? 10)
      });
      if (!updatedHosted.user) {
        throw new Error("Hosted identity did not return a user.");
      }

      const updated = await mirrorHostedUserToLocal(prisma, updatedHosted.user, {
        existingUserId: target.id,
        lookupUsername: updatedHosted.previousLocalUsername || target.username
      });

      await writeAudit(req.auth!.userId, "user.update", "user", updated.id, {
        username: updated.username,
        nickname: updated.nickname || updated.username,
        role: updated.role,
        status: updated.status,
        viewMode: updated.viewMode,
        displayColor: updated.displayColor,
        calendarTintOpacity: Number(updated.calendarTintOpacity ?? 10),
        fullName: updated.fullName || null,
        workplace: updated.workplace || null,
        jobTitle: updated.jobTitle || null,
        hosted: true
      });

      res.json({ ok: true, ...toUserDto(updated) });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        username: parsed.data.username,
        role: parsed.data.role,
        status: parsed.data.status,
        viewMode: parsed.data.viewMode,
        displayColor: parsed.data.displayColor,
        calendarTintOpacity: parsed.data.calendarTintOpacity,
        nickname: parsed.data.nickname,
        fullName: parsed.data.fullName,
        workplace: parsed.data.workplace,
        jobTitle: parsed.data.jobTitle
      }
    });

    await upsertUserInSharedPersonnel(prisma, updated);

    await writeAudit(req.auth!.userId, "user.update", "user", updated.id, {
      username: updated.username,
      nickname: updated.nickname || updated.username,
      role: updated.role,
      status: updated.status,
      viewMode: updated.viewMode,
      displayColor: updated.displayColor,
      calendarTintOpacity: Number(updated.calendarTintOpacity ?? 10),
      fullName: updated.fullName || null,
      workplace: updated.workplace || null,
      jobTitle: updated.jobTitle || null
    });

    res.json({ ok: true, ...toUserDto(updated) });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    throw error;
  }
});

adminRouter.patch("/api/admin/users/:id/password", requirePermission("users.update"), async (req, res) => {
  res.status(410).json({
    error: "Admin password reset is disabled in this build."
  });
});

adminRouter.delete("/api/admin/users/:id/hard", requirePermission("users.delete"), async (req, res) => {
  const userId = paramAsString(req.params.id);
  if (!userId) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.id === req.auth!.userId) {
    res.status(400).json({ error: "You cannot hard-delete your own account" });
    return;
  }

  if (target.role === "system_admin") {
    const sysAdmins = await prisma.user.count({ where: { role: "system_admin", isDeleted: false } });
    if (sysAdmins <= 1) {
      res.status(400).json({ error: "Cannot delete the last system_admin" });
      return;
    }
  }

  if (isHostedIdentityEnabled()) {
    if (isFormerMemberPlaceholder(target)) {
      res.status(400).json({
        error: "Former members are preserved for realm history and cannot be removed."
      });
      return;
    }

    try {
      await hostedKickRealmUser(target.username);
      const preserved = await convertUserToFormerMember(prisma, target.id);
      await writeAudit(req.auth!.userId, "user.kick", "user", target.id, {
        username: target.username,
        hosted: true,
        preservedHistory: true,
        replacementUsername: preserved.username
      });
      res.json({ ok: true, id: target.id, kicked: true, preservedHistory: true });
      return;
    } catch (error) {
      res.status((error as { statusCode?: number }).statusCode || 500).json({
        error: error instanceof Error ? error.message : "Hosted user kick failed"
      });
      return;
    }
  }

  await hardDeleteUserCompletely(target.id);
  await writeAudit(req.auth!.userId, "user.hard_delete", "user", target.id, { username: target.username });
  res.json({ ok: true, id: target.id });
});

adminRouter.get("/api/admin/users/:id/permissions", requireRealmFeature("admin_roles"), requirePermission("permissions.manage"), async (req, res) => {
  const userId = paramAsString(req.params.id);
  if (!userId) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const overrides = await prisma.userPermissionOverride.findMany({ where: { userId: user.id }, orderBy: { permission: "asc" } });
  const rolePermissions = await getRolePermissions(user.role);
  const effective = Array.from(await getEffectivePermissions(user.id, user.role)).sort();

  res.json({
    user: { id: user.id, username: user.username, nickname: user.nickname || user.username, role: user.role },
    knownPermissions: KNOWN_PERMISSIONS,
    rolePermissions,
    overrides,
    effective
  });
});

adminRouter.patch("/api/admin/users/:id/permissions", requireRealmFeature("admin_roles"), requirePermission("permissions.manage"), async (req, res) => {
  const userId = paramAsString(req.params.id);
  if (!userId) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const schema = z.object({
    allow: z.array(z.string().min(1)).optional(),
    deny: z.array(z.string().min(1)).optional(),
    clear: z.array(z.string().min(1)).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await setUserPermissionOverrides(user.id, parsed.data);
  const effective = Array.from(await getEffectivePermissions(user.id, user.role)).sort();
  await writeAudit(req.auth!.userId, "user.permissions.update", "user", user.id, parsed.data);

  res.json({ ok: true, userId: user.id, effective });
});

adminRouter.post("/api/admin/users/:id/permissions/reset", requireRealmFeature("admin_roles"), requirePermission("permissions.manage"), async (req, res) => {
  const userId = paramAsString(req.params.id);
  if (!userId) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.userPermissionOverride.deleteMany({ where: { userId } });
  const effective = Array.from(await getEffectivePermissions(user.id, user.role)).sort();
  await writeAudit(req.auth!.userId, "user.permissions.reset", "user", user.id);
  res.json({ ok: true, userId, effective });
});

adminRouter.get("/api/admin/roles", requireRealmFeature("admin_roles"), requirePermission("roles.read"), async (_req, res) => {
  const defaults = listDefaultRolePermissions();
  const defaultNames = listDefaultRoleNames();
  const roles = Object.keys(defaults) as UserRole[];
  const out = [] as Array<{ role: UserRole; displayName: string; defaults: string[]; current: string[] }>;

  for (const role of roles) {
    const current = await getRolePermissions(role);
    const displayName = await getRoleDisplayName(role);
    out.push({ role, displayName: displayName || defaultNames[role] || role, defaults: defaults[role], current });
  }

  res.json({ knownPermissions: KNOWN_PERMISSIONS, items: out });
});

adminRouter.put("/api/admin/roles/:role", requireRealmFeature("admin_roles"), requirePermission("roles.update"), async (req, res) => {
  const schema = z.object({ permissions: z.array(z.string().min(1)).default([]) });

  const roleParam = paramAsString(req.params.role);
  const roleParsed = roleSchema.safeParse(roleParam);
  const parsed = schema.safeParse(req.body);
  if (!roleParsed.success || !parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  await upsertRolePermissions(roleParsed.data, parsed.data.permissions);
  await writeAudit(req.auth!.userId, "role.permissions.update", "role", roleParsed.data, { permissions: parsed.data.permissions });

  res.json({ ok: true, role: roleParsed.data, permissions: await getRolePermissions(roleParsed.data) });
});

adminRouter.patch("/api/admin/roles/:role/meta", requireRealmFeature("admin_roles"), requirePermission("roles.update"), async (req, res) => {
  const roleParam = paramAsString(req.params.role);
  const roleParsed = roleSchema.safeParse(roleParam);
  const payload = z.object({ displayName: z.string().max(64).optional().nullable() }).safeParse(req.body);
  if (!roleParsed.success || !payload.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  await upsertRoleDisplayName(roleParsed.data, payload.data.displayName || null);
  await writeAudit(req.auth!.userId, "role.meta.update", "role", roleParsed.data, { displayName: payload.data.displayName || null });

  res.json({ ok: true, role: roleParsed.data, displayName: await getRoleDisplayName(roleParsed.data) });
});

adminRouter.post("/api/admin/roles/:role/reset", requireRealmFeature("admin_roles"), requirePermission("roles.update"), async (req, res) => {
  const roleParam = paramAsString(req.params.role);
  const roleParsed = roleSchema.safeParse(roleParam);
  if (!roleParsed.success) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  await resetRolePermissions(roleParsed.data);
  await writeAudit(req.auth!.userId, "role.permissions.reset", "role", roleParsed.data);
  res.json({ ok: true, role: roleParsed.data, permissions: await getRolePermissions(roleParsed.data) });
});

adminRouter.post("/api/admin/tokens", requirePermission("users.update"), async (req, res) => {
  const parsed = createTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const raw = randomToken("svc");
  const token = await prisma.serviceToken.create({
    data: {
      name: parsed.data.name,
      userId: parsed.data.userId || req.auth!.userId,
      tokenHash: sha256(raw),
      tokenPrefix: raw.slice(0, 12)
    }
  });

  await writeAudit(req.auth!.userId, "token.create", "serviceToken", token.id, { name: token.name, userId: token.userId });
  res.status(201).json({ id: token.id, token: raw, tokenPrefix: token.tokenPrefix });
});

adminRouter.post("/api/admin/tokens/:id/revoke", requirePermission("users.update"), async (req, res) => {
  const tokenId = paramAsString(req.params.id);
  if (!tokenId) {
    res.status(400).json({ error: "Invalid token id" });
    return;
  }

  const prisma = getPrisma();
  const updated = await prisma.serviceToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() }
  });
  await writeAudit(req.auth!.userId, "token.revoke", "serviceToken", updated.id);
  res.json({ ok: true });
});

adminRouter.get("/api/admin/leave-template", requireRealmFeature("admin_leave_template"), requirePermission("users.update"), async (_req, res) => {
  const template = loadLeaveTemplate();
  res.json(template || { backgroundDataUrl: "", fields: [], userOverrides: [], updatedAt: null });
});

adminRouter.put("/api/admin/leave-template", requireRealmFeature("admin_leave_template"), requirePermission("users.update"), async (req, res) => {
  const fieldSchema = z.object({
      key: z.string().min(1).max(120),
      label: z.string().min(1).max(200),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      w: z.number().min(0.005).max(1),
      h: z.number().min(0.005).max(1),
      page: z.number().int().min(1).max(20).optional(),
      fontSizePt: z.number().min(6).max(72).optional()
    });
  const schema = z.object({
    backgroundDataUrl: z.string().max(12_000_000).default(""),
    fields: z.array(fieldSchema).max(200).default([]),
    userOverrides: z.array(z.object({
      userId: z.string().min(1).max(191),
      backgroundDataUrl: z.string().max(12_000_000).default(""),
      fields: z.array(fieldSchema).max(200).default([])
    })).max(500).default([])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const saved = saveLeaveTemplate({
    backgroundDataUrl: parsed.data.backgroundDataUrl,
    fields: parsed.data.fields,
    userOverrides: parsed.data.userOverrides,
    updatedAt: new Date().toISOString()
  });
  await writeAudit(req.auth!.userId, "leave.template.save", "leaveTemplate", "active", {
    fields: saved.fields.length,
    hasBackground: Boolean(saved.backgroundDataUrl),
    userOverrides: Array.isArray(saved.userOverrides) ? saved.userOverrides.length : 0
  });
  res.json(saved);
});

adminRouter.get("/api/admin/holidays", requireRealmFeature("admin_holidays"), requirePermission("users.update"), async (_req, res) => {
  const cfg = loadHolidayRules();
  res.json(cfg);
});

adminRouter.put("/api/admin/holidays", requireRealmFeature("admin_holidays"), requirePermission("users.update"), async (req, res) => {
  const baseSchema = z.object({
    id: z.string().min(1).max(120),
    name: z.string().min(1).max(200),
    dayOff: z.boolean().optional(),
    type: z.enum(["fixed", "nth_weekday", "relative"]),
    startYear: z.number().int().min(1900).max(2300).nullable().optional(),
    endYear: z.number().int().min(1900).max(2300).nullable().optional(),
    durationDays: z.number().int().min(1).max(31).optional()
  });
  const fixedSchema = baseSchema.extend({
    type: z.literal("fixed"),
    fixedMonth: z.number().int().min(1).max(12),
    fixedDay: z.number().int().min(1).max(31)
  });
  const nthSchema = baseSchema.extend({
    type: z.literal("nth_weekday"),
    nthMonth: z.number().int().min(1).max(12),
    nthWeekday: z.number().int().min(0).max(6),
    nthOccurrence: z.number().int().min(-5).max(5).refine((v) => v !== 0)
  });
  const relativeSchema = baseSchema.extend({
    type: z.literal("relative"),
    baseRuleId: z.string().min(1).max(120),
    offsetDays: z.number().int().min(-366).max(366)
  });
  const payloadSchema = z.object({
    rules: z.array(z.union([fixedSchema, nthSchema, relativeSchema])).max(500),
    easter: z.object({
      enabled: z.boolean().optional(),
      calendar: z.enum(["orthodox", "western"]).optional(),
      name: z.string().min(1).max(200).optional(),
      dayOff: z.boolean().optional(),
      offsets: z.array(z.number().int().min(-20).max(20)).max(20).optional(),
      startYear: z.number().int().min(1900).max(2300).nullable().optional(),
      endYear: z.number().int().min(1900).max(2300).nullable().optional()
    }).optional()
  });
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const incoming = parsed.data.rules as HolidayRule[];
  const saved = saveHolidayRules({
    rules: incoming,
    easter: (parsed.data.easter || {}) as EasterHolidayConfig,
    updatedAt: new Date().toISOString()
  });
  await writeAudit(req.auth!.userId, "holiday.rules.save", "holidayRules", "active", {
    rules: saved.rules.length,
    easterEnabled: Boolean(saved.easter && saved.easter.enabled),
    easterCalendar: saved.easter && saved.easter.calendar
  });
  res.json(saved);
});

adminRouter.get("/api/admin/audit", requireRealmFeature("admin_audit"), requirePermission("users.read"), async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 300) : 100;
  const cursorRaw = String(req.query.cursor || "").trim();
  if (cursorRaw && !/^\d+$/.test(cursorRaw)) {
    res.status(400).json({ error: "Invalid cursor" });
    return;
  }
  const action = String(req.query.action || "").trim();
  const entityType = String(req.query.entityType || "").trim();
  const actorUserId = String(req.query.actorUserId || "").trim();
  const q = String(req.query.q || "").trim();
  const excludeNoisy = String(req.query.excludeNoisy || "").trim() === "1";
  const noisyActions = ["token.refresh", "legacy.save.shared", "legacy.save.personal"];

  const where: Record<string, unknown> = {
    createdAt: { gte: from, lte: to }
  };
  if (action) where.action = action;
  else if (excludeNoisy) where.action = { notIn: noisyActions };
  if (entityType) where.entityType = entityType;
  if (actorUserId) where.actorUserId = actorUserId;
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { entityType: { contains: q } },
      { entityId: { contains: q } }
    ];
  }

  const prisma = getPrisma();
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursorRaw ? { cursor: { id: BigInt(cursorRaw) }, skip: 1 } : {}),
    take: limit + 1,
    include: {
      actorUser: {
        select: { id: true, username: true, nickname: true }
      }
    }
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && page.length ? String(page[page.length - 1].id) : null;

  const items = page.map((row) => ({
    id: String(row.id),
    actorUserId: row.actorUserId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metaJson: row.metaJson,
    createdAt: row.createdAt,
    actorUser: row.actorUser
      ? {
        id: row.actorUser.id,
        username: row.actorUser.username,
        nickname: row.actorUser.nickname
      }
      : null
  }));

  res.json({ items, nextCursor, hasMore });
});

adminRouter.post("/api/admin/webhook", requirePermission("users.update"), async (req, res) => {
  const schema = z.object({ url: z.string().url().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const meta = await prisma.appMeta.upsert({
    where: { id: 1 },
    create: { id: 1, installed: true, haWebhookUrl: parsed.data.url },
    update: { haWebhookUrl: parsed.data.url }
  });

  await writeAudit(req.auth!.userId, "config.webhook.update", "appMeta", String(meta.id), { url: parsed.data.url });
  res.json({ ok: true, haWebhookUrl: meta.haWebhookUrl });
});

