import { PrismaClient } from "@prisma/client";

export async function testDatabaseConnection(databaseUrl: string): Promise<void> {
  const client = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    await client.$queryRaw`SELECT 1`;
  } finally {
    await client.$disconnect();
  }
}

