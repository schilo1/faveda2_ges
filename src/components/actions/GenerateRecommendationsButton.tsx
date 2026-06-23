"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export function GenerateRecommendationsButton() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/recommendations", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Analyse impossible", "Les recommandations n'ont pas pu être générées.");
      return;
    }
    toast.success("Recommandations générées", "La liste a été actualisée.");
    router.refresh();
  }

  return (
    <button type="button" onClick={generate} disabled={loading} className="btn-primary gap-2">
      <Sparkles size={16} />
      {loading ? "Analyse en cours..." : "Générer les recommandations"}
    </button>
  );
}
