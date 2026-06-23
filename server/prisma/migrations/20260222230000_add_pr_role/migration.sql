ALTER TABLE `User`
  MODIFY `role` ENUM('system_admin','admin','boss','hr','pr','user','role_a','role_b','role_c','role_d') NOT NULL DEFAULT 'user';

ALTER TABLE `RolePolicy`
  MODIFY `role` ENUM('system_admin','admin','boss','hr','pr','user','role_a','role_b','role_c','role_d') NOT NULL;
