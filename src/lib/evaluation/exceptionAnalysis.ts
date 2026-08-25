/**
 * TallyKai — AI Finance Controller
 * Phase 6: Exception Categorization and Breakdown Analysis
 */

import { ExceptionGroupDetail, DetailedRecordEvaluation } from "./types";
import { ExceptionCategory } from "../reconciliation/types";

const REASON_EXPLANATIONS: Record<string, string> = {
  MISSING_SETTLEMENT: "Order marked paid internally but absent from gateway settlement feed",
  AMOUNT_MISMATCH: "Discrepancy between gross order price and net payout after fee tolerance",
  DATE_OUT_OF_RANGE: "Settlement date exceeds the allowable T+3 to T+7 settlement date lag window",
  DUPLICATE_SETTLEMENT: "Order matched against multiple distinct settlement batch transactions",
  ORPHAN_SETTLEMENT: "Gateway settlement transaction has no matching internal order reference",
  AMBIGUOUS_MATCH: "Multiple candidate settlements scored within the ambiguity tolerance threshold",
  FUZZY_LOW_CONFIDENCE: "Highest fuzzy candidate score fell below the 0.85 acceptance threshold",
  AI_UNRESOLVED: "AI investigation concluded with low confidence or ambiguous root cause",
  AI_LIMIT_REACHED: "AI investigation queue capped by configured execution rate limit",
  UNKNOWN: "Uncategorized discrepancy requiring manual finance audit",
};

export function computeExceptionBreakdown(
  evaluations: DetailedRecordEvaluation[]
): ExceptionGroupDetail[] {
  const unresolvedEvals = evaluations.filter(
    (e) => e.actualStatus !== "MATCHED" && e.actualStatus !== "MATCHED_AFTER_ADJUSTMENTS"
  );

  const groupMap = new Map<string, string[]>();

  for (const ev of unresolvedEvals) {
    let cat = ev.actualExceptionCategory || "UNKNOWN";
    if (ev.actualStatus === "AMBIGUOUS") {
      cat = "AMBIGUOUS_MATCH";
    } else if (ev.actualStatus === "MISSING_SETTLEMENT") {
      cat = "MISSING_SETTLEMENT";
    } else if (ev.actualStatus === "DUPLICATE") {
      cat = "DUPLICATE_SETTLEMENT";
    } else if (ev.actualStatus === "ORPHAN_SETTLEMENT") {
      cat = "ORPHAN_SETTLEMENT";
    }

    const current = groupMap.get(cat) || [];
    current.push(ev.orderId);
    groupMap.set(cat, current);
  }

  const totalExceptions = unresolvedEvals.length;
  const groups: ExceptionGroupDetail[] = [];

  for (const [category, orderIds] of groupMap.entries()) {
    const count = orderIds.length;
    const percentageOfExceptions =
      totalExceptions > 0 ? parseFloat(((count / totalExceptions) * 100).toFixed(1)) : 0;

    groups.push({
      category: category as ExceptionCategory | "UNKNOWN",
      count,
      percentageOfExceptions,
      sampleOrderIds: orderIds.slice(0, 5),
      primaryReason: REASON_EXPLANATIONS[category] || "Discrepancy flagged for review",
    });
  }

  // Sort descending by count
  return groups.sort((a, b) => b.count - a.count);
}
