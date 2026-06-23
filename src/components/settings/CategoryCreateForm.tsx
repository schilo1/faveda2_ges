"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export function CategoryCreateForm() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/settings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      const message = data?.error ?? "Impossible d'ajouter la catégorie.";
      setMessage(message);
      toast.error("Catégorie non ajoutée", message);
      return;
    }

    setName("");
    setDescription("");
    setMessage("Catégorie ajoutée.");
    toast.success("Catégorie ajoutée");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-2xl border border-[#D9D7D2]/70 bg-[#F3F3F3]/70 p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="input"
          placeholder="Nom de la catégorie"
          required
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="input"
          placeholder="Description optionnelle"
        />
        <button type="submit" disabled={loading} className="btn-primary gap-1 whitespace-nowrap">
          <Plus size={14} />
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </div>
      {message && <p className="mt-2 text-xs font-medium text-[#596744]">{message}</p>}
    </form>
  );
}
