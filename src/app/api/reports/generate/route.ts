// src/app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCFA } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { type, format, from, to } = await req.json();

  switch (type) {
    case "ETAT_STOCK":   return generateStockReport(format, from, to);
    case "MOUVEMENTS":   return generateMovementsReport(format, from, to);
    case "VALORISATION": return generateValuationReport(format, from, to);
    default:
      return NextResponse.json({ error: "Type de rapport inconnu" }, { status: 400 });
  }
}

function endOfDay(date?: string) {
  if (!date) return undefined;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function generateStockReport(format: string, from?: string, to?: string) {
  const toDate = endOfDay(to);
  const products = await prisma.product.findMany({
    where:   {
      deletedAt: null,
      ...(from || toDate ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(toDate ? { lte: toDate } : {}),
        },
      } : {}),
    },
    include: { category: true, unit: true, supplier: true },
    orderBy: { name: "asc" },
  });

  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "FAVEDA Stock";

    const ws = wb.addWorksheet("État du Stock", {
      views: [{ showGridLines: true }],
    });

    // Styles
    const headerFill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FF4F5C3D" },
    } as const;
    const headerFont = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };

    ws.columns = [
      { header: "SKU",            key: "sku",      width: 16 },
      { header: "Produit",        key: "name",     width: 30 },
      { header: "Catégorie",      key: "cat",      width: 18 },
      { header: "Fournisseur",    key: "sup",      width: 20 },
      { header: "Stock actuel",   key: "stock",    width: 14 },
      { header: "Seuil minimum",  key: "min",      width: 14 },
      { header: "Prix achat",     key: "buy",      width: 14 },
      { header: "Prix vente",     key: "sell",     width: 14 },
      { header: "Valeur stock",   key: "value",    width: 18 },
      { header: "Statut",         key: "status",   width: 12 },
      { header: "Péremption",     key: "expiry",   width: 14 },
    ];

    // Style header row
    ws.getRow(1).eachCell((cell) => {
      cell.fill   = headerFill;
      cell.font   = headerFont;
      cell.alignment = { horizontal: "center" };
    });

    let totalValue = 0;

    products.forEach((p) => {
      const value = p.currentStock * parseFloat(p.buyPrice.toString());
      totalValue += value;

      const status =
        p.currentStock === 0 ? "RUPTURE" :
        p.currentStock < p.minimumStock ? "SEUIL BAS" : "Normal";

      const row = ws.addRow({
        sku:    p.sku,
        name:   p.name,
        cat:    p.category.name,
        sup:    p.supplier?.name ?? "Aucun",
        stock:  p.currentStock,
        min:    p.minimumStock,
        buy:    parseFloat(p.buyPrice.toString()),
        sell:   parseFloat(p.sellPrice.toString()),
        value,
        status,
        expiry: p.expiryDate ? p.expiryDate.toLocaleDateString("fr-FR") : "—",
      });

      // Highlight low/out stock
      if (p.currentStock === 0) {
        row.getCell("stock").font = { color: { argb: "FFCC3300" }, bold: true };
      } else if (p.currentStock < p.minimumStock) {
        row.getCell("stock").font = { color: { argb: "FFBA7517" }, bold: true };
      }
    });

    // Total row
    ws.addRow({});
    const totalRow = ws.addRow({ name: "TOTAL VALEUR STOCK", value: totalValue });
    totalRow.font = { bold: true };
    totalRow.getCell("name").alignment = { horizontal: "right" };

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="faveda-stock-${Date.now()}.xlsx"`,
      },
    });
  }

  // PDF via JSON (client-side jsPDF rendering)
  const rows = products.map((p) => ({
    sku:    p.sku,
    name:   p.name,
    cat:    p.category.name,
    sup:    p.supplier?.name ?? "Aucun",
    stock:  p.currentStock,
    unit:   p.unit.symbol,
    min:    p.minimumStock,
    buy:    parseFloat(p.buyPrice.toString()),
    sell:   parseFloat(p.sellPrice.toString()),
    value:  p.currentStock * parseFloat(p.buyPrice.toString()),
    status: p.currentStock === 0 ? "RUPTURE" : p.currentStock < p.minimumStock ? "SEUIL BAS" : "Normal",
    expiry: p.expiryDate ? p.expiryDate.toLocaleDateString("fr-FR") : "-",
  }));

  return NextResponse.json({ type: "PDF_DATA", title: "État du Stock FAVEDA", rows });
}

async function generateMovementsReport(format: string, from?: string, to?: string) {
  const toDate = endOfDay(to);
  const movements = await prisma.stockMovement.findMany({
    where: {
      deletedAt: null,
      ...(from || toDate) && {
        movementDate: {
          ...(from && { gte: new Date(from) }),
          ...(toDate && { lte: toDate }),
        },
      },
    },
    include: {
      product: true,
      user:    { select: { nom: true, prenom: true } },
    },
    orderBy: { movementDate: "desc" },
  });

  if (format === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Mouvements");

    ws.columns = [
      { header: "Date",        key: "date",    width: 16 },
      { header: "Produit",     key: "product", width: 28 },
      { header: "Type",        key: "type",    width: 18 },
      { header: "Quantité",    key: "qty",     width: 12 },
      { header: "Prix unitaire", key: "unitPrice", width: 14 },
      { header: "Total",       key: "total",   width: 14 },
      { header: "Motif",       key: "motif",   width: 28 },
      { header: "Validateur",  key: "valid",   width: 18 },
      { header: "Utilisateur", key: "user",    width: 20 },
    ];

    movements.forEach((m) => {
      const unitPrice = Number(m.unitPrice ?? m.product.sellPrice ?? 0);
      const total = Number(m.totalPrice ?? unitPrice * m.quantity);
      ws.addRow({
        date:    m.movementDate.toLocaleDateString("fr-FR"),
        product: m.product.name,
        type:    m.type,
        qty:     m.quantity,
        unitPrice,
        total,
        motif:   m.motif,
        valid:   m.validatorName,
        user:    `${m.user.prenom} ${m.user.nom}`,
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="faveda-mouvements-${Date.now()}.xlsx"`,
      },
    });
  }

  const rows = movements.map((m) => {
    const unitPrice = Number(m.unitPrice ?? m.product.sellPrice ?? 0);
    return {
      date: m.movementDate.toLocaleDateString("fr-FR"),
      product: m.product.name,
      type: m.type,
      quantity: m.quantity,
      unitPrice,
      total: Number(m.totalPrice ?? unitPrice * m.quantity),
      motif: m.motif,
      validator: m.validatorName,
      user: `${m.user.prenom} ${m.user.nom}`,
    };
  });

  return NextResponse.json({ type: "PDF_DATA", title: "Mouvements de Stock FAVEDA", rows });
}

