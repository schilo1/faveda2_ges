"use client";

import { useMemo, useState } from "react";
import { Download, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type Product = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  sellPrice: number;
};
type CartLine = { productId: string; quantity: number };
type Receipt = {
  number: string;
  date: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  comment: string;
  sellerName: string;
  total: number;
  paidAmount: number;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

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

function drawReceiptBrand(doc: any) {
  doc.setTextColor(79, 92, 61);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.text("FAVEDA", 14, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Tisane traditionnelle à base de plantes", 14, 32);
}

async function buildPreorderReceiptPdf(receipt: Receipt) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable =
    autoTableModule.default ?? (autoTableModule as any).autoTable;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  drawReceiptBrand(doc);

  doc.setDrawColor(79, 92, 61);
  doc.setLineWidth(0.5);
  doc.line(14, 66, pageWidth - 14, 66);
  doc.setFillColor(79, 92, 61);
  doc.roundedRect(pageWidth - 78, 14, 64, 25, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("COMMANDE", pageWidth - 46, 24, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(receipt.number, pageWidth - 46, 31, { align: "center" });

  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(226, 226, 220);
  doc.roundedRect(14, 74, 182, 32, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text("CLIENT", 19, 82);
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
    105,
    89,
  );
  doc.text(`Date : ${new Date(receipt.date).toLocaleString("fr-FR")}`, 105, 95);
  if (receipt.customerAddress)
    doc.text(`Adresse : ${receipt.customerAddress}`, 19, 101, {
      maxWidth: 165,
    });

  autoTable(doc, {
    startY: 116,
    margin: { left: 14, right: 14 },
    tableWidth: 150,
    head: [["Produit", "SKU", "Qté", "Prix", "Total"]],
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
      fontSize: 7.2,
      cellPadding: 1.2,
      lineColor: [226, 226, 220],
      lineWidth: 0.1,
      textColor: [31, 41, 55],
      overflow: "ellipsize",
    },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    columnStyles: {
      0: { cellWidth: 50, overflow: "linebreak" },
      1: { cellWidth: 20 },
      2: { halign: "right", cellWidth: 14 },
      3: { halign: "right", cellWidth: 33 },
      4: { halign: "right", cellWidth: 33 },
    },
  });

  const finalY = ((doc as any).lastAutoTable?.finalY ?? 120) + 10;
  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(226, 226, 220);
  doc.roundedRect(112, finalY, 84, 20, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text("Total commande", 118, finalY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(receiptMoney(receipt.total), 190, finalY + 8, { align: "right" });

  const noteY = finalY + 32;
  doc.setDrawColor(226, 226, 220);
  doc.line(14, noteY - 8, pageWidth - 14, noteY - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "Commande enregistrée. La livraison confirme la remise du produit au client.",
    14,
    noteY,
  );
  if (receipt.comment)
    doc.text(`Note : ${receipt.comment}`, 14, noteY + 5, { maxWidth: 180 });

  return doc;
}

export function PreorderForm({
  products,
  onCreated,
  onClose,
}: {
  products: Product[];
  onCreated?: () => void;
  onClose?: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
    setCart((current) => {
      const exists = current.find((line) => line.productId === productId);
      if (exists)
        return current.map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      return [...current, { productId, quantity: 1 }];
    });
  }

  async function submit() {
    setReceipt(null);
    if (cart.length === 0) {
      toast.error("Commande vide", "Ajoutez au moins un produit.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/preorders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        customerAddress: customerAddress || null,
        comment: comment || null,
        items: cart,
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      toast.error(
        "Commande non enregistrée",
        data?.error ?? "Action impossible.",
      );
      return;
    }
    setReceipt(data.receipt);
    setQuery("");
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setComment("");
    onCreated?.();
    toast.success("Commande enregistrée", "Le reçu est prêt.");
  }

  async function downloadReceipt() {
    if (!receipt) return;
    setDownloading(true);
    try {
      const doc = await buildPreorderReceiptPdf(receipt);
      doc.save(`${receipt.number}.pdf`);
    } catch {
      toast.error("Reçu non généré", "Impossible de créer le PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-4">
        <div className="card p-4">
          <label className="label">Rechercher un produit</label>
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-9"
              placeholder="Nom ou SKU..."
            />
          </div>
          <div className="max-h-[360px] overflow-auto rounded-2xl border border-[#D9D7D2]/70 bg-white">
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
                    {product.sku} · Stock actuel : {product.currentStock} ·{" "}
                    {money.format(product.sellPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(product.id)}
                  className="rounded-xl bg-[#596744] px-3 py-1.5 text-xs font-semibold text-white"
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
            <h2 className="font-bold text-gray-800">Commande</h2>
            <p className="text-xs text-gray-400">{cart.length} produit(s)</p>
          </div>
          <ShoppingCart className="text-[#596744]" size={22} />
        </div>

        {cart.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/70 p-8 text-center text-sm text-gray-400">
            Ajoutez des produits à la commande.
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
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
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
                      value={line.quantity}
                      onChange={(e) =>
                        setCart((current) =>
                          current.map((item) =>
                            item.productId === line.productId
                              ? {
                                  ...item,
                                  quantity: Math.max(1, Number(e.target.value)),
                                }
                              : item,
                          ),
                        )
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
            onClick={submit}
            disabled={loading || cart.length === 0}
            className="btn-primary w-full"
          >
            {loading ? "Enregistrement..." : "Valider la commande"}
          </button>

          {receipt && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-semibold text-green-800">
                Commande : {receipt.number}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadReceipt}
                  disabled={downloading}
                  className="btn-secondary gap-2"
                >
                  <Download size={15} />
                  {downloading ? "Génération..." : "Télécharger le reçu PDF"}
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-bold text-green-800 transition hover:bg-green-100"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
