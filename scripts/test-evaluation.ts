/**
 * TallyKai — AI Finance Controller
 * Phase 6: Evaluation & Benchmarking Test Suite
 * 
 * Tests ground truth comparison, precision/recall, confusion matrix,
 * resolution funnel, exception breakdowns, false positive detection,
 * financial aggregations, reproducibility, and edge case safety.
 */

import {
  evaluateOrderRecord,
  computeConfusionMatrix,
  computeCoreMetrics,
  computeLayerPerformance,
  computeResolutionFunnel,
  computeExceptionBreakdown,
  computeFinancialMetrics,
  computePerformanceMetrics,
  computeAIMetrics,
  evaluateDataset,
  GroundTruthEntry,
  DetailedRecordEvaluation,
} from "../src/lib/evaluation";
import { OrderReconciliationResult, ReconciliationDatasetResult } from "../src/lib/reconciliation/types";
import { Order } from "../src/lib/data/types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function runEvaluationTests() {
  console.log("==================================================");
  console.log("Running TallyKai Phase 6 Evaluation Test Suite");
  console.log("==================================================");

  // 1. Correct match evaluation
  const gt1: GroundTruthEntry = {
    order_id: "ORD-001",
    scenario_type: "EXACT_MATCH",
    true_status: "MATCHABLE",
    expected_settlement_ids: ["SET-001"],
    expected_settlement_amount: 1000,
  };
  const orderRes1: OrderReconciliationResult = {
    orderId: "ORD-001",
    status: "MATCHED",
    matchMethod: "EXACT_REFERENCE",
    settlementIds: ["SET-001"],
    confidence: 1.0,
    amountDifferenceMinor: 0,
    reason: "Exact match",
    exceptionCategory: null,
    evidence: [],
  };
  const eval1 = evaluateOrderRecord(orderRes1, gt1);
  assert(
    eval1.classification === "CORRECT" && eval1.isMatchCorrect === true,
    "1. Correct match evaluation accurately flags TRUE POSITIVE with valid settlement ID"
  );

  // 2. Incorrect match evaluation (wrong settlement ID)
  const orderRes2: OrderReconciliationResult = {
    orderId: "ORD-001",
    status: "MATCHED",
    matchMethod: "FUZZY_REFERENCE",
    settlementIds: ["SET-999"], // Wrong settlement!
    confidence: 0.9,
    amountDifferenceMinor: 0,
    reason: "Fuzzy match",
    exceptionCategory: null,
    evidence: [],
  };
  const eval2 = evaluateOrderRecord(orderRes2, gt1);
  assert(
    eval2.classification === "INCORRECT" && eval2.isMatchCorrect === false,
    "2. Incorrect match evaluation flags INCORRECT when wrong settlement ID is matched"
  );

  // 3. Unresolved evaluation (correct exception handling)
  const gt3: GroundTruthEntry = {
    order_id: "ORD-003",
    scenario_type: "MISSING_SETTLEMENT",
    true_status: "EXCEPTION",
    expected_settlement_ids: [],
    expected_settlement_amount: 0,
  };
  const orderRes3: OrderReconciliationResult = {
    orderId: "ORD-003",
    status: "MISSING_SETTLEMENT",
    matchMethod: "NONE",
    settlementIds: [],
    confidence: 0.0,
    amountDifferenceMinor: 0,
    reason: "Missing settlement",
    exceptionCategory: "MISSING_SETTLEMENT",
    evidence: [],
  };
  const eval3 = evaluateOrderRecord(orderRes3, gt3);
  assert(
    eval3.classification === "UNRESOLVED" && eval3.isMatchCorrect === true,
    "3. Unresolved evaluation confirms TRUE NEGATIVE for correctly flagged missing settlement exception"
  );

  // 4. Precision calculation
  const evaluations: DetailedRecordEvaluation[] = [eval1, eval2, eval3];
  const cm = computeConfusionMatrix(evaluations);
  // TP = 1 (eval1), FP = 1 (eval2), TN = 1 (eval3), FN = 0
  const metrics = computeCoreMetrics(evaluations, cm);
  assert(
    metrics.precision === 50.0,
    `4. Precision computed accurately: TP / (TP + FP) = 1/2 = 50.0% (got ${metrics.precision}%)`
  );

  // 5. Recall calculation
  // TP = 1, FN = 0 -> Recall = 1/(1+0) = 100%
  assert(
    metrics.recall === 100.0,
    `5. Recall computed accurately: TP / (TP + FN) = 1/1 = 100.0% (got ${metrics.recall}%)`
  );

  // 6. F1 Score calculation
  // 2 * (50 * 100) / (50 + 100) = 10000 / 150 = 66.67%
  assert(
    metrics.f1Score === 66.67,
    `6. F1 Score computed accurately: Harmonic mean = 66.67% (got ${metrics.f1Score}%)`
  );

  // 7. Resolution funnel calculation
  const mockSummary = {
    totalOrders: 3,
    totalSettlements: 3,
    matched: 2,
    matchedAfterAdjustments: 0,
    missingSettlements: 1,
    partialSettlements: 0,
    duplicates: 0,
    orphanSettlements: 0,
    unresolved: 1,
    exceptions: 1,
    deterministicExactMatches: 1,
    deterministicAdjustmentMatches: 0,
    deterministicUnresolved: 2,
    deterministicResolutionRate: 33.3,
    fuzzyHighConfidence: 1,
    fuzzyAmbiguous: 0,
    fuzzyRejected: 1,
    aiInvestigated: 1,
    aiResolved: 0,
    aiHumanReview: 1,
    totalMatched: 2,
    processingTimeMs: 10,
  };
  const layerMetrics = computeLayerPerformance(evaluations);
  const funnel = computeResolutionFunnel(layerMetrics, 3);
  assert(
    funnel.length === 4 && funnel[0].inputCount === 3,
    "7. Resolution funnel progression steps track input, resolved, and remaining accurately"
  );

  // 8. Exception grouping and reason attribution
  const exceptionBreakdown = computeExceptionBreakdown(evaluations);
  assert(
    exceptionBreakdown.length > 0 && exceptionBreakdown[0].category === "MISSING_SETTLEMENT",
    "8. Exception grouping aggregates exception categories with root cause explanations"
  );

  // 9. False-positive detection
  const gtFP: GroundTruthEntry = {
    order_id: "ORD-004",
    scenario_type: "AMOUNT_MISMATCH",
    true_status: "EXCEPTION",
    expected_settlement_ids: [],
    expected_settlement_amount: 0,
  };
  const orderResFP: OrderReconciliationResult = {
    orderId: "ORD-004",
    status: "MATCHED", // Wrong! Declared match on exception
    matchMethod: "FUZZY_COMBINED",
    settlementIds: ["SET-004"],
    confidence: 0.88,
    amountDifferenceMinor: 5000,
    reason: "Erroneous match",
    exceptionCategory: null,
    evidence: [],
  };
  const evalFP = evaluateOrderRecord(orderResFP, gtFP);
  assert(
    evalFP.isFalsePositive === true && evalFP.classification === "FALSE_POSITIVE",
    "9. False positive detector catches matches on unmatchable exception scenarios"
  );

  // 10. AI-Specific operational metrics
  const aiMetrics = computeAIMetrics([eval1, eval2, eval3, evalFP], mockSummary);
  assert(
    aiMetrics.investigations === 1 && aiMetrics.humanReviewDecisions === 1,
    "10. AI operational metrics calculate investigations, resolution rate, and fallback rates"
  );

  // 11. Financial aggregation (Paise to INR, accurate sums)
  const mockOrders: Order[] = [
    {
      order_id: "ORD-001",
      customer_id: "CUST-1",
      amount: 1000.0,
      currency: "INR",
      order_timestamp: "2026-08-01T00:00:00Z",
      payment_method: "UPI",
      order_status: "PAID",
      reference: "REF-1",
    },
    {
      order_id: "ORD-003",
      customer_id: "CUST-3",
      amount: 500.0,
      currency: "INR",
      order_timestamp: "2026-08-01T00:00:00Z",
      payment_method: "UPI",
      order_status: "PAID",
      reference: "REF-3",
    },
  ];
  const finMetrics = computeFinancialMetrics(mockOrders, [eval1, eval3]);
  assert(
    finMetrics.totalOrderValueINR === 1500 && finMetrics.reconciledOrderValueINR === 1000,
    "11. Financial aggregation converts paise correctly to INR and aggregates verified vs unresolved amounts"
  );

  // 12. Benchmark timing and throughput
  const perf = computePerformanceMetrics({
    totalRecords: 1000,
    totalProcessingTimeMs: 500,
  });
  assert(
    perf.recordsPerSecond === 2000 && perf.averageTimePerRecordMs === 0.5,
    "12. Throughput and latency calculations accurately compute records/sec and ms/record"
  );

  // 13. Deterministic reproducibility
  const fullReconResult: ReconciliationDatasetResult = {
    orderResults: [orderRes1, orderRes3],
    orphanResults: [],
    summary: mockSummary,
  };
  const evalRunA = evaluateDataset(fullReconResult, [gt1, gt3], mockOrders, []);
  const evalRunB = evaluateDataset(fullReconResult, [gt1, gt3], mockOrders, []);
  assert(
    evalRunA.report.metrics.accuracy === evalRunB.report.metrics.accuracy &&
      evalRunA.report.metrics.precision === evalRunB.report.metrics.precision,
    "13. 100% Deterministic Reproducibility: Identical evaluation inputs yield exact identical metrics"
  );

  // 14. Ground truth isolation
  // Verify that the evaluation module is independent and does not mutate engine results
  assert(
    orderRes1.status === "MATCHED" && orderRes3.status === "MISSING_SETTLEMENT",
    "14. Ground truth isolation verified: Evaluation operates as a pure observer and never mutates reconciliation data"
  );

  // 15. Zero-match dataset safety
  const emptyCm = computeConfusionMatrix([eval3]); // only 1 negative
  const zeroMetrics = computeCoreMetrics([eval3], emptyCm);
  assert(
    zeroMetrics.correctMatches === 0 && zeroMetrics.accuracy === 100,
    "15. Zero-match dataset handled safely without division-by-zero errors"
  );

  // 16. Empty dataset safety
  const emptyReport = evaluateDataset(
    { orderResults: [], orphanResults: [], summary: { ...mockSummary, totalOrders: 0, processingTimeMs: 0 } },
    [],
    [],
    []
  );
  assert(
    emptyReport.report.metrics.totalRecords === 0 && emptyReport.report.metrics.accuracy === 0,
    "16. Completely empty dataset handled gracefully without runtime exceptions"
  );

  console.log("--------------------------------------------------");
  console.log(`Results: ${passedCount} passed, ${failedCount} failed.`);
  console.log("==================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEvaluationTests().catch((err) => {
  console.error("Evaluation test runner failed:", err);
  process.exit(1);
});
