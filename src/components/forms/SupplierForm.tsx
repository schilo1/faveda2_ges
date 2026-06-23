"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type SupplierFormValue = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  comment: string | null;
  isActive: boolean;
};

type Props = {
  supplier?: SupplierFormValue;
};

export function SupplierForm({ supplier }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const body = {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      comment: String(formData.get("comment") ?? "").trim() || null,
      isActive: formData.get("isActive") === "on",
    };

    const response = await fetch(supplier ? `/api/suppliers/${supplier.id}` : "/api/suppliers", {
      method: supplier ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error ?? "Impossible d'enregistrer le fournisseur.";
      setError(message);
      toast.error("Fournisseur non enregistré", message);
      return;
    }

    toast.success(supplier ? "Fournisseur mis à jour" : "Fournisseur créé");
    router.push("/suppliers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">Nom du fournisseur <span className="text-red-500">*</span></label>
          <input name="name" defaultValue={supplier?.name ?? ""} required className="input" />
        </div>

        <div>
          <label className="label">Téléphone</label>
          <input name="phone" defaultValue={supplier?.phone ?? ""} className="input" />
        </div>

        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={supplier?.email ?? ""} className="input" />
        </div>

        <div className="flex items-center gap-2 pt-7">
          <input
            type="checkbox"
            name="isActive"
            id="isActive"
            defaultChecked={supplier?.isActive ?? true}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Fournisseur actif</label>
        </div>
      </div>

      <div>
        <label className="label">Adresse</label>
        <textarea name="address" defaultValue={supplier?.address ?? ""} rows={3} className="input resize-none" />
      </div>

      <div>
        <label className="label">Commentaire</label>
        <textarea name="comment" defaultValue={supplier?.comment ?? ""} rows={3} className="input resize-none" />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary gap-2">
          <Save size={16} />
          {loading ? "Enregistrement..." : supplier ? "Mettre à jour" : "Créer le fournisseur"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  );
}
