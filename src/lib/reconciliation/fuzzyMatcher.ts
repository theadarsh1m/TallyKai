/**
 * TallyKai — AI Finance Controller
 * Phase 4: Fuzzy / Rule-Based Candidate Matching & Decision Engine
 * 
 * Scores candidate settlements against unresolved orders using multi-signal evidence,
 * enforces strict confidence thresholds and ambiguity margin detection,
 * produces structured audit evidence, and NEVER references Ground Truth.
 */

import { CanonicalTransaction } from "../normalization/types";
import {
  OrderReconciliationResult,
  FuzzyCandidate,
  FuzzyCandidateEvidence,
  EvidenceItem,
  MatchMethod,
} from "./types";
import { FuzzyMatchingConfig, DEFAULT_FUZZY_CONFIG } from "./config";
import {
  calculateReferenceSimilarity,
  calculateAmountSimilarity,
  calculateDateSimilarity,
  calculateCustomerSimilarity,
} from "./similarity";

/**
 * Computes multi-signal similarity scores and composite confidence for an order-settlement pair.
 * 
 * @param order - Unresolved canonical order transaction
 * @param settlement - Candidate canonical settlement transaction
 * @param config - Fuzzy reconciliation engine configuration
 * @returns Structured candidate evidence and composite score
 */
export function scoreCandidate(
  order: CanonicalTransaction,
  settlement: CanonicalTransaction,
  config: FuzzyMatchingConfig = DEFAULT_FUZZY_CONFIG
): FuzzyCandidate {
  // 1. Reference similarity (test combinations of transactionReference and orderId)
  const refScores = [
    calculateReferenceSimilarity(order.transactionReference, settlement.transactionReference),
    calculateReferenceSimilarity(order.orderId, settlement.orderId),
    calculateReferenceSimilarity(order.orderId, settlement.transactionReference),
    calculateReferenceSimilarity(order.transactionReference, settlement.orderId),
  ];
  const refSim = Math.max(...refScores);

  // 2. Amount similarity
  const amountSim = calculateAmountSimilarity(order.amountMinor, settlement.amountMinor);

  // 3. Date proximity similarity
  const dateSim = calculateDateSimilarity(
    order.timestamp,
    settlement.timestamp,
    config.indexing.maxCandidateDateLagDays
  );

  // 4. Customer identity / metadata similarity
  const custSim = calculateCustomerSimilarity(order, settlement);

  // 5. Composite weighted score
  const { weights } = config;
  const compositeScore =
    weights.reference * refSim +
    weights.amount * amountSim +
    weights.date * dateSim.score +
    weights.customer * custSim;

  const boundedScore = Math.min(1.0, Math.max(0.0, compositeScore));
  const roundedScore = parseFloat(boundedScore.toFixed(4));

  const evidence: FuzzyCandidateEvidence = {
    referenceSimilarity: refSim,
    amountSimilarity: amountSim,
    dateSimilarity: dateSim.score,
    customerSimilarity: custSim,
    compositeScore: roundedScore,
    orderReference: order.transactionReference ?? order.orderId,
    settlementReference: settlement.transactionReference ?? settlement.orderId,
    orderAmountMinor: order.amountMinor,
    settlementAmountMinor: settlement.amountMinor,
    delayDays: dateSim.delayDays,
    customerOverlap: custSim === 1.0 ? true : custSim === 0.0 ? false : null,
  };

  return {
    settlementId: settlement.sourceRecordId,
    score: roundedScore,
    evidence,
  };
}

export interface FuzzyEvaluationOutcome {
  resolution: "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED";
  result: OrderReconciliationResult;
  candidateSettlement?: CanonicalTransaction;
  allScoredCandidates: FuzzyCandidate[];
}

/**
 * Evaluates an unresolved order against a list of candidate settlements.
 * 
 * Applies:
 * 1. Multi-signal candidate scoring
 * 2. Ambiguity margin detection (top score - runner-up score < ambiguityMargin)
 * 3. Confidence thresholding (HIGH >= 0.88, MEDIUM 0.75-0.88, LOW < 0.75)
 * 4. Structured audit trail construction
 */
