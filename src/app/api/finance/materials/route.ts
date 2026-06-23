import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nom matière requis"),
  unit: z.string().trim().min(1, "Unité requise"),
  currentStock: z.preprocess(value => value === "" || value === null ? undefined : value, z.coerce.number().min(0).default(0)),
  minimumStock: z.preprocess(value => value === "" || value === null ? undefined : value, z.coerce.number().min(0).default(0)),
  estimatedUnitCost: z.preprocess(value => value === "" || value === null ? undefined : value, z.coerce.number().min(0).default(0)),
  expiryDate: z.preprocess(value => value === "" ? null : value, z.string().optional().nullable()),
  supplierId: z.preprocess(value => value === "" ? null : value, z.string().cuid("Fournisseur invalide").optional().nullable()),
  notes: z.string().trim().optional().nullable(),
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

  const existing = await prisma.rawMaterial.findFirst({
    where: {
      deletedAt: null,
      name: { equals: parsed.data.name },
    },
    select: { id: true },
  });

  if (existing) {
    const material = await prisma.rawMaterial.update({
      where: { id: existing.id },
      data: {
        unit: parsed.data.unit,
        currentStock: parsed.data.currentStock,
        minimumStock: parsed.data.minimumStock,
        estimatedUnitCost: parsed.data.estimatedUnitCost,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        supplierId: parsed.data.supplierId || null,
        notes: parsed.data.notes ?? null,
      },
    });

    await auditLog({
      userId: currentUser.id,
      action: "UPDATE_RAW_MATERIAL_FROM_CREATE",
      entity: "RawMaterial",
      entityId: material.id,
      newValue: material as any,
    });

    return NextResponse.json({ data: material, updated: true }, { status: 200 });
  }

  const material = await prisma.rawMaterial.create({
    data: {
      name: parsed.data.name,
      unit: parsed.data.unit,
      currentStock: parsed.data.currentStock,
      minimumStock: parsed.data.minimumStock,
      estimatedUnitCost: parsed.data.estimatedUnitCost,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      supplierId: parsed.data.supplierId || null,
      notes: parsed.data.notes ?? null,
    },
  });

  await auditLog({
    userId: currentUser.id,
    action: "CREATE_RAW_MATERIAL",
    entity: "RawMaterial",
    entityId: material.id,
    newValue: material as any,
  });

  return NextResponse.json({ data: material }, { status: 201 });
}
