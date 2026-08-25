/**
 * TallyKai — AI Finance Controller
 * Phase 6: Ground Truth Record Matcher
 * 
 * Compares individual order reconciliation results against ground truth.
 */

import {
  GroundTruthEntry,
  DetailedRecordEvaluation,
  MatchEvaluationClassification,
  FalsePositiveRecord,
} from "./types";
import { OrderReconciliationResult } from "../reconciliation/types";

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export function evaluateOrderRecord(
  orderResult: OrderReconciliationResult | undefined,
  gt: GroundTruthEntry
): DetailedRecordEvaluation {
  const orderId = gt.order_id || "ORPHAN";
  const scenarioType = gt.scenario_type;
  const groundTruthStatus = gt.true_status;
  const expectedSettlementIds = gt.expected_settlement_ids || [];
  const expectedAmountPaise = Math.round((gt.expected_settlement_amount || 0) * 100);

  const actualStatus = orderResult ? orderResult.status : "UNRESOLVED";
  const actualMatchMethod = orderResult ? orderResult.matchMethod : "NONE";
  const actualSettlementIds = orderResult ? orderResult.settlementIds || [] : [];
  const actualConfidence = orderResult ? orderResult.confidence : 0;
  const actualExceptionCategory = orderResult ? orderResult.exceptionCategory : null;
  const actualAIDecision = orderResult?.aiInvestigation?.decision || null;

  const isEngineMatch =
    actualStatus === "MATCHED" || actualStatus === "MATCHED_AFTER_ADJUSTMENTS";

  const isGtMatchable = groundTruthStatus === "MATCHABLE";

  let classification: MatchEvaluationClassification;
  let isMatchCorrect = false;
  let isFalsePositive = false;
  let notes = "";

  if (isGtMatchable) {
    if (isEngineMatch) {
      // Check if correct settlement was matched
      const settlementMatchValid = arraysEqual(actualSettlementIds, expectedSettlementIds);
      if (settlementMatchValid) {
        classification = "CORRECT";
        isMatchCorrect = true;
      } else {
        classification = "INCORRECT";
        isMatchCorrect = false;
        notes = `Settlement mismatch: expected [${expectedSettlementIds.join(", ")}] but engine matched [${actualSettlementIds.join(", ")}]`;
      }
    } else {
      classification = "MISSED";
      isMatchCorrect = false;
      notes = `Matchable order was not resolved. Status: ${actualStatus}, Exception: ${actualExceptionCategory || "None"}`;
    }
  } else {
    // Ground truth is EXCEPTION
    if (isEngineMatch) {
      classification = "FALSE_POSITIVE";
      isFalsePositive = true;
      isMatchCorrect = false;
      notes = `Engine declared match for unmatchable ground-truth exception scenario (${scenarioType}). Linked: [${actualSettlementIds.join(", ")}]`;
    } else {
      classification = "UNRESOLVED"; // Correctly identified as exception/unresolved
      isMatchCorrect = true;
      notes = `Correctly flagged exception. Status: ${actualStatus}`;
    }
  }

  return {
    orderId,
    scenarioType,
    groundTruthStatus,
    expectedSettlementIds,
    expectedAmountPaise,
    actualStatus,
    actualMatchMethod,
    actualSettlementIds,
    actualConfidence,
    actualExceptionCategory,
    actualAIDecision,
    classification,
    isMatchCorrect,
    isFalsePositive,
    notes,
  };
}

export function extractFalsePositives(
  evaluations: DetailedRecordEvaluation[],
  orderResultsMap: Map<string, OrderReconciliationResult>
): FalsePositiveRecord[] {
  const fps: FalsePositiveRecord[] = [];

  for (const ev of evaluations) {
    if (ev.isFalsePositive || ev.classification === "INCORRECT") {
      const orderRes = orderResultsMap.get(ev.orderId);
      fps.push({
        orderId: ev.orderId,
        scenarioType: ev.scenarioType,
        matchingMethod: ev.actualMatchMethod,
        confidence: ev.actualConfidence,
        predictedSettlementIds: ev.actualSettlementIds,
        actualGroundTruthSettlementIds: ev.expectedSettlementIds,
        predictedAmountDifferencePaise: orderRes ? orderRes.amountDifferenceMinor : 0,
        reason:
          ev.notes ||
          (ev.isFalsePositive
            ? `Engine matched record under scenario ${ev.scenarioType} which ground truth classifies as EXCEPTION`
            : `Engine matched incorrect settlement IDs`),
      });
    }
  }

  return fps;
}
