ALTER TABLE `User`
  MODIFY `role` ENUM('system_admin','admin','boss','hr','user','role_a','role_b','role_c','role_d') NOT NULL DEFAULT 'user';

ALTER TABLE `RolePolicy`
  MODIFY `role` ENUM('system_admin','admin','boss','hr','user','role_a','role_b','role_c','role_d') NOT NULL,
  ADD COLUMN `displayName` VARCHAR(64) NULL AFTER `role`;
