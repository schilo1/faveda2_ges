import prisma from "@/lib/prisma";
import { SaleForm } from "@/components/forms/SaleForm";

export default async function SalePage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, sku: true, currentStock: true, sellPrice: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouvelle vente</h1>
          <p className="page-subtitle">Vendre plusieurs produits et générer un reçu PDF partageable.</p>
        </div>
      </div>

      <SaleForm products={products.map(product => ({
        ...product,
        sellPrice: Number(product.sellPrice),
      }))} />
    </div>
  );
}
