import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendMovementNotificationEmail } from "@/lib/email";
import { z } from "zod";
import { formatZodError, resolveSessionUser, runAlertEngine, runRecommendationEngine } from "@/lib/utils";

const schema = z.object({
  inventoryDate: z.string(),
  items: z.array(z.object({
    productId:    z.string(),
    physicalStock: z.number().int().min(0),
    justification: z.string().optional().nullable(),
  })).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const inventories = await prisma.inventory.findMany({
    where: { deletedAt: null },
    include: { product: { select: { name: true, sku: true } }, user: { select: { nom: true, prenom: true } } },
    orderBy: { inventoryDate: "desc" },
  });
  return NextResponse.json(inventories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur introuvable dans la base active. Reconnectez-vous ou recréez cet utilisateur." }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });

  const date = new Date(parsed.data.inventoryDate);
  const productIds = Array.from(new Set(parsed.data.items.map(item => item.productId)));
  if (productIds.length !== parsed.data.items.length) {
    return NextResponse.json({ error: "Un produit ne peut être contrôlé qu'une seule fois par inventaire." }, { status: 400 });
  }
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, name: true, sku: true, currentStock: true },
  });
  const productById = new Map(products.map(product => [product.id, product]));
  const stockByProduct = new Map(products.map(product => [product.id, product.currentStock]));

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs produits sont introuvables." }, { status: 400 });
  }

  const created = await prisma.$transaction(async tx => {
    const inventories = [];

    for (const item of parsed.data.items) {
      const theoreticalQty = stockByProduct.get(item.productId) ?? 0;
      const physicalQty = item.physicalStock;

      inventories.push(await tx.inventory.create({
        data: {
          inventoryDate:  date,
          productId:      item.productId,
          theoreticalQty,
          physicalQty,
          difference:     physicalQty - theoreticalQty,
          justification:  item.justification ?? null,
          userId:         currentUser.id,
        },
      }));

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: physicalQty },
      });
    }

    return inventories;
  });

  try {
    await sendMovementNotificationEmail(parsed.data.items
      .map(item => {
        const product = productById.get(item.productId)!;
        const oldStock = product.currentStock;
        const newStock = item.physicalStock;

        return {
          type: "AJUSTEMENT" as const,
          quantity: Math.abs(newStock - oldStock),
          motif: item.justification || "Ajustement inventaire",
          productName: product.name,
          productSku: product.sku,
          oldStock,
          newStock,
          movementDate: date,
          userName: session.user?.name ?? null,
        };
      })
      .filter(item => item.quantity > 0));
  } catch (error) {
    console.error("Movement email delivery failed", error);
  }

  await runAlertEngine();
  await runRecommendationEngine();

  return NextResponse.json(created, { status: 201 });
}
