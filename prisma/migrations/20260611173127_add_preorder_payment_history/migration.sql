-- CreateTable
CREATE TABLE `preorder_payment_histories` (
    `id` VARCHAR(191) NOT NULL,
    `oldPaidAmount` DECIMAL(12, 2) NOT NULL,
    `newPaidAmount` DECIMAL(12, 2) NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `preorderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `preorder_payment_histories_preorderId_idx`(`preorderId`),
    INDEX `preorder_payment_histories_userId_idx`(`userId`),
    INDEX `preorder_payment_histories_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `preorder_payment_histories` ADD CONSTRAINT `preorder_payment_histories_preorderId_fkey` FOREIGN KEY (`preorderId`) REFERENCES `preorders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preorder_payment_histories` ADD CONSTRAINT `preorder_payment_histories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
