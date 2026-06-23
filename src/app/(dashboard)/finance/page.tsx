import { auth } from "@/auth";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { FinanceForms } from "@/components/finance/FinanceForms";
import { FinancePdfButton } from "@/components/finance/FinancePdfButton";
import {
  AlertTriangle,
  Calculator,
  Coins,
  LineChart,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number, digits = 0) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
  }).format(value);
}

function monthBounds(month?: string) {
  const now = new Date();
  const value =
    month ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, monthNumber] = value.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);
  return { value, start, end };
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

type SearchParams = { month?: string };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canEdit = ["ADMIN", "GESTIONNAIRE"].includes(role);
  const { value: month, start, end } = monthBounds((await searchParams).month);

  const [
    budgets,
    allBudgets,
    expenses,
    materials,
    products,
    suppliers,
    units,
    recipes,
    saleMovements,
  ] = await Promise.all([
    prisma.financeBudget.findMany({
      where: { month: start, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financeBudget.findMany({
      where: { deletedAt: null },
      include: { user: { select: { prenom: true, nom: true } } },
      orderBy: { month: "desc" },
      take: 24,
    }),
    prisma.rawMaterialExpense.findMany({
      where: { spentAt: { gte: start, lte: end }, deletedAt: null },
      include: {
        material: true,
        product: true,
        supplier: true,
        user: { select: { prenom: true, nom: true } },
      },
      orderBy: { spentAt: "desc" },
    }),
    prisma.rawMaterial.findMany({
      where: { deletedAt: null },
      include: {
        supplier: true,
        productRecipes: { include: { product: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        materialRecipes: { include: { material: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.productMaterialRecipe.findMany({
      include: {
        product: { select: { name: true } },
        material: { select: { name: true, unit: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.stockMovement.findMany({
      where: {
        deletedAt: null,
        type: { in: ["VENTE", "SORTIE"] },
        movementDate: { gte: start, lte: end },
      },
      select: { productId: true, quantity: true },
    }),
  ]);

  const budget = budgets[0];
  const budgetAmount = Number(budget?.amount ?? 0);
  const spent = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );
  const remaining = budgetAmount - spent;
  const overBudget = budgetAmount > 0 ? Math.max(spent - budgetAmount, 0) : 0;
  const usageRate =
    budgetAmount > 0
      ? Math.round((spent / budgetAmount) * 100)
      : 0;

  const byCategory = Object.values(
    expenses.reduce(
      (acc: Record<string, { name: string; amount: number }>, expense) => {
        acc[expense.category] ??= { name: expense.category, amount: 0 };
        acc[expense.category].amount += Number(expense.amount);
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.amount - a.amount);

  const byMaterial = Object.values(
    expenses.reduce(
      (
        acc: Record<
          string,
          { name: string; amount: number; quantity: number; unit: string }
        >,
        expense,
      ) => {
        const key = expense.material?.id ?? "none";
        const name = expense.material?.name ?? "Non affecté";
        acc[key] ??= {
          name,
          amount: 0,
          quantity: 0,
          unit: expense.material?.unit ?? "",
        };
        acc[key].amount += Number(expense.amount);
        acc[key].quantity += Number(expense.quantity ?? 0);
        return acc;
      },
      {},
    ),
  )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const soldByProduct = saleMovements.reduce(
    (acc: Record<string, number>, movement) => {
      acc[movement.productId] =
        (acc[movement.productId] ?? 0) + movement.quantity;
      return acc;
    },
    {},
  );

  const projectionCandidates = products.flatMap((product) => {
    const recipes = product.materialRecipes;
    if (recipes.length === 0) return [];
    const monthlyDemand = soldByProduct[product.id] ?? 0;
    const materialCostPerUnit = recipes.reduce(
      (sum, recipe) =>
        sum +
        Number(recipe.quantityPerUnit) *
          Number(recipe.material.estimatedUnitCost),
      0,
    );
    const marginPerUnit = Number(product.sellPrice) - materialCostPerUnit;
    if (marginPerUnit <= 0) return [];
    const score =
      materialCostPerUnit > 0
        ? marginPerUnit / materialCostPerUnit
        : marginPerUnit;
    return [
      {
        product,
        monthlyDemand,
        materialCostPerUnit,
        marginPerUnit,
        score,
        recipes: recipes.map((recipe) => ({
          id: recipe.materialId,
          name: recipe.material.name,
          unit: recipe.material.unit,
          quantityPerUnit: Number(recipe.quantityPerUnit),
          currentStock: Number(recipe.material.currentStock),
          estimatedUnitCost: Number(recipe.material.estimatedUnitCost),
        })),
      },
    ];
  });
  const remainingMaterials = new Map<string, number>();
  for (const candidate of projectionCandidates) {
    for (const recipe of candidate.recipes) {
      if (!remainingMaterials.has(recipe.id))
        remainingMaterials.set(recipe.id, recipe.currentStock);
    }
  }
  const projectedQuantities = new Map<string, number>();
  let allocationGuard = 0;
  while (allocationGuard < 20000) {
    allocationGuard += 1;
    const feasibleCandidates = projectionCandidates.filter((candidate) =>
      candidate.recipes.every(
        (recipe) =>
          recipe.quantityPerUnit <= 0 ||
          (remainingMaterials.get(recipe.id) ?? 0) >= recipe.quantityPerUnit,
      ),
    );
    if (feasibleCandidates.length === 0) break;
    const candidate = randomItem(feasibleCandidates);
    projectedQuantities.set(
      candidate.product.id,
      (projectedQuantities.get(candidate.product.id) ?? 0) + 1,
    );
    for (const recipe of candidate.recipes) {
      remainingMaterials.set(
        recipe.id,
        Math.max(
          0,
          (remainingMaterials.get(recipe.id) ?? 0) - recipe.quantityPerUnit,
        ),
      );
    }
  }
  const projections = projectionCandidates
    .map((candidate) => {
      const displayQty = projectedQuantities.get(candidate.product.id) ?? 0;
      const materialCost = candidate.materialCostPerUnit * displayQty;
      const profitPotential = candidate.marginPerUnit * displayQty;
      return {
        ...candidate,
        displayQty,
        materialCost,
        profitPotential,
        materials: candidate.recipes.map((recipe) => ({
          name: recipe.name,
          unit: recipe.unit,
          needed: recipe.quantityPerUnit * displayQty,
          currentStock: recipe.currentStock,
          estimatedCost:
            recipe.quantityPerUnit * displayQty * recipe.estimatedUnitCost,
        })),
      };
    })
    .filter((candidate) => candidate.displayQty > 0)
    .sort((a, b) => b.displayQty - a.displayQty || b.score - a.score);
  const productsWithRecipesCount = products.filter(
    (product) => product.materialRecipes.length > 0,
  ).length;

  const lowMaterials = materials
    .filter(
      (material) =>
        Number(material.currentStock) <= Number(material.minimumStock),
    )
    .slice(0, 8);

  const materialOptions = materials.map((material) => ({
    id: material.id,
    name: material.name,
    unit: material.unit,
    currentStock: Number(material.currentStock),
    minimumStock: Number(material.minimumStock),
    estimatedUnitCost: Number(material.estimatedUnitCost),
    expiryDate: material.expiryDate
      ? material.expiryDate.toISOString().slice(0, 10)
      : null,
    supplierId: material.supplierId,
    supplierName: material.supplier?.name ?? null,
    notes: material.notes,
  }));
  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
  }));
  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));
  const unitOptions = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    symbol: unit.symbol,
  }));
  const budgetRows = allBudgets.map((item) => ({
    id: item.id,
    month: item.month.toISOString().slice(0, 7),
    amount: Number(item.amount),
    notes: item.notes,
    userName: `${item.user.prenom} ${item.user.nom}`,
  }));
  const expenseRows = expenses.map((item) => ({
    id: item.id,
    description: item.description,
    category: item.category,
    materialId: item.materialId,
    materialName: item.material?.name ?? null,
    productId: item.productId,
    productName: item.product?.name ?? null,
    supplierId: item.supplierId,
    supplierName: item.supplier?.name ?? null,
    quantity: item.quantity === null ? null : Number(item.quantity),
    unitCost: item.unitCost === null ? null : Number(item.unitCost),
    amount: Number(item.amount),
    spentAt: item.spentAt.toISOString().slice(0, 10),
    notes: item.notes,
    userName: `${item.user.prenom} ${item.user.nom}`,
  }));
  const recipeRows = recipes.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    materialId: item.materialId,
    materialName: item.material.name,
    materialUnit: item.material.unit,
    quantityPerUnit: Number(item.quantityPerUnit),
    notes: item.notes,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finances</h1>
          <p className="page-subtitle">
            Budgets matières premières, dépenses mensuelles et projections
            d'achat.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/finance/projections?month=${month}`}
            className="btn-secondary gap-2"
          >
            <LineChart size={16} />
            Simuler les ventes
          </Link>
          <FinancePdfButton
            month={month}
            summary={{ budgetAmount, spent, remaining, usageRate }}
            byCategory={byCategory}
            byMaterial={byMaterial}
            projections={projections.map((item) => ({
              productName: item.product.name,
              quantity: item.displayQty,
              monthlyDemand: item.monthlyDemand,
              materialCost: item.materialCost,
              profitPotential: item.profitPotential,
              materials: item.materials,
            }))}
            lowMaterials={lowMaterials.map((material) => ({
              name: material.name,
              unit: material.unit,
              currentStock: Number(material.currentStock),
              minimumStock: Number(material.minimumStock),
              expiryDate: material.expiryDate
                ? material.expiryDate.toISOString().slice(0, 10)
                : null,
            }))}
            budgets={budgetRows}
            materials={materialOptions}
            expenses={expenseRows}
            recipes={recipeRows}
          />
          <form className="flex items-center gap-2">
            <input
              name="month"
              type="month"
              defaultValue={month}
              className="input w-auto"
            />
            <button className="btn-primary" type="submit">
              Afficher
            </button>
          </form>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceStat
          title="Budget matières"
          value={money(budgetAmount)}
          icon={PiggyBank}
          tone="green"
        />
        <FinanceStat
          title="Dépensé ce mois"
          value={money(spent)}
          icon={Wallet}
          tone="orange"
        />
        <FinanceStat
          title="Tchai!"
          value={money(overBudget)}
          icon={Coins}
          tone="red"
        />
        <FinanceStat
          title="Utilisation"
          value={`${usageRate}%`}
          icon={Calculator}
          tone={usageRate > 100 ? "red" : "default"}
        />
      </div>

      <div className="card mb-5 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700">
            Consommation du budget
          </span>
          <span
            className={
              overBudget > 0
                ? "font-bold text-red-600"
                : "font-bold text-[#9F7D16]"
            }
          >
            {overBudget > 0
              ? `Dépassement: ${money(overBudget)}`
              : `Reste: ${money(Math.max(remaining, 0))}`}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#D9D7D2]/60">
          <div
            className={`h-full rounded-full ${overBudget > 0 ? "bg-red-600" : "bg-[#C9A227]"}`}
            style={{ width: `${Math.min(usageRate, 100)}%` }}
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-gray-800">
            Où l'argent est parti
          </h2>
          <div className="space-y-3">
            {byCategory.length === 0 ? (
              <Empty label="Aucune dépense sur ce mois." />
            ) : (
              byCategory.map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {item.name.replaceAll("_", " ")}
                    </span>
                    <span className="font-bold">{money(item.amount)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#D9D7D2]/60">
                    <div
                      className="h-full rounded-full bg-[#C9A227]"
                      style={{
                        width: `${spent > 0 ? Math.round((item.amount / spent) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold text-gray-800">
            Matières les plus coûteuses
          </h2>
          <div className="space-y-2">
            {byMaterial.length === 0 ? (
              <Empty label="Aucune matière suivie ce mois." />
            ) : (
              byMaterial.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl border border-[#D9D7D2]/60 bg-[#F3F3F3]/60 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {number(item.quantity, 2)} {item.unit}
                    </p>
                  </div>
                  <p className="font-bold text-[#9F7D16]">
                    {money(item.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#C9A227]" />
              <h2 className="font-bold text-gray-800">
                Production possible avec les matières
              </h2>
            </div>
            <span className="rounded-full bg-[#F3F3F3] px-3 py-1 text-xs font-bold text-gray-500">
              {projections.length}/{productsWithRecipesCount} produit(s)
            </span>
          </div>
          <div className="space-y-3">
            {projections.length === 0 ? (
              <Empty label="Ajoutez des recettes matière ou du stock matière pour obtenir des projections." />
            ) : (
              projections.map((item) => (
                <div
                  key={item.product.id}
                  className="rounded-2xl border border-[#D9D7D2]/70 bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-800">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Produire {item.displayQty} unité(s), demande estimée{" "}
                        {item.monthlyDemand}/mois
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#596744]">
                        Gain brut matière estimé {money(item.profitPotential)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Valeur matières utilisées {money(item.materialCost)}
                      </p>
                    </div>
                  </div>
                  {item.materials.some((material) => material.needed > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.materials
                        .filter((material) => material.needed > 0)
                        .map((material) => (
                          <span
                            key={material.name}
                            className="rounded-full bg-[#F3F3F3] px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {material.name}: {number(material.needed, 2)}{" "}
                            {material.unit} ({money(material.estimatedCost)})
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#9F7D16]" />
            <h2 className="font-bold text-gray-800">Matières sous seuil</h2>
          </div>
          <div className="space-y-2">
            {lowMaterials.length === 0 ? (
              <Empty label="Aucune matière sous le seuil." />
            ) : (
              lowMaterials.map((material) => (
                <div
                  key={material.id}
                  className="rounded-2xl border border-[#C9A227]/30 bg-[#FFF3C4]/60 px-3 py-2"
                >
                  <p className="font-semibold text-[#6F560D]">
                    {material.name}
                  </p>
                  <p className="text-xs text-[#9F7D16]">
                    Stock {number(Number(material.currentStock), 2)}{" "}
                    {material.unit} / seuil{" "}
                    {number(Number(material.minimumStock), 2)} {material.unit}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mb-5">
        <FinanceForms
          month={month}
          materials={materialOptions}
          budgets={budgetRows}
          expenses={expenseRows}
          recipes={recipeRows}
          products={productOptions}
          suppliers={supplierOptions}
          units={unitOptions}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}

function FinanceStat({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: any;
  tone: "default" | "green" | "orange" | "red";
}) {
  const colors = {
    default: "bg-white text-[#596744]",
    green: "bg-green-50 text-green-700",
    orange: "bg-[#FFF3C4] text-[#9F7D16]",
    red: "bg-red-50 text-red-700",
  };
  const valueColors = {
    default: "text-gray-900",
    green: "text-gray-900",
    orange: "text-gray-900",
    red: "text-red-700",
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueColors[tone]}`}>{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/60 px-4 py-6 text-center text-sm text-gray-400">
      {label}
    </p>
  );
}
