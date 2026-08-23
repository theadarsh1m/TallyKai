/**
 * TARI — AI Finance Controller
 * Phase 2: Gateway Settlement Normalizer
 * 
 * Maps raw payment gateway settlement records to the CanonicalTransaction format.
 */

import { CanonicalTransaction, CanonicalStatus, ValidationError } from "./types";
import { validateRawSettlement } from "./validation";
import { toMinorUnits } from "./money";
import { normalizeTimestamp } from "./dates";
import { normalizeReference } from "./references";

/**
 * Maps raw settlement status to canonical transaction status.
 */
export function mapSettlementStatusToCanonical(rawStatus: unknown): CanonicalStatus {
  if (typeof rawStatus !== "string") {
    return "UNKNOWN";
  }

  const normalized = rawStatus.trim().toUpperCase();

  switch (normalized) {
    case "SETTLED":
    case "COMPLETED":
    case "PROCESSED":
    case "SUCCESS":
    case "SUCCESSFUL":
      return "SETTLED";

    case "PAID":
      return "PAID";

    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
      return "FAILED";

    case "PENDING":
    case "QUEUED":
    case "IN_TRANSIT":
      return "PENDING";

    case "REFUNDED":
    case "REVERSED":
      return "REFUNDED";

    default:
      return "UNKNOWN";
  }
}

export interface NormalizeSettlementResult {
  transaction: CanonicalTransaction | null;
  errors: ValidationError[];
}

/**
 * Normalizes a raw gateway settlement record into a CanonicalTransaction.
 * 
 * @param rawSettlement - Raw gateway settlement record
 * @returns Normalized transaction or validation errors
 */
export function normalizeSettlement(rawSettlement: unknown): NormalizeSettlementResult {
  const validation = validateRawSettlement(rawSettlement);
  if (!validation.isValid) {
    return {
      transaction: null,
      errors: validation.errors,
    };
  }

  const settlement = rawSettlement as Record<string, unknown>;
  const settlementId = String(settlement.settlement_id).trim();
  const rawTimestamp = settlement.settlement_timestamp ?? settlement.timestamp;
  const isoTimestamp = normalizeTimestamp(rawTimestamp);

  if (!isoTimestamp) {
    return {
      transaction: null,
      errors: [
        {
          recordId: settlementId,
          source: "SETTLEMENT",
          field: "settlement_timestamp",
          value: rawTimestamp,
          message: "Failed to parse timestamp to ISO 8601 UTC format",
        },
      ],
    };
  }

  const rawAmount =
    settlement.settlement_amount !== undefined
      ? (settlement.settlement_amount as number)
      : (settlement.amount as number);
  const amountMinor = toMinorUnits(rawAmount);

  const rawFee =
    settlement.fee !== undefined && settlement.fee !== null
      ? toMinorUnits(settlement.fee as number)
      : null;

  const rawTax =
    settlement.tax !== undefined && settlement.tax !== null
      ? toMinorUnits(settlement.tax as number)
      : null;

  const rawStatus = settlement.settlement_status ?? settlement.status;
  const status = mapSettlementStatusToCanonical(rawStatus);

  const rawRef =
    settlement.settlement_reference ??
    settlement.reference ??
    settlement.transaction_reference;
  const transactionRef = normalizeReference(rawRef);
  const orderId = normalizeReference(settlement.order_id);
  const currency =
    typeof settlement.currency === "string" ? settlement.currency.toUpperCase() : "INR";

  // Collect non-standard metadata keys
  const standardKeys = new Set([
    "settlement_id",
    "settlement_reference",
    "order_id",
    "settlement_amount",
    "settlement_timestamp",
    "fee",
    "tax",
    "settlement_status",
    "currency",
    "amount",
    "timestamp",
    "status",
    "reference",
  ]);

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settlement)) {
    if (!standardKeys.has(key)) {
      metadata[key] = value;
    }
  }

  const transaction: CanonicalTransaction = {
    source: "SETTLEMENT",
    sourceRecordId: settlementId,
    transactionReference: transactionRef,
    orderId: orderId,
    customerId: null,
    amount: amountMinor,
    amountMinor: amountMinor,
    currency,
    timestamp: isoTimestamp,
    status,
    paymentMethod: null,
    fee: rawFee,
    feeMinor: rawFee,
    tax: rawTax,
    taxMinor: rawTax,
    refundAmount: 0,
    refundAmountMinor: 0,
    metadata,
  };

  return {
    transaction,
    errors: [],
  };
}
