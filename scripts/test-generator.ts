/**
 * Tallykai — Data Generator Verification Test Suite
 * Minimum automated tests for Phase 1 requirements validation.
 */

import { generateDataset } from "../src/lib/data";

function runTests() {
  console.log("==================================================");
  console.log("Running Tallykai Phase 1 Data Generator Tests");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Default 500 orders generation
  const dataset1 = generateDataset({ count: 500, seed: 42 });
  assert(dataset1.orders.length === 500, "Generates exactly 500 orders by default");

  // Test 2: Unique Order & Settlement IDs
  const orderIds = new Set(dataset1.orders.map((o) => o.order_id));
  assert(orderIds.size === 500, "All order IDs are unique");

  const settlementIds = new Set(dataset1.settlements.map((s) => s.settlement_id));
  assert(settlementIds.size === dataset1.settlements.length, "All settlement IDs are unique");

  // Test 3: Settlement records valid (amounts positive, timestamps valid)
  const validSettlements = dataset1.settlements.every(
    (s) => s.settlement_amount > 0 && !isNaN(Date.parse(s.settlement_timestamp))
  );
  assert(validSettlements, "Settlement records have positive amounts and valid timestamps");

  // Test 4: Ground truth references valid records
  const validGtReferences = dataset1.groundTruth.every((gt) => {
    const validOrder = !gt.order_id || orderIds.has(gt.order_id) || gt.scenario_type === "ORPHAN_SETTLEMENT";
    const validSetts = gt.expected_settlement_ids.every((sid) => settlementIds.has(sid));
    return validOrder && validSetts;
  });
  assert(validGtReferences, "Ground truth records reference valid order and settlement IDs");

  // Test 5: Scenario distribution is reasonable
  const scenarioCounts = dataset1.summary.scenarioDistribution;
  const hasExact = (scenarioCounts["EXACT_MATCH"] ?? 0) > 0;
  const hasFee = (scenarioCounts["FEE_ADJUSTED"] ?? 0) > 0;
  const hasMissing = (scenarioCounts["MISSING_SETTLEMENT"] ?? 0) > 0;
  assert(
    hasExact && hasFee && hasMissing,
    "Scenario distribution contains expected diverse categories"
  );

  // Test 6: Determinism — Same seed produces identical dataset
  const dataset1Again = generateDataset({ count: 500, seed: 42 });
  const sameOrders = JSON.stringify(dataset1.orders) === JSON.stringify(dataset1Again.orders);
  const sameSettlements =
    JSON.stringify(dataset1.settlements) === JSON.stringify(dataset1Again.settlements);
  const sameGt =
    JSON.stringify(dataset1.groundTruth) === JSON.stringify(dataset1Again.groundTruth);
  assert(
    sameOrders && sameSettlements && sameGt,
    "Same seed (42) produces 100% identical dataset"
  );

  // Test 7: Seed variance — Different seed produces different dataset
  const dataset2 = generateDataset({ count: 500, seed: 99 });
  const differentOrders = JSON.stringify(dataset1.orders) !== JSON.stringify(dataset2.orders);
  assert(differentOrders, "Different seed (99) produces different dataset");

  console.log("--------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
