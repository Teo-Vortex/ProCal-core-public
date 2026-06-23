import { getPrisma } from "../db/prisma";

export async function writeAudit(actorUserId: string | null, action: string, entityType: string, entityId?: string, meta?: unknown): Promise<void> {
  const prisma = getPrisma();

  const dedupeWindowMsByAction: Record<string, number> = {
    "legacy.save.shared": 2000,
    "legacy.save.personal": 2000
  };
  const dedupeWindowMs = dedupeWindowMsByAction[String(action || "")] || 0;

  if (dedupeWindowMs > 0) {
    const since = new Date(Date.now() - dedupeWindowMs);
    const existing = await prisma.auditLog.findFirst({
      where: {
        actorUserId: actorUserId || null,
        action,
        entityType,
        entityId: entityId || null,
        createdAt: { gte: since }
      },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    if (existing) return;
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: actorUserId || null,
      action,
      entityType,
      entityId,
      metaJson: (meta as object) || undefined
    }
  });
}
