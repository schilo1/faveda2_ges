import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { runRecommendationEngine } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const recommendations = await prisma.recommendation.findMany({
    where: { isActioned: false },
    orderBy: { createdAt: "desc" },
  });
  const products = await prisma.product.findMany({
    where: { id: { in: recommendations.map(r => r.productId) } },
    select: { id: true, name: true, currentStock: true, minimumStock: true },
  });
  const productById = new Map(products.map(p => [p.id, p]));
  const recs = recommendations.map(r => ({ ...r, product: productById.get(r.productId) ?? null }));
  return NextResponse.json(recs);
}

export async function POST() {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  await runRecommendationEngine();
  return NextResponse.json({ success: true });
}
