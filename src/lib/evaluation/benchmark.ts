/**
 * TallyKai — AI Finance Controller
 * Phase 6: Dataset Scale Benchmark Engine
 * 
 * Runs end-to-end normalization, multi-layer matching, and evaluation
 * across varying dataset sizes (50, 500, 1000, 5000 records) to profile performance and throughput.
 */

import { generateDataset } from "../data";
import { normalizeDataset } from "../normalization";
import { reconcileDatasetAsync } from "../reconciliation";
import { ScaleBenchmarkPoint } from "./types";

export async function runScaleBenchmark(
  sizes: number[] = [50, 500, 1000, 5000],
  seed: number = 42
): Promise<ScaleBenchmarkPoint[]> {
  const points: ScaleBenchmarkPoint[] = [];

  for (const count of sizes) {
    const dataset = generateDataset({ count, seed });
    const normResult = normalizeDataset(dataset.orders, dataset.settlements);

    const orders = normResult.normalizedRecords.filter((r) => r.source === "ORDER_LEDGER");
    const settlements = normResult.normalizedRecords.filter((r) => r.source === "SETTLEMENT");

    const startTime = performance.now();
    const reconResult = await reconcileDatasetAsync(orders, settlements);
    const durationMs = Math.max(0.001, performance.now() - startTime);

    const totalMatches = reconResult.summary.totalMatched;
    const resolutionRate =
      count > 0 ? parseFloat(((totalMatches / count) * 100).toFixed(1)) : 0;

    const throughput = parseFloat(((count / durationMs) * 1000).toFixed(1));

    // Approximate accuracy against ground truth matchables
    const matchableCount = dataset.groundTruth.filter((gt) => gt.true_status === "MATCHABLE").length;
    const accuracy =
      matchableCount > 0
        ? parseFloat(((Math.min(totalMatches, matchableCount) / matchableCount) * 100).toFixed(1))
        : 100.0;

    points.push({
      recordCount: count,
      processingTimeMs: parseFloat(durationMs.toFixed(2)),
      throughputRecordsPerSec: throughput,
      resolutionRate,
      accuracy,
      aiInvestigations: reconResult.summary.aiInvestigated,
    });
  }

  return points;
}
