CREATE TABLE `LeaveAllowance` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `leaveType` ENUM('paid','sick','unpaid','study') NOT NULL,
  `year` INT NOT NULL,
  `days` DECIMAL(8,2) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LeaveAllowance_userId_leaveType_year_key`(`userId`, `leaveType`, `year`),
  INDEX `LeaveAllowance_userId_leaveType_idx`(`userId`, `leaveType`),
  INDEX `LeaveAllowance_year_idx`(`year`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LeaveRecord` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `leaveType` ENUM('paid','sick','unpaid','study') NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `days` DECIMAL(8,2) NOT NULL,
  `sourceYear` INT NULL,
  `note` VARCHAR(512) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `LeaveRecord_userId_startDate_endDate_idx`(`userId`, `startDate`, `endDate`),
  INDEX `LeaveRecord_leaveType_startDate_idx`(`leaveType`, `startDate`),
  INDEX `LeaveRecord_sourceYear_idx`(`sourceYear`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LeaveAllowance`
  ADD CONSTRAINT `LeaveAllowance_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveAllowance_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `LeaveRecord`
  ADD CONSTRAINT `LeaveRecord_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LeaveRecord_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
