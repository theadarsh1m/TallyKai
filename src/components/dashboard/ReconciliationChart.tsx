import React from "react";
import { CheckCircle2, Clock, ShieldAlert, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChartCategory {
  label: string;
  count: number;
  amount: string;
  percentage: number;
  barColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: React.ElementType;
}

export const ReconciliationChart: React.FC = () => {
  const categories: ChartCategory[] = [
    {
      label: "Exact Matched",
      count: 180,
      amount: "₹4,49,820",
      percentage: 36.0,
      barColor: "bg-emerald-600",
      badgeBg: "bg-emerald-50",
      badgeBorder: "border-emerald-200",
      badgeText: "text-emerald-800",
      icon: CheckCircle2,
    },
    {
      label: "Fee / Tax Adjusted",
      count: 149,
      amount: "₹3,72,250",
      percentage: 29.8,
      barColor: "bg-blue-600",
      badgeBg: "bg-blue-50",
      badgeBorder: "border-blue-200",
      badgeText: "text-blue-800",
      icon: Sliders,
    },
    {
      label: "Date Drift (T+1 to T+3)",
      count: 32,
      amount: "₹79,968",
      percentage: 6.4,
      barColor: "bg-amber-500",
      badgeBg: "bg-amber-50",
      badgeBorder: "border-amber-200",
      badgeText: "text-amber-800",
      icon: Clock,
    },
    {
      label: "Exceptions & Discrepancies",
      count: 142,
      amount: "₹3,54,862",
      percentage: 27.8,
      barColor: "bg-rose-500",
      badgeBg: "bg-rose-50",
      badgeBorder: "border-rose-200",
      badgeText: "text-rose-800",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Reconciliation Telemetry & Status Breakdown
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribution across 500 processed internal orders & gateway settlements.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono self-start sm:self-auto">
          <span className="text-slate-500">Overall Match Rate:</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            72.2%
          </span>
        </div>
      </div>

      {/* Clean Stacked Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden flex mb-4">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className={cn("h-full transition-all duration-300", cat.barColor)}
            style={{ width: `${cat.percentage}%` }}
            title={`${cat.label}: ${cat.percentage}% (${cat.count} records)`}
          />
        ))}
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div
              key={idx}
              className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {cat.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border shrink-0",
                    cat.badgeBg,
                    cat.badgeBorder,
                    cat.badgeText
                  )}
                >
                  {cat.percentage}%
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between pt-1 border-t border-slate-200/60 font-mono">
                <span className="font-bold text-xs text-slate-900 tabular-nums">
                  {cat.count} <span className="text-[10px] font-normal text-slate-500 font-sans">records</span>
                </span>
                <span className="text-xs text-slate-600 tabular-nums">
                  {cat.amount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
