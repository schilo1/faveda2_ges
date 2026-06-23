import prisma from "@/lib/prisma";
import Link from "next/link";
import { Eye, Filter, Plus, ShoppingCart } from "lucide-react";
import { MovementBadge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { MovementType } from "@prisma/client";

const TYPES_POSITIFS = ["ENTREE", "RETOUR_CLIENT", "RETOUR_FOURNISSEUR"];

export default async function MovementsPage({ searchParams }: { searchParams: { type?: string; page?: string; from?: string; to?: string } }) {
  const { type, page, from, to } = await searchParams;
  const take = 20;
  const skip = ((parseInt(page ?? "1") - 1) * take);
  const dateEnd = to ? new Date(to) : null;
  if (dateEnd) dateEnd.setHours(23, 59, 59, 999);

  const where = {
    ...(type ? { type: type as MovementType } : {}),
    ...(from || dateEnd ? {
      movementDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(dateEnd ? { lte: dateEnd } : {}),
      },
    } : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, sku: true } }, user: { select: { nom: true, prenom: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  const types: MovementType[] = ["ENTREE","SORTIE","VENTE","PERTE","RETOUR_CLIENT","RETOUR_FOURNISSEUR","TRANSFERT","AJUSTEMENT"];
  const labels: Record<MovementType, string> = {
    ENTREE:"Entrée",SORTIE:"Sortie",VENTE:"Vente",PERTE:"Perte",
    RETOUR_CLIENT:"Retour client",RETOUR_FOURNISSEUR:"Retour fourn.",
    TRANSFERT:"Transfert",AJUSTEMENT:"Ajustement",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mouvements de stock</h1>
          <p className="page-subtitle">{total} mouvement(s) au total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/stock/movements/sale" className="btn-primary flex items-center gap-2">
            <ShoppingCart size={16} />
            Nouvelle vente
          </Link>
          <Link href="/stock/movements/new" className="btn-secondary flex items-center gap-2">
            <Plus size={16} />
            Mouvement simple
          </Link>
        </div>
      </div>

      {/* Filter chips */}
      <form className="card mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <select name="type" defaultValue={type ?? ""} className="input">
          <option value="">Tous les types</option>
          {types.map(t => <option key={t} value={t}>{labels[t]}</option>)}
        </select>
        <input name="from" type="date" defaultValue={from} className="input" aria-label="Date début" />
        <input name="to" type="date" defaultValue={to} className="input" aria-label="Date fin" />
        <button type="submit" className="btn-primary gap-2 whitespace-nowrap">
          <Filter size={15} />
          Filtrer
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link href={`/stock/movements?${from ? `from=${from}&` : ""}${to ? `to=${to}` : ""}`} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!type ? "bg-[#596744] text-white border-[#596744]" : "border-[#D9D7D2] text-gray-600 hover:bg-white"}`}>
          Tous
        </Link>
        {types.map(t => (
          <Link key={t} href={`/stock/movements?type=${t}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${type === t ? "bg-[#596744] text-white border-[#596744]" : "border-[#D9D7D2] text-gray-600 hover:bg-white"}`}>
            {labels[t]}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D9D7D2]/60 bg-[#F3F3F3]">
              {["Date","Produit","Type","Quantité","Client","Motif","Validé par","Utilisateur","Détails"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D7D2]/40">
            {movements.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Aucun mouvement</td></tr>
            )}
            {movements.map(m => (
              <tr key={m.id} className="hover:bg-[#F3F3F3]/70">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(m.movementDate, "dd MMM yyyy HH:mm", { locale: fr })}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{m.product.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{m.product.sku}</p>
                </td>
                <td className="px-4 py-3"><MovementBadge type={m.type} /></td>
                <td className="px-4 py-3 font-semibold">
                  <span className={TYPES_POSITIFS.includes(m.type) ? "text-green-700" : "text-red-600"}>
                    {TYPES_POSITIFS.includes(m.type) ? "+" : "-"}{m.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {m.type === "VENTE" ? (
                    <div className="max-w-[150px]">
                      <p className="truncate font-medium text-gray-700">{m.customerName || "Client comptoir"}</p>
                      {m.customerPhone && <p className="text-xs text-gray-400">{m.customerPhone}</p>}
                    </div>
                  ) : "-"}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{m.motif ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600">{m.validatorName ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600">{`${m.user.prenom} ${m.user.nom}`}</td>
                <td className="px-4 py-3">
                  {m.type === "VENTE" && m.referenceNumber ? (
                    <Link
                      href={`/stock/movements/sales/${m.referenceNumber}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#D9D7D2] px-2.5 py-1.5 text-xs font-semibold text-[#596744] transition hover:bg-[#F3F3F3]"
                    >
                      <Eye size={14} />
                      Voir
                    </Link>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > take && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / take) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/stock/movements?${type ? `type=${type}&` : ""}${from ? `from=${from}&` : ""}${to ? `to=${to}&` : ""}page=${p}`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-colors ${parseInt(page ?? "1") === p ? "bg-[#596744] text-white border-[#596744]" : "border-[#D9D7D2] hover:bg-white"}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
