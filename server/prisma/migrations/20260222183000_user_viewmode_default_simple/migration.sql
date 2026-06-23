ALTER TABLE `User`
  MODIFY `viewMode` ENUM('simple','tasks') NOT NULL DEFAULT 'simple';

UPDATE `User`
SET `viewMode` = 'simple'
WHERE `viewMode` <> 'simple';
