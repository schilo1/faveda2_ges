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

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const suppliers = await prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });
  const supplier = await prisma.supplier.create({ data: parsed.data });
  return NextResponse.json(supplier, { status: 201 });
}
