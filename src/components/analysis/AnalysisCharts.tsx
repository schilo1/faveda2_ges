"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ProductMetric = {
  id: string;
  name: string;
  sku: string;
  soldQty: number;
  preorderQty: number;
  revenue: number;
  cost: number;
  profit: number;
  marginRate: number;
};

type CommercialMetric = {
  name: string;
  preorderCount: number;
  productQty: number;
  amount: number;
  canceledCount: number;
};

type MonthlyMetric = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
};

type Props = {
  products: ProductMetric[];
  commercials: CommercialMetric[];
  monthly: MonthlyMetric[];
};

const money = new Intl.NumberFormat("fr-CI", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const colors = ["#596744", "#8A9B6E", "#C9A227", "#2563EB", "#DC2626", "#7C3AED"];

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/70 text-sm text-gray-400">
      {label}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

export function AnalysisCharts({ products, commercials, monthly }: Props) {
  const [tab, setTab] = useState<"products" | "commercials" | "profit">("products");
  const topProducts = products.slice(0, 10);
  const topCommercials = commercials.slice(0, 10);
  const hasProducts = topProducts.some(product => product.revenue > 0 || product.preorderQty > 0 || product.soldQty > 0);
  const hasCommercials = topCommercials.some(commercial => commercial.preorderCount > 0);
  const hasMonthly = monthly.some(item => item.revenue > 0 || item.cost > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "products", label: "Produits" },
          { id: "commercials", label: "Commerciaux" },
          { id: "profit", label: "Bénéfice" },
        ].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as any)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === item.id
                ? "bg-[#596744] text-white shadow-lg shadow-[#596744]/20"
                : "border border-[#D9D7D2] bg-white text-gray-600 hover:bg-[#F3F3F3]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="card p-5 xl:col-span-2">
            <SectionHeader
              title="Ce que rapporte chaque produit"
              subtitle="Chiffre d'affaires encaissé, comparé au bénéfice brut estimé"
            />
            {hasProducts ? (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} interval={0} angle={-12} height={68} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={value => money.format(Number(value))} contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2" }} />
                    <Legend />
                    <Bar dataKey="revenue" name="CA encaissé" fill="#596744" radius={[10, 10, 2, 2]} />
                    <Bar dataKey="profit" name="Bénéfice brut" fill="#C9A227" radius={[10, 10, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune vente ou précommande à analyser" />
            )}
          </div>

          <div className="card p-5">
            <SectionHeader title="Quantités vendues vs précommandées" subtitle="Comparaison par produit" />
            {hasProducts ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} interval={0} angle={-12} height={62} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2" }} />
                    <Legend />
                    <Bar dataKey="soldQty" name="Vendu" fill="#596744" radius={[10, 10, 2, 2]} />
                    <Bar dataKey="preorderQty" name="Précommandé" fill="#8A9B6E" radius={[10, 10, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune quantité à afficher" />
            )}
          </div>

          <div className="card p-5">
            <SectionHeader title="Marge brute par produit" subtitle="Bénéfice brut / chiffre d'affaires" />
            {hasProducts ? (
              <div className="space-y-3">
                {topProducts.map(product => (
                  <div key={product.id}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-gray-800">{product.name}</p>
                      <p className="text-xs font-bold text-gray-500">{product.marginRate}%</p>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#F3F3F3] ring-1 ring-[#D9D7D2]/70">
                      <div className="h-full rounded-full bg-[#596744]" style={{ width: `${Math.max(0, Math.min(100, product.marginRate))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChart label="Aucune marge à afficher" />
            )}
          </div>
        </div>
      )}

      {tab === "commercials" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="card p-5">
            <SectionHeader title="Précommandes envoyées par commercial" subtitle="Nombre de précommandes et montant encaissé" />
            {hasCommercials ? (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCommercials} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={(value, name) => name === "amount" ? money.format(Number(value)) : value} contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2" }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="preorderCount" name="Précommandes" fill="#596744" radius={[10, 10, 2, 2]} />
                    <Bar yAxisId="right" dataKey="amount" name="Montant encaissé" fill="#C9A227" radius={[10, 10, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune précommande par commercial" />
            )}
          </div>

          <div className="card p-5">
            <SectionHeader title="Répartition des quantités" subtitle="Produits précommandés par commercial" />
            {hasCommercials ? (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topCommercials} dataKey="productQty" nameKey="name" innerRadius={68} outerRadius={108} paddingAngle={4}>
                      {topCommercials.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune quantité précommandée" />
            )}
          </div>
        </div>
      )}

      {tab === "profit" && (
        <div className="grid grid-cols-1 gap-5">
          <div className="card p-5">
            <SectionHeader title="Évolution chiffre d'affaires, coût et bénéfice" subtitle="Ventes + montants encaissés sur précommandes groupés par mois" />
            {hasMonthly ? (
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={value => money.format(Number(value))} contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2" }} />
                    <Legend />
                    <Bar dataKey="revenue" name="CA encaissé" fill="#596744" radius={[10, 10, 2, 2]} />
                    <Bar dataKey="cost" name="Coût estimé" fill="#8A9B6E" radius={[10, 10, 2, 2]} />
                    <Bar dataKey="profit" name="Bénéfice brut" fill="#C9A227" radius={[10, 10, 2, 2]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune donnée mensuelle disponible" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
