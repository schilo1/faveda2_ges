"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { receiptLogoAsDataUrl } from "@/lib/receiptLogo";

type Product = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  sellPrice: number;
};

type CartLine = {
  productId: string;
  quantity: number;
};

type Receipt = {
  number: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  comment: string;
  sellerName: string;
  total: number;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

interface Props {
  products: Product[];
}

const money = new Intl.NumberFormat("fr-CI", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function receiptMoney(value: number) {
  return `${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

async function buildReceiptPdf(receipt: Receipt) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable =
    autoTableModule.default ?? (autoTableModule as any).autoTable;
  if (typeof autoTable !== "function") {
    throw new Error("Le module de tableau PDF n'est pas disponible.");
  }
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  try {
    const logo = await receiptLogoAsDataUrl();
    doc.addImage(logo, "JPEG", 14, 8, 60, 53);
  } catch (error) {
    console.error("Logo du reçu non affiché", error);
    doc.setTextColor(79, 92, 61);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("FAVEDA", 14, 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Tisane traditionnelle à base de plantes", 14, 32);
  }

  doc.setDrawColor(79, 92, 61);
  doc.setLineWidth(0.5);
  doc.line(14, 66, pageWidth - 14, 66);
  doc.setFillColor(79, 92, 61);
  doc.roundedRect(pageWidth - 72, 14, 58, 25, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RECU DE VENTE", pageWidth - 43, 24, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.number, pageWidth - 43, 31, { align: "center" });

  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(226, 226, 220);
  doc.roundedRect(14, 74, 86, 38, 2, 2, "FD");
  doc.roundedRect(110, 74, 86, 38, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text("CLIENT", 19, 82);
  doc.text("VENTE", 115, 82);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(receipt.customerName || "Client comptoir", 19, 89);
  doc.text(
    receipt.customerPhone
      ? `Téléphone : ${receipt.customerPhone}`
      : "Téléphone : -",
    19,
    95,
  );
  doc.text(
    receipt.customerEmail ? `Email : ${receipt.customerEmail}` : "Email : -",
    19,
    101,
  );
  doc.text(`Date : ${new Date(receipt.date).toLocaleString("fr-FR")}`, 115, 89);
  doc.text(`Vendeur : ${receipt.sellerName || "-"}`, 115, 95);
  if (receipt.customerAddress)
    doc.text(`Adresse : ${receipt.customerAddress}`, 115, 101, {
      maxWidth: 72,
    });

  autoTable(doc, {
    startY: 122,
    margin: { left: 14, right: 14 },
    tableWidth: 154,
    head: [["Produit", "SKU", "Qté", "P.U.", "Total"]],
    body: receipt.items.map((item) => [
      item.name,
      item.sku,
      String(item.quantity),
      receiptMoney(item.unitPrice),
      receiptMoney(item.total),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [79, 92, 61],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 1.5,
      lineColor: [226, 226, 220],
      lineWidth: 0.1,
      textColor: [31, 41, 55],
      overflow: "ellipsize",
    },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    columnStyles: {
      0: { cellWidth: 50, overflow: "linebreak" },
      1: { cellWidth: 24 },
      2: { halign: "right", cellWidth: 14 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(255, 243, 196);
  doc.setDrawColor(201, 162, 39);
  doc.roundedRect(pageWidth - 78, finalY, 64, 20, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(111, 86, 13);
  doc.text("TOTAL PAYE", pageWidth - 73, finalY + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(receiptMoney(receipt.total), pageWidth - 18, finalY + 15, {
    align: "right",
  });

  const footerY = Math.max(finalY + 36, 270);
  doc.setDrawColor(226, 226, 220);
  doc.line(14, footerY - 8, pageWidth - 14, footerY - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "Reçu généré par FAVEDA Stock. Conservez ce document comme preuve d'achat.",
    14,
    footerY,
  );
  if (receipt.comment)
    doc.text(`Note : ${receipt.comment}`, 14, footerY + 5, { maxWidth: 180 });

  return doc;
}

export function SaleForm({ products }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [comment, setComment] = useState("");
  const [validatorName, setValidatorName] = useState("Grâce");
  const [loading, setLoading] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const filteredProducts = products
    .filter((product) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${product.name} ${product.sku}`.toLowerCase().includes(q);
    })
    .slice(0, 8);

  const total = cart.reduce((sum, line) => {
    const product = productById.get(line.productId);
    return sum + (product ? product.sellPrice * line.quantity : 0);
  }, 0);

  function addProduct(productId: string) {
    const product = productById.get(productId);
    if (!product || product.currentStock <= 0) return;
    setCart((current) => {
      const exists = current.find((line) => line.productId === productId);
      if (exists) {
        return current.map((line) =>
          line.productId === productId
            ? {
                ...line,
                quantity: Math.min(product.currentStock, line.quantity + 1),
              }
            : line,
        );
      }
      return [...current, { productId, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    const product = productById.get(productId);
    if (!product) return;
    const nextQuantity = Math.max(1, Math.min(product.currentStock, quantity));
    setCart((current) =>
      current.map((line) =>
        line.productId === productId
          ? { ...line, quantity: nextQuantity }
          : line,
      ),
    );
  }

  async function submitSale() {
    setError("");
    setReceipt(null);
    if (cart.length === 0) {
      const message = "Ajoutez au moins un produit à la vente.";
      setError(message);
      toast.error("Vente incomplète", message);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/movements/sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        customerAddress: customerAddress || null,
        comment: comment || null,
        validatorName,
        items: cart,
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      const message = data?.error ?? "Impossible d'enregistrer la vente.";
      setError(message);
      toast.error("Vente non enregistrée", message);
      return;
    }

    setReceipt(data.receipt);
    toast.success("Vente enregistrée", "Le reçu est prêt à être téléchargé.");
  }

  async function downloadReceipt() {
    if (!receipt) return;
    setError("");
    setDownloadingReceipt(true);
    try {
      const doc = await buildReceiptPdf(receipt);
      doc.save(`${receipt.number}.pdf`);
    } catch (err) {
      console.error(err);
      const message =
        "Impossible de générer le reçu PDF. Réessayez ou consultez le reçu depuis les détails de la vente.";
      setError(message);
      toast.error("Reçu non généré", message);
    } finally {
      setDownloadingReceipt(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="card p-4">
          <label className="label">Recherche un produit</label>
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-9"
              placeholder="Nom ou SKU..."
            />
          </div>
          <div className="max-h-[430px] overflow-auto rounded-2xl border border-[#D9D7D2]/70 bg-white">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 border-b border-[#D9D7D2]/40 px-3 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    <span className="font-mono">{product.sku}</span>
                    <span className="mx-1">•</span>
                    Stock : {product.currentStock}
                    <span className="mx-1">•</span>
                    {money.format(product.sellPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(product.id)}
                  disabled={product.currentStock <= 0}
                  className="rounded-xl bg-[#596744] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4F5C3D] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 font-bold text-gray-800">Informations client</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input"
              placeholder="Nom du client"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="input"
              placeholder="Téléphone"
            />
            <input
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="input"
              placeholder="Email"
              type="email"
            />
            <input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="input"
              placeholder="Adresse"
            />
            <input
              value={validatorName}
              onChange={(e) => setValidatorName(e.target.value)}
              className="input"
              placeholder="Validé par"
            />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input"
              placeholder="Note / observation"
            />
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Panier de vente</h2>
            <p className="text-xs text-gray-400">{cart.length} produit(s)</p>
          </div>
          <ShoppingCart className="text-[#596744]" size={22} />
        </div>

        {cart.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/70 p-8 text-center text-sm text-gray-400">
            Ajoutez des produits à la vente.
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((line) => {
              const product = productById.get(line.productId)!;
              return (
                <div
                  key={line.productId}
                  className="rounded-2xl border border-[#D9D7D2]/70 bg-[#F3F3F3]/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {money.format(product.sellPrice)} / unité
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.filter(
                            (item) => item.productId !== line.productId,
                          ),
                        )
                      }
                      className="text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <input
                      type="number"
                      min={1}
                      max={product.currentStock}
                      value={line.quantity}
                      onChange={(e) =>
                        updateQuantity(line.productId, Number(e.target.value))
                      }
                      className="input max-w-[110px]"
                    />
                    <p className="text-sm font-bold text-[#596744]">
                      {money.format(product.sellPrice * line.quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 border-t border-[#D9D7D2]/60 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="text-2xl font-bold text-[#4F5C3D]">
              {money.format(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={submitSale}
            disabled={loading || cart.length === 0}
            className="btn-primary w-full gap-2"
          >
            {loading ? "Enregistrement..." : "Valider la vente"}
          </button>

          {receipt && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-semibold text-green-800">
                Vente enregistrée : {receipt.number}
              </p>
              <p className="mt-1 text-xs text-green-700">
                {receipt.customerName || "Client comptoir"}
                {receipt.customerPhone ? ` · ${receipt.customerPhone}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadReceipt}
                  disabled={downloadingReceipt}
                  className="btn-secondary gap-2"
                >
                  <Download size={15} />
                  {downloadingReceipt
                    ? "Génération..."
                    : "Télécharger le reçu PDF"}
                </button>
                <Link
                  href={`/stock/movements/sales/${receipt.number}`}
                  className="btn-secondary gap-2"
                >
                  <Eye size={15} />
                  Voir le reçu
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
