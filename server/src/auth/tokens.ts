import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomToken, sha256 } from "../utils/crypto";
import { getSecrets } from "../config/env";
import { getPrisma } from "../db/prisma";

const ACCESS_COOKIE = "refresh_token";

export function getRefreshCookieName(): string {
  return ACCESS_COOKIE;
}

export function signAccessToken(payload: { userId: string; role: string }, ttlSec: number): string {
  const { jwtSecret } = getSecrets();
  return jwt.sign(payload, jwtSecret, { expiresIn: ttlSec });
}

export function verifyAccessToken(token: string): { userId: string; role: string } {
  const { jwtSecret } = getSecrets();
  return jwt.verify(token, jwtSecret) as { userId: string; role: string };
}

export async function issueRefreshToken(userId: string, ttlSec: number): Promise<string> {
  const prisma = getPrisma();
  const token = randomToken("rf");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + ttlSec * 1000)
    }
  });
  return token;
}

export type RefreshTokenRotationResult =
  | { status: "ok"; userId: string; refreshToken: string }
  | { status: "invalid" }
  | { status: "reused"; userId: string };

export async function rotateRefreshToken(rawToken: string, ttlSec: number): Promise<RefreshTokenRotationResult> {
  const prisma = getPrisma();
  const hash = sha256(rawToken);
  return prisma.$transaction(async (tx) => {
    const found = await tx.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!found) return { status: "invalid" } as const;

    const now = new Date();
    if (found.revokedAt) {
      await tx.refreshToken.updateMany({
        where: { userId: found.userId, revokedAt: null },
        data: { revokedAt: now }
      });
      return { status: "reused", userId: found.userId } as const;
    }
    if (found.expiresAt <= now) {
      await tx.refreshToken.update({ where: { id: found.id }, data: { revokedAt: now } });
      return { status: "invalid" } as const;
    }

    const revoked = await tx.refreshToken.updateMany({
      where: { id: found.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now }
    });
    if (revoked.count !== 1) {
      await tx.refreshToken.updateMany({
        where: { userId: found.userId, revokedAt: null },
        data: { revokedAt: now }
      });
      return { status: "reused", userId: found.userId } as const;
    }

    const nextToken = randomToken("rf");
    await tx.refreshToken.create({
      data: {
        userId: found.userId,
        tokenHash: sha256(nextToken),
        expiresAt: new Date(now.getTime() + ttlSec * 1000)
      }
    });
    return { status: "ok", userId: found.userId, refreshToken: nextToken } as const;
  });
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const prisma = getPrisma();
  const hash = sha256(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

