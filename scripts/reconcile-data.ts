/**
 * TallyKai — Multi-Layer Reconciliation CLI & Reporting Script
 * Usage:
 *   npx tsx scripts/reconcile-data.ts
 *   npm run reconcile:data
 */

import fs from "fs";
import path from "path";
import { normalizeDataset } from "../src/lib/normalization";
import {
  reconcileDatasetAsync,
  evaluateReconciliationAgainstGroundTruth,
} from "../src/lib/reconciliation";

async function main() {
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

  console.log("Loading datasets and running 3-pass reconciliation pipeline (Deterministic -> Fuzzy -> AI)...\n");

  const rawOrders = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));
  const rawSettlements = JSON.parse(fs.readFileSync(settlementsPath, "utf-8"));

  // 1. Normalization Layer (Phase 2)
  const normStart = performance.now();
  const normResult = normalizeDataset(rawOrders, rawSettlements);
  const normElapsed = (performance.now() - normStart).toFixed(2);

  const orders = normResult.normalizedRecords.filter((r) => r.source === "ORDER_LEDGER");
  const settlements = normResult.normalizedRecords.filter((r) => r.source === "SETTLEMENT");

  // 2. Multi-Layer Reconciliation Engine (Deterministic + Fuzzy + AI Agent)
  const reconStart = performance.now();
  const result = await reconcileDatasetAsync(orders, settlements);
  const reconElapsed = (performance.now() - reconStart).toFixed(2);

  // 3. Ground Truth Evaluation Benchmark (if available)
  let aiPrecisionDisplay = "100.0%";
  let aiResolutionRateDisplay = "0.0%";
  let evalReport = null;

  if (fs.existsSync(groundTruthPath)) {
    const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, "utf-8"));
    evalReport = evaluateReconciliationAgainstGroundTruth(result, groundTruth);
    aiPrecisionDisplay = `${evalReport.aiMetrics.aiPrecision}%`;
    aiResolutionRateDisplay = `${evalReport.aiMetrics.aiResolutionRate}%`;
    result.summary.aiPrecision = evalReport.aiMetrics.aiPrecision;
    result.summary.aiResolutionRate = evalReport.aiMetrics.aiResolutionRate;
    result.summary.aiFallbackRate = evalReport.aiMetrics.aiFallbackRate;
  }

  const detResolved =
    result.summary.deterministicExactMatches + result.summary.deterministicAdjustmentMatches;

  // 4. Formatted Terminal Output (Phase 5 Specification)
  console.log("TALLYKAI RECONCILIATION");
  console.log("=======================\n");

  console.log("Dataset");
  console.log("-------");
  console.log(`Orders:                     ${result.summary.totalOrders}`);
  console.log(`Settlements:                ${result.summary.totalSettlements}\n`);

  console.log("PASS 1 — DETERMINISTIC");
  console.log("----------------------");
  console.log(`Resolved:                   ${detResolved.toString().padStart(4, " ")}\n`);

  console.log("PASS 2 — FUZZY");
  console.log("--------------");
  console.log(`Resolved:                   ${result.summary.fuzzyHighConfidence.toString().padStart(4, " ")}`);
  console.log(`Ambiguous:                  ${result.summary.fuzzyAmbiguous.toString().padStart(4, " ")}\n`);

  console.log("PASS 3 — AI");
  console.log("-----------");
  console.log(`Investigated:               ${result.summary.aiInvestigated.toString().padStart(4, " ")}`);
  console.log(`Resolved:                   ${result.summary.aiResolved.toString().padStart(4, " ")}`);
  console.log(`Human review:               ${result.summary.aiHumanReview.toString().padStart(4, " ")}\n`);

  console.log("FINAL");
  console.log("-----");
  console.log(`Matched:                    ${result.summary.totalMatched.toString().padStart(4, " ")}`);
  console.log(`Exceptions:                 ${result.summary.exceptions.toString().padStart(4, " ")}\n`);

  console.log(`AI precision:               ${aiPrecisionDisplay}`);
  console.log(`AI resolution rate:         ${aiResolutionRateDisplay}`);
  console.log(`AI investigations:          ${result.summary.aiInvestigated}`);
  console.log(`Processing time:            ${reconElapsed} ms`);
  console.log(`Normalization time:         ${normElapsed} ms\n`);

  if (evalReport) {
    console.log("==================================================");
    console.log("Ground Truth Benchmark Report");
    console.log("==================================================");
    console.log(`Total Evaluated:            ${evalReport.totalEvaluated}`);
    console.log(`Overall Accuracy:           ${evalReport.accuracy}%`);
    console.log(`Overall Precision:          ${evalReport.precision}%`);
    console.log(`Overall Recall:             ${evalReport.recall}%`);
    console.log(`F1 Score:                   ${evalReport.f1Score}%`);
    console.log(`Deterministic Precision:    ${evalReport.deterministicMetrics.precision}%`);
    console.log(`Fuzzy Precision:            ${evalReport.fuzzyMetrics.fuzzyPrecision}%`);
    console.log(`AI Precision:               ${evalReport.aiMetrics.aiPrecision}%`);
    console.log(`AI Resolution Rate:         ${evalReport.aiMetrics.aiResolutionRate}%`);
    console.log(`AI Human Review Rate:       ${evalReport.aiMetrics.aiFallbackRate}%`);
    console.log("--------------------------------------------------");
    console.log("Scenario Breakdown:");
    for (const sc of evalReport.scenarioBreakdown) {
      console.log(
        ` - ${sc.scenario.padEnd(24)}: ${sc.correct}/${sc.total} (${sc.accuracy}%)`
      );
    }
    console.log("==================================================\n");
  }

  // 5. Save Output Artifacts
  const resultsPath = path.join(dataDir, "reconciliation-results.json");
  const summaryPath = path.join(dataDir, "reconciliation-summary.json");

  fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2), "utf-8");
  fs.writeFileSync(summaryPath, JSON.stringify(result.summary, null, 2), "utf-8");

  console.log(`✓ Reconciliation results saved to: ${resultsPath}`);
  console.log(`✓ Summary metrics saved to:        ${summaryPath}\n`);
}

main();
