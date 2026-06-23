import prisma from "@/lib/prisma";
import { InventoryForm } from "@/components/forms/InventoryForm";
import { ClipboardList } from "lucide-react";

export default async function NewInventoryPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      unit: { select: { symbol: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouvel inventaire</h1>
          <p className="page-subtitle">Comparez le stock physique au stock théorique puis ajustez les quantités.</p>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#596744]/10 text-[#596744] sm:flex">
          <ClipboardList size={22} />
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        {products.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">Aucun produit disponible</p>
            <p className="mt-1 text-sm text-gray-400">Ajoutez d&apos;abord des produits pour lancer un inventaire.</p>
          </div>
        ) : (
          <InventoryForm products={products} />
        )}
      </div>
    </div>
  );
}
