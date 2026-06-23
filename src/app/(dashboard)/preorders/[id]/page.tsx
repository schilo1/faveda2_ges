import { auth } from "@/auth";
import { PreorderActions } from "@/components/preorders/PreorderActions";
import prisma from "@/lib/prisma";
import { ArrowLeft, CalendarDays, CheckCircle2, Coins, Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const money = new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    EN_ATTENTE: "En attente",
    PAYEE: "Payée",
    LIVREE: "Livrée",
    ANNULEE: "Annulée",
    REMBOURSEE: "Remboursée",
  };
  return labels[status] ?? status;
}

export default async function PreorderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isCommercial = role === "COMMERCIAL";

  const preorder = await prisma.preorder.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      ...(isCommercial ? { userId } : {}),
    },
    include: {
      user: { select: { prenom: true, nom: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true, currentStock: true, buyPrice: true, sellPrice: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!preorder) notFound();

  const totalAmount = Number(preorder.totalAmount);
  const paidAmount = Number(preorder.paidAmount);
  const totalQty = preorder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <div className="mb-5">
        <Link href="/preorders" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#596744]">
          <ArrowLeft size={16} />
          Retour aux commandes
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="page-title">Détails de la commande</h1>
            <span className="rounded-full bg-[#596744]/10 px-3 py-1 text-sm font-bold text-[#596744]">
              {statusLabel(preorder.status)}
            </span>
          </div>
          <p className="page-subtitle font-mono text-sm">{preorder.referenceNumber}</p>
        </div>
        <PreorderActions id={preorder.id} status={preorder.status} totalAmount={totalAmount} paidAmount={paidAmount} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat title="Total" value={money.format(totalAmount)} icon={Coins} />
        <Stat title="Articles" value={`${totalQty} unité(s)`} icon={Package} />
        <Stat title="Statut" value={statusLabel(preorder.status)} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden">
          <div className="border-b border-[#D9D7D2]/60 px-5 py-4">
            <h2 className="font-bold text-gray-800">Produits commandés</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Produit", "SKU", "Qté", "Stock actuel", "Prix", "Total"].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D7D2]/40">
                {preorder.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{item.product.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.product.sku}</td>
                    <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-700">{item.product.currentStock}</td>
                    <td className="px-4 py-3 text-gray-700">{money.format(Number(item.unitPrice))}</td>
                    <td className="px-4 py-3 font-bold text-[#596744]">{money.format(Number(item.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 font-bold text-gray-800">Client</h2>
            <Info label="Nom" value={preorder.customerName || "Client comptoir"} />
            <Info label="Téléphone" value={preorder.customerPhone || "-"} />
            <Info label="Email" value={preorder.customerEmail || "-"} />
            <Info label="Adresse" value={preorder.customerAddress || "-"} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold text-gray-800">Suivi</h2>
            <Info label="Commercial" value={`${preorder.user.prenom} ${preorder.user.nom}`} />
            <Info label="Email commercial" value={preorder.user.email} />
            <Info label="Créée le" value={dateFormat.format(preorder.preorderDate)} />
            {preorder.deliveredAt && <Info label="Livrée le" value={dateFormat.format(preorder.deliveredAt)} />}
            {preorder.canceledAt && <Info label="Clôturée le" value={dateFormat.format(preorder.canceledAt)} />}
            {preorder.cancelReason && <Info label="Motif" value={preorder.cancelReason} tone="danger" />}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center gap-2 text-[#596744]">
              <CalendarDays size={18} />
              <h2 className="font-bold text-gray-800">Note</h2>
            </div>
            <p className="text-sm leading-6 text-gray-600">
              {preorder.comment || "Aucune note ajoutée à cette commande."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#596744]/10 text-[#596744]">
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="border-b border-[#D9D7D2]/50 py-3 last:border-0 last:pb-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${tone === "danger" ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}
