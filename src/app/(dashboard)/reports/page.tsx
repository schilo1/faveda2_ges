"use client";
import { useState } from "react";
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type ReportType = "ETAT_STOCK" | "MOUVEMENTS" | "VALORISATION";

type StockPdfRow = {
  sku: string;
  name: string;
  cat: string;
  sup: string;
  stock: number;
  unit: string;
  min: number;
  buy: number;
  sell: number;
  value: number;
  status: string;
  expiry: string;
};

type MovementPdfRow = {
  date: string;
  product: string;
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
  motif: string;
  validator: string;
  user: string;
};

type ValuationPdfData = {
  totalBuyValue: number;
  totalSellValue: number;
  potentialMargin: number;
  byCategory: Array<{
    cat: string;
    stock: number;
    buyValue: number;
    sellValue: number;
    margin: number;
  }>;
};

function pdfNumber(value: number) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const rgb = (r: number, g: number, b: number): [number, number, number] => [r, g, b];

const reports = [
  {
    type: "ETAT_STOCK" as ReportType,
    title: "État du stock",
    desc: "Liste complète des produits avec niveaux de stock",
    icon: FileBarChart,
  },
  {
    type: "MOUVEMENTS" as ReportType,
    title: "Mouvements de stock",
    desc: "Historique des entrées, sorties et transferts",
    icon: FileText,
  },
  {
    type: "VALORISATION" as ReportType,
    title: "Valorisation du stock",
    desc: "Valeur totale du stock par catégorie",
    icon: FileSpreadsheet,
  },
];

