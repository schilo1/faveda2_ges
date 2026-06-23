import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/StatCard";
import { MovementBadge } from "@/components/ui/Badge";
import { Package, AlertTriangle, TrendingDown, Clock, DollarSign, Bell, ShoppingCart } from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const session = await auth();
  const trendStart = subDays(new Date(), 13);
  trendStart.setHours(0, 0, 0, 0);

  const [products, movements, trendMovements, saleMovements, financeExpenses, activeAlerts, unreadAlerts] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        name: true,
        currentStock: true,
        minimumStock: true,
        sellPrice: true,
        expiryDate: true,
        category: { select: { name: true } },
      },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { product: { select: { name: true } }, user: { select: { nom: true, prenom: true } } },
    }),
    prisma.stockMovement.findMany({
      where: { deletedAt: null, movementDate: { gte: trendStart } },
      select: { type: true, quantity: true, movementDate: true },
      orderBy: { movementDate: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { deletedAt: null, type: { in: ["VENTE", "SORTIE"] }, movementDate: { gte: trendStart } },
      select: {
        quantity: true,
        movementDate: true,
        totalPrice: true,
        product: { select: { sellPrice: true } },
      },
      orderBy: { movementDate: "asc" },
    }),
    prisma.rawMaterialExpense.findMany({
      where: { deletedAt: null, spentAt: { gte: trendStart } },
      select: { amount: true },
    }),
    prisma.alert.findMany({
      where: { isResolved: false },
      select: { severity: true },
    }),
    prisma.alert.count({ where: { isRead: false } }),
  ]);

  const totalValue   = products.reduce((s, p) => s + p.currentStock * Number(p.sellPrice), 0);
  const outOfStock   = products.filter(p => p.currentStock === 0).length;
  const nearMin      = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumStock).length;
  const soon         = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nearExpiry   = products.filter(p => p.expiryDate && p.expiryDate <= soon).length;
  const totalSales   = saleMovements.reduce((sum, movement) => (
    sum + Number(movement.totalPrice ?? Number(movement.product.sellPrice) * movement.quantity)
  ), 0);
  const totalFinanceExpenses = financeExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const netSales = totalSales - totalFinanceExpenses;
  const soldUnits    = saleMovements.reduce((sum, movement) => sum + movement.quantity, 0);

  const movementTrend = Array.from({ length: 14 }, (_, index) => {
    const date = subDays(new Date(), 13 - index);
    return {
      key: format(date, "yyyy-MM-dd"),
      day: format(date, "dd MMM", { locale: fr }),
      entrees: 0,
      sorties: 0,
    };
  });
  const trendByDay = new Map(movementTrend.map(day => [day.key, day]));
  const salesTrend = movementTrend.map(day => ({ key: day.key, day: day.day, amount: 0, quantity: 0 }));
  const salesByDay = new Map(salesTrend.map(day => [day.key, day]));
  const inTypes = ["ENTREE", "RETOUR_CLIENT", "RETOUR_FOURNISSEUR"];
  const outTypes = ["SORTIE", "VENTE", "PERTE"];

  trendMovements.forEach(movement => {
    const day = trendByDay.get(format(movement.movementDate, "yyyy-MM-dd"));
    if (!day) return;
    if (inTypes.includes(movement.type)) day.entrees += movement.quantity;
    if (outTypes.includes(movement.type)) day.sorties += movement.quantity;
  });

  saleMovements.forEach(movement => {
    const day = salesByDay.get(format(movement.movementDate, "yyyy-MM-dd"));
    if (!day) return;
    day.quantity += movement.quantity;
    day.amount += Number(movement.totalPrice ?? Number(movement.product.sellPrice) * movement.quantity);
  });

  const categoryValues = Object.values(
    products.reduce((acc: Record<string, { name: string; value: number }>, product) => {
      const name = product.category.name;
      acc[name] ??= { name, value: 0 };
      acc[name].value += product.currentStock * Number(product.sellPrice);
      return acc;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const alertCounts = activeAlerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const alertSlices = [
    { name: "Critique", value: alertCounts.CRITICAL ?? 0, color: "#dc2626" },
    { name: "Attention", value: alertCounts.WARNING ?? 0, color: "#EAB308" },
    { name: "Info", value: alertCounts.INFO ?? 0, color: "#596744" },
  ];

  const criticalProducts = products
    .filter(product => product.currentStock <= product.minimumStock)
    .sort((a, b) => {
      const aRatio = a.minimumStock > 0 ? a.currentStock / a.minimumStock : 1;
      const bRatio = b.minimumStock > 0 ? b.currentStock / b.minimumStock : 1;
      return aRatio - bRatio;
    })
    .slice(0, 6)
    .map(product => ({ name: product.name, stock: product.currentStock, minimum: product.minimumStock }));

  return (
    <div>
      <div className="page-header">
        <div>
        <h1 className="page-title">
          Bonjour, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="page-subtitle">Voici un aperçu de votre stock aujourd&apos;hui</p>
        </div>
        <div className="hidden rounded-2xl border border-[#C9A227]/30 bg-[#FFF3C4]/55 px-4 py-2 text-sm font-semibold text-[#4F5C3D] sm:block">
          FAVEDA Stock
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          title="Valeur totale"
          subtitle="Valorisation du stock"
          value={fmt(totalValue)}
          icon={DollarSign}
          color="green"
          featured
        />
        <StatCard
          title="CA net 14 jours"
          subtitle="Ventes - dépenses finance"
          value={fmt(netSales)}
          icon={ShoppingCart}
          color={netSales < 0 ? "red" : "blue"}
          featured
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Unités vendues"    subtitle="Sur 14 jours" value={soldUnits}       icon={ShoppingCart} color="default" />
        <StatCard title="Produits"         subtitle="En catalogue" value={products.length} icon={Package}      color="default" />
        <StatCard title="En rupture"       subtitle="Stock à zéro"  value={outOfStock}     icon={AlertTriangle} color="red" />
        <StatCard title="Seuil bas"        subtitle="À surveiller"  value={nearMin}        icon={TrendingDown} color="orange" />
        <StatCard title="Alertes non lues" subtitle="À traiter"     value={unreadAlerts}   icon={Bell}         color={unreadAlerts > 0 ? "red" : "default"} />
      </div>

      {/* Near expiry banner */}
      {nearExpiry > 0 && (
        <div className="mb-6 p-4 bg-[#FFF3C4]/70 border border-[#C9A227]/35 rounded-2xl flex items-center gap-3 shadow-sm">
          <Clock size={20} className="text-[#9F7D16] flex-shrink-0" />
          <p className="text-[#6F560D] text-sm font-medium">
            {nearExpiry} produit(s) arrivent à péremption dans les 30 prochains jours
          </p>
        </div>
      )}

      <DashboardCharts
        movementTrend={movementTrend.map(({ key, ...day }) => day)}
        salesTrend={salesTrend.map(({ key, ...day }) => day)}
        categoryValues={categoryValues}
        alertSlices={alertSlices}
        criticalProducts={criticalProducts}
      />

      {/* Recent movements */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#D9D7D2]/60">
          <h2 className="font-bold text-gray-800">Derniers mouvements</h2>
        </div>
        <div className="divide-y divide-[#D9D7D2]/40">
          {movements.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">Aucun mouvement enregistré</p>
          )}
          {movements.map(m => (
            <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4 transition-colors hover:bg-[#F3F3F3]/70">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{m.product.name}</p>
                <p className="text-xs text-gray-400">par {m.user.prenom} {m.user.nom} · {formatDistanceToNow(m.createdAt, { addSuffix: true, locale: fr })}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <MovementBadge type={m.type} />
                <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                  {["ENTREE", "RETOUR_CLIENT", "RETOUR_FOURNISSEUR"].includes(m.type) ? "+" : "-"}{m.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
