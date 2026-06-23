import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  materialId: z.string().min(1),
  quantityPerUnit: z.coerce.number().positive(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });

  const recipe = await prisma.productMaterialRecipe.upsert({
    where: {
      productId_materialId: {
        productId: parsed.data.productId,
        materialId: parsed.data.materialId,
      },
    },
    update: {
      quantityPerUnit: parsed.data.quantityPerUnit,
      notes: parsed.data.notes ?? null,
    },
    create: {
      productId: parsed.data.productId,
      materialId: parsed.data.materialId,
      quantityPerUnit: parsed.data.quantityPerUnit,
      notes: parsed.data.notes ?? null,
    },
  });

  await auditLog({
    userId: currentUser.id,
    action: "UPSERT_PRODUCT_MATERIAL_RECIPE",
    entity: "ProductMaterialRecipe",
    entityId: recipe.id,
    newValue: recipe as any,
  });

  return NextResponse.json({ data: recipe }, { status: 201 });
}
