import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExceptionCategory {
  type: string;
  count: number;
  description: string;
  severity: "High" | "Medium" | "Low";
  status: "Unresolved" | "In Review" | "Resolved";
}

const exceptionsList: ExceptionCategory[] = [
  {
    type: "Amount mismatch",
    count: 31,
    description: "Difference between order price and gateway net payout.",
    severity: "High",
    status: "Unresolved",
  },
  {
    type: "Missing settlement",
    count: 27,
    description: "Order marked paid internally but missing from settlement feed.",
    severity: "High",
    status: "Unresolved",
  },
  {
    type: "Orphan settlement",
    count: 22,
    description: "Payout record exists with no internal order ledger reference.",
    severity: "Medium",
    status: "In Review",
  },
  {
    type: "Duplicate transaction",
    count: 12,
    description: "Single order paid out across multiple settlement batches.",
    severity: "High",
    status: "Unresolved",
  },
  {
    type: "Low confidence AI match",
    count: 22,
    description: "Match score below 80% threshold awaiting manual audit.",
    severity: "Low",
    status: "In Review",
  },
];

export const ExceptionsPanel: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden flex flex-col justify-between h-full shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Exceptions Queue
            </h3>
          </div>
          <span className="text-[10px] font-mono font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
            114 Flagged
          </span>
        </div>

        {/* List of Exceptions */}
        <div className="p-3 divide-y divide-slate-100">
          {exceptionsList.map((exc, idx) => {
            const severityTag = {
              High: "bg-rose-50 text-rose-700 border-rose-200",
              Medium: "bg-amber-50 text-amber-700 border-amber-200",
              Low: "bg-slate-100 text-slate-600 border-slate-200",
            }[exc.severity];

            return (
              <div
                key={idx}
                className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3 group"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-slate-900 group-hover:text-slate-700 transition-colors">
                      {exc.type}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-mono font-medium px-1.5 py-0.2 rounded border",
                        severityTag
                      )}
                    >
                      {exc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {exc.description}
                  </p>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {exc.count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    cases
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Target for AI Investigation</span>
        <span className="text-slate-700 font-medium">Phase 5 Queue</span>
      </div>
    </div>
  );
};
