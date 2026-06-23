CREATE TABLE `BugReport` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `userName` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` VARCHAR(4000) NOT NULL,
  `pageUrl` VARCHAR(1000) NULL,
  `appVersion` VARCHAR(40) NULL,
  `status` ENUM('open','triaged','resolved','dismissed') NOT NULL DEFAULT 'open',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `BugReport_createdAt_idx`(`createdAt`),
  INDEX `BugReport_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `BugReport_userId_createdAt_idx`(`userId`, `createdAt`),
  CONSTRAINT `BugReport_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;