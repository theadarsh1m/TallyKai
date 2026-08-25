/**
 * TallyKai — AI Finance Controller
 * Phase 6: Evaluation, Metrics & Benchmarking Types
 */

import {
  MatchMethod,
  ReconciliationStatus,
  ExceptionCategory,
} from "../reconciliation/types";
import { ScenarioType, TrueStatus } from "../data/types";
import { AIDecision } from "../ai/types";

export type MatchEvaluationClassification =
  | "CORRECT"
  | "INCORRECT"
  | "MISSED"
  | "FALSE_POSITIVE"
  | "UNRESOLVED";

export interface GroundTruthEntry {
  order_id: string | null;
  scenario_type: ScenarioType;
  true_status: TrueStatus;
  expected_settlement_ids: string[];
  expected_settlement_amount: number;
  expected_result?: string;
}

export interface DetailedRecordEvaluation {
  orderId: string;
  scenarioType: ScenarioType;
  groundTruthStatus: TrueStatus;
  expectedSettlementIds: string[];
  expectedAmountPaise: number;
  actualStatus: ReconciliationStatus;
  actualMatchMethod: MatchMethod;
  actualSettlementIds: string[];
  actualConfidence: number;
  actualExceptionCategory: ExceptionCategory | null;
  actualAIDecision: AIDecision | null;
  classification: MatchEvaluationClassification;
  isMatchCorrect: boolean;
  isFalsePositive: boolean;
  notes?: string;
}

export interface FalsePositiveRecord {
  orderId: string;
  scenarioType: ScenarioType;
  matchingMethod: MatchMethod;
  confidence: number;
  predictedSettlementIds: string[];
  actualGroundTruthSettlementIds: string[];
  predictedAmountDifferencePaise: number;
  reason: string;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  totalRecords: number;
}

export interface CoreMetrics {
  totalRecords: number;
  matchableRecords: number;
  exceptionRecords: number;
  correctMatches: number;
  incorrectMatches: number;
  unresolvedRecords: number;
  exceptionsIdentified: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  resolutionRate: number;
  exceptionRate: number;
}

export interface LayerPerformanceMetric {
  layer: "DETERMINISTIC" | "FUZZY" | "AI" | "HUMAN_REVIEW";
  resolvedCount: number;
  cumulativeResolved: number;
  percentageOfTotal: number;
  precision: number;
  recall?: number;
  f1Score?: number;
  falsePositives: number;
  correctMatches: number;
  incorrectMatches: number;
}

export interface ResolutionFunnelStep {
  stage: string;
  inputCount: number;
  resolvedCount: number;
  unresolvedRemaining: number;
  conversionRate: number;
}

export interface ExceptionGroupDetail {
  category: ExceptionCategory | "UNKNOWN";
  count: number;
  percentageOfExceptions: number;
  sampleOrderIds: string[];
  primaryReason: string;
}

export interface ConfidenceBucketMetric {
  rangeLabel: "0.90–1.00" | "0.80–0.89" | "0.70–0.79" | "<0.70";
  minScore: number;
  maxScore: number;
  totalCases: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracy: number;
}

export interface FinancialReconciliationMetrics {
  totalOrderValuePaise: number;
  reconciledOrderValuePaise: number;
  unresolvedOrderValuePaise: number;
  incorrectlyReconciledValuePaise: number;
  exceptionOrderValuePaise: number;
  totalOrderValueINR: number;
  reconciledOrderValueINR: number;
  unresolvedOrderValueINR: number;
  incorrectlyReconciledValueINR: number;
  exceptionOrderValueINR: number;
  financialReconciliationRate: number;
}

export interface PerformanceMetrics {
  totalProcessingTimeMs: number;
  normalizationTimeMs?: number;
  deterministicTimeMs?: number;
  fuzzyTimeMs?: number;
  aiInvestigationTimeMs?: number;
  recordsPerSecond: number;
  averageTimePerRecordMs: number;
}

export interface AIMetrics {
  investigations: number;
  resolved: number;
  humanReviewDecisions: number;
  failures: number;
  resolutionRate: number;
  fallbackRate: number;
  precision: number;
  falsePositiveCount: number;
  averageConfidence: number;
  averageLatencyMs?: number;
  callsPer1000Records: number;
  totalTokensUsed?: number;
  estimatedCostUSD?: number;
}

export interface DataQualityMetrics {
  recordsGenerated: number;
  recordsNormalized: number;
  invalidRecords: number;
  missingFieldsCount: number;
  duplicateSourceRecords: number;
  dataQualityScore: number;
}

export interface ScaleBenchmarkPoint {
  recordCount: number;
  processingTimeMs: number;
  throughputRecordsPerSec: number;
  resolutionRate: number;
  accuracy: number;
  aiInvestigations: number;
}

export interface EvaluationReportData {
  dataset: {
    totalOrders: number;
    totalSettlements: number;
    totalGroundTruth: number;
    financialValueINR: number;
    seed?: number;
  };
  metrics: CoreMetrics;
  confusionMatrix: ConfusionMatrix;
  layerPerformance: LayerPerformanceMetric[];
  resolutionFunnel: ResolutionFunnelStep[];
  exceptions: ExceptionGroupDetail[];
  falsePositives: FalsePositiveRecord[];
  confidenceBuckets: ConfidenceBucketMetric[];
  financialMetrics: FinancialReconciliationMetrics;
  performance: PerformanceMetrics;
  aiMetrics: AIMetrics;
  dataQuality: DataQualityMetrics;
  scaleBenchmarks?: ScaleBenchmarkPoint[];
  evaluatedAt: string;
}
