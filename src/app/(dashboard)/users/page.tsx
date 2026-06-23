import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Shield, Eye, Settings, BadgeDollarSign } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import type { Role } from "@prisma/client";

const roleConfig: Record<Role, { label: string; icon: typeof Shield; color: string }> = {
  ADMIN:        { label: "Administrateur",       icon: Shield,   color: "text-red-600"    },
  GESTIONNAIRE: { label: "Gestionnaire de stock", icon: Settings, color: "text-blue-600"   },
  SURVEILLANT:  { label: "Surveillant",           icon: Eye,      color: "text-green-600"  },
  COMMERCIAL:   { label: "Commercial",            icon: BadgeDollarSign, color: "text-[#596744]" },
};

export default async function UsersPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true, prenom: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">{users.length} utilisateur(s) avec accès à l'application</p>
        </div>
        <Link href="/users/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouvel utilisateur
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D9D7D2]/60 bg-[#F3F3F3]">
              {["Utilisateur","Email","Rôle","Statut",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D7D2]/40">
            {users.map(u => {
              const cfg = roleConfig[u.role];
              const Icon = cfg.icon;
              return (
                <tr key={u.id} className="hover:bg-[#F3F3F3]/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#596744]/10 flex items-center justify-center text-[#596744] font-bold text-sm flex-shrink-0">
                        {u.prenom[0]?.toUpperCase() ?? u.nom[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.prenom} {u.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} className={cfg.color} />
                      <span className="text-gray-700 text-xs">{cfg.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge active={u.isActive} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}/edit`} className="text-[#596744] hover:underline text-xs font-medium">Modifier</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
