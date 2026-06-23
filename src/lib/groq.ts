type GroqRecommendationInput = {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minimumStock: number;
    sellPrice: number;
    monthlySales: number;
    daysOfStock: number;
    alerts: string[];
    materials: Array<{
      name: string;
      unit: string;
      currentStock: number;
      minimumStock: number;
      expiryDate?: string | null;
      quantityPerUnit: number;
    }>;
  }>;
};

export type GroqRecommendation = {
  productId: string;
  type: "REORDER" | "PROMO" | "FORECAST" | "MARKETING" | "MATERIAL";
  priority: "critical" | "high" | "medium" | "low";
  message: string;
  suggestedQty?: number | null;
};

type VideoScriptInput = {
  product: {
    name: string;
    sku: string;
    sellPrice: number;
    currentStock: number;
    minimumStock: number;
    alerts: string[];
    materials: string[];
  };
  objective: string;
};

export type VideoScriptIdea = {
  title: string;
  hook: string;
  scene: string;
  script: string;
  cta: string;
  format: string;
};

function stripCodeFence(value: string) {
  return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

export async function generateGroqRecommendations(input: GroqRecommendationInput): Promise<GroqRecommendation[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content: [
            "Tu es un expert marketing, stock et production pour une marque de produits naturels appelée FAVEDA.",
            "Tu dois créer des recommandations actionnables, en français, très concrètes.",
            "Réponds uniquement en JSON valide, sans markdown.",
            "Format exact: {\"recommendations\":[{\"productId\":\"...\",\"type\":\"REORDER|PROMO|FORECAST|MARKETING|MATERIAL\",\"priority\":\"critical|high|medium|low\",\"message\":\"...\",\"suggestedQty\":null}]}",
            "Le message peut contenir 2 à 4 phrases courtes. Pour MARKETING, propose un type de vidéo précis: angle, scène, hook, offre ou CTA.",
            "Pour MATERIAL, explique quelle matière première surveiller/acheter et pourquoi.",
            "Ne crée pas plus de 12 recommandations.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || "Groq n'a pas pu générer les recommandations.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(stripCodeFence(content));
  const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];

  return recommendations
    .filter((item: any) => item?.productId && item?.message)
    .map((item: any) => ({
      productId: String(item.productId),
      type: ["REORDER", "PROMO", "FORECAST", "MARKETING", "MATERIAL"].includes(item.type) ? item.type : "MARKETING",
      priority: ["critical", "high", "medium", "low"].includes(item.priority) ? item.priority : "medium",
      message: String(item.message).slice(0, 1800),
      suggestedQty: Number.isFinite(Number(item.suggestedQty)) ? Math.max(0, Math.round(Number(item.suggestedQty))) : null,
    }));
}

export async function generateGroqVideoScripts(input: VideoScriptInput): Promise<VideoScriptIdea[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1700,
      messages: [
        {
          role: "system",
          content: [
            "Tu es un expert marketing social media pour FAVEDA, marque de produits naturels.",
            "Tu écris des concepts vidéo courts pour TikTok, Instagram Reels et WhatsApp Status.",
            "Évite les promesses médicales ou résultats garantis. Reste crédible, concret et vendeur.",
            "Réponds uniquement en JSON valide, sans markdown.",
            "Format exact: {\"ideas\":[{\"title\":\"...\",\"hook\":\"...\",\"scene\":\"...\",\"script\":\"...\",\"cta\":\"...\",\"format\":\"...\"}]}",
            "Génère exactement 3 idées différentes. Chaque script doit être prêt à lire en 20 à 35 secondes.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || "Groq n'a pas pu générer les scripts vidéo.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(stripCodeFence(content));
  const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas : [];

  const mappedIdeas: VideoScriptIdea[] = ideas.slice(0, 3).map((idea: Record<string, unknown>) => ({
    title: String(idea.title || "Idée vidéo").slice(0, 120),
    hook: String(idea.hook || "").slice(0, 280),
    scene: String(idea.scene || "").slice(0, 700),
    script: String(idea.script || "").slice(0, 1200),
    cta: String(idea.cta || "").slice(0, 280),
    format: String(idea.format || "Reel 30 secondes").slice(0, 120),
  }));

  return mappedIdeas.filter((idea: VideoScriptIdea) => idea.hook && idea.script);
}
