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

async function requireEditor() {
  const session = await auth();
  if (!session || !["ADMIN", "GESTIONNAIRE"].includes((session.user as any)?.role)) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) return { error: NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 }) };
  return { currentUser };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireEditor();
  if (authResult.error) return authResult.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });
  }

  const recipe = await prisma.productMaterialRecipe.update({
    where: { id: params.id },
    data: {
      productId: parsed.data.productId,
      materialId: parsed.data.materialId,
      quantityPerUnit: parsed.data.quantityPerUnit,
      notes: parsed.data.notes ?? null,
    },
  });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "UPDATE_PRODUCT_MATERIAL_RECIPE",
    entity: "ProductMaterialRecipe",
    entityId: recipe.id,
    newValue: recipe as any,
  });

  return NextResponse.json({ data: recipe });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireEditor();
  if (authResult.error) return authResult.error;

  const recipe = await prisma.productMaterialRecipe.delete({ where: { id: params.id } });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "DELETE_PRODUCT_MATERIAL_RECIPE",
    entity: "ProductMaterialRecipe",
    entityId: recipe.id,
    oldValue: recipe as any,
  });

  return NextResponse.json({ success: true });
}
