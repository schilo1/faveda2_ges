"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type BatchRow = {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
  deleted?: boolean;
};

interface Props {
  productId: string;
  unitSymbol: string;
  initialBatches: BatchRow[];
}

export function ProductBatchesEditor({ productId, unitSymbol, initialBatches }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [batches, setBatches] = useState(initialBatches);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const activeTotal = batches
    .filter(batch => !batch.deleted)
    .reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);

  function updateBatch(id: string, patch: Partial<BatchRow>) {
    setBatches(current => current.map(batch => batch.id === id ? { ...batch, ...patch } : batch));
  }

  async function save() {
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/products/${productId}/batches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batches: batches.map(batch => ({
          id: batch.id,
          batchNumber: batch.batchNumber || null,
          quantity: Number(batch.quantity),
          expiryDate: batch.expiryDate || null,
          delete: Boolean(batch.deleted),
        })),
      }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      const message = data?.error ?? "Impossible d'enregistrer les lots.";
      setMessage(message);
      toast.error("Lots non enregistrés", message);
      return;
    }

    setMessage("Lots mis à jour avec succès.");
    toast.success("Lots mis à jour", "Le stock du produit a été recalculé.");
    router.refresh();
  }

  if (initialBatches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/70 p-8 text-center">
        <p className="font-medium text-gray-600">Aucun lot actif pour ce produit.</p>
        <p className="mt-1 text-sm text-gray-400">Créez une entrée de stock pour générer un lot avec numéro et date de péremption.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#D9D7D2]/70 bg-[#F3F3F3]/70 px-4 py-3">
        <p className="text-sm font-semibold text-gray-700">
          Stock total après modification : <span className="text-[#596744]">{activeTotal} {unitSymbol}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">Modifier les quantités recalculera automatiquement le stock du produit.</p>
      </div>

      <div className="space-y-3">
        {batches.map(batch => (
          <div
            key={batch.id}
            className={`rounded-2xl border p-4 transition ${
              batch.deleted
                ? "border-red-200 bg-red-50/70 opacity-70"
                : "border-[#D9D7D2]/70 bg-white/85"
            }`}
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.7fr_0.8fr_0.6fr_auto]">
              <div>
                <label className="label">N° lot</label>
                <input
                  value={batch.batchNumber}
                  disabled={batch.deleted}
                  onChange={e => updateBatch(batch.id, { batchNumber: e.target.value })}
                  className="input"
                  placeholder="Lot sans numéro"
                />
              </div>

              <div>
                <label className="label">Quantité</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={batch.quantity}
                  disabled={batch.deleted}
                  onChange={e => updateBatch(batch.id, { quantity: Number(e.target.value) })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Péremption</label>
                <input
                  type="date"
                  value={batch.expiryDate}
                  disabled={batch.deleted}
                  onChange={e => updateBatch(batch.id, { expiryDate: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Réception</label>
                <div className="flex h-[42px] items-center rounded-xl border border-[#D9D7D2] bg-[#F3F3F3]/80 px-3 text-sm text-gray-600">
                  {batch.receivedAt || "-"}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => updateBatch(batch.id, { deleted: !batch.deleted })}
                  className={`flex h-[42px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                    batch.deleted
                      ? "border-[#D9D7D2] bg-white text-gray-600 hover:bg-[#F3F3F3]"
                      : "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 size={15} />
                  {batch.deleted ? "Restaurer" : "Retirer"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[#D9D7D2]/60 pt-5">
        <button type="button" onClick={save} disabled={loading} className="btn-primary gap-2">
          <Save size={16} />
          {loading ? "Enregistrement..." : "Enregistrer les lots"}
        </button>
        {message && <p className="text-sm font-medium text-[#596744]">{message}</p>}
      </div>
    </div>
  );
}
