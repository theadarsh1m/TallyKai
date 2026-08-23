"use client";

import React from "react";
import { X, Sparkles, CheckCircle2, AlertTriangle, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ExceptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    orderId: string;
    reference: string;
    orderAmount: string;
    settlementAmount: string;
    matchMethod: string;
    status: string;
    confidence: number;
    timestamp: string;
    aiExplanation?: string;
    aiDecision?: "MATCH" | "EXCEPTION" | "HUMAN_REVIEW";
    aiConfidence?: number;
    recommendedSettlements?: string[];
    recommendedAction?: string;
    evidenceUsed?: string[];
    auditTrail?: Array<{ timestamp: string; action: string; details: string }>;
  } | null;
}

export const ExceptionDetailModal: React.FC<ExceptionDetailModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen || !record) return null;

  const aiDecision = record.aiDecision || (record.status === "Ambiguous" || record.status === "Review" ? "HUMAN_REVIEW" : "MATCH");
  const aiConfidence = record.aiConfidence ?? record.confidence;
  const isMatch = aiDecision === "MATCH";
  const isHumanReview = aiDecision === "HUMAN_REVIEW";

  const defaultExplanation =
    record.aiExplanation ||
    (isMatch
      ? "Settlement amount is fully explained by recorded MDR fee (2%) and applicable GST tax (18%)."
      : "Multiple candidate settlements have similar reference and date evidence. Data is insufficient to safely determine the exact record.");

  const defaultAction =
    record.recommendedAction ||
    (isMatch ? "Approve matched settlement in gateway ledger." : "Escalate to finance operations for manual verification.");

  const defaultEvidence =
    record.evidenceUsed || [
      `Order Amount: ${record.orderAmount}`,
      `Candidate Settlement Amount: ${record.settlementAmount}`,
      `Reference Match: ${record.reference}`,
    ];

  const defaultAuditTrail = record.auditTrail || [
    {
      timestamp: `${record.timestamp}:00`,
      action: "EXCEPTION_DETECTED",
      details: `Reconciliation exception flagged for ${record.orderId}.`,
    },
    {
      timestamp: `${record.timestamp}:01`,
      action: "FUZZY_PASS_EVALUATION",
      details: "Multi-signal candidate scoring generated plausible settlement candidates.",
    },
    {
      timestamp: `${record.timestamp}:02`,
      action: "AI_INVESTIGATION_COMPLETED",
      details: `AI Agent evaluated fee/tax calculations. Recommended: ${aiDecision} (${aiConfidence}% confidence).`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl border border-slate-200/90 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {record.orderId}
                </h3>
                <Badge
                  variant={isMatch ? "success" : isHumanReview ? "warning" : "error"}
                  size="sm"
                >
                  {isMatch ? "AI Recommendation: Match" : isHumanReview ? "AI Recommendation: Human Review" : "AI Exception"}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                AI Exception Investigation & Audit Dossier
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Order & Settlement Parameters Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Order Gross
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {record.orderAmount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Settled Amount
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {record.settlementAmount}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Reference
              </span>
              <span className="font-medium text-slate-700 truncate block">
                {record.reference}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                AI Confidence
              </span>
              <span
                className={cn(
                  "font-bold text-sm",
                  aiConfidence >= 90
                    ? "text-emerald-700"
                    : aiConfidence >= 75
                    ? "text-amber-700"
                    : "text-rose-700"
                )}
              >
                {aiConfidence}%
              </span>
            </div>
          </div>

          {/* AI Investigation Findings */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-900 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Investigation Summary</span>
            </div>
            <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-lg text-slate-700 leading-relaxed space-y-2">
              <p>{defaultExplanation}</p>
              <div className="pt-2 border-t border-indigo-100/80 flex items-start space-x-2 text-[11px]">
                <strong className="text-slate-900 shrink-0">Recommended Action:</strong>
                <span className="text-slate-600">{defaultAction}</span>
              </div>
            </div>
          </div>

          {/* Evidence Used */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-900 font-semibold">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Factual Evidence Verified</span>
            </div>
            <ul className="space-y-1 bg-slate-50/60 p-3 rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
              {defaultEvidence.map((ev, i) => (
                <li key={i} className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step-by-Step Audit Trail */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-900 font-semibold">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Investigation Audit Trail</span>
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              {defaultAuditTrail.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 p-2 rounded bg-slate-50 border border-slate-200/60"
                >
                  <span className="text-slate-400 shrink-0 text-[10px]">
                    {event.timestamp}
                  </span>
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider block">
                      {event.action}
                    </span>
                    <p className="text-slate-600 font-sans text-[11px] leading-snug">
                      {event.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Model: <span className="font-semibold text-slate-700">TallyKai AI Controller</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Dossier
            </Button>
            {isMatch ? (
              <Button variant="primary" size="sm" onClick={onClose}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Confirm Match</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onClose}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Escalate Review</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
