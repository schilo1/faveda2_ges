"use client";

import { useMemo, useState } from "react";
import { Calculator, Check, Download, PackageCheck, RotateCcw, Settings2, ShoppingCart, TrendingUp, X } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type MaterialLine = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  estimatedUnitCost: number;
  quantityPerUnit: number;
};

type ProductLine = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  sellPrice: number;
  soldInSelectedMonth: number;
  suggestedQuantity: number;
  materials: MaterialLine[];
};

type Props = {
  products: ProductLine[];
};

const SUGGESTION_TARGET_UNITS = 50;

function money(value: number) {
  return new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
}

function pdfMoney(value: number) {
  return String(Math.round(value));
}

function pdfNumber(value: number, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}

function number(value: number, digits = 2) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(value);
}

function rgb(r: number, g: number, b: number) {
  return [r, g, b] as [number, number, number];
}

async function getPdfTools() {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default ?? (autoTableModule as any).autoTable;
  if (typeof autoTable !== "function") throw new Error("Module PDF indisponible.");
  return { jsPDF, autoTable };
}

export function ProjectionSimulator({ products }: Props) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [quantities, setQuantities] = useState<Record<string, number>>(() => (
    Object.fromEntries(products.map((product, index) => [product.id, index === 0 ? product.suggestedQuantity : 0]))
  ));

  const selectedProduct = useMemo(() => (
    products.find(product => product.id === selectedProductId) ?? products[0] ?? null
  ), [products, selectedProductId]);

  const rows = useMemo(() => {
    if (!selectedProduct) return [];
    const product = selectedProduct;
    const quantity = Math.max(0, quantities[product.id] ?? 0);
    const materialCostPerUnit = product.materials.reduce((sum, material) => (
      sum + material.quantityPerUnit * material.estimatedUnitCost
    ), 0);
    const revenue = product.sellPrice * quantity;
    const materialCost = materialCostPerUnit * quantity;
    const grossMaterialProfit = revenue - materialCost;

    return [{
      ...product,
      quantity,
      monthlyDemand: product.soldInSelectedMonth,
      materialCostPerUnit,
      grossMaterialProfitPerUnit: product.sellPrice - materialCostPerUnit,
      revenue,
      materialCost,
      grossMaterialProfit,
    }];
  }, [selectedProduct, quantities]);

  const materialNeeds = useMemo(() => {
    const needs = new Map<string, {
      id: string;
      name: string;
      unit: string;
      currentStock: number;
      estimatedUnitCost: number;
      needed: number;
      cost: number;
    }>();

    for (const row of rows) {
      for (const material of row.materials) {
        const needed = row.quantity * material.quantityPerUnit;
        const current = needs.get(material.id) ?? {
          id: material.id,
          name: material.name,
          unit: material.unit,
          currentStock: material.currentStock,
          estimatedUnitCost: material.estimatedUnitCost,
          needed: 0,
          cost: 0,
        };
        current.needed += needed;
        current.cost += needed * material.estimatedUnitCost;
        needs.set(material.id, current);
      }
    }

    return Array.from(needs.values())
      .map(material => ({
        ...material,
        missing: Math.max(material.needed - material.currentStock, 0),
        missingCost: Math.max(material.needed - material.currentStock, 0) * material.estimatedUnitCost,
      }))
      .filter(material => material.needed > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const totals = rows.reduce((acc, row) => {
    acc.units += row.quantity;
    acc.revenue += row.revenue;
    acc.materialCost += row.materialCost;
    acc.grossMaterialProfit += row.grossMaterialProfit;
    return acc;
  }, {
    units: 0,
    revenue: 0,
    materialCost: 0,
    grossMaterialProfit: 0,
  });
  const purchaseBudget = materialNeeds.reduce((sum, material) => sum + material.missingCost, 0);

  function setQuantity(productId: string, quantity: number) {
    setQuantities(Object.fromEntries(products.map(product => [
      product.id,
      product.id === productId ? Math.max(0, Math.floor(quantity || 0)) : 0,
    ])));
  }

  function selectProduct(productId: string) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    setSelectedProductId(productId);
    setQuantity(productId, product.suggestedQuantity);
    setRecipeModalOpen(false);
  }

  function useProductSuggestion() {
    if (!selectedProduct) return;
    setQuantity(selectedProduct.id, Math.floor(Math.random() * SUGGESTION_TARGET_UNITS) + 1);
  }

  function reset() {
    setQuantities(Object.fromEntries(products.map(product => [product.id, 0])));
  }

  async function downloadSimulationPdf() {
    setDownloading(true);
    try {
      const { jsPDF, autoTable } = await getPdfTools();
      const doc = new jsPDF({ orientation: "landscape" });
      const tableBase = {
        theme: "grid" as const,
        margin: { left: 10, right: 10 },
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 2,
          textColor: rgb(31, 41, 55),
          lineColor: rgb(226, 226, 220),
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: rgb(79, 92, 61),
          textColor: rgb(255, 255, 255),
          fontStyle: "bold" as const,
        },
        alternateRowStyles: { fillColor: rgb(248, 248, 246) },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(`Page ${data.pageNumber} / ${pageCount}`, 276, 202, { align: "right" });
        },
      };

      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Simulation des ventes FAVEDA", 14, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, 14, 23);

      autoTable(doc, {
        ...tableBase,
        startY: 32,
        head: [["Unités simulées", "CA attendu (FCFA)", "Coût matières (FCFA)", "Budget à acheter (FCFA)", "Gain brut matière (FCFA)"]],
        body: [[
          pdfNumber(totals.units, 0),
          pdfMoney(totals.revenue),
          pdfMoney(totals.materialCost),
          pdfMoney(purchaseBudget),
          pdfMoney(totals.grossMaterialProfit),
        ]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Produit", "SKU", "Qté simulée", "Demande mois", "Prix vente (FCFA)", "Coût matière/u (FCFA)", "CA (FCFA)", "Coût matières (FCFA)", "Gain brut (FCFA)"]],
        body: rows.map(row => [
          row.name,
          row.sku,
          pdfNumber(row.quantity, 0),
          pdfNumber(row.monthlyDemand, 0),
          pdfMoney(row.sellPrice),
          pdfMoney(row.materialCostPerUnit),
          pdfMoney(row.revenue),
          pdfMoney(row.materialCost),
          pdfMoney(row.grossMaterialProfit),
        ]),
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Matière", "Besoin total", "Unité", "Stock actuel", "Unité", "À acheter", "Unité", "Budget achat (FCFA)"]],
        body: materialNeeds.length
          ? materialNeeds.map(material => [
              material.name,
              pdfNumber(material.needed),
              material.unit,
              pdfNumber(material.currentStock),
              material.unit,
              pdfNumber(material.missing),
              material.unit,
              pdfMoney(material.missingCost),
            ])
          : [["Aucune matière nécessaire", "-", "-", "-", "-", "-", "-", "-"]],
      });

      doc.save(`faveda-simulation-${Date.now()}.pdf`);
      toast.success("PDF téléchargé", "La simulation a été exportée.");
    } catch (error) {
      toast.error("PDF non généré", error instanceof Error ? error.message : "Impossible de générer le PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-sm font-medium text-gray-500">Ajoutez d'abord des recettes matières aux produits pour pouvoir faire une projection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProjectionStat title="Unités simulées" value={number(totals.units, 0)} icon={ShoppingCart} />
        <ProjectionStat title="Chiffre d'affaires" value={money(totals.revenue)} icon={TrendingUp} />
        <ProjectionStat title="Coût matières" value={money(totals.materialCost)} icon={PackageCheck} />
        <ProjectionStat title="Gain brut matière" value={money(totals.grossMaterialProfit)} icon={Calculator} tone={totals.grossMaterialProfit < 0 ? "red" : "green"} />
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D7D2]/60 px-4 py-3">
          <div>
            <h2 className="font-bold text-gray-900">Simulation par produit</h2>
            <p className="text-xs text-gray-500">Choisissez un seul produit selon sa recette, puis simulez la quantité à produire ou vendre.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRecipeModalOpen(true)} className="btn-primary gap-2 text-sm">
              <Settings2 size={15} />
              Choisir une recette
            </button>
            <button type="button" onClick={downloadSimulationPdf} disabled={downloading} className="btn-secondary gap-2 text-sm">
              <Download size={15} />
              {downloading ? "Génération..." : "PDF simulation"}
            </button>
            <button type="button" onClick={useProductSuggestion} className="btn-secondary gap-2 text-sm">
              <Calculator size={15} />
              Suggestion produit
            </button>
            <button type="button" onClick={reset} className="btn-secondary gap-2 text-sm">
              <RotateCcw size={15} />
              Remettre à zéro
            </button>
          </div>
        </div>

        <div className="border-b border-[#D9D7D2]/60 bg-[#F8F8F6] p-4">
          {selectedProduct && (
            <div className="rounded-2xl border border-[#D9D7D2]/65 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Recette sélectionnée</p>
                  <h3 className="mt-1 font-bold text-gray-900">{selectedProduct.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{selectedProduct.sku} | {selectedProduct.materials.length} matière(s)</p>
                </div>
                <button type="button" onClick={() => setRecipeModalOpen(true)} className="rounded-xl border border-[#D9D7D2] px-3 py-2 text-xs font-bold text-[#596744] transition hover:bg-[#F3F3F3]">
                  Changer
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProduct.materials.map(material => (
                  <span key={material.id} className="rounded-full bg-[#596744]/10 px-3 py-1 text-xs font-semibold text-[#596744]">
                    {material.name}: {number(material.quantityPerUnit)} {material.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="divide-y divide-[#D9D7D2]/50">
          {rows.map(row => (
            <div key={row.id} className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1.2fr_0.55fr_1.4fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-900">{row.name}</h3>
                  <span className="rounded-full bg-[#F3F3F3] px-2.5 py-1 text-xs font-semibold text-gray-500">{row.sku}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Stock actuel {row.currentStock} | seuil {row.minimumStock} | demande estimée {row.monthlyDemand}/mois
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <MiniMetric label="Prix vente" value={money(row.sellPrice)} />
                  <MiniMetric label="Coût matière/u" value={money(row.materialCostPerUnit)} />
                  <MiniMetric label="Gain matière/u" value={money(row.grossMaterialProfitPerUnit)} />
                  <MiniMetric label="Projection max" value={`${SUGGESTION_TARGET_UNITS} u`} />
                </div>
              </div>

              <div>
                <label className="label">Quantité à simuler</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input"
                  value={row.quantity}
                  onChange={event => setQuantity(row.id, Number(event.target.value))}
                />
                <button type="button" onClick={useProductSuggestion} className="mt-2 w-full rounded-xl border border-[#C9A227]/35 bg-[#FFF3C4]/40 px-3 py-2 text-xs font-bold text-[#6F560D] transition hover:bg-[#FFF3C4]">
                  Suggérer une quantité
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <ResultBox label="CA attendu" value={money(row.revenue)} />
                <ResultBox label="Coût matières" value={money(row.materialCost)} />
                <ResultBox label="Gain brut matière" value={money(row.grossMaterialProfit)} strong />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-[#D9D7D2]/60 px-4 py-3">
            <h2 className="font-bold text-gray-900">Matières nécessaires</h2>
            <p className="text-xs text-gray-500">Total pour le produit sélectionné et sa recette.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Matière", "Besoin total", "Stock actuel", "À acheter", "Budget achat"].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D7D2]/45">
                {materialNeeds.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Saisissez au moins une quantité pour voir les matières nécessaires.</td></tr>
                ) : materialNeeds.map(material => (
                  <tr key={material.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{material.name}</td>
                    <td className="px-4 py-3 text-gray-600">{number(material.needed)} {material.unit}</td>
                    <td className="px-4 py-3 text-gray-600">{number(material.currentStock)} {material.unit}</td>
                    <td className={`px-4 py-3 font-bold ${material.missing > 0 ? "text-red-600" : "text-[#596744]"}`}>
                      {number(material.missing)} {material.unit}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#9F7D16]">{money(material.missingCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-gray-900">Résumé exact</h2>
          <div className="mt-4 space-y-3">
            <SummaryLine label="CA attendu" value={money(totals.revenue)} />
            <SummaryLine label="Coût matières total" value={money(totals.materialCost)} />
            <SummaryLine label="Budget à acheter" value={money(purchaseBudget)} warning={purchaseBudget > 0} />
            <SummaryLine label="Gain brut matière" value={money(totals.grossMaterialProfit)} strong />
          </div>
          <div className="mt-5 rounded-2xl bg-[#F3F3F3]/75 p-4 text-xs leading-5 text-gray-600">
            <p><span className="font-bold text-gray-800">Gain brut matière</span> = chiffre d'affaires - coût des matières de la recette.</p>
            <p className="mt-2"><span className="font-bold text-gray-800">Budget à acheter</span> = uniquement les matières manquantes par rapport au stock actuel.</p>
          </div>
        </div>
      </section>

      {recipeModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/45 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20" role="dialog" aria-modal="true" aria-labelledby="recipe-selector-title">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#D9D7D2]/70 bg-white px-5 py-4">
              <div>
                <h2 id="recipe-selector-title" className="font-bold text-gray-900">Choisir une recette</h2>
                <p className="text-xs text-gray-500">Sélectionnez le produit dont la recette doit servir à la simulation.</p>
              </div>
              <button
                type="button"
                onClick={() => setRecipeModalOpen(false)}
                className="rounded-xl border border-[#D9D7D2] p-2 text-gray-500 transition hover:bg-[#F3F3F3]"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(100vh-112px)] overflow-y-auto bg-[#F8F8F6] p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {products.map(product => {
                  const active = product.id === selectedProduct?.id;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product.id)}
                      className={`rounded-2xl border bg-white p-4 text-left transition hover:border-[#596744] hover:shadow-sm ${active ? "border-[#596744] ring-2 ring-[#596744]/15" : "border-[#D9D7D2]/70"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{product.name}</h3>
                          <p className="mt-1 text-xs font-semibold text-gray-400">{product.sku}</p>
                        </div>
                        {active && (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#596744] text-white">
                            <Check size={16} />
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {product.materials.map(material => (
                          <div key={material.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F3F3F3]/75 px-3 py-2 text-xs">
                            <span className="font-semibold text-gray-700">{material.name}</span>
                            <span className="text-right font-bold text-[#596744]">{number(material.quantityPerUnit)} {material.unit}/produit</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectionStat({ title, value, icon: Icon, tone = "default" }: { title: string; value: string; icon: any; tone?: "default" | "green" | "red" }) {
  const colors = {
    default: "bg-[#F3F3F3] text-[#596744]",
    green: "bg-green-50 text-green-700",
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
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F3F3F3]/80 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-bold text-gray-800">{value}</p>
    </div>
  );
}

function ResultBox({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-[#D9D7D2]/65 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className={`mt-1 font-bold ${strong ? "text-[#596744]" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, strong = false, warning = false }: { label: string; value: string; strong?: boolean; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#D9D7D2]/50 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className={`text-right font-bold ${strong ? "text-[#596744]" : warning ? "text-[#9F7D16]" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}
