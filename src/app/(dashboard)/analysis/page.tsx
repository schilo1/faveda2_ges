import prisma from "@/lib/prisma";
import { AnalysisCharts } from "@/components/analysis/AnalysisCharts";
import { BarChart3, Coins, Package, TrendingUp } from "lucide-react";

const money = new Intl.NumberFormat("fr-CI", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export default async function AnalysisPage() {
  const start = new Date();
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [products, sales, preorders] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, sku: true, buyPrice: true, sellPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { deletedAt: null, type: { in: ["VENTE", "SORTIE"] }, movementDate: { gte: start } },
      include: { product: { select: { id: true, name: true, sku: true, buyPrice: true, sellPrice: true } } },
    }),
    prisma.preorder.findMany({
      where: { deletedAt: null, preorderDate: { gte: start } },
      include: {
        user: { select: { id: true, prenom: true, nom: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, buyPrice: true, sellPrice: true } } } },
      },
    }),
  ]);

  const productMap = new Map(products.map(product => [product.id, {
    id: product.id,
    name: product.name,
    sku: product.sku,
    soldQty: 0,
    preorderQty: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    marginRate: 0,
  }]));

  const monthlyMap = new Map<string, { month: string; revenue: number; cost: number; profit: number }>();
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);
    const key = monthKey(date);
    monthlyMap.set(key, { month: monthLabel(key), revenue: 0, cost: 0, profit: 0 });
  }

  for (const sale of sales) {
    const metric = productMap.get(sale.productId);
    if (!metric) continue;
    const revenue = Number(sale.totalPrice ?? Number(sale.product.sellPrice) * sale.quantity);
    const cost = Number(sale.product.buyPrice) * sale.quantity;
    metric.soldQty += sale.quantity;
    metric.revenue += revenue;
    metric.cost += cost;

    const month = monthlyMap.get(monthKey(sale.movementDate));
    if (month) {
      month.revenue += revenue;
      month.cost += cost;
    }
  }

  const activePreorders = preorders.filter(preorder => !["ANNULEE", "REMBOURSEE"].includes(preorder.status));
  for (const preorder of activePreorders) {
    const preorderTotal = Number(preorder.totalAmount);
    const preorderPaid = Number(preorder.paidAmount);
    const paidRatio = preorderTotal > 0 ? Math.min(preorderPaid / preorderTotal, 1) : 0;
    for (const item of preorder.items) {
      const metric = productMap.get(item.productId);
      if (!metric) continue;
      const revenue = Number(item.total) * paidRatio;
      const cost = Number(item.product.buyPrice) * item.quantity * paidRatio;
      metric.preorderQty += item.quantity;
      metric.revenue += revenue;
      metric.cost += cost;

      const month = monthlyMap.get(monthKey(preorder.preorderDate));
      if (month) {
        month.revenue += revenue;
        month.cost += cost;
      }
    }
  }

  const productMetrics = Array.from(productMap.values())
    .map(product => {
      const profit = product.revenue - product.cost;
      return {
        ...product,
        profit,
        marginRate: product.revenue > 0 ? Math.round((profit / product.revenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const commercialMetrics = Object.values(
    preorders.reduce((acc: Record<string, { name: string; preorderCount: number; productQty: number; amount: number; canceledCount: number }>, preorder) => {
      const key = preorder.user.id;
      acc[key] ??= {
        name: `${preorder.user.prenom} ${preorder.user.nom}`,
        preorderCount: 0,
        productQty: 0,
        amount: 0,
        canceledCount: 0,
      };
      acc[key].preorderCount += 1;
      if (["ANNULEE", "REMBOURSEE"].includes(preorder.status)) {
        acc[key].canceledCount += 1;
      } else {
        acc[key].amount += Number(preorder.paidAmount);
        acc[key].productQty += preorder.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      return acc;
    }, {})
  ).sort((a, b) => b.preorderCount - a.preorderCount);

  const monthlyMetrics = Array.from(monthlyMap.values()).map(item => ({
    ...item,
    profit: item.revenue - item.cost,
  }));

  const totalRevenue = productMetrics.reduce((sum, product) => sum + product.revenue, 0);
  const totalCost = productMetrics.reduce((sum, product) => sum + product.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalSoldQty = productMetrics.reduce((sum, product) => sum + product.soldQty, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analyse</h1>
          <p className="page-subtitle">Vue complète des ventes, précommandes, commerciaux et bénéfices encaissés estimés.</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalysisStat title="CA encaissé" value={money.format(totalRevenue)} icon={TrendingUp} />
        <AnalysisStat title="Bénéfice brut" value={money.format(totalProfit)} icon={Coins} tone={totalProfit < 0 ? "red" : "green"} />
        <AnalysisStat title="Coût estimé" value={money.format(totalCost)} icon={BarChart3} />
        <AnalysisStat title="Produits vendus" value={totalSoldQty} icon={Package} />
      </div>

      <AnalysisCharts products={productMetrics} commercials={commercialMetrics} monthly={monthlyMetrics} />

      <section className="card mt-5 p-5">
        <h2 className="mb-3 font-bold text-gray-900">Comment le bénéfice est calculé</h2>
        <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
          <div className="rounded-2xl bg-[#F3F3F3]/70 p-4">
            <p className="font-bold text-gray-800">Chiffre d'affaires</p>
            <p className="mt-1">Ventes validées + montants déjà encaissés sur les précommandes actives. Les précommandes annulées ou remboursées sont exclues.</p>
          </div>
          <div className="rounded-2xl bg-[#F3F3F3]/70 p-4">
            <p className="font-bold text-gray-800">Coût estimé</p>
            <p className="mt-1">Ventes : quantité vendue x prix d'achat. Précommandes : coût estimé au prorata du montant déjà encaissé.</p>
          </div>
          <div className="rounded-2xl bg-[#F3F3F3]/70 p-4">
            <p className="font-bold text-gray-800">Bénéfice brut</p>
            <p className="mt-1">Chiffre d'affaires - coût estimé.</p>
          </div>
          <div className="rounded-2xl bg-[#F3F3F3]/70 p-4">
            <p className="font-bold text-gray-800">Important</p>
            <p className="mt-1">Ce bénéfice est brut : il ne retire pas encore les frais généraux, livraison, salaires, pertes, remboursements futurs ou taxes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalysisStat({ title, value, icon: Icon, tone = "default" }: { title: string; value: string | number; icon: any; tone?: "default" | "green" | "red" }) {
  const color = tone === "green" ? "bg-green-50 text-green-700" : tone === "red" ? "bg-red-50 text-red-700" : "bg-[#596744]/10 text-[#596744]";
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="break-words text-2xl font-black leading-tight text-gray-900">{value}</p>
    </div>
  );
}
