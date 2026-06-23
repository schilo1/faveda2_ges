import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const unread = req.nextUrl.searchParams.get("unread") === "true";
  const alerts = await prisma.alert.findMany({
    where: { ...(unread ? { isRead: false } : {}) },
    include: { product: { select: { id: true, name: true, currentStock: true, minimumStock: true } } },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(alerts);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { ids } = await req.json() as { ids: string[] };
  await prisma.alert.updateMany({ where: { id: { in: ids } }, data: { isRead: true } });
  return NextResponse.json({ success: true });
}
