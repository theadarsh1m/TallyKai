import React from "react";
import { History, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface LogEntry {
  timestamp: string;
  orderId?: string;
  message: string;
  type: "match" | "exception" | "system" | "audit";
  status: "SUCCESS" | "INFO" | "FLAGGED" | "REVIEW";
}

const auditLogs: LogEntry[] = [
  {
    timestamp: "10:42:15",
    orderId: "ORD-000007",
    message: "ORD-000007 matched deterministically (MDR fee ₹160 verified)",
    type: "match",
    status: "SUCCESS",
  },
  {
    timestamp: "10:42:14",
    orderId: "ORD-000006",
    message: "ORD-000006 flagged: Missing settlement record in gateway feed",
    type: "exception",
    status: "FLAGGED",
  },
  {
    timestamp: "10:42:13",
    orderId: "ORD-000005",
    message: "ORD-000005 flagged: Settlement amount mismatch (₹6,000 vs ₹9,999)",
    type: "exception",
    status: "FLAGGED",
  },
  {
    timestamp: "10:42:12",
    orderId: "ORD-000004",
    message: "ORD-000004 matched with T+1 date offset tolerance window",
    type: "match",
    status: "SUCCESS",
  },
  {
    timestamp: "10:42:10",
    orderId: "ORD-000002",
    message: "ORD-000002 AI-assisted resolution confirmed with 94% confidence",
    type: "match",
    status: "SUCCESS",
  },
  {
    timestamp: "10:41:45",
    orderId: "ORD-000003",
    message: "ORD-000003 escalated for human review (61% match score)",
    type: "audit",
    status: "REVIEW",
  },
  {
    timestamp: "10:40:00",
    message: "Phase 1 Synthetic dataset loaded (500 orders, 503 settlements)",
    type: "system",
    status: "INFO",
  },
];

export const ActivityTimeline: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-slate-700 shrink-0" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Operational Audit Log
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Real-Time Event Stream</span>
        </div>
      </div>

      {/* Clean Log List */}
      <div className="font-mono text-xs divide-y divide-slate-100">
        {auditLogs.map((log, idx) => {
          const badgeVariant = {
            SUCCESS: "success" as const,
            FLAGGED: "error" as const,
            REVIEW: "warning" as const,
            INFO: "neutral" as const,
          }[log.status];

          return (
            <div
              key={idx}
              className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 px-1 rounded transition-colors"
            >
              <div className="flex items-baseline space-x-3 min-w-0">
                <span className="text-slate-400 font-normal text-[11px] shrink-0 tabular-nums">
                  {log.timestamp}
                </span>
                <span className="text-slate-800 font-normal text-xs truncate">
                  {log.message}
                </span>
              </div>

              <div className="self-start sm:self-auto shrink-0">
                <Badge variant={badgeVariant} size="sm">
                  {log.status}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
