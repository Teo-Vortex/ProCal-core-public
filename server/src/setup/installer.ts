import { execFileSync } from "child_process";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { buildDatabaseUrl, loadStoredConfig, saveStoredConfig, StoredConfig } from "../config/store";
import { hashPassword } from "../auth/tokens";
import { randomToken, sha256 } from "../utils/crypto";
import { upsertUserInSharedPersonnel } from "../services/personnelSyncService";

export const setupInputSchema = z.object({
  dbHost: z.string().min(1),
  dbPort: z.coerce.number().int().positive().default(3306),
  dbName: z.string().min(1),
  dbUser: z.string().min(1),
  dbPassword: z.string().min(1),
  adminUsername: z.string().min(3).max(64),
  adminPassword: z.string().min(8).max(128),
  adminNickname: z.string().min(2).max(64),
  adminFullName: z.string().min(3).max(191),
  adminWorkplace: z.string().min(2).max(191),
  adminJobTitle: z.string().min(2).max(191),
  adminRole: z.enum(["system_admin", "admin", "boss"]).default("system_admin")
});

export const firstAdminSchema = z.object({
  adminUsername: z.string().min(3).max(64),
  adminPassword: z.string().min(8).max(128),
  adminNickname: z.string().trim().max(64).optional().default(""),
  adminFullName: z.string().trim().max(191).optional().default(""),
  adminWorkplace: z.string().trim().max(191).optional().default(""),
  adminJobTitle: z.string().trim().max(191).optional().default(""),
  adminRole: z.enum(["system_admin", "admin", "boss"]).default("system_admin")
});

const MIGRATION_RETRY_ATTEMPTS = Number(process.env.DB_READY_RETRY_ATTEMPTS || 12);
const MIGRATION_RETRY_DELAY_MS = Number(process.env.DB_READY_RETRY_DELAY_MS || 2000);

function isTruthy(value: unknown): boolean {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function readInternalAutoAdminInput(): z.infer<typeof firstAdminSchema> | null {
  if (!isTruthy(process.env.PROCAL_INTERNAL_AUTO_SETUP)) {
    return null;
  }

  const candidate = {
    adminUsername: String(process.env.PROCAL_INTERNAL_ADMIN_USERNAME || process.env.FIRST_ADMIN_USERNAME || "admin").trim(),
    adminPassword: String(process.env.PROCAL_INTERNAL_ADMIN_PASSWORD || randomToken("internal-admin")).trim(),
    adminNickname: String(process.env.PROCAL_INTERNAL_ADMIN_NICKNAME || "John").trim(),
    adminFullName: String(process.env.PROCAL_INTERNAL_ADMIN_FULL_NAME || "John Doe").trim(),
    adminWorkplace: String(process.env.PROCAL_INTERNAL_ADMIN_WORKPLACE || "Internal Test Stack").trim(),
    adminJobTitle: String(process.env.PROCAL_INTERNAL_ADMIN_JOB_TITLE || "Test User").trim(),
    adminRole: String(process.env.PROCAL_INTERNAL_ADMIN_ROLE || "system_admin").trim().toLowerCase()
  };

  const parsed = firstAdminSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("Invalid PROCAL_INTERNAL_AUTO_SETUP admin profile configuration.");
  }

  return parsed.data;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runMigrations(databaseUrl: string): void {
  const prismaCliPath = require.resolve("prisma/build/index.js");
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MIGRATION_RETRY_ATTEMPTS; attempt += 1) {
    try {
      execFileSync(process.execPath, [prismaCliPath, "migrate", "deploy", "--schema", "prisma/schema.prisma"], {
        cwd: "/app/server",
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: "utf8",
        stdio: "pipe"
      });
      return;
    } catch (error) {
      lastError = error;
      const stderr = error instanceof Error && "stderr" in error ? String((error as { stderr?: unknown }).stderr || "") : "";
      const stdout = error instanceof Error && "stdout" in error ? String((error as { stdout?: unknown }).stdout || "") : "";
      const combinedOutput = `${stdout}\n${stderr}`;
      const databaseNotReady = /P1001|Can't reach database server/i.test(combinedOutput);

      if (!databaseNotReady || attempt >= MIGRATION_RETRY_ATTEMPTS) {
        break;
      }

      process.stderr.write(`[setup] Database is not ready yet (attempt ${attempt}/${MIGRATION_RETRY_ATTEMPTS}). Retrying migrations.\n`);
      sleepSync(MIGRATION_RETRY_DELAY_MS);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Prisma migrate deploy failed");
}

async function createFirstAdminWithPrisma(
  prisma: PrismaClient,
  input: z.infer<typeof firstAdminSchema>
): Promise<{ serviceToken: string }> {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) throw new Error("Admin already exists");

  const passwordHash = await hashPassword(input.adminPassword);
  const nickname = input.adminNickname.trim() || input.adminUsername;
  const fullName = input.adminFullName.trim() || nickname;
  const user = await prisma.user.create({
    data: {
      username: input.adminUsername,
      nickname,
      fullName,
      workplace: input.adminWorkplace.trim(),
      jobTitle: input.adminJobTitle.trim(),
      passwordHash,
      role: input.adminRole,
      status: "active",
      viewMode: "simple"
    }
  });

  // Ensure the very first admin is also present in shared personnel.
  await upsertUserInSharedPersonnel(prisma, {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    displayColor: user.displayColor,
    isDeleted: false
  });
  const rawToken = randomToken("svc");
  await prisma.serviceToken.create({
    data: {
      userId: user.id,
      name: "initial-ha-token",
      tokenHash: sha256(rawToken),
      tokenPrefix: rawToken.slice(0, 12)
    }
  });

  await prisma.appMeta.upsert({
    where: { id: 1 },
    create: { id: 1, installed: true },
    update: { installed: true }
  });

  return { serviceToken: rawToken };
}

async function ensureInternalAutoAdmin(
  prisma: PrismaClient,
  input: z.infer<typeof firstAdminSchema>
): Promise<{ created: boolean; username: string }> {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    const existingAdmin = await prisma.user.findUnique({
      where: { username: input.adminUsername }
    });
    if (existingAdmin) {
      const updatedAdmin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          nickname: input.adminNickname.trim(),
          fullName: input.adminFullName.trim(),
          workplace: input.adminWorkplace.trim(),
          jobTitle: input.adminJobTitle.trim(),
          role: input.adminRole,
          status: "active",
          isDeleted: false
        }
      });
      await upsertUserInSharedPersonnel(prisma, updatedAdmin);
    }

    await prisma.appMeta.upsert({
      where: { id: 1 },
      create: { id: 1, installed: true },
      update: { installed: true }
    });
    return { created: false, username: input.adminUsername };
  }

  await createFirstAdminWithPrisma(prisma, input);
  return { created: true, username: input.adminUsername };
}

