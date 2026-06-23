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

  const budget = await prisma.financeBudget.update({
    where: { id: params.id },
    data: {
      month: monthStart(parsed.data.month),
      amount: parsed.data.amount,
      notes: parsed.data.notes ?? null,
      userId: authResult.currentUser!.id,
    },
  });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "UPDATE_FINANCE_BUDGET",
    entity: "FinanceBudget",
    entityId: budget.id,
    newValue: budget as any,
  });

  return NextResponse.json({ data: budget });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireEditor();
  if (authResult.error) return authResult.error;

  const budget = await prisma.financeBudget.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  await auditLog({
    userId: authResult.currentUser!.id,
    action: "DELETE_FINANCE_BUDGET",
    entity: "FinanceBudget",
    entityId: budget.id,
    oldValue: budget as any,
  });

  return NextResponse.json({ success: true });
}
