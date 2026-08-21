import React from "react";
import { FileText, Percent, IndianRupee, AlertTriangle, LucideIcon } from "lucide-react";

export interface KPICardProps {
  title: string;
  value: string;
  subtext: string;
  iconName: "records" | "rate" | "amount" | "exceptions";
  statusTag?: string;
  variant?: "default" | "alert" | "success" | "warning";
}

const iconMap: Record<KPICardProps["iconName"], LucideIcon> = {
  records: FileText,
  rate: Percent,
  amount: IndianRupee,
  exceptions: AlertTriangle,
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  iconName,
  statusTag = "Placeholder",
  variant = "default",
}) => {
  const Icon = iconMap[iconName];

  const borderVariant = {
    default: "border-slate-800 hover:border-slate-700",
    alert: "border-amber-900/60 hover:border-amber-700/60",
    success: "border-emerald-900/60 hover:border-emerald-700/60",
    warning: "border-rose-900/60 hover:border-rose-700/60",
  }[variant];

  const iconBgVariant = {
    default: "bg-slate-800 text-slate-300",
    alert: "bg-amber-950/80 text-amber-400 border border-amber-800/40",
    success: "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40",
    warning: "bg-rose-950/80 text-rose-400 border border-rose-800/40",
  }[variant];

  return (
    <div
      className={`relative p-5 rounded-xl bg-slate-900/80 border ${borderVariant} transition-all duration-150 shadow-sm flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-800 text-slate-400 rounded border border-slate-700/50">
            {statusTag}
          </span>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBgVariant}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-1 mt-2">
        <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
          {value}
        </div>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {subtext}
        </p>
      </div>

      {/* Subtle indicator strip */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Engine Phase: 0</span>
        <span className="font-mono text-slate-400 font-medium">Awaiting Batch</span>
      </div>
    </div>
  );
};
