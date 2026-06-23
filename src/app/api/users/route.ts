import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatZodError } from "@/lib/utils";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  nom:      z.string().min(2),
  prenom:   z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6).optional(),
  role:     z.enum(["ADMIN", "GESTIONNAIRE", "SURVEILLANT", "COMMERCIAL"]),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true, prenom: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });
  if (!parsed.data.password) return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: { nom: parsed.data.nom, prenom: parsed.data.prenom, email: parsed.data.email, password: hashed, role: parsed.data.role, isActive: parsed.data.isActive ?? true },
    select: { id: true, nom: true, prenom: true, email: true, role: true, isActive: true },
  });
  return NextResponse.json(user, { status: 201 });
}
