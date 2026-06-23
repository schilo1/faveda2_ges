// prisma/seed.ts
import { PrismaClient, Role, MovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed FAVEDA...");

  // ── Settings ──────────────────────────────────────────────
  await prisma.setting.createMany({
    skipDuplicates: true,
    data: [
      { key: "company_name",    value: "FAVEDA",                    label: "Nom entreprise" },
      { key: "company_email",   value: "contact@faveda.ci",         label: "Email entreprise" },
      { key: "company_phone",   value: "+225 07 000 000",           label: "Téléphone" },
      { key: "currency",        value: "FCFA",                      label: "Devise" },
      { key: "currency_symbol", value: "F",                         label: "Symbole devise" },
      { key: "default_min_stock", value: "5",                       label: "Seuil minimum global", type: "number" },
      { key: "default_validator", value: "Grâce",                   label: "Validateur par défaut" },
      { key: "expiry_warning_days", value: "30",                    label: "Alerte péremption (jours)", type: "number" },
    ],
  });

  // ── Categories ────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: "FAVEDA Liquides" }, update: {}, create: { name: "FAVEDA Liquides", description: "Tisanes, infusions et boissons liquides", color: "#596744" } }),
    prisma.category.upsert({ where: { name: "Poudre" },          update: {}, create: { name: "Poudre",          description: "Produits en poudre : moringa, spiruline...", color: "#697555" } }),
    prisma.category.upsert({ where: { name: "Perte de poids" },  update: {}, create: { name: "Perte de poids",  description: "Compléments et produits minceur", color: "#4F5C3D" } }),
    prisma.category.upsert({ where: { name: "Beauté" },          update: {}, create: { name: "Beauté",          description: "Cosmétiques naturels et soins", color: "#8A9B6E" } }),
  ]);
  console.log("✓ Catégories créées");

  // ── Units ─────────────────────────────────────────────────
  const units = await Promise.all([
    prisma.unit.upsert({ where: { name: "Unité" },  update: {}, create: { name: "Unité",  symbol: "u" } }),
    prisma.unit.upsert({ where: { name: "Boîte" },  update: {}, create: { name: "Boîte",  symbol: "bte" } }),
    prisma.unit.upsert({ where: { name: "Flacon" }, update: {}, create: { name: "Flacon", symbol: "fl" } }),
    prisma.unit.upsert({ where: { name: "Kg" },     update: {}, create: { name: "Kg",     symbol: "kg" } }),
    prisma.unit.upsert({ where: { name: "Litre" },  update: {}, create: { name: "Litre",  symbol: "L" } }),
    prisma.unit.upsert({ where: { name: "Sachet" }, update: {}, create: { name: "Sachet", symbol: "sac" } }),
  ]);
  console.log("✓ Unités créées");

  // ── Suppliers ─────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: "Herba Plus",   phone: "+225 07 123 456", email: "contact@herba.ci",    address: "Abidjan, Cocody",   comment: "Fournisseur principal FAVEDA Liquides" } }),
    prisma.supplier.create({ data: { name: "BioNature CI", phone: "+225 05 987 654", email: "bio@nature.ci",        address: "Abidjan, Plateau",  comment: "Certifié bio — poudres et extraits" } }),
    prisma.supplier.create({ data: { name: "SlimLab",      phone: "+225 01 555 234", email: "info@slimlab.ci",      address: "Abidjan, Marcory",  comment: "Spécialiste produits perte de poids" } }),
    prisma.supplier.create({ data: { name: "AfriBeauty",   phone: "+225 07 777 888", email: "contact@africare.ci",  address: "Abidjan, Yopougon", comment: "Cosmétiques naturels africains" } }),
  ]);
  console.log("✓ Fournisseurs créés");

  // ── Stock Locations ───────────────────────────────────────
  await prisma.stockLocation.createMany({
    skipDuplicates: true,
    data: [
      { name: "Stock principal",  description: "Entrepôt principal FAVEDA" },
      { name: "Boutique en ligne", description: "Stock réservé e-commerce" },
      { name: "Réserve",           description: "Stock de réserve secondaire" },
    ],
  });
  console.log("✓ Sites de stock créés");

  // ── Products ──────────────────────────────────────────────
  const productData = [
    { sku: "FAV-LIQ-001", name: "Tisane Détox Premium",    catIdx: 0, unitIdx: 2, supIdx: 0, stock: 45, min: 20, buy: 2500,  sell: 4500,  expiry: new Date("2025-12-15") },
    { sku: "FAV-PDR-001", name: "Poudre Moringa Bio",       catIdx: 1, unitIdx: 3, supIdx: 1, stock: 12, min: 15, buy: 3200,  sell: 6000,  expiry: new Date("2025-09-30") },
    { sku: "FAV-PDS-001", name: "Capsules Slim Tea",        catIdx: 2, unitIdx: 1, supIdx: 2, stock: 0,  min: 10, buy: 4500,  sell: 8500,  expiry: new Date("2026-03-20") },
    { sku: "FAV-BEA-001", name: "Huile Baobab Pure",        catIdx: 3, unitIdx: 2, supIdx: 3, stock: 28, min: 10, buy: 5000,  sell: 9500,  expiry: new Date("2026-01-10") },
    { sku: "FAV-LIQ-002", name: "Infusion Hibiscus",        catIdx: 0, unitIdx: 2, supIdx: 0, stock: 8,  min: 25, buy: 1800,  sell: 3500,  expiry: new Date("2025-08-20") },
    { sku: "FAV-PDR-002", name: "Spiruline Poudre",         catIdx: 1, unitIdx: 3, supIdx: 1, stock: 35, min: 10, buy: 4000,  sell: 7500,  expiry: new Date("2025-11-30") },
    { sku: "FAV-PDS-002", name: "Thé Vert Brûleur",         catIdx: 2, unitIdx: 1, supIdx: 2, stock: 22, min: 15, buy: 2800,  sell: 5500,  expiry: new Date("2026-06-15"), active: false },
    { sku: "FAV-BEA-002", name: "Savon Karité Nature",      catIdx: 3, unitIdx: 0, supIdx: 3, stock: 4,  min: 15, buy: 1200,  sell: 2800,  expiry: new Date("2027-01-01") },
    { sku: "FAV-LIQ-003", name: "Sirop Gingembre Citron",  catIdx: 0, unitIdx: 2, supIdx: 0, stock: 60, min: 20, buy: 2200,  sell: 4000,  expiry: new Date("2026-02-28") },
    { sku: "FAV-PDR-003", name: "Protéine Baobab",          catIdx: 1, unitIdx: 3, supIdx: 1, stock: 18, min: 10, buy: 5500,  sell: 10000, expiry: new Date("2026-04-30") },
  ];

  for (const p of productData) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku:          p.sku,
        name:         p.name,
        categoryId:   categories[p.catIdx].id,
        unitId:       units[p.unitIdx].id,
        supplierId:   suppliers[p.supIdx].id,
        currentStock: p.stock,
        minimumStock: p.min,
        buyPrice:     p.buy,
        sellPrice:    p.sell,
        expiryDate:   p.expiry,
        isActive:     p.active ?? true,
      },
    });
  }
  console.log("✓ Produits créés");

  // ── Users ─────────────────────────────────────────────────
  const hashedAdmin  = await bcrypt.hash("faveda2025!", 12);
  const hashedGrace  = await bcrypt.hash("grace2025!",  12);
  const hashedViewer = await bcrypt.hash("viewer2025!", 12);

  await prisma.user.createMany({
    skipDuplicates: true,
    data: [
      { email: "admin@faveda.ci",     nom: "FAVEDA",   prenom: "Admin",  password: hashedAdmin,  role: Role.ADMIN },
      { email: "grace@faveda.ci",     nom: "Kouamé",   prenom: "Grâce",  password: hashedGrace,  role: Role.GESTIONNAIRE },
      { email: "lecteur@faveda.ci",   nom: "Lecteur",  prenom: "Jean",   password: hashedViewer, role: Role.SURVEILLANT },
    ],
  });
  console.log("✓ Utilisateurs créés");

  console.log("\n🎉 Seed FAVEDA terminé avec succès !");
  console.log("   Connexion : admin@faveda.ci / faveda2025!");
}

main()
  .catch((e) => { console.error("❌ Erreur seed:", e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
