import React from "react";
import { FileText, Percent, IndianRupee, AlertCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  title: string;
  value: string;
  subtext: string;
  iconName: "records" | "rate" | "amount" | "exceptions";
  statusTag?: string;
  variant?: "default" | "success" | "warning" | "error";
}

const iconMap: Record<KPICardProps["iconName"], LucideIcon> = {
  records: FileText,
  rate: Percent,
  amount: IndianRupee,
  exceptions: AlertCircle,
};

const tagColorMap = {
  default: "bg-slate-100/80 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-rose-50 text-rose-800 border-rose-200",
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  iconName,
  statusTag = "Active",
  variant = "default",
}) => {
  const Icon = iconMap[iconName];

  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between transition-colors hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <span
            className={cn(
              "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border leading-none",
              tagColorMap[variant]
            )}
          >
            {statusTag}
          </span>
        </div>

        <div className="mt-2.5 flex items-baseline justify-between">
          <div className="text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>
          <div className="p-1 rounded bg-slate-50 border border-slate-150 text-slate-500">
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate font-sans">
        {subtext}
      </div>
    </div>
  );
};
