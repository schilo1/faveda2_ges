-- AlterTable
ALTER TABLE `stock_movements` ADD COLUMN `customerAddress` TEXT NULL,
    ADD COLUMN `customerEmail` VARCHAR(191) NULL,
    ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NULL,
    ADD COLUMN `totalPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `unitPrice` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `product_batches` (
    `id` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NULL,
    `initialQuantity` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `productId` VARCHAR(191) NOT NULL,
    `movementId` VARCHAR(191) NULL,

    INDEX `product_batches_productId_expiryDate_idx`(`productId`, `expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_movementId_fkey` FOREIGN KEY (`movementId`) REFERENCES `stock_movements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
