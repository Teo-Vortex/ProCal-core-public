CREATE TABLE `EventReminderDelivery` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `reminderKey` VARCHAR(191) NOT NULL,
  `eventId` VARCHAR(191) NOT NULL,
  `dueAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `EventReminderDelivery_userId_reminderKey_key`(`userId`, `reminderKey`),
  INDEX `EventReminderDelivery_dueAt_idx`(`dueAt`),
  INDEX `EventReminderDelivery_eventId_idx`(`eventId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EventReminderDelivery`
  ADD CONSTRAINT `EventReminderDelivery_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
