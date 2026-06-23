-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'GESTIONNAIRE', 'SURVEILLANT', 'COMMERCIAL') NOT NULL DEFAULT 'SURVEILLANT';

-- CreateTable
CREATE TABLE `preorders` (
    `id` VARCHAR(191) NOT NULL,
    `referenceNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('EN_ATTENTE', 'PAYEE', 'LIVREE', 'ANNULEE', 'REMBOURSEE') NOT NULL DEFAULT 'PAYEE',
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerAddress` TEXT NULL,
    `comment` TEXT NULL,
    `cancelReason` TEXT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL,
    `preorderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `canceledAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `preorders_referenceNumber_key`(`referenceNumber`),
    INDEX `preorders_status_idx`(`status`),
    INDEX `preorders_preorderDate_idx`(`preorderDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preorder_items` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `preorderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,

    INDEX `preorder_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `preorders` ADD CONSTRAINT `preorders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preorder_items` ADD CONSTRAINT `preorder_items_preorderId_fkey` FOREIGN KEY (`preorderId`) REFERENCES `preorders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preorder_items` ADD CONSTRAINT `preorder_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
