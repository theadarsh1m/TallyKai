/**
 * TallyKai — AI Finance Controller
 * Phase 6: Central Evaluation Engine
 * 
 * Orchestrates multi-layer ground truth evaluation, precision/recall metrics,
 * confusion matrix, exception analysis, false positive detection, and financial aggregation.
 */

import {
  GroundTruthEntry,
  DetailedRecordEvaluation,
  EvaluationReportData,
  ScaleBenchmarkPoint,
} from "./types";
import { ReconciliationDatasetResult } from "../reconciliation/types";
import { Order, Settlement } from "../data/types";
import { evaluateOrderRecord, extractFalsePositives } from "./groundTruthMatcher";
import { computeConfusionMatrix } from "./confusionMatrix";
import {
  computeCoreMetrics,
  computeLayerPerformance,
  computeResolutionFunnel,
  computeConfidenceBuckets,
} from "./metrics";
import { computeExceptionBreakdown } from "./exceptionAnalysis";
import { computeFinancialMetrics } from "./financialMetrics";
import { computePerformanceMetrics } from "./performanceMetrics";
import { computeAIMetrics } from "./aiMetrics";
import { computeDataQualityMetrics } from "./dataQuality";

export interface EvaluationOptions {
  normalizationTimeMs?: number;
  seed?: number;
  scaleBenchmarks?: ScaleBenchmarkPoint[];
}

export function evaluateDataset(
  reconResult: ReconciliationDatasetResult,
  groundTruth: GroundTruthEntry[],
  orders: Order[],
  settlements: Settlement[],
  options?: EvaluationOptions
): {
  report: EvaluationReportData;
  detailedEvaluations: DetailedRecordEvaluation[];
} {
  const orderResultsMap = new Map(reconResult.orderResults.map((r) => [r.orderId, r]));

  // 1. Evaluate each ground truth record against actual engine outcomes
  const detailedEvaluations: DetailedRecordEvaluation[] = groundTruth.map((gt) => {
    const orderRes = gt.order_id ? orderResultsMap.get(gt.order_id) : undefined;
    return evaluateOrderRecord(orderRes, gt);
  });

  // 2. Compute Confusion Matrix
  const confusionMatrix = computeConfusionMatrix(detailedEvaluations);

  // 3. Compute Core Precision, Recall, F1, Accuracy
  const metrics = computeCoreMetrics(detailedEvaluations, confusionMatrix);

  // 4. Compute Layer-by-Layer Performance
  const layerPerformance = computeLayerPerformance(detailedEvaluations);

  // 5. Compute Resolution Funnel
  const resolutionFunnel = computeResolutionFunnel(layerPerformance, groundTruth.length);

  // 6. Compute Exception Grouping Breakdown
  const exceptions = computeExceptionBreakdown(detailedEvaluations);

  // 7. Extract False Positives
  const falsePositives = extractFalsePositives(detailedEvaluations, orderResultsMap);

  // 8. Compute Confidence Bucket Calibration
  const confidenceBuckets = computeConfidenceBuckets(detailedEvaluations);

  // 9. Compute Financial Aggregations
  const financialMetrics = computeFinancialMetrics(orders, detailedEvaluations);

  // 10. Compute Throughput and Performance
  const performance = computePerformanceMetrics({
    totalRecords: groundTruth.length,
    totalProcessingTimeMs: reconResult.summary.processingTimeMs,
    normalizationTimeMs: options?.normalizationTimeMs,
  });

  // 11. Compute AI-Specific Metrics
  const aiMetrics = computeAIMetrics(detailedEvaluations, reconResult.summary);

  // 12. Compute Data Quality Score
  const dataQuality = computeDataQualityMetrics(orders, settlements);

  const totalFinancialINR = orders.reduce((sum, o) => sum + o.amount, 0);

  const report: EvaluationReportData = {
    dataset: {
      totalOrders: orders.length,
      totalSettlements: settlements.length,
      totalGroundTruth: groundTruth.length,
      financialValueINR: totalFinancialINR,
      seed: options?.seed,
    },
    metrics,
    confusionMatrix,
    layerPerformance,
    resolutionFunnel,
    exceptions,
    falsePositives,
    confidenceBuckets,
    financialMetrics,
    performance,
    aiMetrics,
    dataQuality,
    scaleBenchmarks: options?.scaleBenchmarks,
    evaluatedAt: new Date().toISOString(),
  };

  return { report, detailedEvaluations };
}
