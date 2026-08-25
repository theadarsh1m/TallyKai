/**
 * TallyKai — AI Finance Controller
 * Phase 6: Precision, Recall, F1, Layer Metrics & Confidence Buckets
 */

import {
  ConfusionMatrix,
  CoreMetrics,
  DetailedRecordEvaluation,
  LayerPerformanceMetric,
  ResolutionFunnelStep,
  ConfidenceBucketMetric,
} from "./types";

export function computeCoreMetrics(
  evaluations: DetailedRecordEvaluation[],
  cm: ConfusionMatrix
): CoreMetrics {
  const total = evaluations.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      matchableRecords: 0,
      exceptionRecords: 0,
      correctMatches: 0,
      incorrectMatches: 0,
      unresolvedRecords: 0,
      exceptionsIdentified: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      resolutionRate: 0,
      exceptionRate: 0,
    };
  }

  const matchableRecords = evaluations.filter((e) => e.groundTruthStatus === "MATCHABLE").length;
  const exceptionRecords = total - matchableRecords;

  const correctMatches = cm.truePositives;
  const incorrectMatches = cm.falsePositives;
  const unresolvedRecords = evaluations.filter(
    (e) => e.actualStatus !== "MATCHED" && e.actualStatus !== "MATCHED_AFTER_ADJUSTMENTS"
  ).length;
  const exceptionsIdentified = cm.trueNegatives;

  const accuracy = parseFloat((((cm.truePositives + cm.trueNegatives) / total) * 100).toFixed(2));

  const totalPredictedPositives = cm.truePositives + cm.falsePositives;
  const precision =
    totalPredictedPositives > 0
      ? parseFloat(((cm.truePositives / totalPredictedPositives) * 100).toFixed(2))
      : 100.0;

  const totalActualPositives = cm.truePositives + cm.falseNegatives;
  const recall =
    totalActualPositives > 0
      ? parseFloat(((cm.truePositives / totalActualPositives) * 100).toFixed(2))
      : 0.0;

  const f1Score =
    precision + recall > 0
      ? parseFloat(((2 * (precision * recall)) / (precision + recall)).toFixed(2))
      : 0.0;

  const resolutionRate = parseFloat(((totalPredictedPositives / total) * 100).toFixed(2));
  const exceptionRate = parseFloat(((unresolvedRecords / total) * 100).toFixed(2));

  return {
    totalRecords: total,
    matchableRecords,
    exceptionRecords,
    correctMatches,
    incorrectMatches,
    unresolvedRecords,
    exceptionsIdentified,
    accuracy,
    precision,
    recall,
    f1Score,
    resolutionRate,
    exceptionRate,
  };
}

export function computeLayerPerformance(
  evaluations: DetailedRecordEvaluation[]
): LayerPerformanceMetric[] {
  const total = evaluations.length;

  // Filter evaluations by layer
  const detEvals = evaluations.filter((e) =>
    e.actualMatchMethod === "EXACT_REFERENCE" ||
    e.actualMatchMethod === "AMOUNT_AND_REFERENCE" ||
    e.actualMatchMethod === "FEE_ADJUSTED" ||
    e.actualMatchMethod === "TAX_ADJUSTED" ||
    e.actualMatchMethod === "PARTIAL_SETTLEMENT" ||
    e.actualMatchMethod === "ROUNDING_TOLERANCE" ||
    e.actualMatchMethod === "MERGED_BATCH"
  );

  const fuzzyEvals = evaluations.filter((e) =>
    e.actualMatchMethod === "FUZZY_REFERENCE" ||
    e.actualMatchMethod === "FUZZY_AMOUNT" ||
    e.actualMatchMethod === "FUZZY_COMBINED"
  );

  const aiEvals = evaluations.filter((e) => e.actualMatchMethod === "AI_ASSISTED");

  const humanReviewEvals = evaluations.filter(
    (e) =>
      e.actualStatus === "HUMAN_REVIEW" ||
      e.actualStatus === "EXCEPTION" ||
      e.actualStatus === "AMBIGUOUS" ||
      e.actualStatus === "UNRESOLVED" ||
      e.actualStatus === "MISSING_SETTLEMENT" ||
      e.actualStatus === "DUPLICATE" ||
      e.actualStatus === "ORPHAN_SETTLEMENT"
  );

  function getLayerMetrics(
    layer: "DETERMINISTIC" | "FUZZY" | "AI" | "HUMAN_REVIEW",
    layerEvals: DetailedRecordEvaluation[],
    cumResolved: number
  ): LayerPerformanceMetric {
    const resolvedCount = layerEvals.filter(
      (e) => e.actualStatus === "MATCHED" || e.actualStatus === "MATCHED_AFTER_ADJUSTMENTS"
    ).length;

    const correctMatches = layerEvals.filter((e) => e.isMatchCorrect && (e.actualStatus === "MATCHED" || e.actualStatus === "MATCHED_AFTER_ADJUSTMENTS")).length;
    const incorrectMatches = layerEvals.filter((e) => !e.isMatchCorrect && (e.actualStatus === "MATCHED" || e.actualStatus === "MATCHED_AFTER_ADJUSTMENTS")).length;
    const falsePositives = layerEvals.filter((e) => e.isFalsePositive).length;

    const precision =
      resolvedCount > 0
        ? parseFloat(((correctMatches / resolvedCount) * 100).toFixed(1))
        : 100.0;

    const percentageOfTotal = total > 0 ? parseFloat(((resolvedCount / total) * 100).toFixed(1)) : 0;

    return {
      layer,
      resolvedCount: layer === "HUMAN_REVIEW" ? humanReviewEvals.length : resolvedCount,
      cumulativeResolved: cumResolved,
      percentageOfTotal,
      precision,
      falsePositives,
      correctMatches,
      incorrectMatches,
    };
  }

  const detMetric = getLayerMetrics(
    "DETERMINISTIC",
    detEvals,
    detEvals.filter((e) => e.actualStatus === "MATCHED" || e.actualStatus === "MATCHED_AFTER_ADJUSTMENTS").length
  );

  const fuzzyMetric = getLayerMetrics(
    "FUZZY",
    fuzzyEvals,
    detMetric.resolvedCount +
      fuzzyEvals.filter((e) => e.actualStatus === "MATCHED" || e.actualStatus === "MATCHED_AFTER_ADJUSTMENTS").length
  );

  const aiMetric = getLayerMetrics(
    "AI",
    aiEvals,
    fuzzyMetric.cumulativeResolved +
      aiEvals.filter((e) => e.actualStatus === "MATCHED" || e.actualStatus === "MATCHED_AFTER_ADJUSTMENTS").length
  );

  const humanMetric: LayerPerformanceMetric = {
    layer: "HUMAN_REVIEW",
    resolvedCount: humanReviewEvals.length,
    cumulativeResolved: aiMetric.cumulativeResolved,
    percentageOfTotal: total > 0 ? parseFloat(((humanReviewEvals.length / total) * 100).toFixed(1)) : 0,
    precision: 100.0,
    falsePositives: 0,
    correctMatches: 0,
    incorrectMatches: 0,
  };

  return [detMetric, fuzzyMetric, aiMetric, humanMetric];
}

