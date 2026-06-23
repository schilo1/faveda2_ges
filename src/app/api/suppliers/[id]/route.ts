import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatZodError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  phone: z.string().trim().optional().nullable(),
  email: z.preprocess(
    value => value === "" ? null : value,
    z.string().trim().email("Email invalide").optional().nullable()
  ),
  address: z.string().trim().optional().nullable(),
  comment: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, deletedAt: null },
  });
  if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  return NextResponse.json(supplier);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });
  }

  const exists = await prisma.supplier.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(supplier);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.supplier.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return NextResponse.json({ success: true });
}
