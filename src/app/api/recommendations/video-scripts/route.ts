import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateGroqVideoScripts, type VideoScriptIdea } from "@/lib/groq";

function fallbackIdeas(productName: string, objective: string): VideoScriptIdea[] {
  return [
    {
      title: "Routine simple",
      hook: `Et si ${productName} devenait votre petit geste naturel du jour ?`,
      scene: "Plan 1: produit tenu en main. Plan 2: texture ou utilisation. Plan 3: résultat visuel propre, sans promesse exagérée.",
      script: `Aujourd'hui je vous montre ${productName}. C'est le genre de produit qu'on adopte facilement dans une routine simple. On l'utilise avec régularité, on prend soin de soi, et on garde une approche naturelle. Si vous cherchiez une idée accessible pour commencer, ${productName} peut être un bon choix.`,
      cta: "Écrivez-nous maintenant pour commander ou demander conseil.",
      format: "Reel 25 secondes",
    },
    {
      title: "Problème puis solution",
      hook: "Vous ne savez pas quel produit choisir ? Commencez par celui-ci.",
      scene: "Plan face caméra, puis gros plan sur le produit, puis démonstration courte avec texte à l'écran.",
      script: `Quand on veut prendre soin de soi, le plus dur c'est souvent de choisir simplement. ${productName} est une option claire à présenter, surtout si votre objectif est ${objective}. Dans cette vidéo, on vous montre comment l'intégrer sans compliquer votre routine.`,
      cta: "Envoyez “INFO” en message pour recevoir les détails.",
      format: "TikTok éducatif 30 secondes",
    },
    {
      title: "Preuve produit",
      hook: "Voici pourquoi ce produit mérite plus d'attention.",
      scene: "Plan étagère/stock, détail packaging, puis usage réel. Ajouter prix ou disponibilité en fin de vidéo.",
      script: `${productName} fait partie des produits à mettre en avant cette semaine. Montrez le packaging, expliquez à qui il s'adresse, puis terminez avec une offre ou une disponibilité claire. Le but est de rassurer, pas de forcer la vente.`,
      cta: "Disponible chez FAVEDA. Réservez le vôtre aujourd'hui.",
      format: "WhatsApp Status + Reel 20 secondes",
    },
  ];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role === "SURVEILLANT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || "");
  const objective = String(body.objective || "augmenter les ventes");

  if (!productId) {
    return NextResponse.json({ error: "Produit requis." }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      alerts: {
        where: { isResolved: false },
        select: { severity: true, message: true },
      },
      materialRecipes: {
        include: { material: { select: { name: true, unit: true, currentStock: true, minimumStock: true } } },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  try {
    const ideas = await generateGroqVideoScripts({
      product: {
        name: product.name,
        sku: product.sku,
        sellPrice: Number(product.sellPrice),
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        alerts: product.alerts.map(alert => `${alert.severity}: ${alert.message}`),
        materials: product.materialRecipes.map(recipe => `${recipe.material.name}: ${Number(recipe.material.currentStock)} ${recipe.material.unit}`),
      },
      objective,
    });

    if (ideas.length > 0) return NextResponse.json({ ideas, source: "groq" });
  } catch (error) {
    console.error("Video script generation failed", error);
  }

  return NextResponse.json({ ideas: fallbackIdeas(product.name, objective), source: "local" });
}
