ALTER TABLE `User`
  MODIFY `role` ENUM('system_admin','admin','boss','hr','user') NOT NULL DEFAULT 'user',
  ADD COLUMN `status` ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending' AFTER `role`,
  ADD COLUMN `viewMode` ENUM('simple','tasks') NOT NULL DEFAULT 'tasks' AFTER `status`;

UPDATE `User` SET `status` = 'active' WHERE `status` = 'pending';
UPDATE `User` SET `role` = 'system_admin' WHERE `role` = 'admin';
