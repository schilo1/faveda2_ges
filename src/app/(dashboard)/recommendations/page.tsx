import prisma from "@/lib/prisma";
import { AlertTriangle, Boxes, Brain, Lightbulb, PackageSearch, ShoppingCart, Sparkles, Tag, TrendingDown, TrendingUp, Video } from "lucide-react";
import { GenerateRecommendationsButton } from "@/components/actions/GenerateRecommendationsButton";
import { VideoScriptGenerator } from "@/components/recommendations/VideoScriptGenerator";

const typeConfig: Record<string, { label: string; icon: typeof Lightbulb; color: string; bg: string; border: string }> = {
  REORDER: { label: "Réapprovisionnement", icon: ShoppingCart, color: "text-blue-700", bg: "bg-blue-50", border: "#3b82f6" },
  PROMO: { label: "Promotion", icon: Tag, color: "text-purple-700", bg: "bg-purple-50", border: "#a855f7" },
  FORECAST: { label: "Prévision", icon: TrendingUp, color: "text-green-700", bg: "bg-green-50", border: "#22c55e" },
  SLOW_MOVER: { label: "Faible rotation", icon: TrendingDown, color: "text-orange-700", bg: "bg-orange-50", border: "#f97316" },
  MARKETING: { label: "Idée vidéo", icon: Video, color: "text-[#9F7D16]", bg: "bg-[#FFF3C4]", border: "#C9A227" },
  MATERIAL: { label: "Matière première", icon: Boxes, color: "text-red-700", bg: "bg-red-50", border: "#dc2626" },
};

const priorityConfig: Record<string, string> = {
  critical: "bg-red-100 text-red-700 ring-red-200",
  high: "bg-orange-100 text-orange-700 ring-orange-200",
  medium: "bg-[#FFF3C4] text-[#6F560D] ring-[#C9A227]/30",
  low: "bg-gray-100 text-gray-600 ring-gray-200",
};

function priorityLabel(priority: string) {
  return {
    critical: "Critique",
    high: "Haute",
    medium: "Moyenne",
    low: "Basse",
  }[priority] ?? priority;
}

function splitMessage(message: string) {
  return message
    .split(/\n|(?<=\.)\s+/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export default async function RecommendationsPage() {
  const [recommendations, allProducts] = await Promise.all([
    prisma.recommendation.findMany({
      where: { isActioned: false },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minimumStock: true,
        sku: true,
        sellPrice: true,
        alerts: {
          where: { isResolved: false },
          select: { severity: true, message: true },
        },
        materialRecipes: {
          include: { material: { select: { name: true, unit: true, currentStock: true, minimumStock: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const productById = new Map(allProducts.map(p => [p.id, p]));
  const recs = recommendations.map(r => ({ ...r, product: productById.get(r.productId) }));
  const marketingCount = recs.filter(rec => rec.type === "MARKETING").length;
  const materialCount = recs.filter(rec => rec.type === "MATERIAL").length;
  const criticalCount = recs.filter(rec => rec.priority === "critical" || rec.priority === "high").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Brain size={22} className="text-[#C9A227]" />
            <h1 className="page-title">Assistant recommandations</h1>
          </div>
          <p className="page-subtitle">Analyse stock, alertes, matières premières et idées marketing actionnables.</p>
        </div>
        <GenerateRecommendationsButton />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <AssistantStat icon={Sparkles} title="Recommandations actives" value={recs.length} />
        <AssistantStat icon={Video} title="Idées vidéo marketing" value={marketingCount} tone="mustard" />
        <AssistantStat icon={AlertTriangle} title="Actions prioritaires" value={criticalCount + materialCount} tone="red" />
      </div>

      <VideoScriptGenerator
        products={allProducts.map(product => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          minimumStock: product.minimumStock,
        }))}
      />

      {recs.length === 0 && (
        <div className="card p-12 text-center">
          <Lightbulb size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Aucune recommandation active</p>
          <p className="mt-1 text-xs text-gray-400">Cliquez sur générer pour lancer l&apos;analyse intelligente.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {recs.map(recommendation => {
          const cfg = typeConfig[recommendation.type] ?? typeConfig.FORECAST;
          const Icon = cfg.icon;
          const product = recommendation.product;
          const stockRatio = product && product.minimumStock > 0 ? Math.min(100, Math.round((product.currentStock / product.minimumStock) * 100)) : 0;

          return (
            <article key={recommendation.id} className="card overflow-hidden border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#4F5C3D]/10" style={{ borderLeftColor: cfg.border }}>
              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cfg.bg}`}>
                      <Icon size={20} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${priorityConfig[recommendation.priority] ?? priorityConfig.medium}`}>
                          {priorityLabel(recommendation.priority)}
                        </span>
                      </div>
                      <h2 className="font-bold text-gray-900">{product?.name ?? "Produit introuvable"}</h2>
                      <p className="text-xs text-gray-400">{product?.sku ?? "-"}</p>
                    </div>
                  </div>
                  {recommendation.suggestedQty && (
                    <div className="rounded-2xl bg-[#F3F3F3] px-3 py-2 text-right">
                      <p className="text-[11px] font-semibold uppercase text-gray-400">Qté</p>
                      <p className="font-bold text-[#596744]">{recommendation.suggestedQty}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {splitMessage(recommendation.message).map((line, index) => (
                    <p key={index} className="rounded-xl bg-[#F8F8F6] px-3 py-2 text-sm leading-5 text-gray-700">
                      {line}
                    </p>
                  ))}
                </div>

                {product && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#D9D7D2]/60 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-500">Stock / seuil</span>
                        <span className="font-bold text-gray-800">{product.currentStock}/{product.minimumStock}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#D9D7D2]/60">
                        <div className={`h-full rounded-full ${stockRatio < 60 ? "bg-red-500" : "bg-[#C9A227]"}`} style={{ width: `${Math.min(stockRatio, 100)}%` }} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D9D7D2]/60 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                        <PackageSearch size={14} />
                        Matières liées
                      </div>
                      <p className="text-xs text-gray-600">
                        {product.materialRecipes.length === 0
                          ? "Aucune recette matière configurée."
                          : product.materialRecipes.slice(0, 2).map(recipe => `${recipe.material.name}: ${Number(recipe.material.currentStock)} ${recipe.material.unit}`).join(" | ")}
                      </p>
                    </div>
                  </div>
                )}

                {product?.alerts?.length ? (
                  <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">
                    {product.alerts[0].message}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AssistantStat({ icon: Icon, title, value, tone = "green" }: { icon: any; title: string; value: number; tone?: "green" | "mustard" | "red" }) {
  const colors = {
    green: "bg-[#596744]/10 text-[#596744]",
    mustard: "bg-[#FFF3C4] text-[#9F7D16]",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
