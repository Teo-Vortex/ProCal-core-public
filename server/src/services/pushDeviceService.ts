import { getPrisma } from "../db/prisma";

type RegisterPushDeviceInput = {
  userId: string;
  platform: string;
  installationId: string;
  token: string;
  appVersion?: string | null;
  deviceLabel?: string | null;
  notificationsEnabled?: boolean;
};

type UnregisterPushDeviceInput = {
  userId: string;
  installationId?: string | null;
  token?: string | null;
};

function normalize(value: unknown, max = 191): string {
  return String(value || "").trim().slice(0, max);
}

function normalizeToken(value: unknown): string {
  return String(value || "").trim().slice(0, 512);
}

export async function registerPushDevice(input: RegisterPushDeviceInput) {
  const prisma = getPrisma();
  const userId = normalize(input.userId);
  const platform = normalize(input.platform, 32).toLowerCase() || "android";
  const installationId = normalize(input.installationId);
  const token = normalizeToken(input.token);
  const appVersion = normalize(input.appVersion || "", 64) || null;
  const deviceLabel = normalize(input.deviceLabel || "", 191) || null;
  const notificationsEnabled = Boolean(input.notificationsEnabled);

  if (!userId || !installationId || !token) {
    throw new Error("Push device registration requires userId, installationId, and token.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.pushDevice.deleteMany({
      where: {
        OR: [
          { installationId },
          { token }
        ]
      }
    });

    return tx.pushDevice.create({
      data: {
        userId,
        platform,
        installationId,
        token,
        appVersion,
        deviceLabel,
        notificationsEnabled,
        lastSeenAt: new Date()
      }
    });
  });
}

export async function unregisterPushDevice(input: UnregisterPushDeviceInput): Promise<number> {
  const prisma = getPrisma();
  const userId = normalize(input.userId);
  const installationId = normalize(input.installationId || "");
  const token = normalizeToken(input.token || "");

  const conditions = [];
  if (installationId) conditions.push({ installationId });
  if (token) conditions.push({ token });
  if (!userId || !conditions.length) return 0;

  const result = await prisma.pushDevice.deleteMany({
    where: {
      userId,
      OR: conditions
    }
  });
  return Number(result.count || 0);
}

export async function listEnabledPushDevicesForUsers(userIds: string[]) {
  const prisma = getPrisma();
  const uniqueUserIds = Array.from(new Set((userIds || []).map((item) => normalize(item)).filter(Boolean)));
  if (!uniqueUserIds.length) return [];
  return prisma.pushDevice.findMany({
    where: {
      userId: { in: uniqueUserIds },
      notificationsEnabled: true
    },
    select: {
      id: true,
      userId: true,
      token: true,
      platform: true,
      installationId: true
    }
  });
}

export async function removePushDevicesByIds(ids: string[]): Promise<number> {
  const prisma = getPrisma();
  const uniqueIds = Array.from(new Set((ids || []).map((item) => normalize(item)).filter(Boolean)));
  if (!uniqueIds.length) return 0;
  const result = await prisma.pushDevice.deleteMany({
    where: { id: { in: uniqueIds } }
  });
  return Number(result.count || 0);
}
