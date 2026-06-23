"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: { symbol: string };
};

type InventoryLine = {
  productId: string;
  physicalStock: string;
  justification: string;
};

interface Props {
  products: ProductOption[];
}

const emptyLine = (): InventoryLine => ({
  productId: "",
  physicalStock: "",
  justification: "",
});

export function InventoryForm({ products }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [inventoryDate, setInventoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<InventoryLine[]>([emptyLine()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

  function updateLine(index: number, patch: Partial<InventoryLine>) {
    setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  }

  function removeLine(index: number) {
    setLines(current => current.length === 1 ? current : current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const items = lines
      .filter(line => line.productId && line.physicalStock !== "")
      .map(line => ({
        productId: line.productId,
        physicalStock: Number(line.physicalStock),
        justification: line.justification || null,
      }));

    if (items.length === 0) {
      const message = "Ajoutez au moins un produit à contrôler.";
      setError(message);
      toast.error("Inventaire incomplet", message);
      return;
    }

    if (items.some(item => !Number.isInteger(item.physicalStock) || item.physicalStock < 0)) {
      const message = "Le stock réel doit être un nombre entier positif ou zéro.";
      setError(message);
      toast.error("Stock réel invalide", message);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryDate, items }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = data?.error ?? "Erreur lors de l'enregistrement de l'inventaire.";
      setError(message);
      toast.error("Inventaire non enregistré", message);
      return;
    }

    toast.success("Inventaire enregistré", "Les quantités ont été ajustées.");
    router.push("/inventory");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="label">Date d&apos;inventaire</label>
          <input
            type="date"
            value={inventoryDate}
            onChange={e => setInventoryDate(e.target.value)}
            className="input"
            required
          />
        </div>
        <div className="rounded-2xl border border-[#D9D7D2]/70 bg-[#F3F3F3]/70 px-4 py-3 text-sm text-[#596744]">
          <p className="font-bold">{lines.filter(line => line.productId).length} produit(s)</p>
          <p className="text-xs text-[#697555]">Le stock sera ajusté après validation</p>
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const product = productById.get(line.productId);
          const physical = line.physicalStock === "" ? null : Number(line.physicalStock);
          const diff = product && physical !== null ? physical - product.currentStock : null;

          return (
            <div key={index} className="rounded-2xl border border-[#D9D7D2]/70 bg-white/80 p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                <div>
                  <label className="label">Produit</label>
                  <select
                    value={line.productId}
                    onChange={e => updateLine(index, { productId: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Sélectionner un produit...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.sku}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Stock théorique</label>
                  <div className="flex h-[42px] items-center rounded-xl border border-[#D9D7D2] bg-[#F3F3F3]/80 px-3 text-sm font-semibold text-gray-700">
                    {product ? `${product.currentStock} ${product.unit.symbol}` : "-"}
                  </div>
                </div>

                <div>
                  <label className="label">Stock réel</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={line.physicalStock}
                    onChange={e => updateLine(index, { physicalStock: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="min-w-[86px]">
                    <label className="label">Écart</label>
                    <div className={`flex h-[42px] items-center justify-center rounded-xl border px-3 text-sm font-bold ${
                      diff === null || diff === 0
                        ? "border-[#D9D7D2] bg-[#F3F3F3]/80 text-gray-500"
                        : diff > 0
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                    }`}>
                      {diff === null ? "-" : `${diff > 0 ? "+" : ""}${diff}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"
                    disabled={lines.length === 1}
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="label">Justification</label>
                <input
                  value={line.justification}
                  onChange={e => updateLine(index, { justification: e.target.value })}
                  className="input"
                  placeholder="Ex: casse, perte, erreur de saisie, recomptage..."
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setLines(current => [...current, emptyLine()])}
        className="btn-secondary gap-2"
      >
        <Plus size={16} />
        Ajouter un produit
      </button>

      <div className="flex flex-wrap gap-3 border-t border-[#D9D7D2]/60 pt-5">
        <button type="submit" disabled={loading || products.length === 0} className="btn-primary gap-2">
          <ClipboardCheck size={17} />
          {loading ? "Enregistrement..." : "Valider l'inventaire"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  );
}
