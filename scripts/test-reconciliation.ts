/**
 * TallyKai — Deterministic and Fuzzy Reconciliation Engine Test Suite
 * Validates Phase 3 & Phase 4 Matching Rules, Similarity Metrics, Ambiguity Margins, Isolation, and Benchmarks.
 */

import fs from "fs";
import path from "path";
import { CanonicalTransaction } from "../src/lib/normalization/types";
import {
  reconcileDataset,
  evaluateSingleSettlement,
  evaluateMultipleSettlements,
  evaluateMissingSettlement,
  buildSettlementIndex,
  buildOrderIndex,
  calculateReferenceSimilarity,
  calculateAmountSimilarity,
  calculateDateSimilarity,
  calculateCustomerSimilarity,
  scoreCandidate,
  evaluateFuzzyOrder,
} from "../src/lib/reconciliation";
import {
  DEFAULT_RECONCILIATION_CONFIG,
  DEFAULT_FUZZY_CONFIG,
} from "../src/lib/reconciliation/config";

function runTests() {
  console.log("==================================================");
  console.log("Running TallyKai Phase 4 Reconciliation Test Suite");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const baseOrder: CanonicalTransaction = {
    source: "ORDER_LEDGER",
    sourceRecordId: "ORD-00125",
    orderId: "ORD-00125",
    transactionReference: "WEB-AB123",
    customerId: "CUS-101",
    amount: 249900, // ₹2,499.00
    amountMinor: 249900,
    currency: "INR",
    timestamp: "2026-08-01T10:00:00.000Z",
    status: "PAID",
    paymentMethod: "UPI",
    fee: null,
    feeMinor: null,
    tax: null,
    taxMinor: null,
    refundAmount: 0,
    refundAmountMinor: 0,
    metadata: {},
  };

  const baseSettlement: CanonicalTransaction = {
    source: "SETTLEMENT",
    sourceRecordId: "SET-1001",
    orderId: "ORD-00125",
    transactionReference: "WEB-AB123",
    customerId: "CUS-101",
    amount: 249900,
    amountMinor: 249900,
    currency: "INR",
    timestamp: "2026-08-01T14:00:00.000Z",
    status: "SETTLED",
    paymentMethod: null,
    fee: null,
    feeMinor: null,
    tax: null,
    taxMinor: null,
    refundAmount: 0,
    refundAmountMinor: 0,
    metadata: {},
  };

  // ----------------------------------------------------
  // Test 1: Similar references produce high similarity
  // ----------------------------------------------------
  const sim1A = calculateReferenceSimilarity("ORD-00125", "ORD00125");
  const sim1B = calculateReferenceSimilarity("WEB-AB123", "WEB AB123");
  const sim1C = calculateReferenceSimilarity("ORD-00125", "ORD-00125");

  assert(
    sim1A >= 0.95 && sim1B >= 0.95 && sim1C === 1.0,
    "1. Similar references produce high similarity (>= 0.95) with whitespace/delimiter variations"
  );

  // ----------------------------------------------------
  // Test 2: Different references produce low similarity
  // ----------------------------------------------------
  const sim2A = calculateReferenceSimilarity("ORD-00125", "ORD-99125");
  const sim2B = calculateReferenceSimilarity("WEB-AB123", "PAY-XYZ999");

  assert(
    sim2A < 0.70 && sim2B < 0.30,
    `2. Different references produce low similarity (ORD-00125 vs ORD-99125 = ${sim2A}, WEB vs PAY = ${sim2B})`
  );

  // ----------------------------------------------------
  // Test 3: Exact amounts score 1.0 in minor units
  // ----------------------------------------------------
  const amtSimExact = calculateAmountSimilarity(249900, 249900);
  assert(
    amtSimExact === 1.0,
    "3. Exact amounts in minor units score perfectly (1.0)"
  );

  // ----------------------------------------------------
  // Test 4: Slight amount differences score reasonably
  // ----------------------------------------------------
  // Order: ₹2,499.00 (249900 paise), Settled minus 2% fee (₹50) + 18% GST (₹9) = ₹2,440.00 (244000 paise)
  const amtSimFee = calculateAmountSimilarity(249900, 244000);
  const amtSimRounding = calculateAmountSimilarity(249900, 249800); // 100 paise difference

  assert(
    amtSimFee >= 0.95 && amtSimRounding >= 0.98,
    `4. Slight amount differences within fee bounds or rounding score reasonably high (Fee: ${amtSimFee}, Rounding: ${amtSimRounding})`
  );

  // ----------------------------------------------------
  // Test 5: Large amount differences score poorly
  // ----------------------------------------------------
  const amtSimLarge = calculateAmountSimilarity(247400, 390000); // ₹2,474 vs ₹3,900
  assert(
    amtSimLarge < 0.30,
    `5. Large amount differences score poorly (₹2,474 vs ₹3,900 = ${amtSimLarge} < 0.30)`
  );

  // ----------------------------------------------------
  // Test 6: T+1 settlement scores appropriately
  // ----------------------------------------------------
  const dateSimT1 = calculateDateSimilarity(
    "2026-08-01T10:00:00.000Z",
    "2026-08-02T14:00:00.000Z" // T+1 (28 hours delay)
  );

  assert(
    dateSimT1.score >= 0.90 && dateSimT1.delayDays >= 1.0 && dateSimT1.delayDays <= 1.5,
    `6. T+1 settlement date lag scores appropriately (Score: ${dateSimT1.score}, Delay: ${dateSimT1.delayDays} days)`
  );

  // ----------------------------------------------------
  // Test 7: Out-of-window dates are rejected
  // ----------------------------------------------------
  const dateSimOutOfWindow = calculateDateSimilarity(
    "2026-08-01T10:00:00.000Z",
    "2026-08-15T10:00:00.000Z", // 14 days delay (> 7 days)
    7.0
  );

  assert(
    dateSimOutOfWindow.score === 0.0,
    "7. Out-of-window settlement dates (>7 days) are rejected (score: 0.0)"
  );

  // ----------------------------------------------------
  // Test 8: Same customer increases score
  // ----------------------------------------------------
  const custSimSame = calculateCustomerSimilarity(
    { ...baseOrder, customerId: "CUS-101" },
    { ...baseSettlement, customerId: "CUS-101" }
  );

  assert(
    custSimSame === 1.0,
    "8. Identical customer IDs provide a strong positive signal (score: 1.0)"
  );

  // ----------------------------------------------------
  // Test 9: Conflicting customer IDs reduce score
  // ----------------------------------------------------
  const custSimDiff = calculateCustomerSimilarity(
    { ...baseOrder, customerId: "CUS-101" },
    { ...baseSettlement, customerId: "CUS-999" }
  );

  assert(
    custSimDiff === 0.0,
    "9. Conflicting customer IDs provide a strong negative signal (score: 0.0)"
  );

  // ----------------------------------------------------
  // Test 10: High-confidence candidate is resolved
  // ----------------------------------------------------
  const fuzzyOrder: CanonicalTransaction = {
    ...baseOrder,
    sourceRecordId: "ORD-00125",
    orderId: "ORD-00125",
    transactionReference: "WEB-AB123",
  };

  const fuzzySettlementMatch: CanonicalTransaction = {
    ...baseSettlement,
    sourceRecordId: "SET-2001",
    orderId: null, // Order ID omitted by gateway
    transactionReference: "WEB AB123", // Space instead of hyphen
    amount: 247400, // ₹2,474.00 (Standard net payout)
    amountMinor: 247400,
    timestamp: "2026-08-02T10:00:00.000Z", // T+1
  };

  const fuzzyEvalResolved = evaluateFuzzyOrder(
    fuzzyOrder,
    [fuzzySettlementMatch],
    DEFAULT_FUZZY_CONFIG
  );

  assert(
    fuzzyEvalResolved.resolution === "RESOLVED" &&
      (fuzzyEvalResolved.result.status === "MATCHED" ||
        fuzzyEvalResolved.result.status === "MATCHED_AFTER_ADJUSTMENTS") &&
      fuzzyEvalResolved.result.confidence >= DEFAULT_FUZZY_CONFIG.thresholds.highConfidence &&
      fuzzyEvalResolved.result.settlementIds[0] === "SET-2001",
    `10. High-confidence candidate (Score: ${fuzzyEvalResolved.result.confidence}) is resolved with status ${fuzzyEvalResolved.result.status} and method ${fuzzyEvalResolved.result.matchMethod}`
  );

  // ----------------------------------------------------
  // Test 11: Low-confidence candidate remains unresolved
  // ----------------------------------------------------
  const lowConfidenceSettlement: CanonicalTransaction = {
    ...baseSettlement,
    sourceRecordId: "SET-LOW-999",
    orderId: "ORD-88888",
    transactionReference: "UNRELATED-REF",
    amount: 990000,
    amountMinor: 990000,
    timestamp: "2026-08-05T10:00:00.000Z",
  };

  const fuzzyEvalLow = evaluateFuzzyOrder(
    fuzzyOrder,
    [lowConfidenceSettlement],
    DEFAULT_FUZZY_CONFIG
  );

  assert(
    fuzzyEvalLow.resolution === "UNRESOLVED" &&
      (fuzzyEvalLow.result.status === "MISSING_SETTLEMENT" ||
        fuzzyEvalLow.result.status === "UNRESOLVED") &&
      fuzzyEvalLow.result.exceptionCategory === "FUZZY_LOW_CONFIDENCE",
    "11. Low-confidence candidate remains unresolved with FUZZY_LOW_CONFIDENCE exception category"
  );

  // ----------------------------------------------------
  // Test 12: Two similarly scored candidates become ambiguous
  // ----------------------------------------------------
  const candidateA: CanonicalTransaction = {
    ...baseSettlement,
    sourceRecordId: "SET-CAND-A",
    orderId: null,
    transactionReference: "WEB-AB123-1",
    amount: 247400,
    amountMinor: 247400,
    timestamp: "2026-08-02T10:00:00.000Z",
  };

  const candidateB: CanonicalTransaction = {
    ...baseSettlement,
    sourceRecordId: "SET-CAND-B",
    orderId: null,
    transactionReference: "WEB-AB123-2",
    amount: 247400,
    amountMinor: 247400,
    timestamp: "2026-08-02T10:00:00.000Z",
  };

  const fuzzyEvalAmbiguous = evaluateFuzzyOrder(
    fuzzyOrder,
    [candidateA, candidateB],
    DEFAULT_FUZZY_CONFIG
  );

  assert(
    fuzzyEvalAmbiguous.resolution === "AMBIGUOUS" &&
      fuzzyEvalAmbiguous.result.status === "AMBIGUOUS" &&
      fuzzyEvalAmbiguous.result.exceptionCategory === "AMBIGUOUS_MATCH" &&
      fuzzyEvalAmbiguous.result.settlementIds.length === 2,
    `12. Two similarly scored candidates produce AMBIGUOUS status with AMBIGUOUS_MATCH exception category`
  );

  // ----------------------------------------------------
  // Test 13: Deterministic results are never overridden
  // ----------------------------------------------------
  const exactOrder: CanonicalTransaction = {
    ...baseOrder,
    sourceRecordId: "ORD-EXACT-1",
    orderId: "ORD-EXACT-1",
    transactionReference: "EXACT-REF-1",
  };

  const exactSettlement: CanonicalTransaction = {
    ...baseSettlement,
    sourceRecordId: "SET-EXACT-1",
    orderId: "ORD-EXACT-1",
    transactionReference: "EXACT-REF-1",
  };

  const distractorSettlement: CanonicalTransaction = {
    ...baseSettlement,
    sourceRecordId: "SET-DISTRACTOR-1",
    orderId: null,
    transactionReference: "EXACT REF 1",
  };

  const reconPipelineResult = reconcileDataset(
    [exactOrder],
    [exactSettlement, distractorSettlement]
  );

  const exactOrderResult = reconPipelineResult.orderResults.find(
    (r) => r.orderId === "ORD-EXACT-1"
  );

  assert(
    exactOrderResult !== undefined &&
      exactOrderResult.status === "MATCHED" &&
      exactOrderResult.matchMethod === "EXACT_REFERENCE" &&
      exactOrderResult.settlementIds[0] === "SET-EXACT-1" &&
      reconPipelineResult.orphanResults.some((o) => o.settlementId === "SET-DISTRACTOR-1"),
    "13. Safety rule verified: Deterministic matches are never overridden by fuzzy matcher"
  );

  // ----------------------------------------------------
  // Test 14: Ground truth is not used during matching
  // ----------------------------------------------------
  const reconDir = path.join(process.cwd(), "src", "lib", "reconciliation");
  const reconFiles = fs.readdirSync(reconDir);
  let groundTruthImportedInCore = false;

  const coreReconFiles = [
    "engine.ts",
    "rules.ts",
    "indexer.ts",
    "config.ts",
    "types.ts",
    "similarity.ts",
    "candidateIndex.ts",
    "fuzzyMatcher.ts",
  ];

  for (const file of coreReconFiles) {
    if (fs.existsSync(path.join(reconDir, file))) {
      const content = fs.readFileSync(path.join(reconDir, file), "utf-8");
      if (
        content.includes("ground-truth.json") ||
        content.includes("groundTruth.ts") ||
        content.includes("GroundTruthRecord")
      ) {
        groundTruthImportedInCore = true;
        break;
      }
    }
  }

  assert(
    !groundTruthImportedInCore,
    "14. Ground truth isolation verified: Core fuzzy & deterministic engines never import or reference ground truth"
  );

  // ----------------------------------------------------
  // Test 15: Determinism / Idempotency
  // ----------------------------------------------------
  const runA = reconcileDataset([fuzzyOrder], [fuzzySettlementMatch]);
  const runB = reconcileDataset([fuzzyOrder], [fuzzySettlementMatch]);

  assert(
    JSON.stringify(runA.orderResults) === JSON.stringify(runB.orderResults) &&
      runA.summary.totalMatched === runB.summary.totalMatched,
    "15. 100% Deterministic & Idempotent: Repeated runs produce identical results"
  );

  // ----------------------------------------------------
  // Test 16: Scalability & Performance Benchmark (5,000 records)
  // ----------------------------------------------------
  const bulkOrders: CanonicalTransaction[] = Array.from({ length: 2500 }, (_, i) => ({
    ...baseOrder,
    sourceRecordId: `ORD-${(i + 1).toString().padStart(6, "0")}`,
    orderId: `ORD-${(i + 1).toString().padStart(6, "0")}`,
    transactionReference: `REF-${(i + 1).toString().padStart(6, "0")}`,
  }));

  const bulkSettlements: CanonicalTransaction[] = Array.from({ length: 2500 }, (_, i) => ({
    ...baseSettlement,
    sourceRecordId: `SET-${(i + 1).toString().padStart(6, "0")}`,
    orderId: `ORD-${(i + 1).toString().padStart(6, "0")}`,
    transactionReference: `REF ${(i + 1).toString().padStart(6, "0")}`, // Spaced ref to test fuzzy indexing
  }));

  const benchStart = performance.now();
  const bulkRecon = reconcileDataset(bulkOrders, bulkSettlements);
  const benchDuration = performance.now() - benchStart;

  assert(
    bulkRecon.summary.totalOrders === 2500 &&
      bulkRecon.summary.totalMatched === 2500 &&
      benchDuration < 350,
    `16. Performance benchmark: Reconciled 5,000 records in ${benchDuration.toFixed(2)}ms (<350ms threshold)`
  );

  console.log("--------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
