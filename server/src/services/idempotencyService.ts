import { getPrisma } from "../db/prisma";
import { hashRequestBody } from "../utils/crypto";

export async function tryIdempotency(key: string, endpoint: string, userId: string | null, body: unknown): Promise<{ hit: boolean; statusCode?: number; responseBody?: unknown }> {
  const prisma = getPrisma();
  const requestHash = hashRequestBody(body);
  const now = new Date();

  await prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: now } } });

  const existing = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!existing) return { hit: false };

  if (existing.endpoint !== endpoint || existing.userId !== userId || existing.requestHash !== requestHash) {
    return { hit: true, statusCode: 409, responseBody: { error: "Idempotency key reuse mismatch" } };
  }

  return { hit: true, statusCode: existing.statusCode, responseBody: existing.responseBody };
}

export async function storeIdempotency(key: string, endpoint: string, userId: string | null, body: unknown, statusCode: number, responseBody: unknown): Promise<void> {
  const prisma = getPrisma();
  await prisma.idempotencyRecord.create({
    data: {
      key,
      endpoint,
      userId,
      requestHash: hashRequestBody(body),
      statusCode,
      responseBody: responseBody as object,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
}

