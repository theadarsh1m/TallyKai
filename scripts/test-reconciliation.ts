/**
 * TallyKai — Deterministic Reconciliation Engine Test Suite
 * Validates Phase 3 Matching Rules, Date Lag, Rounding, Partial Splits, Duplicates, and Isolation.
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
} from "../src/lib/reconciliation";
import { DEFAULT_RECONCILIATION_CONFIG } from "../src/lib/reconciliation/config";

function runTests() {
  console.log("==================================================");
  console.log("Running TallyKai Phase 3 Reconciliation Tests");
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
    sourceRecordId: "ORD-1001",
    orderId: "ORD-1001",
    transactionReference: "WEB-REF-1001",
    customerId: "CUS-101",
    amount: 500000, // ₹5,000.00
    amountMinor: 500000,
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

  const dummyOrderIndex = buildOrderIndex([baseOrder]);

  // ----------------------------------------------------
  // Test 1: Exact Reference Match
  // ----------------------------------------------------
  const exactSettlement: CanonicalTransaction = {
    source: "SETTLEMENT",
    sourceRecordId: "SET-2001",
    orderId: "ORD-1001",
    transactionReference: "WEB-REF-1001",
    customerId: null,
    amount: 500000,
    amountMinor: 500000,
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

  const res1 = evaluateSingleSettlement(
    baseOrder,
    exactSettlement,
    DEFAULT_RECONCILIATION_CONFIG,
    dummyOrderIndex
  );

  assert(
    res1.status === "MATCHED" &&
      res1.matchMethod === "EXACT_REFERENCE" &&
      res1.confidence === 1.0 &&
      res1.amountDifferenceMinor === 0,
    "1. Exact reference match with full gross amount achieves MATCHED status (confidence 1.0)"
  );

  // ----------------------------------------------------
  // Test 2: Fee-Adjusted Match
  // ----------------------------------------------------
  const feeSettlement: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-2002",
    amount: 490000, // ₹4,900.00 (₹100 fee)
    amountMinor: 490000,
    fee: 10000,
    feeMinor: 10000,
    tax: null,
    taxMinor: null,
  };

  const res2 = evaluateSingleSettlement(
    baseOrder,
    feeSettlement,
    DEFAULT_RECONCILIATION_CONFIG,
    dummyOrderIndex
  );

  assert(
    res2.status === "MATCHED_AFTER_ADJUSTMENTS" &&
      res2.matchMethod === "FEE_ADJUSTED" &&
      res2.confidence === 1.0,
    "2. Fee-adjusted match reconciles order minus MDR fee accurately"
  );

  // ----------------------------------------------------
  // Test 3: Tax-Adjusted Match
  // ----------------------------------------------------
  const taxSettlement: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-2003",
    amount: 488200, // ₹4,882.00 (₹100 fee + ₹18 tax)
    amountMinor: 488200,
    fee: 10000,
    feeMinor: 10000,
    tax: 1800,
    taxMinor: 1800,
  };

  const res3 = evaluateSingleSettlement(
    baseOrder,
    taxSettlement,
    DEFAULT_RECONCILIATION_CONFIG,
    dummyOrderIndex
  );

  assert(
    res3.status === "MATCHED_AFTER_ADJUSTMENTS" &&
      res3.matchMethod === "TAX_ADJUSTED" &&
      res3.confidence === 1.0,
    "3. Tax-adjusted match reconciles order minus fee and 18% GST tax"
  );

  // ----------------------------------------------------
  // Test 4: Rounding Tolerance Match
  // ----------------------------------------------------
  const roundingSettlement: CanonicalTransaction = {
    ...taxSettlement,
    sourceRecordId: "SET-2004",
    amount: 488300, // ₹1.00 rounding variance (100 paise)
    amountMinor: 488300,
  };

  const res4 = evaluateSingleSettlement(
    baseOrder,
    roundingSettlement,
    DEFAULT_RECONCILIATION_CONFIG,
    dummyOrderIndex
  );

  assert(
    res4.status === "MATCHED_AFTER_ADJUSTMENTS" &&
      res4.matchMethod === "ROUNDING_TOLERANCE" &&
      res4.confidence === 0.97 &&
      res4.amountDifferenceMinor === 100,
    "4. Minor variance within configured tolerance (100 paise) matches with ROUNDING_TOLERANCE"
  );

  // ----------------------------------------------------
  // Test 5: Date Drift Handling (within window vs out of range)
  // ----------------------------------------------------
  const delayedSettlement: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-2005",
    timestamp: "2026-08-06T10:00:00.000Z", // 5 days delay (T+5, exceeds T+3)
  };

  const res5 = evaluateSingleSettlement(
    baseOrder,
    delayedSettlement,
    DEFAULT_RECONCILIATION_CONFIG,
    dummyOrderIndex
  );

  assert(
    res5.status === "EXCEPTION" &&
      res5.exceptionCategory === "DATE_OUT_OF_RANGE",
    "5. Settlement delayed beyond configured threshold (T+5) is flagged as DATE_OUT_OF_RANGE exception"
  );

  // ----------------------------------------------------
  // Test 6: Missing Settlement
  // ----------------------------------------------------
  const res6 = evaluateMissingSettlement(baseOrder);
  assert(
    res6.status === "MISSING_SETTLEMENT" &&
      res6.exceptionCategory === "MISSING_SETTLEMENT" &&
      res6.settlementIds.length === 0,
    "6. Order with 0 matching candidate settlements produces MISSING_SETTLEMENT status"
  );

  // ----------------------------------------------------
  // Test 7: Orphan Settlement Detection
  // ----------------------------------------------------
  const orphanSettlement: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-9999",
    orderId: "NON-EXISTENT-ORDER",
    transactionReference: "ORPHAN-REF-999",
  };

  const batchRecon = reconcileDataset([baseOrder], [exactSettlement, orphanSettlement]);
  assert(
    batchRecon.orphanResults.length === 1 &&
      batchRecon.orphanResults[0].settlementId === "SET-9999" &&
      batchRecon.orphanResults[0].status === "ORPHAN_SETTLEMENT",
    "7. Unmatched settlement is correctly categorized into orphanResults list"
  );

  // ----------------------------------------------------
  // Test 8: Duplicate Settlement Detection
  // ----------------------------------------------------
  const dupSettlement1: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-DUP-1",
  };
  const dupSettlement2: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-DUP-2",
    timestamp: "2026-08-01T18:00:00.000Z",
  };

  const res8 = evaluateMultipleSettlements(
    baseOrder,
    [dupSettlement1, dupSettlement2],
    DEFAULT_RECONCILIATION_CONFIG
  );

  assert(
    res8.status === "DUPLICATE" &&
      res8.exceptionCategory === "DUPLICATE_SETTLEMENT" &&
      res8.settlementIds.length === 2,
    "8. Multiple settlements paying full amount for one order are flagged as DUPLICATE_SETTLEMENT"
  );

  // ----------------------------------------------------
  // Test 9: Partial Settlement Combined Match
  // ----------------------------------------------------
  const partSettlement1: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-PART-1",
    amount: 300000, // ₹3,000.00
    amountMinor: 300000,
  };
  const partSettlement2: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-PART-2",
    amount: 200000, // ₹2,000.00 (Total ₹5,000.00)
    amountMinor: 200000,
    timestamp: "2026-08-02T10:00:00.000Z",
  };

  const res9 = evaluateMultipleSettlements(
    baseOrder,
    [partSettlement1, partSettlement2],
    DEFAULT_RECONCILIATION_CONFIG
  );

  assert(
    res9.status === "MATCHED_AFTER_ADJUSTMENTS" &&
      res9.matchMethod === "PARTIAL_SETTLEMENT" &&
      res9.confidence === 0.98,
    "9. Valid partial settlements totaling exact expected net match with PARTIAL_SETTLEMENT"
  );

  // ----------------------------------------------------
  // Test 10: Partial Settlement Amount Mismatch
  // ----------------------------------------------------
  const badPartSettlement2: CanonicalTransaction = {
    ...partSettlement2,
    sourceRecordId: "SET-PART-BAD",
    amount: 150000, // Total ₹4,500 instead of ₹5,000
    amountMinor: 150000,
  };

  const res10 = evaluateMultipleSettlements(
    baseOrder,
    [partSettlement1, badPartSettlement2],
    DEFAULT_RECONCILIATION_CONFIG
  );

  assert(
    res10.status === "EXCEPTION" &&
      res10.exceptionCategory === "PARTIAL_SETTLEMENT_MISMATCH",
    "10. Partial settlements whose sum deviates from expected net are flagged as PARTIAL_SETTLEMENT_MISMATCH"
  );

  // ----------------------------------------------------
  // Test 11: Single Settlement Amount Mismatch
  // ----------------------------------------------------
  const mismatchSettlement: CanonicalTransaction = {
    ...exactSettlement,
    sourceRecordId: "SET-MISMATCH",
    amount: 350000, // ₹3,500 instead of ₹5,000
    amountMinor: 350000,
  };

  const res11 = evaluateSingleSettlement(
    baseOrder,
    mismatchSettlement,
    DEFAULT_RECONCILIATION_CONFIG,
    dummyOrderIndex
  );

  assert(
    res11.status === "EXCEPTION" &&
      res11.exceptionCategory === "AMOUNT_MISMATCH",
    "11. Single settlement with large variance is categorized as AMOUNT_MISMATCH exception"
  );

  // ----------------------------------------------------
  // Test 12: Ground Truth Isolation Verification
  // ----------------------------------------------------
  const reconDir = path.join(process.cwd(), "src", "lib", "reconciliation");
  const reconFiles = fs.readdirSync(reconDir);
  let groundTruthImportedInCore = false;

  const coreFiles = ["engine.ts", "rules.ts", "indexer.ts", "config.ts", "types.ts"];
  for (const file of coreFiles) {
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
    "12. Core reconciliation engine never imports or references ground truth"
  );

  // ----------------------------------------------------
  // Test 13: Determinism & Idempotency
  // ----------------------------------------------------
  const sampleOrders = [baseOrder];
  const sampleSettlements = [exactSettlement];
  const runA = reconcileDataset(sampleOrders, sampleSettlements);
  const runB = reconcileDataset(sampleOrders, sampleSettlements);

  assert(
    JSON.stringify(runA.orderResults) === JSON.stringify(runB.orderResults) &&
      runA.summary.matched === runB.summary.matched,
    "13. Reconciliation is 100% deterministic (repeated runs produce identical results)"
  );

  // ----------------------------------------------------
  // Test 14: Performance Benchmark (5,000 records)
  // ----------------------------------------------------
  const bulkOrders: CanonicalTransaction[] = Array.from({ length: 2500 }, (_, i) => ({
    ...baseOrder,
    sourceRecordId: `ORD-${(i + 1).toString().padStart(6, "0")}`,
    orderId: `ORD-${(i + 1).toString().padStart(6, "0")}`,
    transactionReference: `REF-${(i + 1).toString().padStart(6, "0")}`,
  }));

  const bulkSettlements: CanonicalTransaction[] = Array.from({ length: 2500 }, (_, i) => ({
    ...exactSettlement,
    sourceRecordId: `SET-${(i + 1).toString().padStart(6, "0")}`,
    orderId: `ORD-${(i + 1).toString().padStart(6, "0")}`,
    transactionReference: `REF-${(i + 1).toString().padStart(6, "0")}`,
  }));

  const benchStart = performance.now();
  const bulkRecon = reconcileDataset(bulkOrders, bulkSettlements);
  const benchDuration = performance.now() - benchStart;

  assert(
    bulkRecon.summary.totalOrders === 2500 &&
      bulkRecon.summary.matched === 2500 &&
      benchDuration < 250,
    `14. Performance benchmark: Reconciled 5,000 records in ${benchDuration.toFixed(2)}ms (<250ms threshold)`
  );

  console.log("--------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
