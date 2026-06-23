import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function InventoryPage() {
  const inventories = await prisma.inventory.findMany({
    where: { deletedAt: null },
    include: { product: { select: { name: true, sku: true } }, user: { select: { nom: true, prenom: true } } },
    orderBy: { inventoryDate: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventaire physique</h1>
          <p className="page-subtitle">{inventories.length} entrée(s) contrôlée(s)</p>
        </div>
        <Link href="/inventory/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouvel inventaire
        </Link>
      </div>

      {inventories.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun inventaire enregistré</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D9D7D2]/60 bg-[#F3F3F3]">
                {["Date","Produit","Stock théorique","Stock réel","Écart","Justification","Utilisateur"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D7D2]/40">
              {inventories.map(inv => {
                const diff = inv.physicalQty - inv.theoreticalQty;
                return (
                  <tr key={inv.id} className="hover:bg-[#F3F3F3]/70">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(inv.inventoryDate, "dd MMM yyyy", { locale: fr })}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{inv.product.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{inv.product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{inv.theoreticalQty}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{inv.physicalQty}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{inv.justification ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{`${inv.user.prenom} ${inv.user.nom}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
