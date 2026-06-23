import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable().or(z.literal("")),
  customerAddress: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().cuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});

function preorderNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CMD-${stamp}-${suffix}`;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any)?.role;
  const userId = (session.user as any)?.id;

  const preorders = await prisma.preorder.findMany({
    where: {
      deletedAt: null,
      ...(role === "COMMERCIAL" ? { userId } : {}),
    },
    include: {
      user: { select: { prenom: true, nom: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
    orderBy: { preorderDate: "desc" },
  });

  return NextResponse.json(preorders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any)?.role;
  if (!["ADMIN", "GESTIONNAIRE", "COMMERCIAL"].includes(role)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return NextResponse.json({ error: formatZodError(parsed.error), details }, { status: 400 });
  }

  const productIds = parsed.data.items.map(item => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    return NextResponse.json({ error: "Un produit ne peut apparaître qu'une seule fois." }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true, sku: true, sellPrice: true },
  });
  const productById = new Map(products.map(product => [product.id, product]));
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs produits sont introuvables." }, { status: 400 });
  }

  const items = parsed.data.items.map(item => {
    const product = productById.get(item.productId)!;
    const unitPrice = Number(product.sellPrice);
    return {
      product,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
    };
  });
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const paidAmount = total;
  const number = preorderNumber();
  const now = new Date();

  const preorder = await prisma.preorder.create({
    data: {
      referenceNumber: number,
      status: "PAYEE",
      customerName: parsed.data.customerName?.trim() || null,
      customerPhone: parsed.data.customerPhone?.trim() || null,
      customerEmail: parsed.data.customerEmail?.trim() || null,
      customerAddress: parsed.data.customerAddress?.trim() || null,
      comment: parsed.data.comment?.trim() || null,
      totalAmount: total,
      paidAmount,
      preorderDate: now,
      userId: currentUser.id,
      items: {
        create: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  await auditLog({
    userId: currentUser.id,
    action: "CREATE_PREORDER",
    entity: "Preorder",
    entityId: preorder.id,
    newValue: preorder as any,
  });

  return NextResponse.json({
    receipt: {
      number,
      date: now.toISOString(),
      status: preorder.status,
      customerName: preorder.customerName ?? "",
      customerPhone: preorder.customerPhone ?? "",
      customerEmail: preorder.customerEmail ?? "",
      customerAddress: preorder.customerAddress ?? "",
      comment: preorder.comment ?? "",
      sellerName: session.user?.name ?? "",
      paidAmount,
      total,
      items: items.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    },
  }, { status: 201 });
}
