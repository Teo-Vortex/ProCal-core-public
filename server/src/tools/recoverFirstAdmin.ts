import crypto from "crypto";
import { closePrisma, getPrisma } from "../db/prisma";
import { hashPassword } from "../auth/tokens";

function readArg(name: string, shortName?: string): string | undefined {
  const args = process.argv.slice(2);
  const longIndex = args.findIndex((a) => a === name);
  if (longIndex >= 0 && args[longIndex + 1]) return args[longIndex + 1];
  if (shortName) {
    const shortIndex = args.findIndex((a) => a === shortName);
    if (shortIndex >= 0 && args[shortIndex + 1]) return args[shortIndex + 1];
  }
  return undefined;
}

function generateTempPassword(): string {
  return `Adm!${crypto.randomBytes(8).toString("hex")}`;
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  const requestedPassword = readArg("--password", "-p");
  const requestedUsername = readArg("--username", "-u");
  const nextPassword = requestedPassword && requestedPassword.length >= 8
    ? requestedPassword
    : generateTempPassword();

  let target = requestedUsername
    ? await prisma.user.findFirst({
        where: { isDeleted: false, username: requestedUsername },
        orderBy: { createdAt: "asc" },
        select: { id: true, username: true, role: true, createdAt: true }
      })
    : null;

  if (!target) {
    target = await prisma.user.findFirst({
      where: {
        isDeleted: false,
        role: { in: ["system_admin", "admin"] }
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, role: true, createdAt: true }
    });
  }

  if (!target) {
    target = await prisma.user.findFirst({
      where: { isDeleted: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, role: true, createdAt: true }
    });
  }

  if (!target) {
    throw new Error("No user found.");
  }

  const passwordHash = await hashPassword(nextPassword);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, status: "active", role: "system_admin" }
  });

  console.log("FIRST_ADMIN_USERNAME=" + target.username);
  console.log("FIRST_ADMIN_PASSWORD=" + nextPassword);
  console.log("FIRST_ADMIN_ROLE=system_admin");
  console.log("FIRST_ADMIN_CREATED_AT=" + target.createdAt.toISOString());
}

void main()
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("RECOVERY_FAILED: " + message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePrisma();
  });
