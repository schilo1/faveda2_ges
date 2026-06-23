"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";

export function PreorderActions({ id, status, totalAmount = 0, paidAmount = 0 }: { id: string; status: string; totalAmount?: number; paidAmount?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState("");
  const closed = ["ANNULEE", "REMBOURSEE", "LIVREE"].includes(status);
  const paymentLocked = ["ANNULEE", "REMBOURSEE"].includes(status);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  async function act(action: "cancel" | "refund" | "deliver" | "payment") {
    const reason = action === "deliver" ? null : window.prompt(action === "refund" ? "Motif du remboursement" : "Pourquoi le client annule ?");
    if (action !== "deliver" && reason === null) return;
    let deliveryPaidAmount = 0;
    if (action === "deliver" && remainingAmount > 0) {
      const restPaid = window.confirm(`Le client a-t-il payé le reste à la livraison ? Reste à payer : ${remainingAmount.toLocaleString("fr-FR")} FCFA`);
      if (restPaid) deliveryPaidAmount = remainingAmount;
    }
    setLoading(action);
    const res = await fetch(`/api/preorders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, deliveryPaidAmount }),
    });
    const data = await res.json().catch(() => null);
    setLoading("");
    if (!res.ok) {
      toast.error("Action impossible", data?.error ?? "La commande n'a pas été modifiée.");
      return;
    }
    toast.success(action === "deliver" && deliveryPaidAmount > 0 ? "Commande livrée et paiement complété" : "Commande mise à jour");
    router.refresh();
  }

  async function updatePayment() {
    const value = window.prompt("Nouveau montant du paiement", String(paidAmount));
    if (value === null) return;
    const nextPaidAmount = Number(value.replace(",", "."));
    if (!Number.isFinite(nextPaidAmount) || nextPaidAmount < 0) {
      toast.error("Montant invalide", "Saisissez un montant de paiement valide.");
      return;
    }
    if (nextPaidAmount > totalAmount) {
      toast.error("Montant invalide", `Le montant ne peut pas dépasser ${totalAmount.toLocaleString("fr-FR")} FCFA.`);
      return;
    }
    const reason = window.prompt("Motif de la correction du paiement");
    if (reason === null) return;

    setLoading("payment");
    const res = await fetch(`/api/preorders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payment", paidAmount: nextPaidAmount, reason }),
    });
    const data = await res.json().catch(() => null);
    setLoading("");
    if (!res.ok) {
      toast.error("Paiement non modifié", data?.error ?? "La correction du paiement a échoué.");
      return;
    }
    toast.success("Paiement corrigé", "La modification a été enregistrée dans l'historique.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!closed && (
        <>
          <button type="button" onClick={() => act("deliver")} disabled={!!loading} className="text-xs font-semibold text-[#596744] hover:underline">
            {loading === "deliver" ? "..." : "Livrer"}
          </button>
          <button type="button" onClick={() => act("cancel")} disabled={!!loading} className="text-xs font-semibold text-orange-600 hover:underline">
            {loading === "cancel" ? "..." : "Annuler"}
          </button>
          <button type="button" onClick={() => act("refund")} disabled={!!loading} className="text-xs font-semibold text-red-600 hover:underline">
            {loading === "refund" ? "..." : "Rembourser"}
          </button>
        </>
      )}
      {!paymentLocked && (
        <button type="button" onClick={updatePayment} disabled={!!loading} className="text-xs font-semibold text-[#9F7D16] hover:underline">
          {loading === "payment" ? "..." : "Corriger paiement"}
        </button>
      )}
    </div>
  );
}
