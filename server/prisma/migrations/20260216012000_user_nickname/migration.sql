ALTER TABLE `User`
  ADD COLUMN `nickname` VARCHAR(64) NULL AFTER `username`;

UPDATE `User`
SET `nickname` = `username`
WHERE `nickname` IS NULL OR `nickname` = '';
