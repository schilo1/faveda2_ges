"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";

export function DeleteAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm("Supprimer cette alerte ?")) return;

    setLoading(true);
    const res = await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      toast.error("Suppression impossible", data?.error ?? "L'alerte n'a pas été supprimée.");
      return;
    }

    toast.success("Alerte supprimée");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-xl border border-red-100 p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Supprimer l'alerte"
      title="Supprimer l'alerte"
    >
      <Trash2 size={16} />
    </button>
  );
}
