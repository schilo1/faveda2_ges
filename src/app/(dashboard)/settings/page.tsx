import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { AlertEmailSettingsForm } from "@/components/forms/AlertEmailSettingsForm";
import { CategoryCreateForm } from "@/components/settings/CategoryCreateForm";
import { AlertWhatsAppSettingsForm } from "@/components/settings/AlertWhatsAppSettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [categories, units, settings] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.setting.findMany(),
  ]);

  const getSetting = (key: string) => settings.find(s => s.key === key)?.value ?? "";

  return (
    <div className="max-w-3xl">
      <div className="page-header">
        <div>
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Configuration de l&apos;application FAVEDA Stock</p>
        </div>
      </div>

      {/* Company info */}
      <div className="card p-5 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4">Informations de l&apos;entreprise</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-gray-500 mb-0.5">Entreprise</p><p className="font-medium">{getSetting("company_name") || "FAVEDA"}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Devise</p><p className="font-medium">{getSetting("currency") || "FCFA"}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Seuil global par défaut</p><p className="font-medium">{getSetting("default_minimum_stock") || "10"} unités</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Validateur par défaut (sorties)</p><p className="font-medium">{getSetting("default_authorized_by") || "Grâce"}</p></div>
        </div>
        {isAdmin && <button className="btn-primary mt-4 text-sm py-2">Modifier</button>}
      </div>

      <AlertEmailSettingsForm
        enabled={getSetting("alert_email_enabled") === "true"}
        recipients={getSetting("alert_email_recipients")}
        minSeverity={getSetting("alert_email_min_severity") || "WARNING"}
        isAdmin={isAdmin}
      />

      <AlertWhatsAppSettingsForm
        enabled={(getSetting("alert_whatsapp_enabled") || process.env.WHATSAPP_ALERTS_ENABLED) === "true"}
        phone={getSetting("alert_whatsapp_phone") || process.env.WHATSAPP_ADMIN_PHONE || ""}
        minSeverity={getSetting("alert_whatsapp_min_severity") || "WARNING"}
        isAdmin={isAdmin}
      />

      {/* Categories */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Catégories</h2>
        </div>
        {isAdmin && <CategoryCreateForm />}
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#D9D7D2]/40 last:border-0">
              <span className="text-sm text-gray-700">{c.name}</span>
              {isAdmin && <button className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      </div>

      {/* Units */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Unités de mesure</h2>
          {isAdmin && (
            <Link href="/settings/units/new" className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
              <Plus size={14} />Ajouter
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {units.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F3F3F3] border border-[#D9D7D2]/60">
              <span className="text-sm text-gray-700">{u.name}</span>
              <span className="text-xs font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-[#D9D7D2]">{u.symbol}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
