import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { runAlertEngine, auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";

const schema = z.object({
  name:         z.string().min(2),
  categoryId:   z.string(),
  unitId:       z.string(),
  supplierId:   z.string().optional().nullable(),
  description:  z.string().optional().nullable(),
  buyPrice:     z.preprocess(value => value === "" || value === null || value === undefined ? 0 : value, z.coerce.number().min(0).default(0)),
  sellPrice:    z.number().min(0),
  currentStock: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  expiryDate:   z.string().optional().nullable(),
  photo:        z.string().optional().nullable(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const product = await prisma.product.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, unit: true, supplier: true },
  });
  if (!product) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

  const data = parsed.data;
  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name:         data.name,
      categoryId:   data.categoryId,
      unitId:       data.unitId,
      supplierId:   data.supplierId,
      description:  data.description ?? null,
      buyPrice:     data.buyPrice,
      sellPrice:    data.sellPrice,
      currentStock: data.currentStock,
      minimumStock: data.minimumStock,
      expiryDate:   data.expiryDate ? new Date(data.expiryDate) : null,
      photo:        data.photo ?? null,
    },
  });

  await runAlertEngine();
  await auditLog({
    userId: currentUser.id,
    action: "UPDATE_PRODUCT",
    entity: "Product",
    entityId: params.id,
  });
  return NextResponse.json(product);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur introuvable dans la base active. Reconnectez-vous ou recréez cet utilisateur." }, { status: 401 });
  }

  await prisma.product.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  await auditLog({
    userId: currentUser.id,
    action: "DELETE_PRODUCT",
    entity: "Product",
    entityId: params.id,
  });
  return NextResponse.json({ success: true });
}
