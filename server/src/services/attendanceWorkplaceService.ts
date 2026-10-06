import { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "../db/prisma";

type AttendanceDb = PrismaClient | Prisma.TransactionClient;

/** Also handles old backups restored after upgrading; never overwrites assigned history. */
export async function backfillLegacyAttendance(db: AttendanceDb = getPrisma()) {
  const first = await db.attendanceWorkplace.findFirst({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  if (!first) return null;
  await db.attendancePunch.updateMany({
    where: { workplaceId: null }, data: { workplaceId: first.id, workplaceName: first.name }
  });
  await db.attendanceStation.updateMany({ where: { workplaceId: null }, data: { workplaceId: first.id } });
  return first;
}