export function computeResolutionFunnel(
  layerMetrics: LayerPerformanceMetric[],
  totalOrders: number
): ResolutionFunnelStep[] {
  let remaining = totalOrders;
  const funnel: ResolutionFunnelStep[] = [];

  for (const lm of layerMetrics) {
    if (lm.layer === "HUMAN_REVIEW") {
      funnel.push({
        stage: "Human Review / Escalations",
        inputCount: remaining,
        resolvedCount: 0,
        unresolvedRemaining: remaining,
        conversionRate: 0,
      });
      break;
    }

    const inputCount = remaining;
    const resolved = lm.resolvedCount;
    remaining = Math.max(0, remaining - resolved);
    const conversionRate = inputCount > 0 ? parseFloat(((resolved / inputCount) * 100).toFixed(1)) : 0;

    funnel.push({
      stage:
        lm.layer === "DETERMINISTIC"
          ? "Pass 1: Deterministic Engine"
          : lm.layer === "FUZZY"
          ? "Pass 2: Fuzzy Similarity Matching"
          : "Pass 3: AI Exception Investigator",
      inputCount,
      resolvedCount: resolved,
      unresolvedRemaining: remaining,
      conversionRate,
    });
  }

  return funnel;
}

export function computeConfidenceBuckets(
  evaluations: DetailedRecordEvaluation[]
): ConfidenceBucketMetric[] {
  const buckets: {
    rangeLabel: ConfidenceBucketMetric["rangeLabel"];
    minScore: number;
    maxScore: number;
  }[] = [
    { rangeLabel: "0.90–1.00", minScore: 0.9, maxScore: 1.0 },
    { rangeLabel: "0.80–0.89", minScore: 0.8, maxScore: 0.8999 },
    { rangeLabel: "0.70–0.79", minScore: 0.7, maxScore: 0.7999 },
    { rangeLabel: "<0.70", minScore: 0.0, maxScore: 0.6999 },
  ];

  return buckets.map((b) => {
    const recordsInBucket = evaluations.filter((e) => {
      const c = e.actualConfidence;
      return c >= b.minScore && (b.rangeLabel === "0.90–1.00" ? c <= b.maxScore : c <= b.maxScore);
    });

    const totalCases = recordsInBucket.length;
    const correctPredictions = recordsInBucket.filter((e) => e.isMatchCorrect).length;
    const incorrectPredictions = totalCases - correctPredictions;
    const accuracy =
      totalCases > 0 ? parseFloat(((correctPredictions / totalCases) * 100).toFixed(1)) : 100.0;

    return {
      rangeLabel: b.rangeLabel,
      minScore: b.minScore,
      maxScore: b.maxScore,
      totalCases,
      correctPredictions,
      incorrectPredictions,
      accuracy,
    };
  });
}
