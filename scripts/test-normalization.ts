/**
 * TARI — Normalization Test Suite
 * Validates Phase 2 Data Model, Validation, Normalization, Money, and Isolation.
 */

import fs from "fs";
import path from "path";
import {
  normalizeOrder,
  normalizeSettlement,
  normalizeDataset,
  toMinorUnits,
  fromMinorUnits,
  formatCurrency,
  normalizeTimestamp,
  normalizeReference,
  mapOrderStatusToCanonical,
  mapSettlementStatusToCanonical,
} from "../src/lib/normalization";

function runTests() {
  console.log("==================================================");
  console.log("Running TARI Phase 2 Normalization Tests");
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

  // ----------------------------------------------------
  // Test 1: Valid order normalization
  // ----------------------------------------------------
  const rawOrder = {
    order_id: "ORD-000123",
    customer_id: "CUS-001",
    amount: 2499,
    currency: "INR",
    order_timestamp: "2026-08-01T10:32:14.000Z",
    payment_method: "UPI",
    order_status: "PAID",
    reference: "WEB-ABC123",
  };

  const orderResult = normalizeOrder(rawOrder);
  assert(
    orderResult.transaction !== null &&
      orderResult.transaction.source === "ORDER_LEDGER" &&
      orderResult.transaction.sourceRecordId === "ORD-000123" &&
      orderResult.transaction.orderId === "ORD-000123" &&
      orderResult.transaction.customerId === "CUS-001" &&
      orderResult.transaction.amount === 249900 &&
      orderResult.transaction.amountMinor === 249900 &&
      orderResult.transaction.currency === "INR" &&
      orderResult.transaction.status === "PAID" &&
      orderResult.transaction.paymentMethod === "UPI" &&
      orderResult.transaction.transactionReference === "WEB-ABC123" &&
      orderResult.transaction.fee === null &&
      orderResult.transaction.tax === null &&
      orderResult.transaction.refundAmount === 0,
    "1. Valid order normalization converts all fields correctly to canonical format"
  );

  // ----------------------------------------------------
  // Test 2: Valid settlement normalization
  // ----------------------------------------------------
  const rawSettlement = {
    settlement_id: "SET-00451",
    settlement_reference: "WEB-ABC123",
    order_id: "ORD-000123",
    settlement_amount: 2470,
    settlement_timestamp: "2026-08-01T14:30:00.000Z",
    fee: 25,
    tax: 4,
    settlement_status: "SETTLED",
  };

  const settlementResult = normalizeSettlement(rawSettlement);
  assert(
    settlementResult.transaction !== null &&
      settlementResult.transaction.source === "SETTLEMENT" &&
      settlementResult.transaction.sourceRecordId === "SET-00451" &&
      settlementResult.transaction.orderId === "ORD-000123" &&
      settlementResult.transaction.transactionReference === "WEB-ABC123" &&
      settlementResult.transaction.amount === 247000 &&
      settlementResult.transaction.fee === 2500 &&
      settlementResult.transaction.tax === 400 &&
      settlementResult.transaction.status === "SETTLED",
    "2. Valid settlement normalization converts amounts, fees, and taxes to minor units"
  );

  // ----------------------------------------------------
  // Test 3: Invalid amount rejection
  // ----------------------------------------------------
  const invalidNegativeOrder = { ...rawOrder, amount: -100 };
  const negativeResult = normalizeOrder(invalidNegativeOrder);
  const nanOrder = { ...rawOrder, amount: "not_a_number" };
  const nanResult = normalizeOrder(nanOrder);

  assert(
    negativeResult.transaction === null &&
      negativeResult.errors.some((e) => e.field === "amount") &&
      nanResult.transaction === null &&
      nanResult.errors.some((e) => e.field === "amount"),
    "3. Invalid amount (negative, non-numeric) produces structured validation errors"
  );

  // ----------------------------------------------------
  // Test 4: Invalid date rejection & alternate date format parsing
  // ----------------------------------------------------
  const invalidDateOrder = { ...rawOrder, order_timestamp: "invalid-date-string" };
  const invalidDateResult = normalizeOrder(invalidDateOrder);
  const impossibleDate = normalizeTimestamp("31/02/2026 10:00 AM"); // Feb 31 does not exist
  const dmyValid = normalizeTimestamp("01/08/2026 10:32 AM");

  assert(
    invalidDateResult.transaction === null &&
      invalidDateResult.errors.some((e) => e.field === "order_timestamp") &&
      impossibleDate === null &&
      dmyValid === "2026-08-01T10:32:00.000Z",
    "4. Invalid dates are rejected and standard DMY formats parse into canonical ISO 8601 UTC"
  );

  // ----------------------------------------------------
  // Test 5: Missing ID rejection
  // ----------------------------------------------------
  const missingIdOrder = { ...rawOrder, order_id: "" };
  const missingIdResult = normalizeOrder(missingIdOrder);
  const missingSettlementId = { ...rawSettlement, settlement_id: undefined };
  const missingSettlementResult = normalizeSettlement(missingSettlementId);

  assert(
    missingIdResult.transaction === null &&
      missingIdResult.errors.some((e) => e.field === "order_id") &&
      missingSettlementResult.transaction === null &&
      missingSettlementResult.errors.some((e) => e.field === "settlement_id"),
    "5. Missing required IDs (order_id, settlement_id) fail validation"
  );

  // ----------------------------------------------------
  // Test 6: Status normalization
  // ----------------------------------------------------
  assert(
    mapOrderStatusToCanonical("SUCCESS") === "PAID" &&
      mapOrderStatusToCanonical("COMPLETED") === "PAID" &&
      mapOrderStatusToCanonical("FAILED") === "FAILED" &&
      mapOrderStatusToCanonical("UNKNOWN_STATUS_XYZ") === "UNKNOWN" &&
      mapSettlementStatusToCanonical("PROCESSED") === "SETTLED" &&
      mapSettlementStatusToCanonical("UNRECOGNIZED") === "UNKNOWN",
    "6. Status mapping correctly converts aliases and preserves UNKNOWN fallback"
  );

  // ----------------------------------------------------
  // Test 7: Reference normalization
  // ----------------------------------------------------
  const refWithWhitespace = normalizeReference("   WEB-ABC123\u200B   ");
  const nullRef = normalizeReference(null);
  const preserveExactChars = normalizeReference("ORD-001");

  assert(
    refWithWhitespace === "WEB-ABC123" &&
      nullRef === null &&
      preserveExactChars === "ORD-001" &&
      normalizeReference("ORD001") === "ORD001",
    "7. Reference normalization trims whitespace/artifacts and preserves exact identity"
  );

  // ----------------------------------------------------
  // Test 8: Money conversion & arithmetic safety
  // ----------------------------------------------------
  const test100 = toMinorUnits(100);
  const testFloat = toMinorUnits(2499.5);
  const testFloat2 = toMinorUnits(19.99);
  const fromMinor = fromMinorUnits(249950);
  const formattedINR = formatCurrency(249950, "INR");

  assert(
    test100 === 10000 &&
      testFloat === 249950 &&
      testFloat2 === 1999 &&
      fromMinor === 2499.5 &&
      formattedINR.includes("2,499.50"),
    "8. Money conversion handles integers, float decimals (₹2499.50 -> 249950 paise), and formatting"
  );

  // ----------------------------------------------------
  // Test 9: Determinism / Idempotency
  // ----------------------------------------------------
  const runA = normalizeOrder(rawOrder);
  const runB = normalizeOrder(rawOrder);
  assert(
    JSON.stringify(runA) === JSON.stringify(runB),
    "9. Normalization is 100% deterministic (same input produces identical output)"
  );

  // ----------------------------------------------------
  // Test 10: Ground truth isolation
  // ----------------------------------------------------
  const normalizationDir = path.join(process.cwd(), "src", "lib", "normalization");
  const normFiles = fs.readdirSync(normalizationDir);
  let groundTruthLeaked = false;

  for (const file of normFiles) {
    const content = fs.readFileSync(path.join(normalizationDir, file), "utf-8");
    if (
      content.includes("ground-truth.json") ||
      content.includes("groundTruth.ts") ||
      content.includes("GroundTruthRecord")
    ) {
      groundTruthLeaked = true;
      break;
    }
  }

  assert(
    !groundTruthLeaked,
    "10. Ground truth isolation verified: normalization library never imports ground truth"
  );

  // ----------------------------------------------------
  // Test 11: Dataset Pipeline & Performance Benchmark
  // ----------------------------------------------------
  const bulkOrders = Array.from({ length: 2500 }, (_, i) => ({
    ...rawOrder,
    order_id: `ORD-${(i + 1).toString().padStart(6, "0")}`,
  }));
  const bulkSettlements = Array.from({ length: 2500 }, (_, i) => ({
    ...rawSettlement,
    settlement_id: `SET-${(i + 1).toString().padStart(6, "0")}`,
  }));

  const startBenchmark = performance.now();
  const bulkResult = normalizeDataset(bulkOrders, bulkSettlements);
  const durationMs = performance.now() - startBenchmark;

  assert(
    bulkResult.statistics.total === 5000 &&
      bulkResult.statistics.normalized === 5000 &&
      bulkResult.statistics.failed === 0 &&
      durationMs < 200,
    `11. Performance benchmark: Normalized 5,000 records in ${durationMs.toFixed(2)}ms (<200ms threshold)`
  );

  console.log("--------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
