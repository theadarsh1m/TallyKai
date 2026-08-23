/**
 * TARI — Normalization CLI & Data Quality Reporting Script
 * Usage:
 *   npx tsx scripts/normalize-data.ts
 *   npm run normalize:data
 * 
 * IMPORTANT: This script strictly ingests orders.json and settlements.json.
 * It NEVER reads or references ground-truth.json.
 */

import fs from "fs";
import path from "path";
import { normalizeDataset } from "../src/lib/normalization";

function main() {
  const dataDir = path.join(process.cwd(), "data", "generated");
  const ordersPath = path.join(dataDir, "orders.json");
  const settlementsPath = path.join(dataDir, "settlements.json");

  if (!fs.existsSync(ordersPath) || !fs.existsSync(settlementsPath)) {
    console.error(
      "❌ Generated datasets not found! Please run 'npm run generate:data' first."
    );
    process.exit(1);
  }

  console.log("Loading raw financial datasets for normalization...\n");

  const orders = JSON.parse(fs.readFileSync(ordersPath, "utf-8"));
  const settlements = JSON.parse(fs.readFileSync(settlementsPath, "utf-8"));

  const startTime = performance.now();
  const result = normalizeDataset(orders, settlements);
  const elapsedMs = (performance.now() - startTime).toFixed(2);

  // Print structured Data Quality Report
  console.log("==================================================");
  console.log("TARI DATA QUALITY REPORT");
  console.log("==================================================");
  console.log("Orders");
  console.log("------");
  console.log(`Records: ${result.statistics.ordersTotal}`);
  console.log(`Valid:   ${result.statistics.ordersNormalized}`);
  console.log(`Invalid: ${result.statistics.ordersFailed}`);
  console.log("");
  console.log("Settlements");
  console.log("-----------");
  console.log(`Records: ${result.statistics.settlementsTotal}`);
  console.log(`Valid:   ${result.statistics.settlementsNormalized}`);
  console.log(`Invalid: ${result.statistics.settlementsFailed}`);
  console.log("");
  console.log("Normalization Summary");
  console.log("---------------------");
  console.log(`Total records:           ${result.statistics.total}`);
  console.log(`Successfully normalized: ${result.statistics.normalized}`);
  console.log(`Errors:                  ${result.statistics.failed}`);
  console.log(`Processing time:         ${elapsedMs} ms`);
  console.log("==================================================");

  if (result.errors.length > 0) {
    console.log("\n⚠️  Validation Errors Encountered:");
    for (const err of result.errors.slice(0, 10)) {
      console.log(
        ` - [${err.source}] Record ${err.recordId ?? "N/A"}: ${err.field} - ${err.message}`
      );
    }
    if (result.errors.length > 10) {
      console.log(` ... and ${result.errors.length - 10} more errors.`);
    }
  }

  // Save canonical records and quality report to data/generated/
  const canonicalPath = path.join(dataDir, "canonical-transactions.json");
  const reportPath = path.join(dataDir, "normalization-report.json");

  fs.writeFileSync(
    canonicalPath,
    JSON.stringify(result.normalizedRecords, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        statistics: result.statistics,
        errors: result.errors,
        normalizedAt: new Date().toISOString(),
        processingTimeMs: parseFloat(elapsedMs),
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`\n✓ Normalized canonical transactions saved to: ${canonicalPath}`);
  console.log(`✓ Data quality report saved to:               ${reportPath}\n`);

  if (result.statistics.failed > 0 && result.statistics.normalized === 0) {
    process.exit(1);
  }
}

main();
