CREATE TABLE `SharedLegacyState` (
  `id` INT NOT NULL DEFAULT 1,
  `dataJson` JSON NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;