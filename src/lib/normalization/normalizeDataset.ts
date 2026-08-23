/**
 * TARI — AI Finance Controller
 * Phase 2: Normalization Pipeline
 * 
 * Ingests raw datasets (orders, settlements), applies structured validation,
 * maps each valid record to a CanonicalTransaction, and aggregates statistics.
 * 
 * IMPORTANT: This pipeline is strictly isolated from Ground Truth data.
 */

import {
  CanonicalTransaction,
  ValidationError,
  NormalizationResult,
  NormalizationStatistics,
} from "./types";
import { normalizeOrder } from "./normalizeOrder";
import { normalizeSettlement } from "./normalizeSettlement";

export interface NormalizeDatasetOptions {
  /** Stop processing on first error (default: false) */
  bailOnError?: boolean;
}

/**
 * Normalizes collections of raw orders and settlements into canonical financial records.
 * 
 * @param orders - Array of raw order records
 * @param settlements - Array of raw gateway settlement records
 * @param options - Normalization options
 * @returns NormalizationResult with canonical records, errors, and statistics
 */
export function normalizeDataset(
  orders: unknown[] = [],
  settlements: unknown[] = [],
  options: NormalizeDatasetOptions = {}
): NormalizationResult {
  const normalizedRecords: CanonicalTransaction[] = [];
  const errors: ValidationError[] = [];

  let ordersNormalized = 0;
  let ordersFailed = 0;
  let settlementsNormalized = 0;
  let settlementsFailed = 0;

  // 1. Process Order Ledger
  for (const rawOrder of orders) {
    const result = normalizeOrder(rawOrder);
    if (result.transaction) {
      normalizedRecords.push(result.transaction);
      ordersNormalized++;
    } else {
      ordersFailed++;
      errors.push(...result.errors);
      if (options.bailOnError) {
        break;
      }
    }
  }

  // 2. Process Settlement Feed
  for (const rawSettlement of settlements) {
    const result = normalizeSettlement(rawSettlement);
    if (result.transaction) {
      normalizedRecords.push(result.transaction);
      settlementsNormalized++;
    } else {
      settlementsFailed++;
      errors.push(...result.errors);
      if (options.bailOnError) {
        break;
      }
    }
  }

  const total = orders.length + settlements.length;
  const normalized = ordersNormalized + settlementsNormalized;
  const failed = ordersFailed + settlementsFailed;

  const statistics: NormalizationStatistics = {
    total,
    normalized,
    failed,
    ordersTotal: orders.length,
    ordersNormalized,
    ordersFailed,
    settlementsTotal: settlements.length,
    settlementsNormalized,
    settlementsFailed,
  };

  return {
    normalizedRecords,
    errors,
    statistics,
  };
}
