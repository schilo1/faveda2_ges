import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatZodError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  description: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });

  const exists = await prisma.category.findUnique({ where: { name: parsed.data.name } });
  if (exists && !exists.deletedAt) {
    return NextResponse.json({ error: "Cette catégorie existe déjà." }, { status: 409 });
  }

  const category = exists
    ? await prisma.category.update({
        where: { id: exists.id },
        data: { deletedAt: null, description: parsed.data.description ?? null },
      })
    : await prisma.category.create({
        data: { name: parsed.data.name, description: parsed.data.description ?? null },
      });

  return NextResponse.json(category, { status: 201 });
}
