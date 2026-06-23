ALTER TABLE `Event`
  ADD COLUMN `scope` ENUM('private','team','global') NOT NULL DEFAULT 'global' AFTER `description`;

CREATE TABLE `RolePolicy` (
  `id` VARCHAR(191) NOT NULL,
  `role` ENUM('system_admin','admin','boss','hr','user') NOT NULL,
  `permissionsJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `RolePolicy_role_key`(`role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserPermissionOverride` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `permission` VARCHAR(191) NOT NULL,
  `effect` ENUM('allow','deny') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `UserPermissionOverride_userId_idx`(`userId`),
  UNIQUE INDEX `UserPermissionOverride_userId_permission_key`(`userId`, `permission`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserPermissionOverride`
  ADD CONSTRAINT `UserPermissionOverride_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
