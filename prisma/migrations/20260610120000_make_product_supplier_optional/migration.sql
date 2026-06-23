-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_supplierId_fkey`;

-- AlterTable
ALTER TABLE `products` MODIFY `supplierId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
