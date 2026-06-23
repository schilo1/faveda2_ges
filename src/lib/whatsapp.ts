import type { AlertSeverity, AlertType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AlertWhatsAppItem = {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
};

type WhatsAppResult =
  | { sent: true; count: number; recipients: string[] }
  | { sent: false; reason: string; count?: number; recipients?: string[] };

const severityRank: Record<AlertSeverity, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
};

function normalizePhone(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function getMetaConfig() {
  return {
    provider: process.env.WHATSAPP_PROVIDER || "meta",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v25.0",
  };
}

function whatsappReady() {
  const config = getMetaConfig();
  return config.provider === "meta" && Boolean(config.phoneNumberId && config.accessToken);
}

async function postWhatsApp(payload: object) {
  const config = getMetaConfig();
  if (!whatsappReady()) {
    return { ok: false, error: "Configuration WhatsApp incomplète. Vérifiez WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN dans .env." };
  }

  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || data?.error?.error_data?.details || "Envoi WhatsApp refusé par Meta.";
    return { ok: false, error: message, data };
  }

  return { ok: true, data };
}

export async function sendWhatsAppHelloWorld(toPhone: string): Promise<WhatsAppResult> {
  const recipient = normalizePhone(toPhone);
  if (!recipient) return { sent: false, reason: "Aucun numéro WhatsApp destinataire configuré." };

  const result = await postWhatsApp({
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" },
    },
  });

  if (!result.ok) return { sent: false, reason: result.error, recipients: [recipient] };
  return { sent: true, count: 1, recipients: [recipient] };
}

export async function sendWhatsAppText(toPhone: string, body: string): Promise<WhatsAppResult> {
  const recipient = normalizePhone(toPhone);
  if (!recipient) return { sent: false, reason: "Aucun numéro WhatsApp destinataire configuré." };

  const result = await postWhatsApp({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  });

  if (!result.ok) return { sent: false, reason: result.error, recipients: [recipient] };
  return { sent: true, count: 1, recipients: [recipient] };
}

export async function sendAlertDigestWhatsApp(alerts: AlertWhatsAppItem[], options: { ignoreEnabled?: boolean } = {}): Promise<WhatsAppResult> {
  if (alerts.length === 0) {
    return { sent: false, reason: "Aucune alerte à envoyer.", count: 0 };
  }

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["alert_whatsapp_enabled", "alert_whatsapp_phone", "alert_whatsapp_min_severity"],
      },
    },
  });
  const setting = Object.fromEntries(settings.map(item => [item.key, item.value]));

  if (!options.ignoreEnabled && setting.alert_whatsapp_enabled !== "true" && process.env.WHATSAPP_ALERTS_ENABLED !== "true") {
    return { sent: false, reason: "L'envoi WhatsApp des alertes est désactivé dans les paramètres." };
  }
  if (!whatsappReady()) {
    return { sent: false, reason: "Configuration WhatsApp incomplète. Vérifiez .env." };
  }

  const recipient = normalizePhone(setting.alert_whatsapp_phone || process.env.WHATSAPP_ADMIN_PHONE);
  if (!recipient) {
    return { sent: false, reason: "Aucun numéro WhatsApp configuré.", count: 0 };
  }

  const minSeverity = (["INFO", "WARNING", "CRITICAL"].includes(setting.alert_whatsapp_min_severity)
    ? setting.alert_whatsapp_min_severity
    : "WARNING") as AlertSeverity;
  const filteredAlerts = alerts.filter(alert => severityRank[alert.severity] >= severityRank[minSeverity]);

  if (filteredAlerts.length === 0) {
    return { sent: false, reason: "Aucune alerte ne correspond à la sévérité minimale configurée.", count: 0, recipients: [recipient] };
  }

  const lines = filteredAlerts.slice(0, 10).map((alert, index) => (
    `${index + 1}. [${alert.severity}] ${alert.productName} - ${alert.message}`
  ));
  const remaining = filteredAlerts.length > 10 ? `\n+ ${filteredAlerts.length - 10} autre(s) alerte(s).` : "";
  const body = `FAVEDA Stock - ${filteredAlerts.length} alerte(s) active(s)\n\n${lines.join("\n")}${remaining}`;

  return sendWhatsAppText(recipient, body);
}
