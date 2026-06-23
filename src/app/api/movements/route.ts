// src/app/api/movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMovementNotificationEmail } from "@/lib/email";
import { auditLog, formatZodError, resolveSessionUser, runAlertEngine, runRecommendationEngine } from "@/lib/utils";
import { z } from "zod";
import { MovementType } from "@prisma/client";

// Types qui AUGMENTENT le stock
const STOCK_IN_TYPES: MovementType[] = ["ENTREE", "RETOUR_CLIENT", "RETOUR_FOURNISSEUR"];
// Types qui DIMINUENT le stock
const STOCK_OUT_TYPES: MovementType[] = ["SORTIE", "VENTE", "PERTE"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

const movementSchema = z.object({
  productId:     z.string().cuid("Produit requis"),
  type:          z.nativeEnum(MovementType),
  quantity:      z.number().int().positive("Quantité doit être positive"),
  motif:         z.string().min(2, "Motif requis"),
  validatorName: z.string().default("Grâce"),
  batchNumber:   z.string().optional().nullable(),
  expiryDate:    z.string().optional().nullable(),
  comment:       z.string().optional().nullable(),
  movementDate:  z.string().optional(),
});

// GET /api/movements
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get("type") as MovementType | null;
  const productId = searchParams.get("productId");
  const from      = searchParams.get("from");
  const to        = searchParams.get("to");
  const page      = parseInt(searchParams.get("page") ?? "1");
  const limit     = parseInt(searchParams.get("limit") ?? "30");
  const skip      = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
    ...(type      && { type }),
    ...(productId && { productId }),
    ...(from || to) && {
      movementDate: {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to) }),
      },
    },
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { include: { category: true } },
        user:    { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { movementDate: "desc" },
      take:    limit,
      skip,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return NextResponse.json({
    data: movements,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

// POST /api/movements
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role === "SURVEILLANT") {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur introuvable dans la base active. Reconnectez-vous ou recréez cet utilisateur." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = movementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, type, quantity, motif, validatorName, batchNumber, expiryDate, comment, movementDate } = parsed.data;
  const movementType: MovementType = type === "SORTIE" ? "VENTE" : type;
  const userId = currentUser.id;

  // Fetch product with its manufacturing recipe. Raw materials are consumed only
  // when a product stock entry represents newly manufactured units.
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      materialRecipes: {
        include: { material: true },
      },
    },
  });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  // Check stock availability for outgoing movements
  if (STOCK_OUT_TYPES.includes(movementType) && product.currentStock < quantity) {
    return NextResponse.json(
      { error: `Stock insuffisant. Disponible : ${product.currentStock}, demandé : ${quantity}` },
      { status: 400 }
    );
  }

  const materialConsumptions = movementType === "ENTREE"
    ? product.materialRecipes.map(recipe => {
        const quantityPerUnit = Number(recipe.quantityPerUnit);
        const needed = quantityPerUnit * quantity;
        return {
          materialId: recipe.materialId,
          materialName: recipe.material.name,
          unit: recipe.material.unit,
          currentStock: Number(recipe.material.currentStock),
          needed,
        };
      })
    : [];

  const insufficientMaterials = materialConsumptions.filter(item => item.currentStock < item.needed);
  if (insufficientMaterials.length > 0) {
    const details = insufficientMaterials
      .map(item => `${item.materialName} : disponible ${item.currentStock} ${item.unit}, nécessaire ${item.needed} ${item.unit}`)
      .join("; ");
    return NextResponse.json({
      error: `Matière première insuffisante pour fabriquer ${quantity} unité(s) de ${product.name}. ${details}`,
    }, { status: 400 });
  }

  // Calculate new stock
  let stockDelta = 0;
  if (STOCK_IN_TYPES.includes(movementType))  stockDelta = +quantity;
  if (STOCK_OUT_TYPES.includes(movementType)) stockDelta = -quantity;
  // TRANSFERT and AJUSTEMENT are handled separately

  const newStock = product.currentStock + stockDelta;
  const movementDateValue = movementDate ? new Date(movementDate) : new Date();
  let resolvedBatchNumber = batchNumber?.trim() || null;

  if (STOCK_IN_TYPES.includes(movementType) && !resolvedBatchNumber) {
    const prefix = `LOT-${product.sku}-${dateKey(movementDateValue)}`;
    const count = await prisma.productBatch.count({
      where: {
        productId,
        batchNumber: { startsWith: prefix },
      },
    });
    resolvedBatchNumber = `${prefix}-${String(count + 1).padStart(2, "0")}`;
  }

  const movement = await prisma.$transaction(async tx => {
    const createdMovement = await tx.stockMovement.create({
      data: {
        productId,
        userId,
        type: movementType,
        quantity,
        motif,
        validatorName,
        comment,
        movementDate: movementDateValue,
      },
      include: {
        product: true,
        user:    { select: { id: true, nom: true, prenom: true } },
      },
    });

    if (STOCK_IN_TYPES.includes(movementType)) {
      await tx.productBatch.create({
        data: {
          productId,
          movementId: createdMovement.id,
          batchNumber: resolvedBatchNumber,
          initialQuantity: quantity,
          quantity,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          receivedAt: movementDateValue,
        },
      });
    }

    if (movementType === "ENTREE" && materialConsumptions.length > 0) {
      for (const item of materialConsumptions) {
        await tx.rawMaterial.update({
          where: { id: item.materialId },
          data: { currentStock: { decrement: item.needed } },
        });
      }
    }

    if (STOCK_OUT_TYPES.includes(movementType)) {
      let remaining = quantity;
      const batches = await tx.productBatch.findMany({
        where: { productId, deletedAt: null, quantity: { gt: 0 } },
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
    }

    await tx.product.update({
      where: { id: productId },
      data:  { currentStock: newStock },
    });

    return createdMovement;
  });

  await auditLog({
    userId,
    action:   "STOCK_MOVEMENT",
    entity:   "StockMovement",
    entityId: movement.id,
    oldValue: { stock: product.currentStock },
    newValue: { stock: newStock, requestedType: type, type: movementType, quantity, materialConsumptions },
  });

  try {
    await sendMovementNotificationEmail([{
      type: movementType,
      quantity,
      motif,
      productName: product.name,
      productSku: product.sku,
      oldStock: product.currentStock,
      newStock,
      movementDate: movement.movementDate,
      validatorName,
      userName: [movement.user.prenom, movement.user.nom].filter(Boolean).join(" "),
      comment,
    }]);
  } catch (error) {
    console.error("Movement email delivery failed", error);
  }

  // Refresh alerts
  await runAlertEngine();
  await runRecommendationEngine();

  return NextResponse.json({ data: movement }, { status: 201 });
}
