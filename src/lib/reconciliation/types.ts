/**
 * TallyKai — AI Finance Controller
 * Phase 3: Deterministic Reconciliation Types
 */

export type ReconciliationStatus =
  | "MATCHED"
  | "MATCHED_AFTER_ADJUSTMENTS"
  | "EXCEPTION"
  | "MISSING_SETTLEMENT"
  | "DUPLICATE"
  | "PARTIAL_SETTLEMENT"
  | "ORPHAN_SETTLEMENT"
  | "UNRESOLVED";

export type MatchMethod =
  | "EXACT_REFERENCE"
  | "AMOUNT_AND_REFERENCE"
  | "FEE_ADJUSTED"
  | "TAX_ADJUSTED"
  | "PARTIAL_SETTLEMENT"
  | "ROUNDING_TOLERANCE"
  | "MERGED_BATCH"
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
  | "MERGED_BATCH";

export interface EvidenceItem {
  type: EvidenceType;
  description?: string;
  [key: string]: unknown;
}

export interface OrderReconciliationResult {
  /** Internal Order ID being reconciled */
  orderId: string;
  /** Final reconciliation status */
  status: ReconciliationStatus;
  /** Exact deterministic match method utilized */
  matchMethod: MatchMethod;
  /** Linked settlement IDs (empty array if missing) */
  settlementIds: string[];
  /** Deterministic rule confidence score (0.0 to 1.0) */
  confidence: number;
  /** Monetary variance between expected net and actual settled in minor units (paise) */
  amountDifferenceMinor: number;
  /** Human-readable explanation of the reconciliation outcome */
  reason: string;
  /** Structured exception classification (if status is EXCEPTION / MISSING / DUPLICATE) */
  exceptionCategory: ExceptionCategory | null;
  /** Structured audit trail evidence items */
  evidence: EvidenceItem[];
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
  /** Percentage of records successfully resolved deterministically */
  deterministicResolutionRate: number;
  /** Execution time in milliseconds */
  processingTimeMs: number;
}

export interface ReconciliationDatasetResult {
  orderResults: OrderReconciliationResult[];
  orphanResults: OrphanReconciliationResult[];
  summary: ReconciliationSummary;
}
