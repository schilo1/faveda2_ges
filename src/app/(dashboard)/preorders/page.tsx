import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { PreorderCreateModal } from "@/components/preorders/PreorderCreateModal";
import { PreorderOverview } from "@/components/preorders/PreorderOverview";
import { CheckCircle2, Clock3, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";

const money = new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });

export default async function PreordersPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isCommercial = role === "COMMERCIAL";
  const canCreate = ["ADMIN", "GESTIONNAIRE", "COMMERCIAL"].includes(role);

  const [products, preorders] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, sku: true, currentStock: true, sellPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.preorder.findMany({
      where: {
        deletedAt: null,
        ...(isCommercial ? { userId } : {}),
      },
      include: {
        user: { select: { prenom: true, nom: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { preorderDate: "desc" },
    }),
  ]);

  const validOrders = preorders.filter(preorder => !["ANNULEE", "REMBOURSEE"].includes(preorder.status));
  const deliveredOrders = validOrders.filter(preorder => preorder.status === "LIVREE");
  const pendingDeliveryOrders = validOrders.filter(preorder => preorder.status !== "LIVREE");
  const totalAmount = validOrders.reduce((sum, preorder) => sum + Number(preorder.totalAmount), 0);
  const deliveredQty = deliveredOrders.reduce((sum, preorder) => sum + preorder.items.reduce((s, item) => s + item.quantity, 0), 0);
  const orderRows = preorders.map(preorder => ({
    id: preorder.id,
    referenceNumber: preorder.referenceNumber,
    status: preorder.status,
    customerName: preorder.customerName,
    customerPhone: preorder.customerPhone,
    totalAmount: Number(preorder.totalAmount),
    paidAmount: Number(preorder.paidAmount),
    cancelReason: preorder.cancelReason,
    preorderDate: preorder.preorderDate.toISOString(),
    userName: `${preorder.user.prenom} ${preorder.user.nom}`,
    items: preorder.items.map(item => ({
      productId: item.productId,
      name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      total: Number(item.total),
    })),
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Commandes</h1>
          <p className="page-subtitle">
            {isCommercial ? "Déclarez vos commandes et suivez uniquement votre activité." : "Suivi des commandes avant ou après livraison."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreate && <PreorderCreateModal products={products.map(product => ({ ...product, sellPrice: Number(product.sellPrice) }))} />}
          {role === "ADMIN" && (
            <Link href="/preorders/payments" className="btn-secondary text-sm">
              Historique paiements
            </Link>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Commandes livrées" value={deliveredOrders.length.toString()} icon={CheckCircle2} />
        <Stat title="Commandes pas encore livrées" value={pendingDeliveryOrders.length.toString()} icon={Clock3} />
        <Stat title="Produits livrés" value={deliveredQty.toString()} icon={Package} />
        <Stat title="Montant total" value={money.format(totalAmount)} icon={ShoppingBag} />
      </div>

      <PreorderOverview orders={orderRows} isCommercial={isCommercial} />
    </div>
  );
}

function Stat({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#596744]/10 text-[#596744]">
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
