// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { prisma } from "./prisma";
import { sendAlertDigestEmail } from "./email";
import { sendAlertDigestWhatsApp } from "./whatsapp";
import { generateGroqRecommendations, type GroqRecommendation } from "./groq";
import type { ZodError } from "zod";

// ── Class merging ──────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

// ── Currency ───────────────────────────────────────────────
export function formatCFA(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

// ── Validation ─────────────────────────────────────────────
export function formatZodError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Données invalides.";

  const field = issue.path.length > 0
    ? issue.path.reduce((path, segment) => {
        if (typeof segment === "number") return `${path}[${segment + 1}]`;
        return path ? `${path}.${segment}` : String(segment);
      }, "")
    : "formulaire";

  return `Champ invalide "${field}" : ${issue.message}`;
}

// ── SKU Generator ──────────────────────────────────────────
export async function generateSKU(categoryName: string): Promise<string> {
  const prefix = categoryName
    .split(" ")
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 4);

  const count = await prisma.product.count({
    where: {
      sku: { startsWith: `FAV-${prefix}-` },
    },
  });

  const next = String(count + 1).padStart(3, "0");
  return `FAV-${prefix}-${next}`;
}

// ── Alert Engine ───────────────────────────────────────────
export async function runAlertEngine(): Promise<void> {
  const warningDays = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + warningDays);
  expiryThreshold.setHours(23, 59, 59, 999);

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      batches: {
        where: { deletedAt: null, quantity: { gt: 0 }, expiryDate: { not: null } },
        orderBy: { expiryDate: "asc" },
      },
    },
  });
  const createdAlerts = [];

  // Clear old unresolved alerts then regenerate
  await prisma.alert.deleteMany({
    where: { isResolved: false },
  });

  for (const product of products) {
    // Rupture
    if (product.currentStock === 0) {
      const alert = await prisma.alert.create({
        data: {
          productId: product.id,
          type:      "RUPTURE_STOCK",
          severity:  "CRITICAL",
          message:   `Stock à zéro pour "${product.name}". Réapprovisionnement urgent requis.`,
        },
      });
      createdAlerts.push({ ...alert, productName: product.name, currentStock: product.currentStock, minimumStock: product.minimumStock });
      continue;
    }

    // Seuil minimum
    if (product.currentStock < product.minimumStock) {
      const severity = product.currentStock < product.minimumStock * 0.5 ? "CRITICAL" : "WARNING";
      const alert = await prisma.alert.create({
        data: {
          productId: product.id,
          type:      "SEUIL_MINIMUM",
          severity,
          message:   `Stock de "${product.name}" (${product.currentStock}) inférieur au seuil minimum (${product.minimumStock}).`,
        },
      });
      createdAlerts.push({ ...alert, productName: product.name, currentStock: product.currentStock, minimumStock: product.minimumStock });
    }

    const expiringBatches = product.batches.filter(batch =>
      batch.expiryDate && batch.expiryDate >= today && batch.expiryDate <= expiryThreshold
    );

    if (expiringBatches.length > 0) {
      const nearestBatch = expiringBatches[0];
      const expiryDate = nearestBatch.expiryDate as Date;
      const daysLeft = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const totalExpiringQty = expiringBatches.reduce((sum, batch) => sum + batch.quantity, 0);
      const alert = await prisma.alert.create({
        data: {
          productId: product.id,
          type:      "PROCHE_PEREMPTION",
          severity:  "CRITICAL",
          message:   `${totalExpiringQty} unité(s) de "${product.name}" expirent bientôt. Prochaine péremption : ${expiryDate.toLocaleDateString("fr-FR")}.`,
        },
      });
      createdAlerts.push({ ...alert, productName: product.name, currentStock: product.currentStock, minimumStock: product.minimumStock });
      continue;
    }

    // Péremption historique produit, gardée pour les produits sans lots
    if (product.expiryDate && product.expiryDate >= today && product.expiryDate <= expiryThreshold) {
      const daysLeft = Math.ceil(
        (product.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const alert = await prisma.alert.create({
        data: {
          productId: product.id,
          type:      "PROCHE_PEREMPTION",
          severity:  "CRITICAL",
          message:   `"${product.name}" expire dans ${daysLeft} jours (${product.expiryDate.toLocaleDateString("fr-FR")}).`,
        },
      });
      createdAlerts.push({ ...alert, productName: product.name, currentStock: product.currentStock, minimumStock: product.minimumStock });
    }
  }

  try {
    await sendAlertDigestEmail(createdAlerts);
  } catch (error) {
    console.error("Alert email delivery failed", error);
  }

  try {
    await sendAlertDigestWhatsApp(createdAlerts);
  } catch (error) {
    console.error("Alert WhatsApp delivery failed", error);
  }
}

// ── Recommendation Engine ──────────────────────────────────
export async function runRecommendationEngine(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      alerts: {
        where: { isResolved: false },
        select: { severity: true, type: true, message: true },
      },
      materialRecipes: {
        include: { material: true },
      },
    },
  });

  // Clear old recommendations
  await prisma.recommendation.deleteMany({ where: { isActioned: false } });

  const localRecommendations: GroqRecommendation[] = [];
  const productInsights = [];

  for (const product of products) {
    // Sales in last 30 days
    const salesAgg = await prisma.stockMovement.aggregate({
      where: {
        productId: product.id,
        type: { in: ["VENTE", "SORTIE"] },
        movementDate: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      _sum: { quantity: true },
    });

    const monthlySales = salesAgg._sum.quantity ?? 0;
    const weeklySales = Math.round(monthlySales / 4);
    const daysOfStock =
      weeklySales > 0
        ? Math.round((product.currentStock / weeklySales) * 7)
        : 999;
    const materials = product.materialRecipes.map(recipe => ({
      name: recipe.material.name,
      unit: recipe.material.unit,
      currentStock: Number(recipe.material.currentStock),
      minimumStock: Number(recipe.material.minimumStock),
      expiryDate: recipe.material.expiryDate ? recipe.material.expiryDate.toISOString().slice(0, 10) : null,
      quantityPerUnit: Number(recipe.quantityPerUnit),
    }));

    productInsights.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock,
      minimumStock: product.minimumStock,
      sellPrice: Number(product.sellPrice),
      monthlySales,
      daysOfStock,
      alerts: product.alerts.map(alert => `${alert.severity} ${alert.type}: ${alert.message}`),
      materials,
    });

    // Reorder
    if (product.currentStock === 0 || daysOfStock <= 7) {
      const suggestedQty = Math.max(weeklySales * 4, product.minimumStock * 2);
      localRecommendations.push({
        productId: product.id,
        type: "REORDER",
        priority: product.currentStock === 0 ? "critical" : "high",
        message: `Commander ${suggestedQty} unités de "${product.name}". Stock pour ${daysOfStock} jours. Ventes : ~${weeklySales}/semaine.`,
        suggestedQty,
      });
    }

    // Low rotation
    if (monthlySales < 5 && product.currentStock > product.minimumStock * 2) {
      localRecommendations.push({
        productId: product.id,
        type: "PROMO",
        priority: "low",
        message: `Faible rotation pour "${product.name}" (${monthlySales} ventes/mois). Envisager une offre courte pour réduire le stock sans casser la valeur perçue.`,
      });
      localRecommendations.push({
        productId: product.id,
        type: "MARKETING",
        priority: "medium",
        message: `Vidéo recommandée pour "${product.name}" : faire une démonstration avant/après ou routine de 20 secondes. Hook : "Vous avez ce problème ? Essayez cette routine simple." Montrer le produit en main, une utilisation réelle, puis terminer par un appel à précommander ou acheter aujourd'hui.`,
      });
    }

    // Forecast trend
    if (monthlySales > 30 && product.currentStock < product.minimumStock * 3) {
      localRecommendations.push({
        productId: product.id,
        type: "FORECAST",
        priority: "medium",
        message: `Tendance forte pour "${product.name}" (${monthlySales} ventes/mois). Augmenter le stock de sécurité et préparer une communication de rareté contrôlée.`,
        suggestedQty: weeklySales * 6,
      });
    }

    for (const material of materials) {
      const neededForSafety = material.quantityPerUnit * Math.max(product.minimumStock, weeklySales * 4);
      const isLow = material.currentStock <= material.minimumStock || material.currentStock < neededForSafety;
      if (!isLow) continue;
      localRecommendations.push({
        productId: product.id,
        type: "MATERIAL",
        priority: material.currentStock <= material.minimumStock ? "high" : "medium",
        message: `Matière à surveiller pour "${product.name}" : ${material.name}. Stock actuel ${material.currentStock} ${material.unit}, seuil ${material.minimumStock} ${material.unit}. Prévoir un achat avant de pousser ce produit en campagne pour éviter une rupture de production.`,
      });
    }
  }

  let finalRecommendations = localRecommendations;
  try {
    const aiRecommendations = await generateGroqRecommendations({ products: productInsights });
    if (aiRecommendations.length > 0) finalRecommendations = aiRecommendations;
  } catch (error) {
    console.error("Groq recommendation generation failed", error);
  }

  const validProductIds = new Set(products.map(product => product.id));
  const uniqueRecommendations = new Map<string, GroqRecommendation>();
  for (const recommendation of finalRecommendations) {
    if (!validProductIds.has(recommendation.productId)) continue;
    const key = `${recommendation.productId}-${recommendation.type}-${recommendation.message.slice(0, 90)}`;
    if (!uniqueRecommendations.has(key)) uniqueRecommendations.set(key, recommendation);
  }

  for (const recommendation of Array.from(uniqueRecommendations.values()).slice(0, 24)) {
    await prisma.recommendation.create({
      data: {
        productId: recommendation.productId,
        type: recommendation.type,
        priority: recommendation.priority,
        message: recommendation.message,
        suggestedQty: recommendation.suggestedQty || undefined,
      },
    });
  }
}

// ── Audit Logger ──────────────────────────────────────────
export async function auditLog(params: {
  userId:   string;
  action:   string;
  entity:   string;
  entityId: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({ data: params });
}

export async function resolveSessionUser(session: { user?: { email?: string | null } } | null) {
  const email = session?.user?.email;
  if (!email) return null;

  return prisma.user.findFirst({
    where: { email, isActive: true, deletedAt: null },
    select: { id: true, email: true, nom: true, prenom: true, role: true },
  });
}
