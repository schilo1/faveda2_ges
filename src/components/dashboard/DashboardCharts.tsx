"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MovementTrend = {
  day: string;
  entrees: number;
  sorties: number;
};

type SalesTrend = {
  day: string;
  amount: number;
  quantity: number;
};

type CategoryValue = {
  name: string;
  value: number;
};

type AlertSlice = {
  name: string;
  value: number;
  color: string;
};

type CriticalProduct = {
  name: string;
  stock: number;
  minimum: number;
};

interface Props {
  movementTrend: MovementTrend[];
  salesTrend: SalesTrend[];
  categoryValues: CategoryValue[];
  alertSlices: AlertSlice[];
  criticalProducts: CriticalProduct[];
}

const currency = new Intl.NumberFormat("fr-CI", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/60 text-sm text-gray-400">
      {label}
    </div>
  );
}

export function DashboardCharts({ movementTrend, salesTrend, categoryValues, alertSlices, criticalProducts }: Props) {
  const hasMovements = movementTrend.some(day => day.entrees > 0 || day.sorties > 0);
  const hasSales = salesTrend.some(day => day.amount > 0);
  const hasCategories = categoryValues.some(item => item.value > 0);
  const hasAlerts = alertSlices.some(item => item.value > 0);

  return (
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="card p-5 xl:col-span-3">
        <CardHeader
          title="Chiffre d'affaires des ventes"
          subtitle="Montant total vendu sur les 14 derniers jours"
        />
        {hasSales ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrend} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip
                  formatter={(value, name) => name === "amount" ? currency.format(Number(value)) : value}
                  contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2", boxShadow: "0 12px 30px rgba(79,92,61,.12)" }}
                  labelStyle={{ color: "#4F5C3D", fontWeight: 700 }}
                />
                <Bar dataKey="amount" name="Montant vendu" radius={[12, 12, 4, 4]} fill="#596744" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="Aucune vente récente à afficher" />
        )}
      </div>

      <div className="card p-5 xl:col-span-2">
        <CardHeader
          title="Flux de stock"
          subtitle="Entrées et sorties sur les 14 derniers jours"
        />
        {hasMovements ? (
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={movementTrend} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="entrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#596744" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#596744" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="sorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A227" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#C9A227" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2", boxShadow: "0 12px 30px rgba(79,92,61,.12)" }}
                  labelStyle={{ color: "#4F5C3D", fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#596744" strokeWidth={3} fill="url(#entrees)" />
                <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#C9A227" strokeWidth={3} fill="url(#sorties)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="Aucun mouvement récent à afficher" />
        )}
      </div>

      <div className="card p-5">
        <CardHeader
          title="Alertes actives"
          subtitle="Répartition par niveau de sévérité"
        />
        {hasAlerts ? (
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertSlices}
                  cx="50%"
                  cy="46%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {alertSlices.map(item => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2", boxShadow: "0 12px 30px rgba(79,92,61,.12)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2">
              {alertSlices.map(item => (
                <div key={item.name} className="rounded-2xl bg-[#F3F3F3]/80 px-3 py-2 text-center">
                  <div className="mx-auto mb-1 h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                  <p className="text-xs font-semibold text-gray-700">{item.value}</p>
                  <p className="text-[11px] text-gray-400">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChart label="Aucune alerte active" />
        )}
      </div>

      <div className="card p-5 xl:col-span-2">
        <CardHeader
          title="Valeur du stock par catégorie"
          subtitle="Poids financier des familles de produits"
        />
        {hasCategories ? (
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryValues} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip
                  formatter={value => currency.format(Number(value))}
                  contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2", boxShadow: "0 12px 30px rgba(79,92,61,.12)" }}
                  labelStyle={{ color: "#4F5C3D", fontWeight: 700 }}
                />
                <Bar dataKey="value" name="Valeur" radius={[12, 12, 4, 4]} fill="#596744" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="Aucune valeur de stock à afficher" />
        )}
      </div>

      <div className="card p-5">
        <CardHeader
          title="Produits à surveiller"
          subtitle="Stock actuel comparé au seuil minimum"
        />
        {criticalProducts.length > 0 ? (
          <div className="space-y-4">
            {criticalProducts.map(product => {
              const ratio = product.minimum > 0 ? Math.min(100, Math.round((product.stock / product.minimum) * 100)) : 100;
              const color = product.stock === 0 ? "bg-red-500" : "bg-[#C9A227]";
              return (
                <div key={product.name}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-gray-800">{product.name}</p>
                    <p className="text-xs font-bold text-gray-500">{product.stock}/{product.minimum}</p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#F3F3F3] ring-1 ring-[#D9D7D2]/70">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyChart label="Tous les produits sont au-dessus du seuil" />
        )}
      </div>
    </div>
  );
}
