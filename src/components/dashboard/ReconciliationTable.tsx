"use client";

import React, { useState } from "react";
import { Search, Filter, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionDetailModal } from "./ExceptionDetailModal";
import { cn } from "@/lib/utils";

export interface ReconciliationRecord {
  orderId: string;
  reference: string;
  orderAmount: string;
  settlementAmount: string;
  matchMethod:
    | "Deterministic"
    | "Fee / Tax"
    | "Fuzzy Ref"
    | "Fuzzy Amount"
    | "Fuzzy Combined"
    | "AI Assisted"
    | "Unresolved";
  status:
    | "Matched"
    | "Resolved"
    | "Review"
    | "Ambiguous"
    | "Human Review"
    | "Mismatch"
    | "Missing"
    | "Duplicate";
  confidence: number;
  timestamp: string;
  aiExplanation?: string;
  aiDecision?: "MATCH" | "EXCEPTION" | "HUMAN_REVIEW";
  aiConfidence?: number;
  recommendedAction?: string;
  evidenceUsed?: string[];
  auditTrail?: Array<{ timestamp: string; action: string; details: string }>;
}

const defaultRecords: ReconciliationRecord[] = [
  {
    orderId: "ORD-000001",
    reference: "WEB-78M9G",
    orderAmount: "₹2,499.00",
    settlementAmount: "₹2,474.00",
    matchMethod: "Deterministic",
    status: "Matched",
    confidence: 100,
    timestamp: "2026-08-05 01:46",
    aiExplanation: "Exact reference match verified in deterministic Pass 1.",
    aiDecision: "MATCH",
    aiConfidence: 100,
    recommendedAction: "No action required.",
  },
  {
    orderId: "ORD-000002",
    reference: "WEB-L4Y5J",
    orderAmount: "₹5,200.00",
    settlementAmount: "₹5,070.00",
    matchMethod: "AI Assisted",
    status: "Matched",
    confidence: 96,
    timestamp: "2026-08-05 02:10",
    aiExplanation: "Settlement SET-000412 matches order gross minus standard 2% MDR fee and 18% GST tax deduction.",
    aiDecision: "MATCH",
    aiConfidence: 96,
    recommendedAction: "Approve matched settlement in gateway ledger.",
    evidenceUsed: [
      "Order gross amount: ₹5,200.00",
      "Settlement amount: ₹5,070.00 (MDR: ₹104.00, GST: ₹18.72)",
      "Reference stem overlap: WEB-L4Y5J vs WEB L4Y5J",
    ],
  },
  {
    orderId: "ORD-000003",
    reference: "WEB-K9P2X",
    orderAmount: "₹8,000.00",
    settlementAmount: "₹7,800.00",
    matchMethod: "Unresolved",
    status: "Human Review",
    confidence: 62,
    timestamp: "2026-08-05 03:15",
    aiExplanation: "Two candidate settlements (SET-000481 @ 91.2% and SET-000482 @ 90.8%) have close scores. Evidence is insufficient to choose.",
    aiDecision: "HUMAN_REVIEW",
    aiConfidence: 62,
    recommendedAction: "Manual finance review required.",
    evidenceUsed: [
      "Candidate 1: SET-000481 (Amount: ₹7,800.00, Date: T+1)",
      "Candidate 2: SET-000482 (Amount: ₹7,800.00, Date: T+1)",
    ],
  },
  {
    orderId: "ORD-000004",
    reference: "WEB-M3R7T",
    orderAmount: "₹4,999.00",
    settlementAmount: "₹4,874.00",
    matchMethod: "Fuzzy Ref",
    status: "Matched",
    confidence: 94,
    timestamp: "2026-08-05 04:30",
    aiExplanation: "Fuzzy reference stem matched in Pass 2 candidate scoring.",
    aiDecision: "MATCH",
    aiConfidence: 94,
    recommendedAction: "Approve match.",
  },
  {
    orderId: "ORD-000005",
    reference: "WEB-P8Q1V",
    orderAmount: "₹9,999.00",
    settlementAmount: "₹6,000.00",
    matchMethod: "Unresolved",
    status: "Mismatch",
    confidence: 42,
    timestamp: "2026-08-05 05:00",
    aiExplanation: "Discrepancy: Settled ₹6,000.00 but expected net ₹9,750.00. Genuine amount mismatch.",
    aiDecision: "EXCEPTION",
    aiConfidence: 92,
    recommendedAction: "Raise dispute with payment gateway partner.",
  },
  {
    orderId: "ORD-000006",
    reference: "WEB-R4T9W",
    orderAmount: "₹14,999.00",
    settlementAmount: "₹0.00",
    matchMethod: "Unresolved",
    status: "Missing",
    confidence: 0,
    timestamp: "2026-08-05 06:12",
    aiExplanation: "No settlement record exists in payout statement for order ORD-000006.",
    aiDecision: "HUMAN_REVIEW",
    aiConfidence: 40,
    recommendedAction: "Check payout hold status in payment gateway dashboard.",
  },
  {
    orderId: "ORD-000007",
    reference: "WEB-X2N5Z",
    orderAmount: "₹7,999.00",
    settlementAmount: "₹7,839.00",
    matchMethod: "Fee / Tax",
    status: "Matched",
    confidence: 98,
    timestamp: "2026-08-05 07:22",
  },
  {
    orderId: "ORD-000008",
    reference: "WEB-V9L2K",
    orderAmount: "₹3,450.00",
    settlementAmount: "₹3,381.00",
    matchMethod: "Deterministic",
    status: "Matched",
    confidence: 100,
    timestamp: "2026-08-05 08:05",
  },
];

