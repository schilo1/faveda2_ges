import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "green" | "red" | "orange" | "blue" | "default";
  featured?: boolean;
  className?: string;
}

const colorMap = {
  green:   { bg: "bg-green-50",  icon: "text-green-600",  border: "border-green-100" },
  red:     { bg: "bg-red-50",    icon: "text-red-600",    border: "border-red-100"   },
  orange:  { bg: "bg-[#FFF3C4]", icon: "text-[#9F7D16]", border: "border-[#C9A227]/35"},
  blue:    { bg: "bg-blue-50",   icon: "text-blue-600",   border: "border-blue-100"  },
  default: { bg: "bg-[#F3F3F3]", icon: "text-[#596744]",  border: "border-[#D9D7D2]" },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = "default", featured = false, className = "" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`card group flex min-h-[132px] flex-col justify-between gap-5 overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#4F5C3D]/10 ${featured ? "sm:p-6" : ""} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          {subtitle && <p className="mt-1 text-xs font-medium text-gray-400">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${c.bg} ${c.border} transition-transform duration-300 group-hover:scale-105`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
      <div>
        <p className={`break-words font-black leading-none tracking-tight text-gray-800 [overflow-wrap:anywhere] ${featured ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
