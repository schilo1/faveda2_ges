"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, ArrowLeftRight, Bell, Truck,
  ClipboardList, Lightbulb, FileBarChart, Users, Settings,
  LogOut, ChevronRight, Leaf, Wallet, ShoppingBag, BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",           label: "Tableau de bord",  icon: LayoutDashboard },
  { href: "/products",            label: "Produits",          icon: Package },
  { href: "/stock/movements",     label: "Mouvements",        icon: ArrowLeftRight },
  { href: "/preorders",           label: "Précommandes",      icon: ShoppingBag },
  { href: "/alerts",              label: "Alertes",           icon: Bell },
  { href: "/suppliers",           label: "Fournisseurs",      icon: Truck },
  { href: "/inventory",           label: "Inventaire",        icon: ClipboardList },
  { href: "/recommendations",     label: "Recommandations",   icon: Lightbulb },
  { href: "/analysis",            label: "Analyse",           icon: BarChart3 },
  { href: "/finance",             label: "Finances",          icon: Wallet },
  { href: "/reports",             label: "Rapports",          icon: FileBarChart },
  { href: "/users",               label: "Utilisateurs",      icon: Users },
  { href: "/settings",            label: "Paramètres",        icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const visibleNavItems = role === "COMMERCIAL"
    ? navItems.filter(item => item.href === "/preorders")
    : navItems;

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 lg:hidden"
        style={{ background: "linear-gradient(135deg, #4F5C3D 0%, #344225 100%)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#C9A227] shadow-lg shadow-black/10 ring-1 ring-white/20">
              <Leaf size={21} className="text-[#344225]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-tight tracking-tight text-white">FAVEDA</p>
              <p className="truncate text-xs text-white/55">Gestion Stock</p>
            </div>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-shrink-0 items-center justify-center rounded-xl bg-white/10 p-2.5 text-white/75 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "bg-white text-[#4F5C3D] shadow-lg shadow-black/10 ring-1 ring-[#C9A227]/35"
                    : "bg-white/10 text-white/75 hover:bg-white/15 hover:text-white"
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] flex-col overflow-hidden border-r border-white/10 lg:flex"
        style={{ background: "linear-gradient(180deg, #4F5C3D 0%, #344225 100%)" }}>
        <div className="absolute -left-20 top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-[-5rem] h-64 w-64 rounded-full bg-[#C9A227]/25 blur-3xl" />

        <div className="relative flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-[#C9A227] ring-1 ring-white/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/10">
            <Leaf size={21} className="text-[#344225]" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight tracking-tight">FAVEDA</p>
            <p className="text-white/55 text-xs">Gestion Stock</p>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto py-4 px-3">
          {visibleNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm transition-all group ${
                  active
                    ? "bg-white text-[#4F5C3D] font-semibold shadow-lg shadow-black/10 ring-1 ring-[#C9A227]/35"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={17} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={13} className="text-[#C9A227]" />}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-4 border-t border-white/10">
          <div className="mb-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{session?.user?.name}</p>
              <p className="text-white/50 text-xs truncate">{session?.user?.email}</p>
            </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/15 hover:text-white text-xs py-2.5 transition-colors"
          >
            <LogOut size={14} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
