"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type Props = {
  supplierId: string;
  supplierName: string;
};

export function DeleteSupplierButton({ supplierId, supplierName }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function remove() {
    const confirmed = window.confirm(`Supprimer le fournisseur "${supplierName}" ?`);
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/suppliers/${supplierId}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      toast.error("Fournisseur non supprimé", data?.error ?? "Impossible de supprimer ce fournisseur.");
      return;
    }

    toast.success("Fournisseur supprimé", `"${supplierName}" a été retiré de la liste.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 size={13} />
      {loading ? "Suppression..." : "Supprimer"}
    </button>
  );
}
