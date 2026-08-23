/**
 * TallyKai — Deterministic Reconciliation CLI & Reporting Script
 * Usage:
 *   npx tsx scripts/reconcile-data.ts
 *   npm run reconcile:data
 */

import fs from "fs";
import path from "path";
import { normalizeDataset } from "../src/lib/normalization";
import {
  reconcileDataset,
  evaluateReconciliationAgainstGroundTruth,
} from "../src/lib/reconciliation";

function main() {
  const dataDir = path.join(process.cwd(), "data", "generated");
  const ordersPath = path.join(dataDir, "orders.json");
  const settlementsPath = path.join(dataDir, "settlements.json");
  const groundTruthPath = path.join(dataDir, "ground-truth.json");

  if (!fs.existsSync(ordersPath) || !fs.existsSync(settlementsPath)) {
    console.error(
      "❌ Datasets not found! Please run 'npm run generate:data' first."
    );
    process.exit(1);
  }

  console.log("Loading datasets and normalizing transactions...\n");

  const rawOrders = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));
  const rawSettlements = JSON.parse(fs.readFileSync(settlementsPath, "utf-8"));

  // 1. Normalization Layer (Phase 2)
  const normStart = performance.now();
  const normResult = normalizeDataset(rawOrders, rawSettlements);
  const normElapsed = (performance.now() - normStart).toFixed(2);

  const orders = normResult.normalizedRecords.filter((r) => r.source === "ORDER_LEDGER");
  const settlements = normResult.normalizedRecords.filter((r) => r.source === "SETTLEMENT");

  // 2. Deterministic Reconciliation Engine (Phase 3)
  const reconStart = performance.now();
  const result = reconcileDataset(orders, settlements);
  const reconElapsed = (performance.now() - reconStart).toFixed(2);

  // 3. Print Structured Output
  console.log("==================================================");
  console.log("TallyKai Reconciliation Summary");
  console.log("==================================================");
  console.log(`Orders:      ${result.summary.totalOrders}`);
  console.log(`Settlements: ${result.summary.totalSettlements}`);
  console.log("");
  console.log("Results");
  console.log("-------");
  console.log(`Matched:                  ${result.summary.matched}`);
  console.log(`Matched after adjustment: ${result.summary.matchedAfterAdjustments}`);
  console.log(`Missing settlement:       ${result.summary.missingSettlements}`);
  console.log(`Partial settlement:       ${result.summary.partialSettlements}`);
  console.log(`Duplicates:               ${result.summary.duplicates}`);
  console.log(`Orphans:                  ${result.summary.orphanSettlements}`);
  console.log(`Unresolved:               ${result.summary.unresolved}`);
  console.log(`Total Exceptions:         ${result.summary.exceptions}`);
  console.log("");
  console.log(`Deterministic resolution: ${result.summary.deterministicResolutionRate}%`);
  console.log(`Normalization time:       ${normElapsed} ms`);
  console.log(`Reconciliation time:      ${reconElapsed} ms`);
  console.log("==================================================");

  // 4. Ground Truth Evaluation Benchmark (if available)
  if (fs.existsSync(groundTruthPath)) {
    const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, "utf-8"));
    const evalReport = evaluateReconciliationAgainstGroundTruth(result, groundTruth);

    console.log("\nGround Truth Evaluation Benchmark");
    console.log("----------------------------------");
    console.log(`Total Evaluated:          ${evalReport.totalEvaluated}`);
    console.log(`Correct Classifications:  ${evalReport.correctClassifications}`);
    console.log(`Accuracy:                 ${evalReport.accuracy}%`);
    console.log(`Precision:                ${evalReport.precision}%`);
    console.log(`Recall:                   ${evalReport.recall}%`);
    console.log(`F1 Score:                 ${evalReport.f1Score}%`);
    console.log("----------------------------------");
    console.log("Scenario Breakdown:");
    for (const sc of evalReport.scenarioBreakdown) {
      console.log(
        ` - ${sc.scenario.padEnd(22)}: ${sc.correct}/${sc.total} (${sc.accuracy}%)`
      );
    }
    console.log("==================================================");
  }

  // 5. Save Output Artifacts
  const resultsPath = path.join(dataDir, "reconciliation-results.json");
  const summaryPath = path.join(dataDir, "reconciliation-summary.json");

  fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), "utf-8");
  fs.writeFileSync(summaryPath, JSON.stringify(result.summary, null, 2), "utf-8");

  console.log(`\n✓ Reconciliation results saved to: ${resultsPath}`);
  console.log(`✓ Summary metrics saved to:        ${summaryPath}\n`);
}

main();
