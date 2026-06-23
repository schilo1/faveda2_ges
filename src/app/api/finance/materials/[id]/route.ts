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

async function requireEditor() {
  const session = await auth();
  if (!session || !["ADMIN", "GESTIONNAIRE"].includes((session.user as any)?.role)) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) {
    return { error: NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 }) };
  }
  return { currentUser };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireEditor();
  if (authResult.error) return authResult.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });
  }

  const exists = await prisma.rawMaterial.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Matière première introuvable." }, { status: 404 });

  const duplicate = await prisma.rawMaterial.findFirst({
    where: {
      deletedAt: null,
      name: { equals: parsed.data.name },
      id: { not: params.id },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Une autre matière utilise déjà ce nom." }, { status: 409 });
  }

  const material = await prisma.rawMaterial.update({
    where: { id: params.id },
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
    userId: authResult.currentUser!.id,
    action: "UPDATE_RAW_MATERIAL",
    entity: "RawMaterial",
    entityId: material.id,
    newValue: material as any,
  });

  return NextResponse.json({ data: material });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireEditor();
  if (authResult.error) return authResult.error;

  const exists = await prisma.rawMaterial.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Matière première introuvable." }, { status: 404 });

  const material = await prisma.rawMaterial.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "DELETE_RAW_MATERIAL",
    entity: "RawMaterial",
    entityId: material.id,
    oldValue: material as any,
  });

  return NextResponse.json({ success: true });
}
