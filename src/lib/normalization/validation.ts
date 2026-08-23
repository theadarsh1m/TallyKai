/**
 * TARI — AI Finance Controller
 * Phase 2: Raw Financial Data Validation
 * 
 * Performs strict validation on raw records before canonical normalization.
 * Flags corrupted fields, negative/non-numeric amounts, invalid timestamps, and missing IDs.
 */

import { ValidationError } from "./types";
import { isValidTimestamp } from "./dates";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a raw internal order record before normalization.
 */
export function validateRawOrder(record: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!record || typeof record !== "object") {
    return {
      isValid: false,
      errors: [
        {
          source: "ORDER_LEDGER",
          field: "record",
          value: record,
          message: "Order record must be a valid non-null object",
        },
      ],
    };
  }

  const order = record as Record<string, unknown>;
  const recordId = typeof order.order_id === "string" ? order.order_id : undefined;

  // 1. Order ID validation
  if (!order.order_id || typeof order.order_id !== "string" || !order.order_id.trim()) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "order_id",
      value: order.order_id,
      message: "Order must have a non-empty order_id string",
    });
  }

  // 2. Amount validation
  if (order.amount === undefined || order.amount === null) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "amount",
      value: order.amount,
      message: "Order amount is required",
    });
  } else if (typeof order.amount !== "number" || isNaN(order.amount) || !isFinite(order.amount)) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "amount",
      value: order.amount,
      message: "Order amount must be a numeric, finite value",
    });
  } else if (order.amount < 0) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "amount",
      value: order.amount,
      message: "Order amount must be non-negative",
    });
  }

  // 3. Timestamp validation
  if (!order.order_timestamp) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "order_timestamp",
      value: order.order_timestamp,
      message: "Order timestamp is required",
    });
  } else if (!isValidTimestamp(order.order_timestamp)) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "order_timestamp",
      value: order.order_timestamp,
      message: `Invalid order timestamp: "${String(order.order_timestamp)}"`,
    });
  }

  // 4. Currency validation
  if (!order.currency || typeof order.currency !== "string") {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "currency",
      value: order.currency,
      message: "Order currency is required and must be a string",
    });
  }

  // 5. Status validation
  if (!order.order_status && !order.status) {
    errors.push({
      recordId,
      source: "ORDER_LEDGER",
      field: "order_status",
      value: order.order_status,
      message: "Order status is required",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a raw gateway settlement record before normalization.
 */
export function validateRawSettlement(record: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!record || typeof record !== "object") {
    return {
      isValid: false,
      errors: [
        {
          source: "SETTLEMENT",
          field: "record",
          value: record,
          message: "Settlement record must be a valid non-null object",
        },
      ],
    };
  }

  const settlement = record as Record<string, unknown>;
  const recordId =
    typeof settlement.settlement_id === "string" ? settlement.settlement_id : undefined;

  // 1. Settlement ID validation
  if (
    !settlement.settlement_id ||
    typeof settlement.settlement_id !== "string" ||
    !settlement.settlement_id.trim()
  ) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_id",
      value: settlement.settlement_id,
      message: "Settlement must have a non-empty settlement_id string",
    });
  }

  // 2. Settlement Amount validation
  const amountVal =
    settlement.settlement_amount !== undefined
      ? settlement.settlement_amount
      : settlement.amount;

  if (amountVal === undefined || amountVal === null) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_amount",
      value: amountVal,
      message: "Settlement amount is required",
    });
  } else if (typeof amountVal !== "number" || isNaN(amountVal) || !isFinite(amountVal)) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_amount",
      value: amountVal,
      message: "Settlement amount must be a numeric, finite value",
    });
  } else if (amountVal < 0) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_amount",
      value: amountVal,
      message: "Settlement amount must be non-negative",
    });
  }

  // 3. Timestamp validation
  const timestampVal = settlement.settlement_timestamp ?? settlement.timestamp;
  if (!timestampVal) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_timestamp",
      value: timestampVal,
      message: "Settlement timestamp is required",
    });
  } else if (!isValidTimestamp(timestampVal)) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_timestamp",
      value: timestampVal,
      message: `Invalid settlement timestamp: "${String(timestampVal)}"`,
    });
  }

  // 4. Status validation
  const statusVal = settlement.settlement_status ?? settlement.status;
  if (!statusVal) {
    errors.push({
      recordId,
      source: "SETTLEMENT",
      field: "settlement_status",
      value: statusVal,
      message: "Settlement status is required",
    });
  }

  // 5. Fee / Tax numeric validations (if present)
  if (settlement.fee !== undefined && settlement.fee !== null) {
    if (typeof settlement.fee !== "number" || isNaN(settlement.fee) || settlement.fee < 0) {
      errors.push({
        recordId,
        source: "SETTLEMENT",
        field: "fee",
        value: settlement.fee,
        message: "Settlement fee must be a non-negative number if provided",
      });
    }
  }

  if (settlement.tax !== undefined && settlement.tax !== null) {
    if (typeof settlement.tax !== "number" || isNaN(settlement.tax) || settlement.tax < 0) {
      errors.push({
        recordId,
        source: "SETTLEMENT",
        field: "tax",
        value: settlement.tax,
        message: "Settlement tax must be a non-negative number if provided",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
