/**
 * TallyKai — AI Finance Controller
 * Phase 6: Throughput and Performance Metrics
 */

import { PerformanceMetrics } from "./types";

export function computePerformanceMetrics(params: {
  totalRecords: number;
  totalProcessingTimeMs: number;
  normalizationTimeMs?: number;
  deterministicTimeMs?: number;
  fuzzyTimeMs?: number;
  aiInvestigationTimeMs?: number;
}): PerformanceMetrics {
  const {
    totalRecords,
    totalProcessingTimeMs,
    normalizationTimeMs,
    deterministicTimeMs,
    fuzzyTimeMs,
    aiInvestigationTimeMs,
  } = params;

  const validTimeMs = Math.max(totalProcessingTimeMs, 0.001);
  const recordsPerSecond =
    totalRecords > 0
      ? parseFloat(((totalRecords / validTimeMs) * 1000).toFixed(1))
      : 0;

  const averageTimePerRecordMs =
    totalRecords > 0
      ? parseFloat((validTimeMs / totalRecords).toFixed(3))
      : 0;

  return {
    totalProcessingTimeMs: parseFloat(validTimeMs.toFixed(2)),
    normalizationTimeMs: normalizationTimeMs ? parseFloat(normalizationTimeMs.toFixed(2)) : undefined,
    deterministicTimeMs: deterministicTimeMs ? parseFloat(deterministicTimeMs.toFixed(2)) : undefined,
    fuzzyTimeMs: fuzzyTimeMs ? parseFloat(fuzzyTimeMs.toFixed(2)) : undefined,
    aiInvestigationTimeMs: aiInvestigationTimeMs ? parseFloat(aiInvestigationTimeMs.toFixed(2)) : undefined,
    recordsPerSecond,
    averageTimePerRecordMs,
  };
}
