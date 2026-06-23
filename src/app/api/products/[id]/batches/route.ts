import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatZodError, runAlertEngine, runRecommendationEngine } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  batches: z.array(z.object({
    id: z.string(),
    batchNumber: z.string().optional().nullable(),
    quantity: z.number().int().min(0),
    expiryDate: z.string().optional().nullable(),
    delete: z.boolean().optional(),
  })),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.product.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  await prisma.$transaction(async tx => {
    for (const batch of parsed.data.batches) {
      await tx.productBatch.updateMany({
        where: { id: batch.id, productId: params.id },
        data: batch.delete
          ? { deletedAt: new Date(), quantity: 0 }
          : {
              batchNumber: batch.batchNumber?.trim() || null,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
              deletedAt: null,
            },
      });
    }

    const activeBatches = await tx.productBatch.findMany({
      where: { productId: params.id, deletedAt: null },
      select: { quantity: true },
    });
    const currentStock = activeBatches.reduce((sum, batch) => sum + batch.quantity, 0);

    await tx.product.update({
      where: { id: params.id },
      data: { currentStock },
    });
  });

  await runAlertEngine();
  await runRecommendationEngine();

  return NextResponse.json({ success: true });
}
