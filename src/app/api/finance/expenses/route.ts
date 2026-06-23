import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(2),
  category: z.string().min(2).default("MATIERE_PREMIERE"),
  materialId: z.preprocess(value => value === "" ? null : value, z.string().optional().nullable()),
  productId: z.preprocess(value => value === "" ? null : value, z.string().optional().nullable()),
  supplierId: z.preprocess(value => value === "" ? null : value, z.string().optional().nullable()),
  quantity: z.coerce.number().min(0).optional().nullable(),
  unitCost: z.coerce.number().min(0).optional().nullable(),
  amount: z.coerce.number().min(0).optional().nullable(),
  spentAt: z.string().optional(),
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

  const quantity = parsed.data.quantity ?? null;
  const unitCost = parsed.data.unitCost ?? null;
  const amount = parsed.data.amount ?? ((quantity ?? 0) * (unitCost ?? 0));
  if (amount <= 0) {
    return NextResponse.json({ error: "Renseignez un montant ou une quantité avec prix unitaire." }, { status: 400 });
  }

  const expense = await prisma.$transaction(async tx => {
    const created = await tx.rawMaterialExpense.create({
      data: {
        description: parsed.data.description.trim(),
        category: parsed.data.category.trim(),
        materialId: parsed.data.materialId || null,
        productId: parsed.data.productId || null,
        supplierId: parsed.data.supplierId || null,
        quantity,
        unitCost,
        amount,
        spentAt: parsed.data.spentAt ? new Date(parsed.data.spentAt) : new Date(),
        notes: parsed.data.notes ?? null,
        userId: currentUser.id,
      },
    });

    if (parsed.data.materialId && quantity && quantity > 0) {
      await tx.rawMaterial.update({
        where: { id: parsed.data.materialId },
        data: {
          currentStock: { increment: quantity },
          ...(unitCost ? { estimatedUnitCost: unitCost } : {}),
        },
      });
    }

    return created;
  });

  await auditLog({
    userId: currentUser.id,
    action: "CREATE_RAW_MATERIAL_EXPENSE",
    entity: "RawMaterialExpense",
    entityId: expense.id,
    newValue: expense as any,
  });

  return NextResponse.json({ data: expense }, { status: 201 });
}
