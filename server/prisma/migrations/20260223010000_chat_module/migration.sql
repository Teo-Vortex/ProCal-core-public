CREATE TABLE `ChatMessage` (
  `id` VARCHAR(191) NOT NULL,
  `scope` ENUM('global','direct') NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `recipientUserId` VARCHAR(191) NULL,
  `body` VARCHAR(4000) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ChatMessage_scope_createdAt_idx`(`scope`, `createdAt`),
  INDEX `ChatMessage_recipientUserId_createdAt_idx`(`recipientUserId`, `createdAt`),
  INDEX `ChatMessage_senderId_createdAt_idx`(`senderId`, `createdAt`),
  CONSTRAINT `ChatMessage_senderId_fkey`
    FOREIGN KEY (`senderId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ChatMessage_recipientUserId_fkey`
    FOREIGN KEY (`recipientUserId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChatThreadRead` (
  `userId` VARCHAR(191) NOT NULL,
  `threadKey` VARCHAR(191) NOT NULL,
  `lastReadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`userId`, `threadKey`),
  INDEX `ChatThreadRead_userId_updatedAt_idx`(`userId`, `updatedAt`),
  CONSTRAINT `ChatThreadRead_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
