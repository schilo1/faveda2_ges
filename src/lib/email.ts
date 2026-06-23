import nodemailer from "nodemailer";
import type { AlertSeverity, AlertType, MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AlertEmailItem = {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
};

type AlertEmailResult =
  | { sent: true; count: number; recipients: string[] }
  | { sent: false; reason: string; count?: number; recipients?: string[] };

type MovementEmailItem = {
  type: MovementType;
  quantity: number;
  motif: string;
  productName: string;
  productSku: string;
  oldStock?: number;
  newStock?: number;
  movementDate: Date;
  validatorName?: string | null;
  userName?: string | null;
  referenceNumber?: string | null;
  comment?: string | null;
};

const severityRank: Record<AlertSeverity, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
};

function parseRecipients(value: string) {
  return value
    .split(/[\n,;]+/)
    .map(email => email.trim())
    .filter(Boolean);
}

function smtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendAlertDigestEmail(alerts: AlertEmailItem[], options: { ignoreEnabled?: boolean } = {}): Promise<AlertEmailResult> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["alert_email_enabled", "alert_email_recipients", "alert_email_min_severity"],
      },
    },
  });
  const setting = Object.fromEntries(settings.map(item => [item.key, item.value]));

  if (!options.ignoreEnabled && setting.alert_email_enabled !== "true") {
    return { sent: false, reason: "L'envoi email des alertes est désactivé dans les paramètres." };
  }
  if (!smtpReady()) {
    return { sent: false, reason: "Configuration SMTP incomplète. Vérifiez SMTP_HOST, SMTP_USER et SMTP_PASSWORD dans .env." };
  }

  const recipients = parseRecipients(setting.alert_email_recipients ?? "");
  if (recipients.length === 0) {
    return { sent: false, reason: "Aucun destinataire configuré dans les paramètres." };
  }

  const minSeverity = (["INFO", "WARNING", "CRITICAL"].includes(setting.alert_email_min_severity)
    ? setting.alert_email_min_severity
    : "WARNING") as AlertSeverity;
  const filteredAlerts = alerts.filter(alert => severityRank[alert.severity] >= severityRank[minSeverity]);
  if (filteredAlerts.length === 0) {
    return { sent: false, reason: "Aucune alerte ne correspond à la sévérité minimale configurée.", count: 0, recipients };
  }

  const transporter = createTransporter();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const rows = filteredAlerts.map(alert => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${alert.severity}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${alert.productName}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${alert.currentStock}/${alert.minimumStock}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${alert.message}</td>
    </tr>
  `).join("");

  await transporter.sendMail({
    from,
    to: recipients,
    subject: `FAVEDA Stock - ${filteredAlerts.length} alerte(s) à traiter`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#2d3a1e;">
        <h2 style="color:#4F5C3D;">Alertes FAVEDA Stock</h2>
        <p>${filteredAlerts.length} alerte(s) nécessitent votre attention.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#F3F3F3;">
              <th style="padding:10px;text-align:left;">Sévérité</th>
              <th style="padding:10px;text-align:left;">Produit</th>
              <th style="padding:10px;text-align:left;">Stock</th>
              <th style="padding:10px;text-align:left;">Message</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
  });

  return { sent: true, count: filteredAlerts.length, recipients };
}

export async function sendMovementNotificationEmail(movements: MovementEmailItem[]): Promise<AlertEmailResult> {
  if (movements.length === 0) {
    return { sent: false, reason: "Aucun mouvement à notifier.", count: 0 };
  }
  if (!smtpReady()) {
    return { sent: false, reason: "Configuration SMTP incomplète. Vérifiez SMTP_HOST, SMTP_USER et SMTP_PASSWORD dans .env." };
  }

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["alert_email_recipients"] } },
  });
  const setting = Object.fromEntries(settings.map(item => [item.key, item.value]));
  const recipients = Array.from(new Set(parseRecipients(setting.alert_email_recipients ?? "")));

  if (recipients.length === 0) {
    return { sent: false, reason: "Aucun destinataire configuré dans les paramètres.", count: 0 };
  }

  const rows = movements.map(movement => {
    const stock = movement.oldStock !== undefined && movement.newStock !== undefined
      ? `${movement.oldStock} -> ${movement.newStock}`
      : "-";

    return `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(movement.type)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(movement.productName)}<br><span style="color:#6b7280;font-size:12px;">${escapeHtml(movement.productSku)}</span></td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(movement.quantity)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(stock)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(movement.motif)}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(movement.userName ?? movement.validatorName ?? "-")}</td>
      </tr>
    `;
  }).join("");

  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: recipients,
    subject: `FAVEDA Stock - ${movements.length} mouvement(s) de stock`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#2d3a1e;">
        <h2 style="color:#4F5C3D;">Mouvement de stock enregistré</h2>
        <p>${movements.length} mouvement(s) viennent d'être enregistrés.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#F3F3F3;">
              <th style="padding:10px;text-align:left;">Type</th>
              <th style="padding:10px;text-align:left;">Produit</th>
              <th style="padding:10px;text-align:left;">Quantité</th>
              <th style="padding:10px;text-align:left;">Stock</th>
              <th style="padding:10px;text-align:left;">Motif</th>
              <th style="padding:10px;text-align:left;">Créé par</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px;">Date : ${escapeHtml(movements[0].movementDate.toLocaleString("fr-FR"))}</p>
      </div>
    `,
  });

  return { sent: true, count: movements.length, recipients };
}
