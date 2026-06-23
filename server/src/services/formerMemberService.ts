import crypto from "crypto";
import type { PrismaClient, User } from "@prisma/client";
import { hashPassword } from "../auth/tokens";
import { upsertUserInSharedPersonnel } from "./personnelSyncService";

type FormerMemberOptions = {
  preserveRole?: boolean;
};

function createHttpError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function clipText(value: string, maxLength: number): string {
  return String(value || "").trim().slice(0, maxLength);
}

function buildFormerDisplayLabel(user: User): string {
  return clipText(
    String(user.fullName || user.nickname || user.username || "").trim() || "Former member",
    191
  );
}

function normalizeFormerUsernameSegment(username: string): string {
  const normalized = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "member";
}

async function buildUniqueFormerUsername(
  prisma: PrismaClient,
  currentUserId: string,
  username: string
): Promise<string> {
  const base = clipText(`former-${normalizeFormerUsernameSegment(username)}`, 64) || "former-member";
  let counter = 0;

  while (counter < 1000) {
    const suffix = counter === 0
      ? clipText(currentUserId.slice(-6).toLowerCase(), 6) || "old"
      : String(counter + 1);
    const candidate = clipText(`${base}-${suffix}`, 191);
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true }
    });
    if (!existing || existing.id === currentUserId) {
      return candidate;
    }
    counter += 1;
  }

  return clipText(`former-member-${Date.now()}`, 191);
}

export async function convertUserToFormerMember(
  prisma: PrismaClient,
  userId: string,
  options?: FormerMemberOptions
): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing || existing.isDeleted) {
    throw createHttpError(404, "User not found");
  }

  if (existing.role === "system_admin") {
    const activeSystemAdmins = await prisma.user.count({
      where: {
        role: "system_admin",
        status: "active",
        isDeleted: false
      }
    });
    if (activeSystemAdmins <= 1) {
      throw createHttpError(400, "The last system_admin cannot leave the realm");
    }
  }

  const replacementPasswordHash = await hashPassword(crypto.randomBytes(24).toString("hex"));
  const formerLabel = buildFormerDisplayLabel(existing);
  const replacementUsername = await buildUniqueFormerUsername(prisma, existing.id, existing.username);
  const revokedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id: existing.id },
      data: {
        username: replacementUsername,
        nickname: clipText(`Former member: ${formerLabel}`, 191),
        fullName: formerLabel,
        jobTitle: "Former member",
        role: options?.preserveRole ? existing.role : "user",
        status: "suspended",
        passwordHash: replacementPasswordHash
      }
    });

    await tx.refreshToken.updateMany({
      where: {
        userId: existing.id,
        revokedAt: null
      },
      data: {
        revokedAt
      }
    });

    await tx.serviceToken.updateMany({
      where: {
        userId: existing.id,
        revokedAt: null
      },
      data: {
        revokedAt
      }
    });

    return next;
  });

  await upsertUserInSharedPersonnel(prisma, updated);
  return updated;
}
