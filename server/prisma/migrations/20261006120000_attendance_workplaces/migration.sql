-- Add workplaces without dropping or rewriting existing attendance history.
-- Legacy rows are assigned transactionally when the first workplace is created.
CREATE TABLE `AttendanceWorkplace` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AttendanceWorkplace_name_key` (`name`),
  INDEX `AttendanceWorkplace_active_name_idx` (`active`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `AttendanceWorkplace` ADD CONSTRAINT `AttendanceWorkplace_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AttendancePunch`
  ADD COLUMN `workplaceId` VARCHAR(191) NULL,
  ADD COLUMN `workplaceName` VARCHAR(191) NULL,
  ADD INDEX `AttendancePunch_workplaceId_occurredAt_idx` (`workplaceId`, `occurredAt`),
  ADD CONSTRAINT `AttendancePunch_workplaceId_fkey` FOREIGN KEY (`workplaceId`) REFERENCES `AttendanceWorkplace` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AttendanceStation`
  ADD COLUMN `workplaceId` VARCHAR(191) NULL,
  ADD INDEX `AttendanceStation_workplaceId_idx` (`workplaceId`),
  ADD CONSTRAINT `AttendanceStation_workplaceId_fkey` FOREIGN KEY (`workplaceId`) REFERENCES `AttendanceWorkplace` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
