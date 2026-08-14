-- CreateEnum
-- MariaDB stores Prisma enums inline on their columns.

-- CreateTable
CREATE TABLE `InventoryLocation` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(512) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryLocation_name_key`(`name`),
    INDEX `InventoryLocation_active_name_idx`(`active`, `name`),
    INDEX `InventoryLocation_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(300) NOT NULL,
    `description` VARCHAR(2000) NULL,
    `category` VARCHAR(191) NULL,
    `unit` VARCHAR(32) NOT NULL DEFAULT 'pcs',
    `lowStockThreshold` DECIMAL(14, 3) NULL,
    `criticalStockThreshold` DECIMAL(14, 3) NULL,
    `restockTarget` DECIMAL(14, 3) NULL,
    `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `qrTokenHash` VARCHAR(64) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryItem_sku_key`(`sku`),
    UNIQUE INDEX `InventoryItem_qrTokenHash_key`(`qrTokenHash`),
    INDEX `InventoryItem_active_name_idx`(`active`, `name`),
    INDEX `InventoryItem_category_name_idx`(`category`, `name`),
    INDEX `InventoryItem_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItemLocation` (
    `itemId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `lowStockThreshold` DECIMAL(14, 3) NULL,
    `criticalStockThreshold` DECIMAL(14, 3) NULL,
    `restockTarget` DECIMAL(14, 3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItemLocation_locationId_idx`(`locationId`),
    PRIMARY KEY (`itemId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMovement` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` ENUM('receive', 'issue', 'transfer', 'adjustment') NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `sourceLocationId` VARCHAR(191) NULL,
    `destinationLocationId` VARCHAR(191) NULL,
    `reason` VARCHAR(512) NULL,
    `note` VARCHAR(1000) NULL,
    `createdById` VARCHAR(191) NULL,
    `reversesMovementId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InventoryMovement_reversesMovementId_key`(`reversesMovementId`),
    INDEX `InventoryMovement_itemId_createdAt_idx`(`itemId`, `createdAt`),
    INDEX `InventoryMovement_sourceLocationId_createdAt_idx`(`sourceLocationId`, `createdAt`),
    INDEX `InventoryMovement_destinationLocationId_createdAt_idx`(`destinationLocationId`, `createdAt`),
    INDEX `InventoryMovement_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `InventoryMovement_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryStockAlertState` (
    `itemId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `status` ENUM('normal', 'low', 'critical') NOT NULL DEFAULT 'normal',
    `lastNotifiedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryStockAlertState_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`itemId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `inAppEnabled` BOOLEAN NOT NULL DEFAULT true,
    `pushEnabled` BOOLEAN NOT NULL DEFAULT true,
    `notifyManagers` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnRestored` BOOLEAN NOT NULL DEFAULT true,
    `repeatHours` INTEGER NOT NULL DEFAULT 24,
    `recipientUserIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InventoryLocation` ADD CONSTRAINT `InventoryLocation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryItemLocation` ADD CONSTRAINT `InventoryItemLocation_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryItemLocation` ADD CONSTRAINT `InventoryItemLocation_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `InventoryLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_sourceLocationId_fkey` FOREIGN KEY (`sourceLocationId`) REFERENCES `InventoryLocation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_destinationLocationId_fkey` FOREIGN KEY (`destinationLocationId`) REFERENCES `InventoryLocation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_reversesMovementId_fkey` FOREIGN KEY (`reversesMovementId`) REFERENCES `InventoryMovement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `InventoryStockAlertState` ADD CONSTRAINT `InventoryStockAlertState_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InventoryStockAlertState` ADD CONSTRAINT `InventoryStockAlertState_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `InventoryLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
