import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [products, movements, alerts] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { currentStock: true, minimumStock: true, sellPrice: true, expiryDate: true, name: true, id: true },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { product: { select: { name: true } }, user: { select: { nom: true, prenom: true } } },
    }),
    prisma.alert.count({ where: { isRead: false } }),
  ]);

  const totalValue = products.reduce((s, p) => s + p.currentStock * Number(p.sellPrice), 0);
  const outOfStock = products.filter(p => p.currentStock === 0).length;
  const nearMinimum = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumStock).length;
  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nearExpiry = products.filter(p => p.expiryDate && p.expiryDate <= soon).length;

  const recentEntries = movements.filter(m => m.type === "ENTREE").slice(0, 5);
  const recentExits = movements.filter(m => ["SORTIE", "VENTE"].includes(m.type)).slice(0, 5);

  return NextResponse.json({
    totalValue,
    totalProducts: products.length,
    outOfStock,
    nearMinimum,
    nearExpiry,
    unreadAlerts: alerts,
    recentEntries: recentEntries.map(m => ({
      id: m.id,
      productName: m.product.name,
      quantity: m.quantity,
      type: m.type,
      date: m.createdAt,
      userName: `${m.user.prenom} ${m.user.nom}`,
    })),
    recentExits: recentExits.map(m => ({
      id: m.id,
      productName: m.product.name,
      quantity: m.quantity,
      type: m.type,
      date: m.createdAt,
      userName: `${m.user.prenom} ${m.user.nom}`,
    })),
  });
}