export const ReconciliationTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);

  const filteredRecords = defaultRecords.filter((rec) => {
    const matchesSearch =
      rec.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "MATCHED" && (rec.status === "Matched" || rec.status === "Resolved")) ||
      (statusFilter === "HUMAN_REVIEW" && (rec.status === "Human Review" || rec.status === "Ambiguous" || rec.status === "Review")) ||
      (statusFilter === "EXCEPTION" &&
        (rec.status === "Mismatch" || rec.status === "Missing" || rec.status === "Duplicate" || rec.status === "Human Review"));

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Table Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Reconciliation Records
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click any record to inspect AI Investigation Dossier & Audit Trail
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center space-x-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-md pl-2.5 pr-7 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Records</option>
                <option value="MATCHED">Matched & Resolved</option>
                <option value="HUMAN_REVIEW">Human Review Needed</option>
                <option value="EXCEPTION">Exceptions Only</option>
              </select>
              <Filter className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter Order ID..."
                className="bg-white border border-slate-200 rounded-md pl-7 pr-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono shadow-2xs w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4 font-mono font-medium">Order ID</th>
                <th className="py-2.5 px-4 text-right font-mono font-medium">Amount</th>
                <th className="py-2.5 px-4 text-right font-mono font-medium">Settlement</th>
                <th className="py-2.5 px-4 font-medium">Match Method</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 text-right font-mono font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6">
                    <EmptyState
                      title="No reconciliation records found"
                      description="Try adjusting your filter criteria or search query to find matching ledger entries."
                      actionLabel="Reset Filters"
                      onAction={() => {
                        setSearchTerm("");
                        setStatusFilter("ALL");
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isMatched = record.status === "Matched" || record.status === "Resolved";
                  const isHumanReview = record.status === "Human Review" || record.status === "Ambiguous" || record.status === "Review";
                  const isException =
                    record.status === "Mismatch" ||
                    record.status === "Missing" ||
                    record.status === "Duplicate";

                  return (
                    <tr
                      key={record.orderId}
                      onClick={() => setSelectedRecord(record)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {/* Order ID & Reference */}
                      <td className="py-2.5 px-4 font-mono">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight flex items-center space-x-1.5">
                          <span>{record.orderId}</span>
                          {record.matchMethod === "AI Assisted" && (
                            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans leading-tight mt-0.5">
                          Ref: {record.reference}
                        </div>
                      </td>

                      {/* Order Amount */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900 tabular-nums">
                        {record.orderAmount}
                      </td>

                      {/* Settlement Amount */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900 tabular-nums">
                        {record.settlementAmount === "₹0.00" ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          record.settlementAmount
                        )}
                      </td>

                      {/* Match Method */}
                      <td className="py-2.5 px-4">
                        {record.matchMethod === "Unresolved" ? (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        ) : (
                          <span
                            className={cn(
                              "inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border",
                              record.matchMethod === "AI Assisted"
                                ? "text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold"
                                : record.matchMethod.startsWith("Fuzzy")
                                ? "text-slate-700 bg-slate-100 border-slate-200"
                                : "text-slate-600 bg-slate-100/90 border-slate-200"
                            )}
                          >
                            {record.matchMethod}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              isMatched && "bg-emerald-600",
                              isHumanReview && "bg-amber-500",
                              isException && "bg-rose-600"
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isMatched && "text-emerald-800",
                              isHumanReview && "text-amber-800",
                              isException && "text-rose-800"
                            )}
                          >
                            {record.status}
                          </span>
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            record.confidence >= 90
                              ? "text-slate-900"
                              : record.confidence >= 75
                              ? "text-amber-700"
                              : "text-rose-700"
                          )}
                        >
                          {record.confidence}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Showing {filteredRecords.length} of {defaultRecords.length} records</span>
          <span>Click row for AI dossier</span>
        </div>
      </div>

      {/* Exception Detail Modal Dossier */}
      <ExceptionDetailModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </>
  );
};
