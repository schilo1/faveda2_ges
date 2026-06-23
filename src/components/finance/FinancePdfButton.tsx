"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type NameAmount = { name: string; amount: number };
type NameAmountQty = NameAmount & { quantity: number; unit: string };
type ProjectionPdfRow = {
  productName: string;
  quantity: number;
  monthlyDemand: number;
  materialCost: number;
  profitPotential: number;
  materials: { name: string; unit: string; needed: number; estimatedCost: number }[];
};
type LowMaterialPdfRow = {
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
};
type BudgetPdfRow = {
  month: string;
  amount: number;
  notes?: string | null;
  userName: string;
};
type MaterialPdfRow = {
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  estimatedUnitCost: number;
  expiryDate?: string | null;
  supplierName?: string | null;
};
type ExpensePdfRow = {
  spentAt: string;
  description: string;
  category: string;
  materialName?: string | null;
  supplierName?: string | null;
  quantity?: number | null;
  unitCost?: number | null;
  amount: number;
  userName: string;
};
type RecipePdfRow = {
  productName: string;
  materialName: string;
  materialUnit: string;
  quantityPerUnit: number;
  notes?: string | null;
};

type Props = {
  month: string;
  summary: {
    budgetAmount: number;
    spent: number;
    remaining: number;
    usageRate: number;
  };
  byCategory: NameAmount[];
  byMaterial: NameAmountQty[];
  projections: ProjectionPdfRow[];
  lowMaterials: LowMaterialPdfRow[];
  budgets: BudgetPdfRow[];
  materials: MaterialPdfRow[];
  expenses: ExpensePdfRow[];
  recipes: RecipePdfRow[];
};

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
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

function addHeader(doc: any, title: string, subtitle: string) {
  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, 14, 23);
  doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, 14, 29);
}

function addPageNumber(doc: any, data: any) {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Page ${data.pageNumber} / ${pageCount}`, 276, 202, { align: "right" });
}

export function FinancePdfButton(props: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    setLoading(true);
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
        didDrawPage: (data: any) => addPageNumber(doc, data),
      };

      addHeader(doc, "Finances FAVEDA", `Mois : ${props.month}`);

      autoTable(doc, {
        ...tableBase,
        startY: 36,
        head: [["Budget (FCFA)", "Dépensé (FCFA)", "Reste (FCFA)", "Utilisation"]],
        body: [[
          pdfMoney(props.summary.budgetAmount),
          pdfMoney(props.summary.spent),
          pdfMoney(props.summary.remaining),
          `${props.summary.usageRate}%`,
        ]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Catégorie", "Montant (FCFA)"]],
        body: props.byCategory.length
          ? props.byCategory.map(row => [row.name.replaceAll("_", " "), pdfMoney(row.amount)])
          : [["Aucune dépense", "0"]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Matière", "Quantité", "Unité", "Montant (FCFA)"]],
        body: props.byMaterial.length
          ? props.byMaterial.map(row => [row.name, pdfNumber(row.quantity), row.unit, pdfMoney(row.amount)])
          : [["Aucune matière", "-", "-", "0"]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Produit", "Qté projetée", "Demande mois", "Valeur matières (FCFA)", "Gain brut matière (FCFA)", "Détail matières"]],
        body: props.projections.length
          ? props.projections.map(row => [
              row.productName,
              pdfNumber(row.quantity, 0),
              pdfNumber(row.monthlyDemand, 0),
              pdfMoney(row.materialCost),
              pdfMoney(row.profitPotential),
              row.materials.map(material => `${material.name}: ${pdfNumber(material.needed)} ${material.unit}`).join(", "),
            ])
          : [["Aucune projection", "-", "-", "-", "-", "-"]],
        columnStyles: { 5: { cellWidth: 90 } },
      });

      doc.addPage();
      addHeader(doc, "Données Finance", `Mois : ${props.month}`);

      autoTable(doc, {
        ...tableBase,
        startY: 36,
        head: [["Date", "Dépense", "Catégorie", "Matière", "Fournisseur", "Qté", "Prix unit. (FCFA)", "Montant (FCFA)", "Saisi par"]],
        body: props.expenses.length
          ? props.expenses.map(row => [
              row.spentAt,
              row.description,
              row.category.replaceAll("_", " "),
              row.materialName ?? "-",
              row.supplierName ?? "-",
              row.quantity == null ? "-" : pdfNumber(row.quantity),
              row.unitCost == null ? "-" : pdfMoney(row.unitCost),
              pdfMoney(row.amount),
              row.userName,
            ])
          : [["Aucune dépense", "", "", "", "", "", "", "", ""]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Matière", "Unité", "Stock", "Seuil", "Coût estimé (FCFA)", "Péremption", "Fournisseur"]],
        body: props.materials.length
          ? props.materials.map(row => [
              row.name,
              row.unit,
              pdfNumber(row.currentStock),
              pdfNumber(row.minimumStock),
              pdfMoney(row.estimatedUnitCost),
              row.expiryDate ?? "-",
              row.supplierName ?? "-",
            ])
          : [["Aucune matière", "", "", "", "", "", ""]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Mois", "Budget (FCFA)", "Note", "Saisi par"]],
        body: props.budgets.length
          ? props.budgets.map(row => [row.month, pdfMoney(row.amount), row.notes ?? "-", row.userName])
          : [["Aucun budget", "", "", ""]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Matière sous seuil", "Stock actuel", "Unité", "Seuil minimum", "Unité"]],
        body: props.lowMaterials.length
          ? props.lowMaterials.map(row => [
              row.name,
              pdfNumber(row.currentStock),
              row.unit,
              pdfNumber(row.minimumStock),
              row.unit,
            ])
          : [["Aucune matière sous seuil", "", "", "", ""]],
      });

      autoTable(doc, {
        ...tableBase,
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Produit", "Matière", "Qté pour 1 produit", "Unité", "Note"]],
        body: props.recipes.length
          ? props.recipes.map(row => [
              row.productName,
              row.materialName,
              pdfNumber(row.quantityPerUnit),
              row.materialUnit,
              row.notes ?? "-",
            ])
          : [["Aucune recette", "", "", "", ""]],
      });

      doc.save(`faveda-finances-${props.month}-${Date.now()}.pdf`);
      toast.success("PDF téléchargé", "Les données finance ont été exportées.");
    } catch (error) {
      toast.error("PDF non généré", error instanceof Error ? error.message : "Impossible de générer le PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={downloadPdf} disabled={loading} className="btn-secondary gap-2">
      <Download size={16} />
      {loading ? "Génération..." : "PDF finances"}
    </button>
  );
}
