import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendWhatsAppHelloWorld } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["alert_whatsapp_phone"] } },
  });
  const setting = Object.fromEntries(settings.map(item => [item.key, item.value]));
  const phone = String(body.phone || setting.alert_whatsapp_phone || process.env.WHATSAPP_ADMIN_PHONE || "");

  const result = await sendWhatsAppHelloWorld(phone);
  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
