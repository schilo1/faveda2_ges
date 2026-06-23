"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
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
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PreorderActions } from "@/components/preorders/PreorderActions";

type OrderItem = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  total: number;
};

export type PreorderRow = {
  id: string;
  referenceNumber: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  paidAmount: number;
  cancelReason: string | null;
  preorderDate: string;
  userName: string;
  items: OrderItem[];
};

type ChartItem = {
  name: string;
  count?: number;
  amount?: number;
  qty?: number;
  color?: string;
};

const pageSize = 5;
const money = new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    EN_ATTENTE: "En attente",
    PAYEE: "Payée",
    LIVREE: "Livrée",
    ANNULEE: "Annulée",
    REMBOURSEE: "Remboursée",
  };
  return labels[status] ?? status;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#D9D7D2] bg-[#F3F3F3]/70 text-sm text-gray-400">
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

export function PreorderOverview({ orders, isCommercial }: { orders: PreorderRow[]; isCommercial: boolean }) {
  const [query, setQuery] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [deliveredPage, setDeliveredPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(order => {
      const haystack = [
        order.referenceNumber,
        order.customerName ?? "",
        order.customerPhone ?? "",
        order.userName,
        statusLabel(order.status),
        ...order.items.flatMap(item => [item.name, item.sku]),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, query]);

  const pendingOrders = filteredOrders.filter(order => ["EN_ATTENTE", "PAYEE"].includes(order.status));
  const deliveredOrders = filteredOrders.filter(order => order.status === "LIVREE");
  const closedOrders = filteredOrders.filter(order => ["ANNULEE", "REMBOURSEE"].includes(order.status));

  const validOrders = orders.filter(order => !["ANNULEE", "REMBOURSEE"].includes(order.status));
  const statusData: ChartItem[] = [
    {
      name: "Pas encore livrées",
      count: validOrders.filter(order => order.status !== "LIVREE").length,
      amount: validOrders.filter(order => order.status !== "LIVREE").reduce((sum, order) => sum + order.totalAmount, 0),
      color: "#C9A227",
    },
    {
      name: "Livrées",
      count: validOrders.filter(order => order.status === "LIVREE").length,
      amount: validOrders.filter(order => order.status === "LIVREE").reduce((sum, order) => sum + order.totalAmount, 0),
      color: "#596744",
    },
    {
      name: "Annulées",
      count: orders.filter(order => ["ANNULEE", "REMBOURSEE"].includes(order.status)).length,
      amount: orders.filter(order => ["ANNULEE", "REMBOURSEE"].includes(order.status)).reduce((sum, order) => sum + order.totalAmount, 0),
      color: "#DC2626",
    },
  ];

  const productData = Object.values(
    validOrders.flatMap(order => order.items).reduce((acc: Record<string, ChartItem>, item) => {
      acc[item.productId] ??= { name: item.name, qty: 0, amount: 0 };
      acc[item.productId].qty = (acc[item.productId].qty ?? 0) + item.quantity;
      acc[item.productId].amount = (acc[item.productId].amount ?? 0) + item.total;
      return acc;
    }, {})
  ).sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0)).slice(0, 8);

  const commercialOrderData = Object.values(
    validOrders.reduce((acc: Record<string, ChartItem>, order) => {
      acc[order.userName] ??= { name: order.userName, count: 0 };
      acc[order.userName].count = (acc[order.userName].count ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 8);

  return (
    <div className="space-y-5">
      <section className={`${isCommercial ? "hidden md:grid" : "grid"} grid-cols-1 gap-5 xl:grid-cols-3`}>
        <div className="card p-5">
          <SectionHeader title="Répartition des commandes" subtitle="Livrées, pas encore livrées et clôturées" />
          {orders.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={4}>
                    {statusData.map(item => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2">
                {statusData.map(item => (
                  <div key={item.name} className="rounded-2xl bg-[#F3F3F3]/80 px-2 py-2 text-center">
                    <div className="mx-auto mb-1 h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                    <p className="text-xs font-bold text-gray-800">{item.count}</p>
                    <p className="text-[11px] text-gray-500">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart label="Aucune commande à afficher" />
          )}
        </div>

        <div className="card p-5 xl:col-span-2">
          <SectionHeader title="Produits les plus commandés" subtitle="Quantités commandées et montant associé" />
          {productData.length > 0 ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} margin={{ left: -8, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} interval={0} angle={-10} height={62} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value, name) => name === "amount" ? money.format(Number(value)) : value} contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2" }} />
                  <Bar yAxisId="left" dataKey="qty" name="Quantité" fill="#596744" radius={[10, 10, 2, 2]} />
                  <Bar yAxisId="right" dataKey="amount" name="Montant" fill="#C9A227" radius={[10, 10, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="Aucun produit commandé" />
          )}
        </div>

        {!isCommercial && (
          <div className="card p-5 xl:col-span-3">
            <SectionHeader title="Nombre de commandes par agent" subtitle="Volume de commandes enregistrées par chaque commercial." />
            {commercialOrderData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commercialOrderData} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#D9D7D2" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #D9D7D2" }} />
                    <Bar dataKey="count" name="Commandes" fill="#C9A227" radius={[10, 10, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune commande par agent commercial" />
            )}
          </div>
        )}
      </section>

      <section className="card p-4">
        <label className="label">Rechercher une commande</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPendingPage(1);
              setDeliveredPage(1);
              setClosedPage(1);
            }}
            className="input pl-9"
            placeholder="Référence, client, téléphone, produit, commercial..."
          />
        </div>
      </section>

      <OrderTable
        title="Commandes pas encore livrées"
        subtitle="Commandes en attente ou payées, à suivre jusqu'à la livraison."
        orders={pendingOrders}
        page={pendingPage}
        onPageChange={setPendingPage}
      />

      <OrderTable
        title="Commandes livrées"
        subtitle="Commandes remises au client."
        orders={deliveredOrders}
        page={deliveredPage}
        onPageChange={setDeliveredPage}
      />

      {closedOrders.length > 0 && (
        <OrderTable
          title="Commandes annulées ou remboursées"
          subtitle="Historique des commandes clôturées sans livraison."
          orders={closedOrders}
          page={closedPage}
          onPageChange={setClosedPage}
        />
      )}
    </div>
  );
}

function OrderTable({
  title,
  subtitle,
  orders,
  page,
  onPageChange,
}: {
  title: string;
  subtitle: string;
  orders: PreorderRow[];
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleOrders = orders.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D7D2]/60 px-5 py-4">
        <div>
          <h2 className="font-bold text-gray-800">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-[#596744]/10 px-3 py-1 text-xs font-bold text-[#596744]">
          {orders.length} commande(s)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Date", "Référence", "Client", "Produits", "Total", "Statut", "Commercial", "Actions"].map(header => (
                <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D7D2]/40">
            {visibleOrders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune commande</td></tr>
            ) : visibleOrders.map(order => (
              <tr key={order.id}>
                <td className="px-4 py-3 text-xs text-gray-500">{dateFormat.format(new Date(order.preorderDate))}</td>
                <td className="px-4 py-3">
                  <Link href={`/preorders/${order.id}`} className="font-mono text-xs font-semibold text-[#596744] hover:underline">
                    {order.referenceNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{order.customerName || "Client comptoir"}</p>
                  <p className="text-xs text-gray-400">{order.customerPhone || "-"}</p>
                </td>
                <td className="max-w-[300px] px-4 py-3 text-gray-600">
                  <span className="line-clamp-2">{order.items.map(item => `${item.quantity} x ${item.name}`).join(", ")}</span>
                </td>
                <td className="px-4 py-3 font-bold text-[#596744]">{money.format(order.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#F3F3F3] px-2 py-1 text-xs font-semibold text-gray-700">{statusLabel(order.status)}</span>
                  {order.cancelReason && <p className="mt-1 max-w-[220px] text-xs text-red-500">{order.cancelReason}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{order.userName}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/preorders/${order.id}`} className="text-xs font-semibold text-gray-600 hover:text-[#596744] hover:underline">
                      Détails
                    </Link>
                    <PreorderActions id={order.id} status={order.status} totalAmount={order.totalAmount} paidAmount={order.paidAmount} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9D7D2]/60 px-5 py-4">
        <p className="text-xs font-medium text-gray-500">
          Page {safePage} sur {pageCount} · {pageSize} lignes maximum
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="rounded-xl border border-[#D9D7D2] p-2 text-gray-500 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
            disabled={safePage >= pageCount}
            className="rounded-xl border border-[#D9D7D2] p-2 text-gray-500 transition hover:bg-[#F3F3F3] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
