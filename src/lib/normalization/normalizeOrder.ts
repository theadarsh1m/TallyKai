/**
 * TARI — AI Finance Controller
 * Phase 2: Order Ledger Normalizer
 * 
 * Maps raw internal order records to the CanonicalTransaction format.
 */

import { CanonicalTransaction, CanonicalStatus, ValidationError } from "./types";
import { validateRawOrder } from "./validation";
import { toMinorUnits } from "./money";
import { normalizeTimestamp } from "./dates";
import { normalizeReference } from "./references";

/**
 * Maps raw source status to canonical transaction status.
 */
export function mapOrderStatusToCanonical(rawStatus: unknown): CanonicalStatus {
  if (typeof rawStatus !== "string") {
    return "UNKNOWN";
  }

  const normalized = rawStatus.trim().toUpperCase();

  switch (normalized) {
    case "PAID":
    case "SUCCESS":
    case "SUCCESSFUL":
    case "COMPLETED":
    case "CAPTURED":
      return "PAID";

    case "SETTLED":
      return "SETTLED";

    case "FAILED":
    case "DECLINED":
    case "CANCELLED":
    case "CANCELED":
      return "FAILED";

    case "PENDING":
    case "INITIATED":
    case "PROCESSING":
    case "AUTHORIZED":
      return "PENDING";

    case "REFUNDED":
    case "REVERSED":
      return "REFUNDED";

    default:
      return "UNKNOWN";
  }
}

export interface NormalizeOrderResult {
  transaction: CanonicalTransaction | null;
  errors: ValidationError[];
}

/**
 * Normalizes a raw internal order record into a CanonicalTransaction.
 * 
 * @param rawOrder - Raw order ledger record
 * @returns Normalized transaction or validation errors
 */
export function normalizeOrder(rawOrder: unknown): NormalizeOrderResult {
  const validation = validateRawOrder(rawOrder);
  if (!validation.isValid) {
    return {
      transaction: null,
      errors: validation.errors,
    };
  }

  const order = rawOrder as Record<string, unknown>;
  const orderId = String(order.order_id).trim();
  const rawTimestamp = order.order_timestamp ?? order.timestamp;
  const isoTimestamp = normalizeTimestamp(rawTimestamp);

  if (!isoTimestamp) {
    return {
      transaction: null,
      errors: [
        {
          recordId: orderId,
          source: "ORDER_LEDGER",
          field: "order_timestamp",
          value: rawTimestamp,
          message: "Failed to parse timestamp to ISO 8601 UTC format",
        },
      ],
    };
  }

  const amountMinor = toMinorUnits(order.amount as number);
  const rawStatus = order.order_status ?? order.status;
  const status = mapOrderStatusToCanonical(rawStatus);
  const rawRef = order.reference ?? order.transaction_reference ?? order.ref;
  const transactionRef = normalizeReference(rawRef);
  const customerId = normalizeReference(order.customer_id);
  const currency = typeof order.currency === "string" ? order.currency.toUpperCase() : "INR";
  const paymentMethod =
    typeof order.payment_method === "string" ? order.payment_method.trim() : null;

  // Collect any non-standard metadata keys
  const standardKeys = new Set([
    "order_id",
    "customer_id",
    "amount",
    "currency",
    "order_timestamp",
    "payment_method",
    "order_status",
    "reference",
    "timestamp",
    "status",
  ]);

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(order)) {
    if (!standardKeys.has(key)) {
      metadata[key] = value;
    }
  }

  const transaction: CanonicalTransaction = {
    source: "ORDER_LEDGER",
    sourceRecordId: orderId,
    transactionReference: transactionRef,
    orderId: orderId,
    customerId: customerId,
    amount: amountMinor,
    amountMinor: amountMinor,
    currency,
    timestamp: isoTimestamp,
    status,
    paymentMethod,
    fee: null,
    feeMinor: null,
    tax: null,
    taxMinor: null,
    refundAmount: 0,
    refundAmountMinor: 0,
    metadata,
  };

  return {
    transaction,
    errors: [],
  };
}
