"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { MovementType } from "@prisma/client";
import { useToast } from "@/components/providers/ToastProvider";

interface Props {
  products: { id: string; name: string; sku: string; currentStock: number }[];
  onTypeLabelChange?: (label: string) => void;
}

const movementTypes: { value: MovementType; label: string }[] = [
  { value: "ENTREE",             label: "Entrée de stock" },
  { value: "SORTIE",             label: "Sortie de stock (vente)" },
  { value: "PERTE",              label: "Perte" },
  { value: "RETOUR_CLIENT",      label: "Retour client" },
  { value: "RETOUR_FOURNISSEUR", label: "Retour fournisseur" },
  { value: "TRANSFERT",          label: "Transfert" },
  { value: "AJUSTEMENT",         label: "Ajustement d'inventaire" },
];

const EXITS: MovementType[] = ["SORTIE", "VENTE", "PERTE", "TRANSFERT"];
const ENTRIES: MovementType[] = ["ENTREE", "RETOUR_CLIENT", "RETOUR_FOURNISSEUR"];

export function MovementForm({ products, onTypeLabelChange }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<MovementType>("ENTREE");
  const [productId, setProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const isExit = EXITS.includes(type);
  const isEntry = ENTRIES.includes(type);
  const selectedProduct = products.find(product => product.id === productId);
  const filteredProducts = products.filter(product => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return true;
    return `${product.name} ${product.sku}`.toLowerCase().includes(query);
  }).slice(0, 8);

  useEffect(() => {
    const label = movementTypes.find(item => item.value === type)?.label ?? "";
    onTypeLabelChange?.(label);
  }, [type, onTypeLabelChange]);

  function buildBatchNumber(nextProductId: string) {
    const product = products.find(p => p.id === nextProductId);
    if (!product) return "";
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `LOT-${product.sku}-${today}`;
  }

  function handleProductChange(nextProductId: string) {
    const product = products.find(p => p.id === nextProductId);
    setProductId(nextProductId);
    if (product) setProductSearch(`${product.name} - ${product.sku}`);
    if (isEntry && !batchNumber) {
      setBatchNumber(buildBatchNumber(nextProductId));
    }
  }

  function handleTypeChange(nextType: MovementType) {
    setType(nextType);
    if (ENTRIES.includes(nextType) && productId && !batchNumber) {
      setBatchNumber(buildBatchNumber(productId));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const quantity = parseInt(fd.get("quantity") as string);
    const motif = String(fd.get("motif") ?? "").trim();
    const missing: string[] = [];
    if (!productId) missing.push("produit");
    if (!fd.get("type")) missing.push("type de mouvement");
    if (!Number.isInteger(quantity) || quantity <= 0) missing.push("quantité");
    if (!motif) missing.push("motif");

    if (missing.length > 0) {
      const message = `Champ${missing.length > 1 ? "s" : ""} requis : ${missing.join(", ")}.`;
      setError(message);
      toast.error("Mouvement incomplet", message);
      return;
    }

    setLoading(true);
    const body = {
      productId,
      type:        fd.get("type"),
      quantity,
      motif,
      validatorName: fd.get("validatorName") || "Grâce",
      batchNumber:  fd.get("batchNumber") || null,
      expiryDate:   fd.get("expiryDate") || null,
      comment:     fd.get("comment") || null,
    };
    const res = await fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      const message = d.error ?? d.details?.formErrors?.[0] ?? "Erreur lors de l'enregistrement.";
      setError(message);
      toast.error("Mouvement non enregistré", message);
      return;
    }
    toast.success("Mouvement enregistré", "Le stock a été mis à jour.");
    router.push("/stock/movements");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Produit <span className="text-red-500">*</span></label>
          <input type="hidden" name="productId" value={productId} />
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={productSearch}
              onChange={e => {
                setProductSearch(e.target.value);
                setProductId("");
                if (error) setError("");
              }}
              className="input pl-9"
              placeholder="Rechercher par nom ou SKU..."
            />
          </div>
          {selectedProduct && (
            <div className="mb-2 rounded-2xl border border-[#596744]/20 bg-[#596744]/10 px-3 py-2 text-sm text-[#4F5C3D]">
              <span className="font-semibold">{selectedProduct.name}</span>
              <span className="mx-1 text-[#697555]">-</span>
              <span className="font-mono text-xs">{selectedProduct.sku}</span>
              <span className="ml-2 text-xs">Stock : {selectedProduct.currentStock}</span>
            </div>
          )}
          {!selectedProduct && (
            <div className="max-h-72 overflow-auto rounded-2xl border border-[#D9D7D2]/70 bg-white shadow-sm">
              <div className="sticky top-0 z-10 border-b border-[#D9D7D2]/60 bg-[#F3F3F3] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {productSearch ? "Résultats de recherche" : "Produits disponibles"}
                </p>
              </div>
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-3 text-xs text-orange-600">Aucun produit ne correspond à cette recherche.</p>
              ) : (
                filteredProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between gap-3 border-b border-[#D9D7D2]/40 px-3 py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-400">
                        <span className="font-mono">{product.sku}</span>
                        <span className="mx-1">•</span>
                        Stock : {product.currentStock}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleProductChange(product.id);
                        if (error) setError("");
                      }}
                      className="rounded-xl bg-[#596744] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4F5C3D]"
                    >
                      Sélectionner
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          {!productId && <p className="mt-1 text-xs text-gray-400">Sélectionnez un produit directement ou filtrez avec la recherche.</p>}
        </div>

        <div>
          <label className="label">Type de mouvement <span className="text-red-500">*</span></label>
          <select name="type" required className="input" value={type} onChange={e => handleTypeChange(e.target.value as MovementType)}>
            {movementTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Quantité <span className="text-red-500">*</span></label>
          <input name="quantity" type="number" min={1} className="input" />
        </div>

        <div>
          <label className="label">Validé / autorisé par</label>
          <input name="validatorName" type="text" defaultValue={isExit ? "Grâce" : ""} className="input" placeholder={isExit ? "Grâce" : ""} />
        </div>

        <div>
          <label className="label">Motif</label>
          <input name="motif" type="text" className="input" placeholder="Ex: Commande client, Réapprovisionnement..." />
        </div>

        {isEntry && (
          <>
            <div>
              <label className="label">N° lot</label>
              <input
                name="batchNumber"
                type="text"
                className="input"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                placeholder="Ex: LOT-FAV-001-20260526"
              />
              <p className="mt-1 text-xs text-gray-400">Généré automatiquement, mais vous pouvez le modifier.</p>
            </div>

            <div>
              <label className="label">Date de péremption du lot</label>
              <input name="expiryDate" type="date" className="input" />
              <p className="mt-1 text-xs text-gray-400">À renseigner si ce nouvel arrivage a une date différente.</p>
            </div>
          </>
        )}
      </div>

      <div>
        <label className="label">Commentaire</label>
        <textarea name="comment" rows={3} className="input resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enregistrement..." : "Enregistrer le mouvement"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}
