import prisma from "@/lib/prisma";
import { ProductForm } from "@/components/forms/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const [product, categories, units, suppliers] = await Promise.all([
    prisma.product.findFirst({ where: { id, deletedAt: null } }),
    prisma.category.findMany({ where: { deletedAt: null } }),
    prisma.unit.findMany({ where: { deletedAt: null } }),
    prisma.supplier.findMany({ where: { deletedAt: null } }),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
        <h1 className="page-title">Modifier le produit</h1>
        <p className="page-subtitle font-mono">{product.sku}</p>
        </div>
        <Link href={`/products/${product.id}/lots`} className="btn-secondary">Modifier les lots</Link>
      </div>
      <div className="card p-6">
        <ProductForm
          categories={categories}
          units={units}
          suppliers={suppliers}
          product={{
            ...product,
            buyPrice: Number(product.buyPrice),
            sellPrice: Number(product.sellPrice),
          }}
        />
      </div>
    </div>
  );
}
