/**
 * TallyKai — AI Finance Controller
 * Phase 3: Independent Ground Truth Evaluation Utility
 * 
 * Compares deterministic reconciliation decisions against Phase 1 Ground Truth
 * to benchmark engine accuracy, precision, recall, and false positive rates.
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

export interface EvaluationReport {
  totalEvaluated: number;
  correctClassifications: number;
  incorrectClassifications: number;
  accuracy: number;
  truePositives: number; // Ground truth MATCHABLE, Engine MATCHED
  falsePositives: number; // Ground truth EXCEPTION, Engine MATCHED
  trueNegatives: number; // Ground truth EXCEPTION, Engine EXCEPTION
  falseNegatives: number; // Ground truth MATCHABLE, Engine EXCEPTION
  precision: number;
  recall: number;
  f1Score: number;
  scenarioBreakdown: ScenarioMetric[];
}

/**
 * Evaluates reconciliation results against ground truth records.
 */
export function evaluateReconciliationAgainstGroundTruth(
  reconResult: ReconciliationDatasetResult,
  groundTruth: GroundTruthEntry[]
): EvaluationReport {
  // Index engine results by orderId
  const orderResultMap = new Map(reconResult.orderResults.map((r) => [r.orderId, r]));
  // Index orphan results by settlementId
  const orphanResultMap = new Map(reconResult.orphanResults.map((r) => [r.settlementId, r]));

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

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
    scenarioBreakdown,
  };
}