async function generateValuationReport(format: string, from?: string, to?: string) {
  const toDate = endOfDay(to);
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(from || toDate ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(toDate ? { lte: toDate } : {}),
        },
      } : {}),
    },
    include: { category: true },
  });

  const totalBuyValue  = products.reduce((s, p) => s + p.currentStock * parseFloat(p.buyPrice.toString()),  0);
  const totalSellValue = products.reduce((s, p) => s + p.currentStock * parseFloat(p.sellPrice.toString()), 0);

  const byCategory = Object.entries(
      products.reduce((acc: Record<string, { buyValue: number; sellValue: number; stock: number }>, p) => {
        const cat = p.category.name;
        acc[cat] ??= { buyValue: 0, sellValue: 0, stock: 0 };
        acc[cat].buyValue += p.currentStock * parseFloat(p.buyPrice.toString());
        acc[cat].sellValue += p.currentStock * parseFloat(p.sellPrice.toString());
        acc[cat].stock += p.currentStock;
        return acc;
      }, {})
    ).map(([cat, value]) => ({
      cat,
      stock: value.stock,
      buyValue: value.buyValue,
      sellValue: value.sellValue,
      margin: value.sellValue - value.buyValue,
    }));

  const data = {
    totalBuyValue,
    totalSellValue,
    potentialMargin: totalSellValue - totalBuyValue,
    byCategory,
  };

  return NextResponse.json({ type: "PDF_DATA", title: "Valorisation du Stock", data });
}
