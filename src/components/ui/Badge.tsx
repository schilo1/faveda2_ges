import { MovementType, AlertSeverity } from "@prisma/client";

const movementLabels: Record<MovementType, string> = {
  ENTREE:             "Entrée",
  SORTIE:             "Sortie",
  VENTE:              "Vente",
  PERTE:              "Perte",
  RETOUR_CLIENT:      "Retour client",
  RETOUR_FOURNISSEUR: "Retour fourn.",
  TRANSFERT:          "Transfert",
  AJUSTEMENT:         "Ajustement",
};

const movementClasses: Record<MovementType, string> = {
  ENTREE:             "badge-entry",
  SORTIE:             "badge-exit",
  VENTE:              "badge-sale",
  PERTE:              "badge-loss",
  RETOUR_CLIENT:      "badge-adjust",
  RETOUR_FOURNISSEUR: "badge-adjust",
  TRANSFERT:          "badge-transfer",
  AJUSTEMENT:         "badge-adjust",
};

export function MovementBadge({ type }: { type: MovementType }) {
  return <span className={movementClasses[type]}>{movementLabels[type]}</span>;
}

const severityClasses: Record<AlertSeverity, string> = {
  INFO:     "bg-blue-100 text-blue-800",
  WARNING:  "bg-[#FFF3C4] text-[#6F560D]",
  CRITICAL: "bg-red-100 text-red-800",
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityClasses[severity]}`}>
      {severity === "CRITICAL" ? "Critique" : severity === "WARNING" ? "Attention" : "Info"}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

export function StockBadge({ current, minimum }: { current: number; minimum: number }) {
  if (current === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rupture</span>;
  if (current <= minimum) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFF3C4] text-[#6F560D]">Seuil bas</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Normal</span>;
}