export function evaluateFuzzyOrder(
  order: CanonicalTransaction,
  candidateSettlements: CanonicalTransaction[],
  config: FuzzyMatchingConfig = DEFAULT_FUZZY_CONFIG
): FuzzyEvaluationOutcome {
  // If 0 candidates found within allowable search bounds
  if (candidateSettlements.length === 0) {
    const evidence: EvidenceItem[] = [
      {
        type: "MISSING_RECORD",
        missingType: "SETTLEMENT",
        description: "No candidate settlements found within date window or amount bounds during fuzzy pass.",
      },
    ];

    return {
      resolution: "UNRESOLVED",
      result: {
        orderId: order.sourceRecordId,
        status: "MISSING_SETTLEMENT",
        matchMethod: "NONE",
        settlementIds: [],
        confidence: 0.0,
        amountDifferenceMinor: order.amountMinor,
        reason: "No candidate settlement found within acceptable time/amount parameters.",
        exceptionCategory: "NO_CANDIDATE",
        evidence,
        fuzzyCandidates: [],
      },
      allScoredCandidates: [],
    };
  }

  // Score all candidate settlements
  const settlementMap = new Map<string, CanonicalTransaction>();
  const scoredCandidates: FuzzyCandidate[] = [];

  for (const s of candidateSettlements) {
    settlementMap.set(s.sourceRecordId, s);
    scoredCandidates.push(scoreCandidate(order, s, config));
  }

  // Sort descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  const top = scoredCandidates[0];
  const runnerUp = scoredCandidates.length > 1 ? scoredCandidates[1] : null;
  const margin = runnerUp ? top.score - runnerUp.score : 1.0;

  const candidateEvidenceItem: EvidenceItem = {
    type: "FUZZY_CANDIDATE_MATCH",
    candidateEvidence: top.evidence,
    candidates: scoredCandidates.slice(0, 5),
    description: `Fuzzy evaluation evaluated ${scoredCandidates.length} candidate(s). Top candidate ${top.settlementId} scored ${top.score} (Ref: ${top.evidence.referenceSimilarity}, Amt: ${top.evidence.amountSimilarity}, Date: ${top.evidence.dateSimilarity}, Cust: ${top.evidence.customerSimilarity}).`,
  };

  const evidenceItems: EvidenceItem[] = [candidateEvidenceItem];

  // ----------------------------------------------------
  // Case 1: High Confidence Match (score >= highConfidence)
  // ----------------------------------------------------
  if (top.score >= config.thresholds.highConfidence) {
    // Check ambiguity: If runner-up has similar high confidence
    if (
      runnerUp &&
      runnerUp.score >= config.thresholds.mediumConfidence &&
      margin < config.thresholds.ambiguityMargin
    ) {
      evidenceItems.push({
        type: "AMBIGUITY_DETECTION",
        margin: parseFloat(margin.toFixed(4)),
        topCandidateId: top.settlementId,
        topCandidateScore: top.score,
        runnerUpCandidateId: runnerUp.settlementId,
        runnerUpCandidateScore: runnerUp.score,
        description: `Ambiguous match: Multiple settlements have close scores (Top: ${top.settlementId} @ ${top.score}, Runner-up: ${runnerUp.settlementId} @ ${runnerUp.score}, Margin: ${margin.toFixed(4)} < ${config.thresholds.ambiguityMargin}). Flagged for AI investigation.`,
      });

      return {
        resolution: "AMBIGUOUS",
        result: {
          orderId: order.sourceRecordId,
          status: "AMBIGUOUS",
          matchMethod: "NONE",
          settlementIds: [top.settlementId, runnerUp.settlementId],
          confidence: top.score,
          amountDifferenceMinor: Math.abs(order.amountMinor - (top.evidence.settlementAmountMinor ?? 0)),
          reason: `Ambiguous match: Settlements ${top.settlementId} (${(top.score * 100).toFixed(1)}%) and ${runnerUp.settlementId} (${(runnerUp.score * 100).toFixed(1)}%) have overlapping confidence (Margin: ${(margin * 100).toFixed(1)}%).`,
          exceptionCategory: "AMBIGUOUS_MATCH",
          evidence: evidenceItems,
          fuzzyCandidates: scoredCandidates.slice(0, 5),
        },
        allScoredCandidates: scoredCandidates,
      };
    }

    // Unambiguous High Confidence Fuzzy Match -> Resolve!
    let matchMethod: MatchMethod = "FUZZY_COMBINED";
    if (top.evidence.referenceSimilarity >= 0.85 && top.evidence.amountSimilarity >= 0.85) {
      matchMethod = "FUZZY_COMBINED";
    } else if (top.evidence.referenceSimilarity >= 0.85) {
      matchMethod = "FUZZY_REFERENCE";
    } else if (top.evidence.amountSimilarity >= 0.85) {
      matchMethod = "FUZZY_AMOUNT";
    }

    const diffMinor = Math.abs(order.amountMinor - (top.evidence.settlementAmountMinor ?? order.amountMinor));
    const status = diffMinor === 0 ? "MATCHED" : "MATCHED_AFTER_ADJUSTMENTS";

    return {
      resolution: "RESOLVED",
      result: {
        orderId: order.sourceRecordId,
        status,
        matchMethod,
        settlementIds: [top.settlementId],
        confidence: top.score,
        amountDifferenceMinor: diffMinor,
        reason: `Fuzzy matched to ${top.settlementId} with ${(top.score * 100).toFixed(1)}% confidence via ${matchMethod} (Ref: ${top.evidence.referenceSimilarity}, Amt: ${top.evidence.amountSimilarity}, Date: ${top.evidence.dateSimilarity}).`,
        exceptionCategory: null,
        evidence: evidenceItems,
        fuzzyCandidates: scoredCandidates.slice(0, 5),
      },
      candidateSettlement: settlementMap.get(top.settlementId),
      allScoredCandidates: scoredCandidates,
    };
  }

  // ----------------------------------------------------
  // Case 2: Medium Confidence (mediumConfidence <= score < highConfidence)
  // ----------------------------------------------------
  if (top.score >= config.thresholds.mediumConfidence) {
    if (
      runnerUp &&
      runnerUp.score >= config.thresholds.mediumConfidence - 0.05 &&
      margin < config.thresholds.ambiguityMargin
    ) {
      evidenceItems.push({
        type: "AMBIGUITY_DETECTION",
        margin: parseFloat(margin.toFixed(4)),
        description: `Ambiguous match in medium confidence bracket: ${top.settlementId} (${top.score}) vs ${runnerUp.settlementId} (${runnerUp.score}).`,
      });

      return {
        resolution: "AMBIGUOUS",
        result: {
          orderId: order.sourceRecordId,
          status: "AMBIGUOUS",
          matchMethod: "NONE",
          settlementIds: [top.settlementId, runnerUp.settlementId],
          confidence: top.score,
          amountDifferenceMinor: Math.abs(order.amountMinor - (top.evidence.settlementAmountMinor ?? 0)),
          reason: `Ambiguous candidate match: Multiple candidate settlements have similar confidence (Top: ${(top.score * 100).toFixed(1)}%, Runner-up: ${(runnerUp.score * 100).toFixed(1)}%).`,
          exceptionCategory: "AMBIGUOUS_MATCH",
          evidence: evidenceItems,
          fuzzyCandidates: scoredCandidates.slice(0, 5),
        },
        allScoredCandidates: scoredCandidates,
      };
    }

    // Medium confidence candidate suggestion — kept unresolved for Phase 5 AI investigation
    return {
      resolution: "UNRESOLVED",
      result: {
        orderId: order.sourceRecordId,
        status: "UNRESOLVED",
        matchMethod: "NONE",
        settlementIds: [top.settlementId],
        confidence: top.score,
        amountDifferenceMinor: Math.abs(order.amountMinor - (top.evidence.settlementAmountMinor ?? 0)),
        reason: `Plausible candidate ${top.settlementId} identified with ${(top.score * 100).toFixed(1)}% confidence, below auto-resolution threshold (${(config.thresholds.highConfidence * 100).toFixed(0)}%). Flagged for AI investigation.`,
        exceptionCategory: "FUZZY_LOW_CONFIDENCE",
        evidence: evidenceItems,
        fuzzyCandidates: scoredCandidates.slice(0, 5),
      },
      allScoredCandidates: scoredCandidates,
    };
  }

  // ----------------------------------------------------
  // Case 3: Low Confidence (score < mediumConfidence) -> Rejected
  // ----------------------------------------------------
  return {
    resolution: "UNRESOLVED",
    result: {
      orderId: order.sourceRecordId,
      status: "MISSING_SETTLEMENT",
      matchMethod: "NONE",
      settlementIds: [],
      confidence: top.score,
      amountDifferenceMinor: order.amountMinor,
      reason: `Best fuzzy candidate ${top.settlementId} scored ${(top.score * 100).toFixed(1)}%, below minimum acceptable confidence (${(config.thresholds.mediumConfidence * 100).toFixed(0)}%).`,
      exceptionCategory: "FUZZY_LOW_CONFIDENCE",
      evidence: evidenceItems,
      fuzzyCandidates: scoredCandidates.slice(0, 5),
    },
    allScoredCandidates: scoredCandidates,
  };
}
