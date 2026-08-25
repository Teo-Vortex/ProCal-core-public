ALTER TABLE `Task` DROP FOREIGN KEY `Task_eventId_fkey`;

ALTER TABLE `Task`
  MODIFY `eventId` VARCHAR(191) NULL,
  ADD COLUMN `legacyKey` VARCHAR(300) NULL,
  ADD COLUMN `legacyEventId` VARCHAR(191) NULL,
  ADD COLUMN `legacyDateKey` VARCHAR(10) NULL,
  ADD COLUMN `scope` ENUM('personal', 'shared') NOT NULL DEFAULT 'shared',
  ADD COLUMN `kind` ENUM('dated', 'ongoing') NOT NULL DEFAULT 'dated',
  ADD COLUMN `source` ENUM('standalone', 'event') NOT NULL DEFAULT 'event',
  ADD COLUMN `categoryId` VARCHAR(191) NULL,
  ADD COLUMN `scheduledOn` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Task_legacyKey_key` ON `Task`(`legacyKey`);
CREATE INDEX `Task_scope_source_status_idx` ON `Task`(`scope`, `source`, `status`);
CREATE INDEX `Task_legacyEventId_idx` ON `Task`(`legacyEventId`);
CREATE INDEX `Task_scheduledOn_idx` ON `Task`(`scheduledOn`);
CREATE INDEX `Task_ownerId_status_idx` ON `Task`(`ownerId`, `status`);

ALTER TABLE `Task`
  ADD CONSTRAINT `Task_eventId_fkey`
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TaskMember`
  ADD COLUMN `assignmentMode` ENUM('direct', 'invite') NOT NULL DEFAULT 'direct',
  ADD COLUMN `invitationStatus` ENUM('not_required', 'pending', 'accepted', 'declined', 'removed') NOT NULL DEFAULT 'not_required',
  ADD COLUMN `status` ENUM('open', 'in_progress', 'done') NOT NULL DEFAULT 'open',
  ADD COLUMN `startedOn` DATETIME(3) NULL,
  ADD COLUMN `completedOn` DATETIME(3) NULL,
  ADD COLUMN `respondedAt` DATETIME(3) NULL,
  ADD COLUMN `removedAt` DATETIME(3) NULL,
  ADD COLUMN `assignedById` VARCHAR(191) NULL,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

CREATE INDEX `TaskMember_userId_invitationStatus_status_idx`
  ON `TaskMember`(`userId`, `invitationStatus`, `status`);
CREATE INDEX `TaskMember_assignedById_idx` ON `TaskMember`(`assignedById`);

ALTER TABLE `TaskMember`
  ADD CONSTRAINT `TaskMember_assignedById_fkey`
  FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
