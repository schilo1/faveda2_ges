import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendAlertDigestWhatsApp } from "@/lib/whatsapp";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { isResolved: false },
    include: {
      product: { select: { name: true, currentStock: true, minimumStock: true } },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });

  if (alerts.length === 0) {
    return NextResponse.json({ sent: false, reason: "Aucune alerte active à envoyer." }, { status: 400 });
  }

  const result = await sendAlertDigestWhatsApp(
    alerts.map(alert => ({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      productName: alert.product.name,
      currentStock: alert.product.currentStock,
      minimumStock: alert.product.minimumStock,
    })),
    { ignoreEnabled: true }
  );

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
