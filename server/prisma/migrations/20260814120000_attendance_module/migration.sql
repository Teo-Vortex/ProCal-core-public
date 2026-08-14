CREATE TABLE `AttendanceStation` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `location` VARCHAR(191) NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `AttendanceStation_tokenHash_key`(`tokenHash`),
  INDEX `AttendanceStation_active_name_idx`(`active`, `name`),
  INDEX `AttendanceStation_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AttendancePunch` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `kind` ENUM('check_in', 'check_out', 'void') NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `source` ENUM('web', 'nfc', 'admin') NOT NULL DEFAULT 'web',
  `stationId` VARCHAR(191) NULL,
  `note` VARCHAR(512) NULL,
  `reason` VARCHAR(512) NULL,
  `createdById` VARCHAR(191) NULL,
  `targetPunchId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `AttendancePunch_targetPunchId_key`(`targetPunchId`),
  INDEX `AttendancePunch_userId_occurredAt_idx`(`userId`, `occurredAt`),
  INDEX `AttendancePunch_stationId_occurredAt_idx`(`stationId`, `occurredAt`),
  INDEX `AttendancePunch_createdById_createdAt_idx`(`createdById`, `createdAt`),
  INDEX `AttendancePunch_kind_occurredAt_idx`(`kind`, `occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AttendanceStation`
  ADD CONSTRAINT `AttendanceStation_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AttendancePunch`
  ADD CONSTRAINT `AttendancePunch_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `AttendancePunch_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `AttendancePunch_stationId_fkey`
  FOREIGN KEY (`stationId`) REFERENCES `AttendanceStation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `AttendancePunch_targetPunchId_fkey`
  FOREIGN KEY (`targetPunchId`) REFERENCES `AttendancePunch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
