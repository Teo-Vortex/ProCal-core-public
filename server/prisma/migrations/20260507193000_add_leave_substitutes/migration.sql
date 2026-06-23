ALTER TABLE `LeaveRecord`
  ADD COLUMN `substituteUserId` VARCHAR(191) NULL;

CREATE INDEX `LeaveRecord_substituteUserId_startDate_endDate_idx`
  ON `LeaveRecord`(`substituteUserId`, `startDate`, `endDate`);

ALTER TABLE `LeaveRecord`
  ADD CONSTRAINT `LeaveRecord_substituteUserId_fkey`
  FOREIGN KEY (`substituteUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
