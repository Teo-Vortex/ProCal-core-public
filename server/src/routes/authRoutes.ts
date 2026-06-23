import { Router } from "express";
import type { User } from "@prisma/client";
import { getPrisma } from "../db/prisma";
import { writeAudit } from "../services/auditService";
import { credentialsSchema, mePreferencesSchema, meProfileSchema, publicRegisterSchema } from "../utils/schemas";
import { consumeRefreshToken, getRefreshCookieName, issueRefreshToken, revokeRefreshToken, signAccessToken, verifyPassword, hashPassword } from "../auth/tokens";
import { getRuntimeConfig } from "../config/env";
import { loginRateLimiter } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { upsertUserInSharedPersonnel } from "../services/personnelSyncService";
import { createNotifications, findUsersWithPermission } from "../services/notificationService";
import { convertUserToFormerMember } from "../services/formerMemberService";
import { buildCookiePath } from "../utils/publicBasePath";
import {
  hostedUpdateRealmUser,
  isHostedIdentityEnabled,
  mirrorHostedUserToLocal
} from "../services/hostedIdentityService";

export const authRouter = Router();

function isTruthy(value: unknown): boolean {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function isInternalAutoLoginEnabled(): boolean {
  return isTruthy(process.env.PROCAL_INTERNAL_AUTO_LOGIN);
}

function resolveInternalAutoLoginUsername(): string {
  const username = String(
    process.env.PROCAL_INTERNAL_ADMIN_USERNAME || process.env.FIRST_ADMIN_USERNAME || "admin"
  ).trim();
  return username || "admin";
}

function serializeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    role: user.role,
    status: user.status,
    viewMode: user.viewMode,
    displayColor: user.displayColor,
    calendarTintOpacity: Number(user.calendarTintOpacity ?? 10),
    fullName: user.fullName,
    workplace: user.workplace,
    jobTitle: user.jobTitle
  };
}

function isProfileIncomplete(user: User): boolean {
  const nickname = String(user.nickname || "").trim();
  const fullName = String(user.fullName || "").trim();
  const workplace = String(user.workplace || "").trim();
  const jobTitle = String(user.jobTitle || "").trim();
  return !nickname || !fullName || !workplace || !jobTitle;
}

async function respondWithSession(
  req: any,
  res: any,
  user: User,
  auditAction: string,
  auditMeta?: Record<string, unknown>
) {
  const runtime = getRuntimeConfig();
  const accessToken = signAccessToken({ userId: user.id, role: user.role }, runtime.accessTokenTtlSec);
  const refreshToken = await issueRefreshToken(user.id, runtime.refreshTokenTtlSec);

  res.cookie(getRefreshCookieName(), refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure || req.header("x-forwarded-proto") === "https",
    maxAge: runtime.refreshTokenTtlSec * 1000,
    path: buildCookiePath(req, "/api/auth")
  });

  await writeAudit(user.id, auditAction, "auth", user.id, auditMeta);
  res.json({
    accessToken,
    user: serializeUser(user)
  });
}

authRouter.post("/api/auth/register", async (req, res) => {
  const parsed = publicRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.flatten() });
    return;
  }

  if (isHostedIdentityEnabled()) {
    res.status(409).json({ ok: false, error: "Managed account registration is not available in this build." });
    return;
  }

  try {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (existing && !existing.isDeleted) {
      res.status(409).json({ ok: false, error: "Username already exists" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        nickname: parsed.data.nickname,
        fullName: parsed.data.fullName,
        workplace: parsed.data.workplace,
        jobTitle: parsed.data.jobTitle,
        passwordHash,
        role: "user",
        status: "pending",
        viewMode: "simple",
        displayColor: null
      }
    });

    await upsertUserInSharedPersonnel(prisma, user);

    await writeAudit(null, "user.register.pending", "user", user.id, {
      username: user.username,
      nickname: user.nickname
      ,fullName: user.fullName || null
      ,workplace: user.workplace || null
      ,jobTitle: user.jobTitle || null
    });
    const admins = await findUsersWithPermission("users.approve");
    if (admins.length) {
      await createNotifications(admins.map((userId) => ({
        userId,
        type: "admin.user_registration_pending",
        title: "Нова заявка за акаунт",
        body: `Потребител ${user.nickname || user.username} чака одобрение.`,
        entityType: "user",
        entityId: user.id,
        metaJson: {
          actorUserId: user.id,
          username: user.username,
          nickname: user.nickname || user.username
        }
      })));
    }
    res.status(201).json({ ok: true, pending: true, message: "Registration submitted. Wait for admin approval." });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Register failed" });
  }
});

authRouter.post("/api/auth/login", loginRateLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (isHostedIdentityEnabled()) {
    res.status(409).json({ error: "Managed sign-in is not available in this build." });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || user.isDeleted) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.status !== "active") {
    const reason = user.status === "pending" ? "Account pending admin approval" : "Account is suspended";
    res.status(403).json({ error: reason, status: user.status });
    return;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await respondWithSession(req, res, user, "login", { ip: req.ip });
});

