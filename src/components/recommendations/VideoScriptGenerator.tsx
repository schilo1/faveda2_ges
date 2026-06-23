"use client";

import { useState } from "react";
import { Copy, Loader2, Sparkles, Video } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
};

type VideoIdea = {
  title: string;
  hook: string;
  scene: string;
  script: string;
  cta: string;
  format: string;
};

type Props = {
  products: ProductOption[];
};

const objectives = [
  "augmenter les ventes",
  "écouler un produit en stock",
  "lancer une promotion",
  "rassurer les clientes",
  "présenter les bienfaits sans exagérer",
];

export function VideoScriptGenerator({ products }: Props) {
  const toast = useToast();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [objective, setObjective] = useState(objectives[0]);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!productId) {
      toast.error("Produit requis", "Choisissez un produit pour générer des scripts.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/recommendations/video-scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, objective }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      toast.error("Scripts non générés", data?.error ?? "Action impossible.");
      return;
    }

    setIdeas(data.ideas ?? []);
    setSource(data.source ?? "");
    toast.success("Scripts générés", data.source === "groq" ? "L'assistant marketing a proposé des idées vidéo." : "Des idées locales ont été proposées.");
  }

  async function copyIdea(idea: VideoIdea) {
    const text = [
      idea.title,
      `Format: ${idea.format}`,
      `Hook: ${idea.hook}`,
      `Scène: ${idea.scene}`,
      `Script: ${idea.script}`,
      `CTA: ${idea.cta}`,
    ].join("\n\n");
    await navigator.clipboard.writeText(text);
    toast.success("Script copié");
  }

  return (
    <section className="card mb-5 overflow-hidden">
      <div className="border-b border-[#D9D7D2]/60 p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3C4] text-[#9F7D16]">
            <Video size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Générateur de scripts vidéo</h2>
            <p className="text-sm text-gray-500">Créez des idées de vidéos promotionnelles prêtes à tourner pour chaque produit.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label">Produit</label>
            <select value={productId} onChange={event => setProductId(event.target.value)} className="input">
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.sku}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Objectif</label>
            <select value={objective} onChange={event => setObjective(event.target.value)} className="input">
              {objectives.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button type="button" onClick={generate} disabled={loading || products.length === 0} className="btn-primary w-full gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Génération..." : "Générer"}
            </button>
          </div>
        </div>
      </div>

      {ideas.length > 0 && (
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-800">Scripts proposés</h3>
            <span className="rounded-full bg-[#F3F3F3] px-3 py-1 text-xs font-bold text-gray-500">
              {source === "groq" ? "Assistant IA" : "Local"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {ideas.map((idea, index) => (
              <article key={`${idea.title}-${index}`} className="rounded-2xl border border-[#D9D7D2]/70 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#9F7D16]">{idea.format}</p>
                    <h4 className="mt-1 font-bold text-gray-900">{idea.title}</h4>
                  </div>
                  <button type="button" onClick={() => copyIdea(idea)} className="rounded-xl border border-[#D9D7D2] p-2 text-gray-500 transition hover:bg-[#F3F3F3]" title="Copier">
                    <Copy size={15} />
                  </button>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <Block label="Hook" value={idea.hook} />
                  <Block label="Scène" value={idea.scene} />
                  <Block label="Script" value={idea.script} />
                  <Block label="CTA" value={idea.cta} />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8F8F6] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 leading-5">{value}</p>
    </div>
  );
}
