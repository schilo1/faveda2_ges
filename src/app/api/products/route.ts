// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateSKU, auditLog, formatZodError, resolveSessionUser, runAlertEngine } from "@/lib/utils";
import { z } from "zod";

const productSchema = z.object({
  name:         z.string().min(2, "Nom requis"),
  description:  z.string().optional().nullable(),
  buyPrice:     z.preprocess(value => value === "" || value === null || value === undefined ? 0 : value, z.coerce.number().min(0).default(0)),
  sellPrice:    z.number().positive("Prix de vente requis"),
  minimumStock: z.number().int().min(0).default(5),
  currentStock: z.number().int().min(0).default(0),
  expiryDate:   z.string().optional().nullable(),
  categoryId:   z.string().cuid("Catégorie requise"),
  unitId:       z.string().cuid("Unité requise"),
  supplierId:   z.string().cuid().optional().nullable(),
  photo:        z.string().optional().nullable(),
});

// GET /api/products
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const status   = searchParams.get("status") ?? "";
  const page     = parseInt(searchParams.get("page") ?? "1");
  const limit    = parseInt(searchParams.get("limit") ?? "20");
  const skip     = (page - 1) * limit;

  const where: any = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search } },
        { sku:  { contains: search } },
      ],
    }),
    ...(category && { categoryId: category }),
    ...(status === "low"      && { currentStock: { gt: 0, lt: prisma.product.fields.minimumStock } }),
    ...(status === "out"      && { currentStock: 0 }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, unit: true, supplier: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    data: products,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

// POST /api/products
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (!["ADMIN", "GESTIONNAIRE"].includes(role)) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  const currentUser = await resolveSessionUser(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur introuvable dans la base active. Reconnectez-vous ou recréez cet utilisateur." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error), details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Get category name for SKU generation
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });

  const sku = await generateSKU(category.name);

  const product = await prisma.product.create({
    data: {
      sku,
      name:         data.name,
      description:  data.description ?? null,
      buyPrice:     data.buyPrice,
      sellPrice:    data.sellPrice,
      minimumStock: data.minimumStock,
      currentStock: data.currentStock,
      expiryDate:   data.expiryDate ? new Date(data.expiryDate) : null,
      categoryId:   data.categoryId,
      unitId:       data.unitId,
      supplierId:   data.supplierId,
      photo:        data.photo,
    },
    include: { category: true, unit: true, supplier: true },
  });

  await auditLog({
    userId:   currentUser.id,
    action:   "CREATE",
    entity:   "Product",
    entityId: product.id,
    newValue: product as any,
  });

  // Trigger alert engine
  await runAlertEngine();

  return NextResponse.json({ data: product }, { status: 201 });
}
