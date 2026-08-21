import React from "react";
import { CheckCircle2, AlertCircle, Clock, Info } from "lucide-react";

export interface ReconciliationRecord {
  orderId: string;
  orderAmount: string;
  settlementAmount: string;
  status: "Matched" | "Mismatch" | "Pending";
  confidence: string;
  date: string;
  source: string;
}

const dummyRecords: ReconciliationRecord[] = [
  {
    orderId: "ORD-2026-9041",
    orderAmount: "₹24,500.00",
    settlementAmount: "₹24,500.00",
    status: "Matched",
    confidence: "100%",
    date: "2026-08-21 10:14",
    source: "Razorpay Gateway",
  },
  {
    orderId: "ORD-2026-9042",
    orderAmount: "₹18,200.00",
    settlementAmount: "₹18,050.00",
    status: "Mismatch",
    confidence: "65%",
    date: "2026-08-21 10:22",
    source: "HDFC Bank Settlement",
  },
  {
    orderId: "ORD-2026-9043",
    orderAmount: "₹5,999.00",
    settlementAmount: "₹0.00",
    status: "Pending",
    confidence: "0%",
    date: "2026-08-21 10:30",
    source: "ICICI Bank Ledger",
  },
  {
    orderId: "ORD-2026-9044",
    orderAmount: "₹1,42,000.00",
    settlementAmount: "₹1,42,000.00",
    status: "Matched",
    confidence: "99%",
    date: "2026-08-21 10:45",
    source: "Razorpay Gateway",
  },
];

export const ReconciliationTable: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header / Action Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Reconciliation Overview
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded">
              UI Demonstration Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal Order Ledger vs. Bank Settlement Records (Sample Feed)
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>4 Mock Rows Displayed</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider font-mono">
            <tr>
              <th className="py-3.5 px-4">Order ID</th>
              <th className="py-3.5 px-4">Order Amount</th>
              <th className="py-3.5 px-4">Settlement Amount</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Confidence</th>
              <th className="py-3.5 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {dummyRecords.map((record) => {
              const isMatched = record.status === "Matched";
              const isMismatch = record.status === "Mismatch";
              const isPending = record.status === "Pending";

              return (
                <tr
                  key={record.orderId}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    <div className="flex flex-col">
                      <span>{record.orderId}</span>
                      <span className="text-[10px] text-slate-500 font-sans font-normal">
                        {record.source}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                    {record.orderAmount}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                    {record.settlementAmount}
                  </td>
                  <td className="py-3.5 px-4">
                    {isMatched && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Matched</span>
                      </span>
                    )}
                    {isMismatch && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/50">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Mismatch</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isMatched
                              ? "bg-emerald-500"
                              : isMismatch
                              ? "bg-amber-500"
                              : "bg-slate-600"
                          }`}
                          style={{ width: record.confidence }}
                        />
                      </div>
                      <span className="text-slate-400">{record.confidence}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                    {record.date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Banner */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-500 font-mono">
        Reconciliation matching logic and rules engine will be executed in Phase 1 & 2.
      </div>
    </div>
  );
};
