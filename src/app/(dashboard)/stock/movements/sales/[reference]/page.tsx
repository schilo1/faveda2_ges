import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, ReceiptText, UserRound } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const money = new Intl.NumberFormat("fr-CI", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

export default async function SaleDetailsPage({ params }: { params: { reference: string } }) {
  const { reference } = await params;
  const movements = await prisma.stockMovement.findMany({
    where: { type: "VENTE", referenceNumber: reference, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { nom: true, prenom: true, email: true } },
    },
  });

  if (movements.length === 0) notFound();

  const sale = movements[0];
  const total = movements.reduce((sum, movement) => {
    const lineTotal = Number(movement.totalPrice ?? Number(movement.unitPrice ?? 0) * movement.quantity);
    return sum + lineTotal;
  }, 0);
  const totalQuantity = movements.reduce((sum, movement) => sum + movement.quantity, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <img src="/logo-pdf.jpg" alt="FAVEDA" className="mb-4 h-20 w-auto object-contain" />
          <Link href="/stock/movements?type=VENTE" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#596744] hover:text-[#4F5C3D]">
            <ArrowLeft size={16} />
            Retour aux ventes
          </Link>
          <h1 className="page-title">Détails de la vente</h1>
          <p className="page-subtitle">Reçu {reference} · {format(sale.movementDate, "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
        </div>
        <div className="rounded-2xl bg-[#596744]/10 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#596744]/70">Total vente</p>
          <p className="text-2xl font-black text-[#4F5C3D]">{money.format(total)}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D9D7D2] bg-[#F3F3F3] text-[#596744]">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Informations client</h2>
              <p className="text-xs text-gray-400">Coordonnées liées à cette vente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoItem label="Nom" value={sale.customerName || "Client comptoir"} />
            <InfoItem icon={<Phone size={15} />} label="Téléphone" value={sale.customerPhone} />
            <InfoItem icon={<Mail size={15} />} label="Email" value={sale.customerEmail} />
            <InfoItem icon={<MapPin size={15} />} label="Adresse" value={sale.customerAddress} />
          </div>

          {sale.comment && (
            <div className="mt-4 rounded-2xl border border-[#D9D7D2]/70 bg-[#F3F3F3]/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Note</p>
              <p className="mt-1 text-sm text-gray-700">{sale.comment}</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-green-100 bg-green-50 text-green-700">
              <ReceiptText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Résumé</h2>
              <p className="text-xs text-gray-400">Vente et validation</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <SummaryLine label="Numéro reçu" value={reference} />
            <SummaryLine label="Articles" value={`${movements.length} type(s)`} />
            <SummaryLine label="Quantité totale" value={String(totalQuantity)} />
            <SummaryLine label="Validé par" value={sale.validatorName || "-"} />
            <SummaryLine label="Utilisateur" value={`${sale.user.prenom} ${sale.user.nom}`} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[#D9D7D2]/60 px-5 py-4">
          <h2 className="font-bold text-gray-800">Produits vendus</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D9D7D2]/60 bg-[#F3F3F3]">
              {["Produit", "SKU", "Quantité", "Prix unitaire", "Total"].map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D7D2]/40">
            {movements.map(movement => {
              const unitPrice = Number(movement.unitPrice ?? 0);
              const lineTotal = Number(movement.totalPrice ?? unitPrice * movement.quantity);
              return (
                <tr key={movement.id} className="hover:bg-[#F3F3F3]/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">{movement.product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{movement.product.sku}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">-{movement.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{money.format(unitPrice)}</td>
                  <td className="px-4 py-3 font-bold text-[#4F5C3D]">{money.format(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#D9D7D2]/60 bg-[#F3F3F3]/80">
              <td colSpan={4} className="px-4 py-4 text-right font-bold text-gray-700">Total</td>
              <td className="px-4 py-4 text-lg font-black text-[#4F5C3D]">{money.format(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D9D7D2]/70 bg-white p-4">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {icon}
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-gray-800">{value || "-"}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#D9D7D2]/50 pb-3 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-800">{value}</span>
    </div>
  );
}
