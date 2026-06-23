import { PrismaClient } from "@prisma/client";
import { buildDatabaseUrl, loadStoredConfig } from "../config/store";

let prisma: PrismaClient | null = null;
let currentUrl: string | null = null;

export function getPrisma(): PrismaClient {
  const cfg = loadStoredConfig();
  if (!cfg) throw new Error("Configuration missing");
  const url = buildDatabaseUrl(cfg);
  if (!prisma || currentUrl !== url) {
    prisma = new PrismaClient({ datasourceUrl: url });
    currentUrl = url;
  }
  return prisma;
}

export async function closePrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    currentUrl = null;
  }
}

