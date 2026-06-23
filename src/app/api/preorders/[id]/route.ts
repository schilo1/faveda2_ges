import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { auditLog, formatZodError, resolveSessionUser } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["cancel", "refund", "deliver", "payment"]),
  reason: z.string().optional().nullable(),
  deliveryPaidAmount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const role = (session.user as any)?.role;
  const sessionUserId = (session.user as any)?.id;
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 401 });

  const preorder = await prisma.preorder.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!preorder) return NextResponse.json({ error: "Précommande introuvable." }, { status: 404 });
  if (role === "COMMERCIAL" && preorder.userId !== sessionUserId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return NextResponse.json({ error: formatZodError(parsed.error), details }, { status: 400 });
  }

  const now = new Date();
  let data;
  if (parsed.data.action === "cancel") {
    data = { status: "ANNULEE" as const, cancelReason: parsed.data.reason ?? "Client ne veut plus du produit", canceledAt: now };
  } else if (parsed.data.action === "refund") {
    data = { status: "REMBOURSEE" as const, cancelReason: parsed.data.reason ?? "Client remboursé", canceledAt: now };
  } else if (parsed.data.action === "payment") {
    if (["ANNULEE", "REMBOURSEE"].includes(preorder.status)) {
      return NextResponse.json({ error: "Impossible de modifier le paiement d'une précommande annulée ou remboursée." }, { status: 400 });
    }
    const totalAmount = Number(preorder.totalAmount);
    const nextPaidAmount = parsed.data.paidAmount;
    if (nextPaidAmount === undefined) {
      return NextResponse.json({ error: "Champ invalide \"paidAmount\" : montant encaissé requis." }, { status: 400 });
    }
    if (nextPaidAmount > totalAmount) {
      return NextResponse.json({ error: `Champ invalide "paidAmount" : le montant encaissé ne peut pas dépasser ${totalAmount.toLocaleString("fr-FR")} FCFA.` }, { status: 400 });
    }
    const status = preorder.status === "LIVREE"
      ? "LIVREE" as const
      : nextPaidAmount >= totalAmount ? "PAYEE" as const : "EN_ATTENTE" as const;

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.preorder.update({
        where: { id: params.id },
        data: { paidAmount: nextPaidAmount, status },
      });
      await tx.preorderPaymentHistory.create({
        data: {
          preorderId: preorder.id,
          userId: currentUser.id,
          oldPaidAmount: preorder.paidAmount,
          newPaidAmount: nextPaidAmount,
          reason: parsed.data.reason?.trim() || "Correction du paiement",
        },
      });
      return result;
    });

    await auditLog({
      userId: currentUser.id,
      action: "PREORDER_PAYMENT_UPDATE",
      entity: "Preorder",
      entityId: updated.id,
      oldValue: { paidAmount: Number(preorder.paidAmount), status: preorder.status } as any,
      newValue: { paidAmount: Number(updated.paidAmount), status: updated.status, reason: parsed.data.reason } as any,
    });

    return NextResponse.json(updated);
  } else {
    const totalAmount = Number(preorder.totalAmount);
    const paidAmount = Number(preorder.paidAmount);
    const deliveryPaidAmount = parsed.data.deliveryPaidAmount ?? 0;
    const nextPaidAmount = Math.min(totalAmount, paidAmount + deliveryPaidAmount);
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.preorder.update({
        where: { id: params.id },
        data: {
          status: "LIVREE" as const,
          deliveredAt: now,
          paidAmount: nextPaidAmount,
        },
      });
      if (nextPaidAmount !== paidAmount) {
        await tx.preorderPaymentHistory.create({
          data: {
            preorderId: preorder.id,
            userId: currentUser.id,
            oldPaidAmount: preorder.paidAmount,
            newPaidAmount: nextPaidAmount,
            reason: "Paiement du reste à la livraison",
          },
        });
      }
      return result;
    });

    await auditLog({
      userId: currentUser.id,
      action: "PREORDER_DELIVER",
      entity: "Preorder",
      entityId: updated.id,
      oldValue: { status: preorder.status, paidAmount: Number(preorder.paidAmount) } as any,
      newValue: { status: updated.status, paidAmount: Number(updated.paidAmount) } as any,
    });

    return NextResponse.json(updated);
  }

  const updated = await prisma.preorder.update({ where: { id: params.id }, data });
  await auditLog({
    userId: currentUser.id,
    action: `PREORDER_${parsed.data.action.toUpperCase()}`,
    entity: "Preorder",
    entityId: updated.id,
    newValue: updated as any,
  });

  return NextResponse.json(updated);
}
