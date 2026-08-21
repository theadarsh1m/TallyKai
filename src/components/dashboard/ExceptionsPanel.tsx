import React from "react";
import { AlertOctagon, ArrowUpRight, Filter, ShieldAlert } from "lucide-react";

export interface ExceptionCategory {
  type: string;
  cases: number;
  status: "Unresolved" | "Under Review" | "Resolved";
  description: string;
  severity: "High" | "Medium" | "Low";
}

const dummyExceptions: ExceptionCategory[] = [
  {
    type: "Settlement Amount Mismatch",
    cases: 0,
    status: "Unresolved",
    description: "Difference between order final price and bank payout total.",
    severity: "High",
  },
  {
    type: "Fee Structure Discrepancy",
    cases: 0,
    status: "Under Review",
    description: "Gateway MDR fee higher than contracted tier schedule.",
    severity: "Medium",
  },
  {
    type: "Missing Bank Settlement Ref",
    cases: 0,
    status: "Unresolved",
    description: "Ledger status paid, but no matching settlement UTR from bank.",
    severity: "High",
  },
  {
    type: "Timing / Cut-off Delay",
    cases: 0,
    status: "Resolved",
    description: "Transaction settled past standard T+1 midnight cycle.",
    severity: "Low",
  },
];

export const ExceptionsPanel: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-rose-950/80 text-rose-400 rounded-lg border border-rose-800/40">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Exception Queue
              </h2>
              <p className="text-xs text-slate-400">
                Categorized Discrepancies & AI Investigation Target List
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded">
            Static Queue
          </span>
        </div>

        {/* List of Exceptions */}
        <div className="p-4 divide-y divide-slate-800/60">
          {dummyExceptions.map((exc, idx) => {
            const severityColor = {
              High: "text-rose-400 bg-rose-950/60 border-rose-900/50",
              Medium: "text-amber-400 bg-amber-950/60 border-amber-900/50",
              Low: "text-slate-400 bg-slate-800 border-slate-700",
            }[exc.severity];

            return (
              <div
                key={idx}
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {exc.type}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${severityColor}`}
                    >
                      {exc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {exc.description}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-1 shrink-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-sm font-bold text-white">
                      {exc.cases}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      cases
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {exc.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Action / Info Footer */}
      <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Exception Agent: Offline (Phase 5)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">0 Active Flags</span>
      </div>
    </div>
  );
};
