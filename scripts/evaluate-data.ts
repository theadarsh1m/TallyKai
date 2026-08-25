/**
 * TallyKai — AI Finance Controller
 * Phase 6: Ground Truth Evaluation & Benchmarking CLI
 * 
 * Usage:
 *   npx tsx scripts/evaluate-data.ts
 *   npm run evaluate:data
 */

import fs from "fs";
import path from "path";
import { normalizeDataset } from "../src/lib/normalization";
import { reconcileDatasetAsync } from "../src/lib/reconciliation";
import { evaluateDataset, formatCLIOutput, generateMarkdownReport } from "../src/lib/evaluation";

async function main() {
  const dataDir = path.join(process.cwd(), "data", "generated");
  const reportsDir = path.join(process.cwd(), "data", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const ordersPath = path.join(dataDir, "orders.json");
  const settlementsPath = path.join(dataDir, "settlements.json");
  const groundTruthPath = path.join(dataDir, "ground-truth.json");

  if (!fs.existsSync(ordersPath) || !fs.existsSync(settlementsPath) || !fs.existsSync(groundTruthPath)) {
    console.error("❌ Generated dataset or ground truth not found. Please run 'npm run generate:data' first.");
    process.exit(1);
  }

  const rawOrders = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));
  const rawSettlements = JSON.parse(fs.readFileSync(settlementsPath, "utf-8"));
  const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, "utf-8"));

  // 1. Normalize
  const normStart = performance.now();
  const normResult = normalizeDataset(rawOrders, rawSettlements);
  const normElapsed = performance.now() - normStart;

  const orders = normResult.normalizedRecords.filter((r) => r.source === "ORDER_LEDGER");
  const settlements = normResult.normalizedRecords.filter((r) => r.source === "SETTLEMENT");

  // 2. Reconcile
  const reconResult = await reconcileDatasetAsync(orders, settlements);

  // 3. Evaluate
  const { report } = evaluateDataset(
    reconResult,
    groundTruth,
    rawOrders,
    rawSettlements,
    { normalizationTimeMs: normElapsed, seed: 42 }
  );

  // 4. Print CLI Output
  console.log(formatCLIOutput(report));

  // 5. Save Reports
  const count = rawOrders.length;
  const jsonReportPath = path.join(reportsDir, `evaluation-${count}.json`);
  const mdReportPath = path.join(reportsDir, `evaluation-${count}.md`);
  const latestJsonPath = path.join(reportsDir, `evaluation-latest.json`);

  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(mdReportPath, generateMarkdownReport(report), "utf-8");

  console.log("==================================================");
  console.log(`✓ Machine-readable report saved: ${jsonReportPath}`);
  console.log(`✓ Formatted Markdown report saved: ${mdReportPath}`);
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("Evaluation failed:", err);
  process.exit(1);
});
