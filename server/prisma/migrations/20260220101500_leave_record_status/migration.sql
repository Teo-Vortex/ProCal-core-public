ALTER TABLE `LeaveRecord`
  ADD COLUMN `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER `leaveType`,
  ADD INDEX `LeaveRecord_status_startDate_idx`(`status`, `startDate`);
