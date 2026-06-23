import prisma from "@/lib/prisma";
import { ProductBatchesEditor } from "@/components/products/ProductBatchesEditor";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProductLotsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      unit: true,
      batches: {
        where: { deletedAt: null },
        orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
      },
    },
  });

  if (!product) notFound();

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lots du produit</h1>
          <p className="page-subtitle">
            <span className="font-semibold text-gray-700">{product.name}</span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="font-mono">{product.sku}</span>
          </p>
        </div>
        <Link href="/products" className="btn-secondary">Retour aux produits</Link>
      </div>

      <div className="card p-5 sm:p-6">
        <ProductBatchesEditor
          productId={product.id}
          unitSymbol={product.unit.symbol}
          initialBatches={product.batches.map(batch => ({
            id: batch.id,
            batchNumber: batch.batchNumber ?? "",
            quantity: batch.quantity,
            expiryDate: batch.expiryDate ? batch.expiryDate.toISOString().slice(0, 10) : "",
            receivedAt: batch.receivedAt.toISOString().slice(0, 10),
          }))}
        />
      </div>
    </div>
  );
}
