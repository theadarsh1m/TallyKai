/**
 * TallyKai — AI Finance Controller
 * Phase 3 & Phase 4: Independent Ground Truth Evaluation Utility
 * 
 * Compares multi-layer deterministic and fuzzy reconciliation outcomes against Ground Truth
 * to independently benchmark engine accuracy, precision, recall, and false positive rates.
 * 
 * NOTE: This module is strictly decoupled from the core reconciliation engine.
 */

import { ReconciliationDatasetResult } from "./types";

export interface GroundTruthEntry {
  order_id: string | null;
  scenario_type: string;
  true_status: "MATCHABLE" | "EXCEPTION";
  expected_settlement_ids: string[];
  expected_settlement_amount: number;
  expected_result?: string;
}

export interface ScenarioMetric {
  scenario: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface DeterministicEvaluationMetrics {
  matched: number;
  correct: number;
  incorrect: number;
  unresolved: number;
  precision: number;
}

export interface FuzzyEvaluationMetrics {
  proposedMatches: number;
  correctFuzzyMatches: number;
  incorrectFuzzyMatches: number;
  ambiguous: number;
  rejected: number;
  fuzzyPrecision: number;
  fuzzyResolutionRate: number;
}

export interface EvaluationReport {
  totalEvaluated: number;
  correctClassifications: number;
  incorrectClassifications: number;
  accuracy: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  deterministicMetrics: DeterministicEvaluationMetrics;
  fuzzyMetrics: FuzzyEvaluationMetrics;
  scenarioBreakdown: ScenarioMetric[];
}

/**
 * Evaluates reconciliation dataset results against ground truth records.
 */
export function evaluateReconciliationAgainstGroundTruth(
  reconResult: ReconciliationDatasetResult,
  groundTruth: GroundTruthEntry[]
): EvaluationReport {
  const orderResultMap = new Map(reconResult.orderResults.map((r) => [r.orderId, r]));
  const orphanResultMap = new Map(reconResult.orphanResults.map((r) => [r.settlementId, r]));

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  // Deterministic layer tracking
  let detMatched = 0;
  let detCorrect = 0;
  let detIncorrect = 0;

  // Fuzzy layer tracking
  let fuzzyProposed = 0;
  let fuzzyCorrect = 0;
  let fuzzyIncorrect = 0;
  let fuzzyAmbiguous = 0;
  let fuzzyRejected = 0;

  const scenarioStats = new Map<string, { total: number; correct: number }>();

  for (const gt of groundTruth) {
    const scenario = gt.scenario_type;
    const currentScenario = scenarioStats.get(scenario) ?? { total: 0, correct: 0 };
    currentScenario.total++;

    const isGtMatchable = gt.true_status === "MATCHABLE";
    let engineDecidedMatch = false;

    if (gt.order_id) {
      const orderRes = orderResultMap.get(gt.order_id);
      if (orderRes) {
        engineDecidedMatch =
          orderRes.status === "MATCHED" ||
          orderRes.status === "MATCHED_AFTER_ADJUSTMENTS";

        const isFuzzyMethod =
          orderRes.matchMethod === "FUZZY_REFERENCE" ||
          orderRes.matchMethod === "FUZZY_AMOUNT" ||
          orderRes.matchMethod === "FUZZY_COMBINED";

        if (engineDecidedMatch) {
          if (isFuzzyMethod) {
            fuzzyProposed++;
            if (isGtMatchable) {
              fuzzyCorrect++;
            } else {
              fuzzyIncorrect++;
            }
          } else {
            detMatched++;
            if (isGtMatchable) {
              detCorrect++;
            } else {
              detIncorrect++;
            }
          }
        } else {
          if (orderRes.status === "AMBIGUOUS" || orderRes.exceptionCategory === "AMBIGUOUS_MATCH") {
            fuzzyAmbiguous++;
          } else if (
            orderRes.exceptionCategory === "FUZZY_LOW_CONFIDENCE" ||
            orderRes.exceptionCategory === "NO_CANDIDATE"
          ) {
            fuzzyRejected++;
          }
        }
      }
    } else {
      // Orphan settlement check
      const orphanId = gt.expected_settlement_ids[0];
      const isIdentifiedAsOrphan = orphanId ? orphanResultMap.has(orphanId) : false;
      engineDecidedMatch = !isIdentifiedAsOrphan;
    }

    if (isGtMatchable && engineDecidedMatch) {
      truePositives++;
      currentScenario.correct++;
    } else if (!isGtMatchable && !engineDecidedMatch) {
      trueNegatives++;
      currentScenario.correct++;
    } else if (!isGtMatchable && engineDecidedMatch) {
      falsePositives++;
    } else if (isGtMatchable && !engineDecidedMatch) {
      falseNegatives++;
    }

    scenarioStats.set(scenario, currentScenario);
  }

  const totalEvaluated = groundTruth.length;
  const correctClassifications = truePositives + trueNegatives;
  const incorrectClassifications = falsePositives + falseNegatives;
  const accuracy =
    totalEvaluated > 0
      ? parseFloat(((correctClassifications / totalEvaluated) * 100).toFixed(2))
      : 0;

  const precision =
    truePositives + falsePositives > 0
      ? parseFloat(((truePositives / (truePositives + falsePositives)) * 100).toFixed(2))
      : 0;

  const recall =
    truePositives + falseNegatives > 0
      ? parseFloat(((truePositives / (truePositives + falseNegatives)) * 100).toFixed(2))
      : 0;

  const f1Score =
    precision + recall > 0
      ? parseFloat(((2 * ((precision * recall) / (precision + recall)))).toFixed(2))
      : 0;

  const detPrecision =
    detMatched > 0 ? parseFloat(((detCorrect / detMatched) * 100).toFixed(1)) : 100.0;

  const fuzzyPrecision =
    fuzzyProposed > 0
      ? parseFloat(((fuzzyCorrect / fuzzyProposed) * 100).toFixed(1))
      : 100.0;

  const detUnresolved = reconResult.summary.deterministicUnresolved;
  const fuzzyResolutionRate =
    detUnresolved > 0
      ? parseFloat(((fuzzyProposed / detUnresolved) * 100).toFixed(1))
      : 0.0;

  const deterministicMetrics: DeterministicEvaluationMetrics = {
    matched: detMatched,
    correct: detCorrect,
    incorrect: detIncorrect,
    unresolved: detUnresolved,
    precision: detPrecision,
  };

  const fuzzyMetrics: FuzzyEvaluationMetrics = {
    proposedMatches: fuzzyProposed,
    correctFuzzyMatches: fuzzyCorrect,
    incorrectFuzzyMatches: fuzzyIncorrect,
    ambiguous: fuzzyAmbiguous,
    rejected: fuzzyRejected,
    fuzzyPrecision,
    fuzzyResolutionRate,
  };

  const scenarioBreakdown: ScenarioMetric[] = [];
  for (const [scenario, stat] of scenarioStats.entries()) {
    const scAccuracy =
      stat.total > 0 ? parseFloat(((stat.correct / stat.total) * 100).toFixed(1)) : 0;
    scenarioBreakdown.push({
      scenario,
      total: stat.total,
      correct: stat.correct,
      incorrect: stat.total - stat.correct,
      accuracy: scAccuracy,
    });
  }

  return {
    totalEvaluated,
    correctClassifications,
    incorrectClassifications,
    accuracy,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    deterministicMetrics,
    fuzzyMetrics,
    scenarioBreakdown,
  };
}
