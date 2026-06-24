import prisma from "@/lib/prisma";
import { SeverityBadge } from "@/components/ui/Badge";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AlertType } from "@prisma/client";
import { SendAlertsEmailButton } from "@/components/actions/SendAlertsEmailButton";
import { DeleteAlertButton } from "@/components/actions/DeleteAlertButton";

const typeLabels: Record<AlertType, string> = {
  RUPTURE_STOCK: "Rupture de stock",
  SEUIL_MINIMUM: "Seuil minimum",
  PROCHE_PEREMPTION: "Péremption proche",
  SURSTOCK: "Surstock",
  FAIBLE_ROTATION: "Faible rotation",
};

function severityAccent(severity: string) {
  if (severity === "CRITICAL") return { border: "border-l-red-500", dot: "bg-red-500" };
  if (severity === "WARNING") return { border: "border-l-[#C9A227]", dot: "bg-[#C9A227]" };
  return { border: "border-l-[#596744]", dot: "bg-[#596744]" };
}

export default async function AlertsPage() {
  const alerts = await prisma.alert.findMany({
    include: { product: { select: { id: true, name: true, currentStock: true, minimumStock: true } } },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });

  const unread = alerts.filter(a => !a.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertes</h1>
          <p className="page-subtitle">
            {unread > 0 ? <span className="text-[#9F7D16] font-medium">{unread} non lue(s)</span> : "Toutes les alertes sont lues"}
          </p>
        </div>
        <SendAlertsEmailButton disabled={alerts.length === 0} />
      </div>

      {alerts.length === 0 && (
        <div className="card p-12 text-center">
          <Bell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune alerte active</p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map(a => {
          const accent = severityAccent(a.severity);
          return (
          <div key={a.id} className={`card border-l-4 ${accent.border} p-4 flex items-start gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#4F5C3D]/10`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <SeverityBadge severity={a.severity} />
                <span className="text-xs text-gray-500">{typeLabels[a.type]}</span>
                {!a.isRead && <span className={`w-2 h-2 rounded-full ${accent.dot} flex-shrink-0`} />}
              </div>
              <p className="text-sm font-medium text-gray-800">{a.product.name}</p>
              <p className="text-sm text-gray-600 mt-0.5">{a.message}</p>
              <p className="text-xs text-gray-400 mt-1">{format(a.createdAt, "dd MMM yyyy à HH:mm", { locale: fr })}</p>
            </div>
            <div className="flex flex-shrink-0 items-start gap-3">
              <div className="text-right">
                <p className="text-lg font-bold text-gray-700">{a.product.currentStock}</p>
                <p className="text-xs text-gray-400">en stock</p>
              </div>
              <DeleteAlertButton id={a.id} />
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
