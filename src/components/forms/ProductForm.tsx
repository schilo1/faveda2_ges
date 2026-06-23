"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";

interface Props {
  categories: { id: string; name: string }[];
  units:      { id: string; name: string; symbol: string }[];
  suppliers:  { id: string; name: string }[];
  product?: {
    id: string; name: string; categoryId: string; unitId: string; supplierId: string | null;
    description: string | null; buyPrice: number; sellPrice: number; currentStock: number;
    minimumStock: number; expiryDate: Date | null;
  };
}

export function ProductForm({ categories, units, suppliers, product }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      name:          fd.get("name") as string,
      categoryId:    fd.get("categoryId") as string,
      unitId:        fd.get("unitId") as string,
      supplierId:    (fd.get("supplierId") as string) || null,
      description:   (fd.get("description") as string) || null,
      buyPrice:      parseFloat((fd.get("buyPrice") as string) || "0"),
      sellPrice:     parseFloat(fd.get("sellPrice") as string),
      currentStock:  parseInt(fd.get("currentStock") as string),
      minimumStock:  parseInt(fd.get("minimumStock") as string),
      expiryDate:    (fd.get("expiryDate") as string) || null,
    };

    const url    = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setLoading(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      const message = payload?.error || "Erreur lors de l'enregistrement.";
      setError(message);
      toast.error("Produit non enregistré", message);
      return;
    }
    toast.success(product ? "Produit mis à jour" : "Produit créé", "Le catalogue a été actualisé.");
    router.push("/products");
    router.refresh();
  }

  const inp = (name: string, label: string, type = "text", required = true, defaultVal?: string | number) => (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input name={name} type={type} defaultValue={defaultVal ?? ""} required={required} className="input" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inp("name", "Nom du produit", "text", true, product?.name)}

        <div>
          <label className="label">Catégorie <span className="text-red-500">*</span></label>
          <select name="categoryId" defaultValue={product?.categoryId} required className="input">
            <option value="">Sélectionner...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Unité <span className="text-red-500">*</span></label>
          <select name="unitId" defaultValue={product?.unitId} required className="input">
            <option value="">Sélectionner...</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </select>
        </div>

        <div>
          <label className="label">Fournisseur</label>
          <select name="supplierId" defaultValue={product?.supplierId ?? ""} className="input">
            <option value="">Aucun</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {inp("buyPrice", "Prix d'achat (FCFA)", "number", false, product?.buyPrice)}
        {inp("sellPrice", "Prix de vente (FCFA)", "number", true, product?.sellPrice)}
        {inp("currentStock",  "Stock actuel", "number", true, product?.currentStock)}
        {inp("minimumStock",  "Seuil minimum", "number", true, product?.minimumStock)}
        {inp("expiryDate",    "Date de péremption", "date", false,
           product?.expiryDate ? new Date(product.expiryDate).toISOString().split("T")[0] : "")}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea name="description" defaultValue={product?.description ?? ""} rows={3} className="input resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enregistrement..." : product ? "Mettre à jour" : "Créer le produit"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}
