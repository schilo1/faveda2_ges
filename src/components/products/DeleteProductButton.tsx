"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type Props = {
  productId: string;
  productName: string;
};

export function DeleteProductButton({ productId, productName }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function remove() {
    const confirmed = window.confirm(`Supprimer le produit "${productName}" ?`);
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      toast.error("Produit non supprimé", data?.error ?? "Impossible de supprimer ce produit.");
      return;
    }

    toast.success("Produit supprimé", `"${productName}" a été retiré du catalogue.`);
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
