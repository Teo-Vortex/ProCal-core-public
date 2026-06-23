CREATE TABLE `MediaOwnedPublication` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `url` VARCHAR(1000) NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdByName` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `MediaOwnedPublication_publishedAt_idx`(`publishedAt`),
  INDEX `MediaOwnedPublication_createdById_createdAt_idx`(`createdById`, `createdAt`),
  CONSTRAINT `MediaOwnedPublication_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MediaObservedMention` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `url` VARCHAR(1000) NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL,
  `linkedOwnedId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdByName` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `MediaObservedMention_publishedAt_idx`(`publishedAt`),
  INDEX `MediaObservedMention_linkedOwnedId_publishedAt_idx`(`linkedOwnedId`, `publishedAt`),
  INDEX `MediaObservedMention_createdById_createdAt_idx`(`createdById`, `createdAt`),
  CONSTRAINT `MediaObservedMention_linkedOwnedId_fkey`
    FOREIGN KEY (`linkedOwnedId`) REFERENCES `MediaOwnedPublication`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `MediaObservedMention_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
