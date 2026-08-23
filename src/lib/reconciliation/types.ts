/**
 * TallyKai — AI Finance Controller
 * Phase 3, Phase 4 & Phase 5: Multi-Layer Reconciliation Types
 */

import { AIInvestigationResult } from "../ai/types";

export type ReconciliationStatus =
  | "MATCHED"
  | "MATCHED_AFTER_ADJUSTMENTS"
  | "EXCEPTION"
  | "MISSING_SETTLEMENT"
  | "DUPLICATE"
  | "PARTIAL_SETTLEMENT"
  | "ORPHAN_SETTLEMENT"
  | "UNRESOLVED"
  | "AMBIGUOUS"
  | "HUMAN_REVIEW";

export type MatchMethod =
  | "EXACT_REFERENCE"
  | "AMOUNT_AND_REFERENCE"
  | "FEE_ADJUSTED"
  | "TAX_ADJUSTED"
  | "PARTIAL_SETTLEMENT"
  | "ROUNDING_TOLERANCE"
  | "MERGED_BATCH"
  | "FUZZY_REFERENCE"
  | "FUZZY_AMOUNT"
  | "FUZZY_COMBINED"
  | "AI_ASSISTED"
  | "NONE";

export type ExceptionCategory =
  | "MISSING_SETTLEMENT"
  | "AMOUNT_MISMATCH"
  | "DATE_OUT_OF_RANGE"
  | "DUPLICATE_SETTLEMENT"
  | "ORPHAN_SETTLEMENT"
  | "PARTIAL_SETTLEMENT_MISMATCH"
  | "MERGED_BATCH_MISMATCH"
  | "LOW_EVIDENCE"
  | "FUZZY_LOW_CONFIDENCE"
  | "AMBIGUOUS_MATCH"
  | "NO_CANDIDATE"
  | "MULTIPLE_CANDIDATES"
  | "AI_UNRESOLVED"
  | "AI_LIMIT_REACHED"
  | "UNKNOWN";

export type EvidenceType =
  | "REFERENCE_MATCH"
  | "AMOUNT_COMPARISON"
  | "FEE_ADJUSTMENT"
  | "TAX_ADJUSTMENT"
  | "REFUND_ADJUSTMENT"
  | "DATE_COMPARISON"
  | "MULTIPLE_SETTLEMENTS"
  | "MISSING_RECORD"
  | "ROUNDING_DIFFERENCE"
  | "MERGED_BATCH"
  | "FUZZY_CANDIDATE_MATCH"
  | "AMBIGUITY_DETECTION"
  | "AI_INVESTIGATION_RESULT";

export interface FuzzyCandidateEvidence {
  referenceSimilarity: number;
  amountSimilarity: number;
  dateSimilarity: number;
  customerSimilarity: number;
  compositeScore?: number;
  orderReference?: string | null;
  settlementReference?: string | null;
  orderAmountMinor?: number;
  settlementAmountMinor?: number;
  delayDays?: number;
  customerOverlap?: boolean | null;
  [key: string]: unknown;
}

export interface FuzzyCandidate {
  settlementId: string;
  score: number;
  evidence: FuzzyCandidateEvidence;
}

export interface EvidenceItem {
  type: EvidenceType;
  description?: string;
  candidateEvidence?: FuzzyCandidateEvidence;
  candidates?: FuzzyCandidate[];
  aiInvestigation?: AIInvestigationResult;
  [key: string]: unknown;
}

export interface OrderReconciliationResult {
  /** Internal Order ID being reconciled */
  orderId: string;
  /** Final reconciliation status */
  status: ReconciliationStatus;
  /** Exact deterministic, fuzzy, or AI match method utilized */
  matchMethod: MatchMethod;
  /** Linked settlement IDs (empty array if missing) */
  settlementIds: string[];
  /** Rule/Candidate/AI confidence score (0.0 to 1.0) */
  confidence: number;
  /** Monetary variance between expected net and actual settled in minor units (paise) */
  amountDifferenceMinor: number;
  /** Human-readable explanation of the reconciliation outcome */
  reason: string;
  /** Structured exception classification */
  exceptionCategory: ExceptionCategory | null;
  /** Structured audit trail evidence items */
  evidence: EvidenceItem[];
  /** Top fuzzy candidate scores and evidence */
  fuzzyCandidates?: FuzzyCandidate[];
  /** AI agent investigation payload and audit trail */
  aiInvestigation?: AIInvestigationResult;
}

export interface OrphanReconciliationResult {
  /** Settlement ID with no corresponding internal order */
  settlementId: string;
  /** Status fixed to ORPHAN_SETTLEMENT */
  status: "ORPHAN_SETTLEMENT";
  /** Settlement reference string */
  settlementReference: string | null;
  /** Settlement amount in minor units (paise) */
  settlementAmountMinor: number;
  /** ISO 8601 UTC timestamp of settlement */
  settlementTimestamp: string;
  /** Human-readable explanation */
  reason: string;
  /** Structured audit trail evidence items */
  evidence: EvidenceItem[];
}

export interface ReconciliationSummary {
  totalOrders: number;
  totalSettlements: number;
  matched: number;
  matchedAfterAdjustments: number;
  missingSettlements: number;
  partialSettlements: number;
  duplicates: number;
  orphanSettlements: number;
  unresolved: number;
  exceptions: number;
  /** Pass 1 Deterministic breakdown */
  deterministicExactMatches: number;
  deterministicAdjustmentMatches: number;
  deterministicUnresolved: number;
  deterministicResolutionRate: number;
  /** Pass 2 Fuzzy matching breakdown */
  fuzzyHighConfidence: number;
  fuzzyAmbiguous: number;
  fuzzyRejected: number;
  fuzzyPrecision?: number;
  fuzzyResolutionRate?: number;
  /** Pass 3 AI agent breakdown */
  aiInvestigated: number;
  aiResolved: number;
  aiHumanReview: number;
  aiPrecision?: number;
  aiResolutionRate?: number;
  aiFallbackRate?: number;
  /** Aggregate matched count */
  totalMatched: number;
  /** Execution time in milliseconds */
  processingTimeMs: number;
}

export interface ReconciliationDatasetResult {
  orderResults: OrderReconciliationResult[];
  orphanResults: OrphanReconciliationResult[];
  summary: ReconciliationSummary;
}
