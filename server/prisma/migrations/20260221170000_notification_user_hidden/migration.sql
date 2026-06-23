ALTER TABLE `Notification`
  ADD COLUMN `userHiddenAt` DATETIME(3) NULL;

CREATE INDEX `Notification_userId_userHiddenAt_createdAt_idx`
  ON `Notification`(`userId`, `userHiddenAt`, `createdAt`);
