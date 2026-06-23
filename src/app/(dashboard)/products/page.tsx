import prisma from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { Plus, Search } from "lucide-react";
import { StockBadge } from "@/components/ui/Badge";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);
}

export default async function ProductsPage({ searchParams }: { searchParams: { q?: string; cat?: string; expFrom?: string; expTo?: string } }) {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const { q, cat, expFrom, expTo } = await searchParams;
  const expiryEnd = expTo ? new Date(expTo) : null;
  if (expiryEnd) expiryEnd.setHours(23, 59, 59, 999);

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(q ? { name: { contains: q } } : {}),
      ...(cat ? { categoryId: cat } : {}),
      ...(expFrom || expiryEnd ? {
        OR: [
          {
            expiryDate: {
              ...(expFrom ? { gte: new Date(expFrom) } : {}),
              ...(expiryEnd ? { lte: expiryEnd } : {}),
            },
          },
          {
            batches: {
              some: {
                deletedAt: null,
                quantity: { gt: 0 },
                expiryDate: {
                  ...(expFrom ? { gte: new Date(expFrom) } : {}),
                  ...(expiryEnd ? { lte: expiryEnd } : {}),
                },
              },
            },
          },
        ],
      } : {}),
    },
    include: {
      category: true,
      unit: true,
      supplier: true,
      batches: {
        where: { deletedAt: null, quantity: { gt: 0 } },
        orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
        take: 3,
      },
    },
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({ where: { deletedAt: null } });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Produits</h1>
          <p className="page-subtitle">{products.length} produit(s) dans le catalogue</p>
        </div>
        <Link href="/products/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau produit
        </Link>
      </div>

      {/* Filters */}
      <form className="card p-4 mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={q} placeholder="Rechercher..." className="input pl-9" />
        </div>
        <div>
          <select name="cat" defaultValue={cat} className="input">
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <input name="expFrom" type="date" defaultValue={expFrom} className="input" aria-label="Péremption du" />
        <input name="expTo" type="date" defaultValue={expTo} className="input" aria-label="Péremption au" />
        <button type="submit" className="btn-primary whitespace-nowrap">Filtrer</button>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D9D7D2]/60 bg-[#F3F3F3]">
              {["Produit", "SKU", "Catégorie", "Stock", "Prix vente", "Lots actifs", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D7D2]/40">
            {products.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Aucun produit trouvé</td></tr>
            )}
            {products.map(p => {
              const visibleBatches = p.batches.length > 0
                ? p.batches
                : p.expiryDate
                  ? [{
                      id: "legacy",
                      batchNumber: "Ancienne date",
                      quantity: p.currentStock,
                      expiryDate: p.expiryDate,
                    }]
                  : [];

              return (
              <tr key={p.id} className="hover:bg-[#F3F3F3]/70">
                <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                <td className="px-4 py-3 text-gray-600">{p.category.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.currentStock}</span>
                    <span className="text-gray-400 text-xs">{p.unit.symbol}</span>
                    <StockBadge current={p.currentStock} minimum={p.minimumStock} />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{fmt(Number(p.sellPrice))}</td>
                <td className="px-4 py-3 text-gray-600">
                  {visibleBatches.length === 0 ? (
                    <span className="text-gray-400">Aucun lot</span>
                  ) : (
                    <div className="space-y-1.5">
                      {visibleBatches.map(batch => (
                        <div key={batch.id} className="inline-flex max-w-[230px] flex-wrap items-center gap-1.5 rounded-xl bg-[#F3F3F3] px-2.5 py-1 text-xs ring-1 ring-[#D9D7D2]/70">
                          <span className="font-semibold text-[#596744]">{batch.batchNumber || "Lot sans numéro"}</span>
                          <span className="text-gray-400">•</span>
                          <span>{batch.quantity} {p.unit.symbol}</span>
                          <span className="text-gray-400">•</span>
                          <span>{batch.expiryDate ? format(batch.expiryDate, "dd MMM yyyy", { locale: fr }) : "Sans péremption"}</span>
                        </div>
                      ))}
                      {p.batches.length > visibleBatches.length && (
                        <p className="text-[11px] font-medium text-gray-400">+{p.batches.length - visibleBatches.length} autre(s) lot(s)</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/products/${p.id}/edit`} className="text-[#596744] hover:underline text-xs font-medium">Modifier</Link>
                    <Link href={`/products/${p.id}/lots`} className="text-[#596744] hover:underline text-xs font-medium">Lots</Link>
                    {isAdmin && <DeleteProductButton productId={p.id} productName={p.name} />}
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
