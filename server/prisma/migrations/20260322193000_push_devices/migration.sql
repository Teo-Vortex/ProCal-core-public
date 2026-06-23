CREATE TABLE `PushDevice` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `platform` VARCHAR(32) NOT NULL,
  `installationId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(512) NOT NULL,
  `appVersion` VARCHAR(64) NULL,
  `deviceLabel` VARCHAR(191) NULL,
  `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PushDevice_installationId_key`(`installationId`),
  UNIQUE INDEX `PushDevice_token_key`(`token`),
  INDEX `PushDevice_userId_platform_idx`(`userId`, `platform`),
  INDEX `PushDevice_lastSeenAt_idx`(`lastSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PushDevice`
  ADD CONSTRAINT `PushDevice_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