export async function registerFirstAdmin(input: z.infer<typeof firstAdminSchema>): Promise<{ serviceToken: string }> {
  const cfg = loadStoredConfig();
  if (!cfg) throw new Error("Database configuration is missing");

  const databaseUrl = buildDatabaseUrl(cfg);
  runMigrations(databaseUrl);

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    return await createFirstAdminWithPrisma(prisma, {
      ...input,
      adminRole: "system_admin"
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function installApplication(input: z.infer<typeof setupInputSchema>): Promise<{ serviceToken: string }> {
  const jwtSecret = randomToken("jwt");
  const refreshSecret = randomToken("rfs");

  const cfg: StoredConfig = {
    dbHost: input.dbHost,
    dbPort: input.dbPort,
    dbName: input.dbName,
    dbUser: input.dbUser,
    dbPassword: input.dbPassword,
    jwtSecret,
    refreshSecret,
    cookieSecure: true
  };

  saveStoredConfig(cfg);
  const databaseUrl = buildDatabaseUrl(cfg);
  runMigrations(databaseUrl);

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    return await createFirstAdminWithPrisma(prisma, {
      adminUsername: input.adminUsername,
      adminPassword: input.adminPassword,
      adminNickname: input.adminNickname,
      adminFullName: input.adminFullName,
      adminWorkplace: input.adminWorkplace,
      adminJobTitle: input.adminJobTitle,
      adminRole: input.adminRole
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function bootstrapDatabaseFromEnvIfNeeded(): Promise<void> {
  const existing = loadStoredConfig();
  if (existing) {
    const databaseUrl = buildDatabaseUrl(existing);
    const internalAutoAdmin = readInternalAutoAdminInput();
    if (internalAutoAdmin) {
      const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
      try {
        await ensureInternalAutoAdmin(prisma, internalAutoAdmin);
      } finally {
        await prisma.$disconnect();
      }
    }
    return;
  }

  const dbHost = process.env.DB_HOST;
  const dbPort = Number(process.env.DB_PORT || 3306);
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;

  if (!dbHost || !dbName || !dbUser || !dbPassword) return;

  const cfg: StoredConfig = {
    dbHost,
    dbPort,
    dbName,
    dbUser,
    dbPassword,
    jwtSecret: randomToken("jwt"),
    refreshSecret: randomToken("rfs"),
    cookieSecure: true
  };

  saveStoredConfig(cfg);
  const databaseUrl = buildDatabaseUrl(cfg);
  runMigrations(databaseUrl);
  const internalAutoAdmin = readInternalAutoAdminInput();

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    if (internalAutoAdmin) {
      await ensureInternalAutoAdmin(prisma, internalAutoAdmin);
      return;
    }

    await prisma.appMeta.upsert({
      where: { id: 1 },
      create: { id: 1, installed: false },
      update: { installed: false }
    });
  } finally {
    await prisma.$disconnect();
  }
}

export function migrateSchemaIfConfigured(): void {
  const cfg = loadStoredConfig();
  if (!cfg) return;
  const databaseUrl = buildDatabaseUrl(cfg);
  runMigrations(databaseUrl);
}





