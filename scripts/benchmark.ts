/**
 * TallyKai — AI Finance Controller
 * Phase 6: Multi-Scale Benchmark & Reproducibility Runner
 * 
 * Usage:
 *   npx tsx scripts/benchmark.ts
 *   npm run benchmark
 *   npm run benchmark -- --count=1000 --seed=42
 */

import { runScaleBenchmark } from "../src/lib/evaluation";

function parseArgs(): { count?: number; seed: number; sizes: number[] } {
  const args = process.argv.slice(2);
  let count: number | undefined;
  let seed = 42;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      count = parseInt(arg.replace("--count=", ""), 10);
    } else if (arg.startsWith("--seed=")) {
      seed = parseInt(arg.replace("--seed=", ""), 10);
    }
  }

  const sizes: number[] = count ? [count] : [50, 500, 1000, 5000];
  return { count, seed, sizes };
}

async function main() {
  const { seed, sizes } = parseArgs();

  console.log("==================================================");
  console.log("TallyKai Phase 6: Multi-Scale Performance Benchmark");
  console.log(`Config: Seed=${seed}, Scales=[${sizes.join(", ")}]`);
  console.log("==================================================\n");

  console.log("Running benchmarks across dataset sizes...");
  const benchmarkResults = await runScaleBenchmark(sizes, seed);

  console.log("\nBENCHMARK RESULTS");
  console.log("----------------------------------------------------------------------------------");
  console.log(
    "Records".padEnd(10) +
      "Duration (ms)".padEnd(16) +
      "Throughput (rec/s)".padEnd(22) +
      "Resolution Rate".padEnd(18) +
      "AI Investigations"
  );
  console.log("----------------------------------------------------------------------------------");

  for (const res of benchmarkResults) {
    console.log(
      res.recordCount.toString().padEnd(10) +
        (res.processingTimeMs + " ms").padEnd(16) +
        res.throughputRecordsPerSec.toLocaleString().padEnd(22) +
        (res.resolutionRate + "%").padEnd(18) +
        res.aiInvestigations.toString()
    );
  }
  console.log("----------------------------------------------------------------------------------\n");

  // Reproducibility Check
  console.log("Verifying 100% Deterministic Reproducibility (Seed: 42)...");
  const run1 = await runScaleBenchmark([500], 42);
  const run2 = await runScaleBenchmark([500], 42);

  const match =
    run1[0].recordCount === run2[0].recordCount &&
    run1[0].resolutionRate === run2[0].resolutionRate &&
    run1[0].aiInvestigations === run2[0].aiInvestigations;

  if (match) {
    console.log("✓ PASS: Identical seed produced 100% identical resolution rates and match counts.\n");
  } else {
    console.error("❌ FAIL: Seed outputs differed between runs.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Benchmark error:", err);
  process.exit(1);
});
