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

export async function consumeRefreshToken(rawToken: string): Promise<string | null> {
  const prisma = getPrisma();
  const hash = sha256(rawToken);
  const found = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!found) return null;
  if (found.revokedAt || found.expiresAt < new Date()) return null;
  return found.userId;
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

