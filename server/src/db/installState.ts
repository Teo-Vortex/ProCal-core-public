import { getPrisma } from "./prisma";

export async function isInstalled(): Promise<boolean> {
  try {
    const prisma = getPrisma();
    const meta = await prisma.appMeta.findUnique({ where: { id: 1 } });
    return Boolean(meta?.installed);
  } catch {
    return false;
  }
}

