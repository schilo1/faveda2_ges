-- CreateTable
CREATE TABLE `raw_materials` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `currentStock` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `minimumStock` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `estimatedUnitCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `supplierId` VARCHAR(191) NULL,

    UNIQUE INDEX `raw_materials_name_deletedAt_key`(`name`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_budgets` (
    `id` VARCHAR(191) NOT NULL,
    `month` DATETIME(3) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `finance_budgets_month_idx`(`month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `raw_material_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'MATIERE_PREMIERE',
    `quantity` DECIMAL(12, 2) NULL,
    `unitCost` DECIMAL(12, 2) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `spentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `materialId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `raw_material_expenses_spentAt_idx`(`spentAt`),
    INDEX `raw_material_expenses_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_material_recipes` (
    `id` VARCHAR(191) NOT NULL,
    `quantityPerUnit` DECIMAL(12, 4) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `product_material_recipes_productId_materialId_key`(`productId`, `materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_budgets` ADD CONSTRAINT `finance_budgets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_expenses` ADD CONSTRAINT `raw_material_expenses_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `raw_materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_expenses` ADD CONSTRAINT `raw_material_expenses_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_expenses` ADD CONSTRAINT `raw_material_expenses_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_expenses` ADD CONSTRAINT `raw_material_expenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_material_recipes` ADD CONSTRAINT `product_material_recipes_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_material_recipes` ADD CONSTRAINT `product_material_recipes_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `raw_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
