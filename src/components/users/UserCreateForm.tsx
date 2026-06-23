"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export function UserCreateForm() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: fd.get("nom"),
        prenom: fd.get("prenom"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
        isActive: true,
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      toast.error("Utilisateur non créé", data?.error ?? "Action impossible.");
      return;
    }
    toast.success("Utilisateur créé", "Le nouveau profil peut se connecter.");
    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">Nom</label>
          <input name="nom" className="input" required />
        </div>
        <div>
          <label className="label">Prénom</label>
          <input name="prenom" className="input" required />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input name="password" type="password" minLength={6} className="input" required />
        </div>
        <div className="md:col-span-2">
          <label className="label">Rôle</label>
          <select name="role" className="input" defaultValue="COMMERCIAL">
            <option value="COMMERCIAL">Commercial</option>
            <option value="GESTIONNAIRE">Gestionnaire de stock</option>
            <option value="SURVEILLANT">Surveillant</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary mt-5 gap-2">
        <Save size={16} />
        {loading ? "Création..." : "Créer l'utilisateur"}
      </button>
    </form>
  );
}
