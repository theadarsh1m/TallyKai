/**
 * TallyKai — AI Finance Controller
 * Phase 6: AI-Specific Metrics and Cost Tracking
 */

import { AIMetrics, DetailedRecordEvaluation } from "./types";
import { ReconciliationSummary } from "../reconciliation/types";

export function computeAIMetrics(
  evaluations: DetailedRecordEvaluation[],
  summary: ReconciliationSummary
): AIMetrics {
  const aiEvaluations = evaluations.filter((e) => e.actualAIDecision !== null);
  const aiMatches = evaluations.filter((e) => e.actualMatchMethod === "AI_ASSISTED");

  const investigations = summary.aiInvestigated || aiEvaluations.length;
  const resolved = summary.aiResolved || aiMatches.length;
  const humanReviewDecisions = summary.aiHumanReview || (investigations - resolved);
  const failures = evaluations.filter((e) => e.actualExceptionCategory === "AI_LIMIT_REACHED").length;

  const resolutionRate =
    investigations > 0 ? parseFloat(((resolved / investigations) * 100).toFixed(1)) : 0.0;

  const fallbackRate =
    investigations > 0 ? parseFloat(((humanReviewDecisions / investigations) * 100).toFixed(1)) : 0.0;

  const correctAIMatches = aiMatches.filter((e) => e.isMatchCorrect).length;
  const precision =
    aiMatches.length > 0 ? parseFloat(((correctAIMatches / aiMatches.length) * 100).toFixed(1)) : 100.0;

  const falsePositiveCount = aiMatches.filter((e) => e.isFalsePositive).length;

  const totalConf = aiEvaluations.reduce((acc, curr) => acc + (curr.actualConfidence || 0), 0);
  const averageConfidence =
    aiEvaluations.length > 0 ? parseFloat((totalConf / aiEvaluations.length).toFixed(3)) : 0.0;

  const totalRecords = evaluations.length;
  const callsPer1000Records =
    totalRecords > 0 ? parseFloat(((investigations / totalRecords) * 1000).toFixed(1)) : 0;

  return {
    investigations,
    resolved,
    humanReviewDecisions,
    failures,
    resolutionRate,
    fallbackRate,
    precision,
    falsePositiveCount,
    averageConfidence,
    callsPer1000Records,
  };
}
