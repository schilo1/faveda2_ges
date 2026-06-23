import prisma from "@/lib/prisma";
import { NewMovementPanel } from "@/components/stock/NewMovementPanel";

export default async function NewMovementPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, sku: true, currentStock: true },
    orderBy: { name: "asc" },
  });

  return <NewMovementPanel products={products} />;
}
