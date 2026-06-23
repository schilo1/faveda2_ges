import prisma from "@/lib/prisma";
import { ProductForm } from "@/components/forms/ProductForm";

export default async function NewProductPage() {
  const [categories, units, suppliers] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null } }),
    prisma.unit.findMany({ where: { deletedAt: null } }),
    prisma.supplier.findMany({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
        <h1 className="page-title">Nouveau produit</h1>
        <p className="page-subtitle">Le SKU sera généré automatiquement</p>
        </div>
      </div>
      <div className="card p-6">
        <ProductForm categories={categories} units={units} suppliers={suppliers} />
      </div>
    </div>
  );
}
