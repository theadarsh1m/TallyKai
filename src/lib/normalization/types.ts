/**
 * TARI — AI Finance Controller
 * Phase 2: Canonical Financial Data Model & Normalization Types
 */

export type SourceType =
  | "ORDER_LEDGER"
  | "SETTLEMENT"
  | "BANK_STATEMENT"
  | "REFUND"
  | "INVOICE";

export type CanonicalStatus =
  | "PAID"
  | "SETTLED"
  | "FAILED"
  | "PENDING"
  | "REFUNDED"
  | "UNKNOWN";

export interface CanonicalTransaction {
  /** Source identifier (e.g., ORDER_LEDGER, SETTLEMENT) */
  source: SourceType;
  /** Primary identifier from the origin source record */
  sourceRecordId: string;
  /** Transaction / payment reference for cross-source matching */
  transactionReference: string | null;
  /** Associated Order ID if explicitly known */
  orderId: string | null;
  /** Customer ID if available */
  customerId: string | null;
  /** Transaction gross amount in integer minor units (paise for INR) */
  amount: number;
  /** Explicit alias for minor units (paise) to guarantee arithmetic safety */
  amountMinor: number;
  /** Three-letter ISO 4217 currency code (e.g., INR) */
  currency: string;
  /** Canonical ISO 8601 UTC timestamp string (YYYY-MM-DDTHH:mm:ss.sssZ) */
  timestamp: string;
  /** Canonical lifecycle status */
  status: CanonicalStatus;
  /** Payment method/channel if known */
  paymentMethod: string | null;
  /** Payment gateway MDR fee in minor units (paise) */
  fee: number | null;
  /** Fee alias in minor units */
  feeMinor: number | null;
  /** Applicable tax (e.g., GST) in minor units (paise) */
  tax: number | null;
  /** Tax alias in minor units */
  taxMinor: number | null;
  /** Refunded amount in minor units (paise) */
  refundAmount: number;
  /** Refund amount alias in minor units */
  refundAmountMinor: number;
  /** Extensible arbitrary metadata key-value pairs */
  metadata: Record<string, unknown>;
}

export interface ValidationError {
  /** Identifier of the problematic record (if extractable) */
  recordId?: string;
  /** Source of the record */
  source: SourceType | "UNKNOWN";
  /** Field name where validation failed */
  field: string;
  /** The invalid raw value received */
  value?: unknown;
  /** Human-readable explanation of the validation failure */
  message: string;
}

export interface NormalizationStatistics {
  /** Total raw records ingested */
  total: number;
  /** Total records successfully converted to CanonicalTransaction */
  normalized: number;
  /** Total records rejected due to validation or parsing errors */
  failed: number;
  /** Order ledger breakdown */
  ordersTotal: number;
  ordersNormalized: number;
  ordersFailed: number;
  /** Settlement record breakdown */
  settlementsTotal: number;
  settlementsNormalized: number;
  settlementsFailed: number;
}

export interface NormalizationResult {
  /** Successfully normalized canonical records */
  normalizedRecords: CanonicalTransaction[];
  /** Structured validation errors encountered during ingestion */
  errors: ValidationError[];
  /** Aggregate data-quality summary statistics */
  statistics: NormalizationStatistics;
}
