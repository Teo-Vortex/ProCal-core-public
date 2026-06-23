import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { getPrisma } from "../db/prisma";
import { sha256 } from "../utils/crypto";
import { verifyAccessToken } from "../auth/tokens";
import { getEffectivePermissions, hasPermission, PermissionKey } from "../services/permissionService";
import { getRealmFeatureFlags } from "../services/realmEntitlementsService";

function extractBearer(req: Request): string | null {
  const auth = req.header("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

async function buildAuthContext(userId: string, role: UserRole, tokenType: "access" | "service") {
  const permissionSet = await getEffectivePermissions(userId, role);
  const featureFlags = await getRealmFeatureFlags().catch(() => ({}));
  return {
    userId,
    role,
    tokenType,
    permissions: Array.from(permissionSet),
    featureFlags
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const prisma = getPrisma();

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isDeleted || user.status !== "active") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.auth = await buildAuthContext(user.id, user.role, "access");
    next();
    return;
  } catch {
    // fall through to service token
  }

  const hashed = sha256(token);
  const st = await prisma.serviceToken.findFirst({ where: { tokenHash: hashed, revokedAt: null }, include: { user: true } });
  if (!st) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const role = (st.user?.role || "user") as UserRole;
  req.auth = await buildAuthContext(st.userId || "", role, "service");

  await prisma.serviceToken.update({ where: { id: st.id }, data: { lastUsedAt: new Date() } });
  next();
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissionSet = new Set(req.auth?.permissions || []);
    if (!hasPermission(permissionSet, permission)) {
      res.status(403).json({ error: "Forbidden", missingPermission: permission });
      return;
    }
    next();
  };
}
