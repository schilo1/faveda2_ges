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

  const existing = await prisma.rawMaterialExpense.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  const quantity = parsed.data.quantity ?? null;
  const unitCost = parsed.data.unitCost ?? null;
  const amount = parsed.data.amount ?? ((quantity ?? 0) * (unitCost ?? 0));
  if (amount <= 0) {
    return NextResponse.json({ error: "Renseignez un montant ou une quantité avec prix unitaire." }, { status: 400 });
  }

  const expense = await prisma.$transaction(async tx => {
    if (existing.materialId && existing.quantity && Number(existing.quantity) > 0) {
      await tx.rawMaterial.update({
        where: { id: existing.materialId },
        data: { currentStock: { decrement: Number(existing.quantity) } },
      });
    }

    const updated = await tx.rawMaterialExpense.update({
      where: { id: params.id },
      data: {
        description: parsed.data.description.trim(),
        category: parsed.data.category.trim(),
        materialId: parsed.data.materialId || null,
        productId: parsed.data.productId || null,
        supplierId: parsed.data.supplierId || null,
        quantity,
        unitCost,
        amount,
        spentAt: parsed.data.spentAt ? new Date(parsed.data.spentAt) : existing.spentAt,
        notes: parsed.data.notes ?? null,
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

    return updated;
  });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "UPDATE_RAW_MATERIAL_EXPENSE",
    entity: "RawMaterialExpense",
    entityId: expense.id,
    oldValue: existing as any,
    newValue: expense as any,
  });

  return NextResponse.json({ data: expense });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireEditor();
  if (authResult.error) return authResult.error;

  const existing = await prisma.rawMaterialExpense.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  const expense = await prisma.$transaction(async tx => {
    if (existing.materialId && existing.quantity && Number(existing.quantity) > 0) {
      await tx.rawMaterial.update({
        where: { id: existing.materialId },
        data: { currentStock: { decrement: Number(existing.quantity) } },
      });
    }

    return tx.rawMaterialExpense.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });
  });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "DELETE_RAW_MATERIAL_EXPENSE",
    entity: "RawMaterialExpense",
    entityId: expense.id,
    oldValue: expense as any,
  });

  return NextResponse.json({ success: true });
}
