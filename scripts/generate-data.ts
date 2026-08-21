/**
 * Tallykai — Synthetic Data CLI Generator Script
 * Usage:
 *   npx tsx scripts/generate-data.ts [--count=500] [--seed=42]
 *   npm run generate:data -- --count=1000 --seed=100
 */

import fs from "fs";
import path from "path";
import { generateDataset } from "../src/lib/data";

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 500;
  let seed = 42;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      const parsedCount = parseInt(arg.split("=")[1], 10);
      if (!isNaN(parsedCount) && parsedCount > 0) {
        count = parsedCount;
      }
    } else if (arg.startsWith("--seed=")) {
      const parsedSeed = parseInt(arg.split("=")[1], 10);
      if (!isNaN(parsedSeed)) {
        seed = parsedSeed;
      }
    }
  }

  return { count, seed };
}

function main() {
  const { count, seed } = parseArgs();

  console.log(`Generating synthetic financial dataset (count: ${count}, seed: ${seed})...`);

  const result = generateDataset({ count, seed });

  const outputDir = path.join(process.cwd(), "data", "generated");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "orders.json"),
    JSON.stringify(result.orders, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(outputDir, "settlements.json"),
    JSON.stringify(result.settlements, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(outputDir, "ground-truth.json"),
    JSON.stringify(result.groundTruth, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(outputDir, "summary.json"),
    JSON.stringify(result.summary, null, 2),
    "utf-8"
  );

  console.log("\n==================================================");
  console.log("Tallykai Synthetic Dataset Summary");
  console.log("==================================================");
  console.log(`Orders:      ${result.summary.totalOrders}`);
  console.log(`Settlements: ${result.summary.totalSettlements}`);
  console.log(`GroundTruth: ${result.summary.totalGroundTruth}`);
  console.log(`Seed:        ${result.summary.seed}`);
  console.log("--------------------------------------------------");
  console.log("Scenario distribution:");
  console.log("--------------------------------------------------");

  for (const [scenario, scCount] of Object.entries(result.summary.scenarioDistribution)) {
    console.log(`${scenario.padEnd(24)} ${scCount}`);
  }

  console.log("--------------------------------------------------");
  console.log(`Saved datasets to: ${outputDir}`);
  console.log("==================================================\n");
}

main();