export default function ReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function getPdfTools() {
    const [{ default: jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default ?? (autoTableModule as any).autoTable;
    if (typeof autoTable !== "function") throw new Error("Module PDF indisponible.");
    return { jsPDF, autoTable };
  }

  function writePdfHeader(doc: any, title: string) {
    const generatedAt = new Date().toLocaleString("fr-FR");
    const period = from || to
      ? `Période : ${from || "début"} au ${to || "aujourd'hui"}`
      : "Tous les produits";

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(period, 14, 23);
    doc.text(`Généré le ${generatedAt}`, 14, 29);
  }

  const tableBase = {
    theme: "grid" as const,
    margin: { left: 10, right: 10 },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      fontStyle: "normal" as const,
      cellPadding: { top: 2.2, right: 2.6, bottom: 2.2, left: 2.6 },
        textColor: rgb(31, 41, 55),
        lineColor: rgb(226, 226, 220),
      lineWidth: 0.1,
    },
    headStyles: {
        fillColor: rgb(79, 92, 61),
        textColor: rgb(255, 255, 255),
      fontStyle: "bold" as const,
      halign: "center" as const,
    },
    alternateRowStyles: { fillColor: rgb(248, 248, 246) },
  };

  function addPageNumber(doc: any, data: any) {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Page ${data.pageNumber} / ${pageCount}`, 276, 202, { align: "right" });
  }

  function addValuationDefinitions(doc: any, startY: number) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const definitions = [
      "Catégorie : famille ou groupe auquel les produits appartiennent.",
      "Stock : quantité totale disponible dans la catégorie au moment du rapport.",
      "Valeur achat : coût total du stock, calculé avec quantité en stock x prix d'achat.",
      "Valeur vente : montant théorique si tout le stock est vendu au prix de vente actuel.",
      "Marge potentielle : valeur vente - valeur achat. C'est une estimation, pas le bénéfice réel encaissé.",
      "Total : addition des valeurs de toutes les catégories affichées dans le rapport.",
    ];
    let y = startY + 10;

    if (y + 44 > pageHeight - 12) {
      doc.addPage();
      y = 18;
    }

    doc.setDrawColor(201, 162, 39);
    doc.setFillColor(255, 243, 196);
    doc.roundedRect(10, y, 277, 40, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text("Définitions des termes", 14, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    definitions.forEach((definition, index) => {
      doc.text(definition, 14, y + 14 + index * 4.2);
    });
  }

  async function buildStockPdf(payload: { title: string; rows: StockPdfRow[] }) {
    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF({ orientation: "landscape" });
    const totalValue = payload.rows.reduce((sum, row) => sum + row.value, 0);

    writePdfHeader(doc, payload.title);

    autoTable(doc, {
      ...tableBase,
      startY: 36,
      head: [[
        "SKU",
        "Produit",
        "Catégorie",
        "Fournisseur",
        "Stock",
        "Seuil",
        "Prix achat (FCFA)",
        "Prix vente (FCFA)",
        "Valeur (FCFA)",
        "Statut",
        "Péremption",
      ]],
      body: [
        ...payload.rows.map(row => [
        row.sku,
        row.name,
        row.cat,
        row.sup,
        pdfNumber(row.stock),
        pdfNumber(row.min),
        pdfNumber(row.buy),
        pdfNumber(row.sell),
        pdfNumber(row.value),
        row.status,
        row.expiry,
      ]),
      ["", "TOTAL", "", "", "", "", "", "", pdfNumber(totalValue), "", ""],
      ],
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 38 },
        2: { cellWidth: 28 },
        3: { cellWidth: 31 },
        4: { halign: "right", cellWidth: 16 },
        5: { halign: "right", cellWidth: 16 },
        6: { halign: "right", cellWidth: 24 },
        7: { halign: "right", cellWidth: 24 },
        8: { halign: "right", cellWidth: 28 },
        9: { halign: "center", cellWidth: 22 },
        10: { halign: "center", cellWidth: 22 },
      },
      didParseCell: data => {
        if (data.section === "body" && data.column.index === 9) {
          const status = String(data.cell.raw);
          if (status === "RUPTURE") data.cell.styles.textColor = [190, 24, 24];
          if (status === "SEUIL BAS") data.cell.styles.textColor = [194, 120, 3];
        }
        if (data.section === "body" && data.row.index === payload.rows.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 243, 239];
          data.cell.styles.textColor = [31, 41, 55];
        }
      },
      didDrawPage: data => addPageNumber(doc, data),
    });

    doc.save(`faveda-etat-stock-${Date.now()}.pdf`);
  }

  async function buildMovementsPdf(payload: { title: string; rows: MovementPdfRow[] }) {
    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF({ orientation: "landscape" });
    const total = payload.rows.reduce((sum, row) => sum + row.total, 0);
    writePdfHeader(doc, payload.title);

    autoTable(doc, {
      ...tableBase,
      startY: 36,
      head: [["Date", "Produit", "Type", "Qté", "Prix unit. (FCFA)", "Total (FCFA)", "Motif", "Validateur", "Utilisateur"]],
      body: [
        ...payload.rows.map(row => [
          row.date,
          row.product,
          row.type,
          pdfNumber(row.quantity),
          pdfNumber(row.unitPrice),
          pdfNumber(row.total),
          row.motif,
          row.validator,
          row.user,
        ]),
        ["", "TOTAL", "", "", "", pdfNumber(total), "", "", ""],
      ],
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: 43 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 14, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
        6: { cellWidth: 48 },
        7: { cellWidth: 28 },
        8: { cellWidth: 30 },
      },
      didParseCell: data => {
        if (data.section === "body" && data.row.index === payload.rows.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 243, 239];
        }
      },
      didDrawPage: data => addPageNumber(doc, data),
    });

    doc.save(`faveda-mouvements-${Date.now()}.pdf`);
  }

  async function buildValuationPdf(payload: { title: string; data: ValuationPdfData }) {
    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF({ orientation: "landscape" });
    writePdfHeader(doc, payload.title);

    autoTable(doc, {
      ...tableBase,
      startY: 36,
      head: [["Catégorie", "Stock", "Valeur achat (FCFA)", "Valeur vente (FCFA)", "Marge potentielle (FCFA)"]],
      body: [
        ...payload.data.byCategory.map(row => [
          row.cat,
          pdfNumber(row.stock),
          pdfNumber(row.buyValue),
          pdfNumber(row.sellValue),
          pdfNumber(row.margin),
        ]),
        [
          "TOTAL",
          "",
          pdfNumber(payload.data.totalBuyValue),
          pdfNumber(payload.data.totalSellValue),
          pdfNumber(payload.data.potentialMargin),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 70 },
        1: { halign: "right", cellWidth: 30 },
        2: { halign: "right", cellWidth: 48 },
        3: { halign: "right", cellWidth: 48 },
        4: { halign: "right", cellWidth: 52 },
      },
      didParseCell: data => {
        if (data.section === "body" && data.row.index === payload.data.byCategory.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [243, 243, 239];
        }
      },
      didDrawPage: data => addPageNumber(doc, data),
    });

    addValuationDefinitions(doc, (doc as any).lastAutoTable?.finalY ?? 36);

    doc.save(`faveda-valorisation-${Date.now()}.pdf`);
  }

  async function download(type: ReportType, format: "excel" | "pdf") {
    setLoading(`${type}-${format}`);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          format,
          from: from || undefined,
          to: to || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      if (format === "pdf") {
        const payload = await res.json();
        if (type === "ETAT_STOCK") await buildStockPdf(payload);
        if (type === "MOUVEMENTS") await buildMovementsPdf(payload);
        if (type === "VALORISATION") await buildValuationPdf(payload);
        toast.success("Rapport généré", "Le PDF a été téléchargé.");
        return;
      }
      const blob = await res.blob();
      const ext = format === "excel" ? "xlsx" : "pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faveda-${type.toLowerCase()}-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Rapport généré", "Le téléchargement a commencé.");
    } catch {
      toast.error("Rapport non généré", "Erreur lors de la génération du rapport.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports</h1>
          <p className="page-subtitle">Exporter les données en Excel ou PDF</p>
        </div>
      </div>

      <div className="card mb-5 p-4">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-800">
            Période d&apos;exportation
          </h2>
          <p className="text-xs text-gray-500">
            Choisissez une marge de dates avant de générer un fichier.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.type}
              className="card group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#4F5C3D]/10"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#F3F3F3] border border-[#D9D7D2] flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                <Icon size={20} className="text-[#596744]" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{r.title}</h3>
              <p className="text-sm text-gray-500 mb-5">{r.desc}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => download(r.type, "excel")}
                  disabled={!!loading}
                  className="btn-primary flex items-center gap-1.5 flex-1 justify-center text-sm py-2"
                >
                  <Download size={14} />
                  {loading === `${r.type}-excel` ? "..." : "Excel"}
                </button>
                <button
                  onClick={() => download(r.type, "pdf")}
                  disabled={!!loading}
                  className="btn-secondary flex items-center gap-1.5 flex-1 justify-center text-sm py-2"
                >
                  <Download size={14} />
                  {loading === `${r.type}-pdf` ? "..." : "PDF"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
