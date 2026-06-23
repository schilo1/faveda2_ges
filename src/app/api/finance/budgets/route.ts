import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  month: z.string().min(7),
  amount: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});

function monthStart(value: string) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: formatZodError(parsed.error), details: parsed.error.flatten() }, { status: 400 });

  const month = monthStart(parsed.data.month);
  const existing = await prisma.financeBudget.findFirst({ where: { month, deletedAt: null } });
  const budget = existing
    ? await prisma.financeBudget.update({
        where: { id: existing.id },
        data: { amount: parsed.data.amount, notes: parsed.data.notes ?? null, userId: currentUser.id },
      })
    : await prisma.financeBudget.create({
        data: { month, amount: parsed.data.amount, notes: parsed.data.notes ?? null, userId: currentUser.id },
      });

  await auditLog({
    userId: currentUser.id,
    action: existing ? "UPDATE_FINANCE_BUDGET" : "CREATE_FINANCE_BUDGET",
    entity: "FinanceBudget",
    entityId: budget.id,
    newValue: budget as any,
  });

  return NextResponse.json({ data: budget }, { status: existing ? 200 : 201 });
}
