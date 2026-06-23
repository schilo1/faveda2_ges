import Link from "next/link";
import prisma from "@/lib/prisma";
import { ProjectionSimulator } from "@/components/finance/ProjectionSimulator";
import { ArrowLeft, Calculator } from "lucide-react";

function monthBounds(month?: string) {
  const now = new Date();
  const value = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, monthNumber] = value.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);
  return { value, start, end };
}

type SearchParams = { month?: string };

export default async function FinanceProjectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { value: month, start, end } = monthBounds((await searchParams).month);

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        materialRecipes: {
          include: { material: true },
          orderBy: { material: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
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

  const soldByProduct = movements.reduce((acc: Record<string, number>, movement) => {
    acc[movement.productId] = (acc[movement.productId] ?? 0) + movement.quantity;
    return acc;
  }, {});

  const projectionProducts = products
    .filter(product => product.materialRecipes.length > 0)
    .map(product => {
      const soldInSelectedMonth = soldByProduct[product.id] ?? 0;
      const monthlyDemand = soldInSelectedMonth;
      const suggestedQuantity = Math.max(product.minimumStock * 2 - product.currentStock, monthlyDemand - product.currentStock, 0);

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        sellPrice: Number(product.sellPrice),
        soldInSelectedMonth,
        suggestedQuantity,
        materials: product.materialRecipes.map(recipe => ({
          id: recipe.material.id,
          name: recipe.material.name,
          unit: recipe.material.unit,
          currentStock: Number(recipe.material.currentStock),
          estimatedUnitCost: Number(recipe.material.estimatedUnitCost),
          quantityPerUnit: Number(recipe.quantityPerUnit),
        })),
      };
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Calculator size={20} className="text-[#C9A227]" />
            <h1 className="page-title">Projection des ventes</h1>
          </div>
          <p className="page-subtitle">Simulez des ventes par produit pour le mois sélectionné et voyez les matières, coûts et gains attendus.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form className="flex items-center gap-2">
            <input name="month" type="month" defaultValue={month} className="input w-auto" />
            <button className="btn-primary" type="submit">Afficher</button>
          </form>
          <Link href={`/finance?month=${month}`} className="btn-secondary gap-2">
            <ArrowLeft size={16} />
            Finances
          </Link>
        </div>
      </div>

      <ProjectionSimulator products={projectionProducts} />
    </div>
  );
}
