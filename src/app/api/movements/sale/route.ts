import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMovementNotificationEmail } from "@/lib/email";
import { auditLog, formatZodError, resolveSessionUser, runAlertEngine, runRecommendationEngine } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable().or(z.literal("")),
  customerAddress: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  validatorName: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().cuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});

function receiptNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `REC-${stamp}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if ((session.user as any).role === "SURVEILLANT") {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur introuvable dans la base active. Reconnectez-vous ou recréez cet utilisateur." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });

  const productIds = parsed.data.items.map(item => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    return NextResponse.json({ error: "Un produit ne peut apparaître qu'une seule fois dans la vente." }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true, sku: true, currentStock: true, sellPrice: true },
  });
  const productById = new Map(products.map(product => [product.id, product]));

  for (const item of parsed.data.items) {
    const product = productById.get(item.productId);
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    if (product.currentStock < item.quantity) {
      return NextResponse.json({
        error: `Stock insuffisant pour ${product.name}. Disponible : ${product.currentStock}, demandé : ${item.quantity}.`,
      }, { status: 400 });
    }
  }

  const userId = currentUser.id;
  const number = receiptNumber();
  const validatorName = parsed.data.validatorName || "Grâce";
  const customerName = parsed.data.customerName?.trim() || null;
  const customerPhone = parsed.data.customerPhone?.trim() || null;
  const customerEmail = parsed.data.customerEmail?.trim() || null;
  const customerAddress = parsed.data.customerAddress?.trim() || null;
  const comment = parsed.data.comment?.trim() || null;
  const now = new Date();

  const movements = await prisma.$transaction(async tx => {
    const created = [];

    for (const item of parsed.data.items) {
      const product = productById.get(item.productId)!;
      const newStock = product.currentStock - item.quantity;
      const unitPrice = Number(product.sellPrice);
      const totalPrice = unitPrice * item.quantity;

      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          userId,
          type: "VENTE",
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          motif: `Vente ${number}`,
          validatorName,
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          comment,
          referenceNumber: number,
          movementDate: now,
        },
      });

      let remaining = item.quantity;
      const batches = await tx.productBatch.findMany({
        where: { productId: item.productId, deletedAt: null, quantity: { gt: 0 } },
        orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
      });

      for (const batch of batches) {
        if (remaining <= 0) break;
        const consumed = Math.min(batch.quantity, remaining);
        remaining -= consumed;
        await tx.productBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - consumed },
        });
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: newStock },
      });

      created.push(movement);
    }

    return created;
  });

  await auditLog({
    userId,
    action: "SALE",
    entity: "StockMovement",
    entityId: number,
    newValue: {
      receiptNumber: number,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      comment,
      items: parsed.data.items,
    },
  });

  try {
    await sendMovementNotificationEmail(parsed.data.items.map(item => {
      const product = productById.get(item.productId)!;
      return {
        type: "VENTE" as const,
        quantity: item.quantity,
        motif: `Vente ${number}`,
        productName: product.name,
        productSku: product.sku,
        oldStock: product.currentStock,
        newStock: product.currentStock - item.quantity,
        movementDate: now,
        validatorName,
        userName: session.user?.name ?? null,
        referenceNumber: number,
        comment,
      };
    }));
  } catch (error) {
    console.error("Movement email delivery failed", error);
  }

  await runAlertEngine();
  await runRecommendationEngine();

  const receiptItems = parsed.data.items.map(item => {
    const product = productById.get(item.productId)!;
    const unitPrice = Number(product.sellPrice);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
    };
  });
  const total = receiptItems.reduce((sum, item) => sum + item.total, 0);

  return NextResponse.json({
    receipt: {
      number,
      date: now.toISOString(),
      customerName: customerName ?? "",
      customerPhone: customerPhone ?? "",
      customerEmail: customerEmail ?? "",
      customerAddress: customerAddress ?? "",
      comment: comment ?? "",
      sellerName: session.user?.name ?? "",
      items: receiptItems,
      total,
      movementIds: movements.map(movement => movement.id),
    },
  }, { status: 201 });
}
