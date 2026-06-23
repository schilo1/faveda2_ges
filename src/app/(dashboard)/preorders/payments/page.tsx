import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const money = new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function PreorderPaymentHistoryPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") notFound();

  const histories = await prisma.preorderPaymentHistory.findMany({
    include: {
      preorder: {
        select: {
          id: true,
          referenceNumber: true,
          customerName: true,
          customerPhone: true,
          totalAmount: true,
          status: true,
        },
      },
      user: { select: { prenom: true, nom: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-5">
        <Link href="/preorders" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#596744]">
          <ArrowLeft size={16} />
          Retour aux précommandes
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Historique des paiements</h1>
          <p className="page-subtitle">Corrections et validations de paiements des précommandes.</p>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-[#C9A227]/30 bg-[#FFF3C4]/60 text-[#9F7D16] sm:flex">
          <History size={20} />
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[#D9D7D2]/60 px-5 py-4">
          <h2 className="font-bold text-gray-800">Dernières modifications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Date", "Précommande", "Client", "Ancien", "Nouveau", "Écart", "Vérifié par", "Motif"].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D7D2]/40">
              {histories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune modification de paiement</td>
                </tr>
              ) : histories.map(history => {
                const oldAmount = Number(history.oldPaidAmount);
                const newAmount = Number(history.newPaidAmount);
                const delta = newAmount - oldAmount;
                return (
                  <tr key={history.id} className="hover:bg-[#F3F3F3]/70">
                    <td className="px-4 py-3 text-gray-600">{dateFormat.format(history.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/preorders/${history.preorder.id}`} className="font-mono text-xs font-semibold text-[#596744] hover:underline">
                        {history.preorder.referenceNumber}
                      </Link>
                      <p className="mt-1 text-xs text-gray-400">{history.preorder.status}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{history.preorder.customerName || "Client comptoir"}</p>
                      <p className="text-xs text-gray-400">{history.preorder.customerPhone || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{money.format(oldAmount)}</td>
                    <td className="px-4 py-3 font-bold text-[#596744]">{money.format(newAmount)}</td>
                    <td className={`px-4 py-3 font-bold ${delta < 0 ? "text-red-600" : "text-[#9F7D16]"}`}>
                      {delta > 0 ? "+" : ""}{money.format(delta)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{history.user.prenom} {history.user.nom}</p>
                      <p className="text-xs text-gray-400">{history.user.email}</p>
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-gray-600">{history.reason || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
