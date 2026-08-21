import React from "react";
import { Terminal, Shield, FileSpreadsheet, Bot, CheckCircle } from "lucide-react";

export interface ActivityItem {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  type: "system" | "audit" | "ingest" | "ai";
  status: "Completed" | "Standby" | "Scheduled";
}

const dummyActivities: ActivityItem[] = [
  {
    id: "ACT-001",
    title: "System Initialization & Foundation Setup",
    timestamp: "2026-08-21 10:50:00",
    description: "Tallykai Phase 0 architecture initialized. UI shell and state hooks verified.",
    type: "system",
    status: "Completed",
  },
  {
    id: "ACT-002",
    title: "Ledger Schema & Synthetic Data Ingestion Pipeline",
    timestamp: "Phase 1 - Upcoming",
    description: "Multi-source normalization engine (Razorpay settlement CSV + Bank statement format).",
    type: "ingest",
    status: "Scheduled",
  },
  {
    id: "ACT-003",
    title: "Deterministic Rule Matching & Fuzzy Resolution",
    timestamp: "Phase 3 - Upcoming",
    description: "Rule engine execution for exact transaction matching and threshold confidence scoring.",
    type: "audit",
    status: "Scheduled",
  },
  {
    id: "ACT-004",
    title: "Autonomous AI Exception Investigator Agent",
    timestamp: "Phase 5 - Upcoming",
    description: "AI Agent deployment for investigating root causes of ambiguous payout discrepancies.",
    type: "ai",
    status: "Standby",
  },
];

export const ActivityTimeline: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-indigo-950/80 text-indigo-400 rounded-lg border border-indigo-800/40">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Activity & Audit Trail
            </h2>
            <p className="text-xs text-slate-400">
              System Execution Timeline & Audit Log History
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded">
          Placeholder Timeline
        </span>
      </div>

      {/* Timeline Content */}
      <div className="p-4 sm:p-5">
        <div className="relative border-l border-slate-800 ml-3 space-y-6">
          {dummyActivities.map((item) => {
            const isCompleted = item.status === "Completed";
            
            return (
              <div key={item.id} className="relative pl-6 group">
                {/* Timeline Node Dot */}
                <div className="absolute -left-[9px] top-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isCompleted
                        ? "bg-indigo-950 border-indigo-500 text-indigo-400"
                        : "bg-slate-900 border-slate-700 text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-2.5 h-2.5 text-indigo-400" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 group-hover:border-slate-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-white group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-mono">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`font-semibold ${
                        isCompleted
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