authRouter.post("/api/auth/internal-auto-login", async (req, res) => {
  if (!isInternalAutoLoginEnabled()) {
    res.status(404).json({ error: "Internal auto-login is disabled." });
    return;
  }

  const prisma = getPrisma();
  const username = resolveInternalAutoLoginUsername();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.isDeleted) {
    res.status(404).json({ error: "Internal auto-login user is missing." });
    return;
  }

  if (user.status !== "active") {
    res.status(403).json({ error: "Internal auto-login user is not active.", status: user.status });
    return;
  }

  await respondWithSession(req, res, user, "login.internal_auto", {
    ip: req.ip,
    username: user.username
  });
});

authRouter.post("/api/auth/handoff", async (_req, res) => {
  res.status(404).json({ error: "Handoff sign-in is not available in this build." });
});

authRouter.post("/api/auth/refresh", async (req, res) => {
  const token = req.cookies[getRefreshCookieName()];
  if (!token) {
    res.status(401).json({ error: "Missing refresh token" });
    return;
  }

  const userId = await consumeRefreshToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isDeleted || user.status !== "active") {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const runtime = getRuntimeConfig();
  const accessToken = signAccessToken({ userId: user.id, role: user.role }, runtime.accessTokenTtlSec);
  await writeAudit(user.id, "token.refresh", "auth", user.id);
  res.json({ accessToken });
});

authRouter.post("/api/auth/logout", async (req, res) => {
  const token = req.cookies[getRefreshCookieName()];
  if (token) await revokeRefreshToken(token);
  res.clearCookie(getRefreshCookieName(), { path: buildCookiePath(req, "/api/auth") });
  if (req.auth?.userId) await writeAudit(req.auth.userId, "logout", "auth", req.auth.userId);
  res.json({ ok: true });
});

authRouter.get("/api/me", requireAuth, async (req, res) => {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    role: user.role,
    status: user.status,
    profileIncomplete: isProfileIncomplete(user),
    viewMode: user.viewMode,
    displayColor: user.displayColor,
    calendarTintOpacity: Number(user.calendarTintOpacity ?? 10),
    fullName: user.fullName,
    workplace: user.workplace,
    jobTitle: user.jobTitle,
    permissions: req.auth?.permissions || [],
    featureFlags: req.auth?.featureFlags || {}
  });
});

authRouter.get("/api/people/directory", requireAuth, async (_req, res) => {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      nickname: true,
      displayColor: true,
      status: true,
      role: true
    }
  });

  const items = users.map((user) => ({
    id: user.id,
    userId: user.id,
    username: user.username,
    name: (user.nickname || user.username || "").trim() || user.username,
    color: /^#[0-9a-fA-F]{6}$/.test(String(user.displayColor || "")) ? String(user.displayColor) : "#64748b",
    status: user.status,
    role: user.role
  }));

  res.json(items);
});

authRouter.patch("/api/me/profile", requireAuth, async (req, res) => {
  const parsed = meProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const payload = {
    nickname: parsed.data.nickname.trim(),
    fullName: parsed.data.fullName.trim(),
    workplace: parsed.data.workplace.trim(),
    jobTitle: parsed.data.jobTitle.trim()
  };

  if (isHostedIdentityEnabled()) {
    try {
      const hosted = await hostedUpdateRealmUser(user.username, {
        username: user.username,
        nickname: payload.nickname,
        fullName: payload.fullName,
        workplace: payload.workplace,
        jobTitle: payload.jobTitle,
        role: user.role,
        status: user.status,
        viewMode: user.viewMode,
        displayColor: user.displayColor,
        calendarTintOpacity: Number(user.calendarTintOpacity ?? 10)
      });
      if (!hosted.user) {
        throw new Error("Hosted identity did not return a user.");
      }
      const updated = await mirrorHostedUserToLocal(prisma, hosted.user, {
        existingUserId: user.id,
        lookupUsername: hosted.previousLocalUsername || user.username
      });
      await writeAudit(req.auth!.userId, "user.profile.update", "user", updated.id, { hosted: true });
      res.json({
        ok: true,
        user: serializeUser(updated),
        profileIncomplete: isProfileIncomplete(updated)
      });
      return;
    } catch (error) {
      res.status((error as { statusCode?: number }).statusCode || 500).json({
        error: error instanceof Error ? error.message : "Profile update failed"
      });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: payload
  });

  await upsertUserInSharedPersonnel(prisma, updated);
  await writeAudit(req.auth!.userId, "user.profile.update", "user", updated.id);
  res.json({
    ok: true,
    user: serializeUser(updated),
    profileIncomplete: isProfileIncomplete(updated)
  });
});

authRouter.patch("/api/me/password", requireAuth, async (req, res) => {
  res.status(410).json({
    error: "Password changes are disabled in this build."
  });
});
authRouter.patch("/api/me/preferences", requireAuth, async (req, res) => {
  const parsed = mePreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const updated = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { viewMode: parsed.data.viewMode }
  });

  await writeAudit(req.auth!.userId, "user.preferences.update", "user", updated.id, { viewMode: updated.viewMode });
  res.json({ ok: true, viewMode: updated.viewMode });
});
