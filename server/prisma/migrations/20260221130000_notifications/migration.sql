CREATE TABLE `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` VARCHAR(1000) NULL,
  `entityType` VARCHAR(120) NULL,
  `entityId` VARCHAR(191) NULL,
  `metaJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` DATETIME(3) NULL,
  INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `Notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Notification`
  ADD CONSTRAINT `Notification_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
