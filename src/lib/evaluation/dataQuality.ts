/**
 * TallyKai — AI Finance Controller
 * Phase 6: Dataset Quality Metrics
 */

import { DataQualityMetrics } from "./types";
import { Order, Settlement } from "../data/types";
import { NormalizationResult } from "../normalization/types";

export function computeDataQualityMetrics(
  orders: Order[],
  settlements: Settlement[],
  normResult?: NormalizationResult
): DataQualityMetrics {
  const totalInputRecords = orders.length + settlements.length;

  let recordsNormalized = totalInputRecords;
  let invalidRecords = 0;
  let missingFieldsCount = 0;
  let duplicateSourceRecords = 0;

  if (normResult) {
    recordsNormalized = normResult.normalizedRecords.length;
    invalidRecords = normResult.errors.length;
    missingFieldsCount = normResult.errors.filter((e) =>
      e.message.toLowerCase().includes("missing")
    ).length;
    duplicateSourceRecords = 0;
  } else {
    // Quick inline validation
    const orderIdSet = new Set<string>();
    for (const o of orders) {
      if (!o.order_id || !o.amount || !o.order_timestamp) {
        missingFieldsCount++;
        invalidRecords++;
      }
      if (orderIdSet.has(o.order_id)) {
        duplicateSourceRecords++;
        invalidRecords++;
      }
      orderIdSet.add(o.order_id);
    }

    const settlementIdSet = new Set<string>();
    for (const s of settlements) {
      if (!s.settlement_id || s.settlement_amount === undefined || !s.settlement_timestamp) {
        missingFieldsCount++;
        invalidRecords++;
      }
      if (settlementIdSet.has(s.settlement_id)) {
        duplicateSourceRecords++;
        invalidRecords++;
      }
      settlementIdSet.add(s.settlement_id);
    }
  }

  const validRecords = Math.max(0, totalInputRecords - invalidRecords);
  const dataQualityScore =
    totalInputRecords > 0
      ? parseFloat(((validRecords / totalInputRecords) * 100).toFixed(2))
      : 100.0;

  return {
    recordsGenerated: totalInputRecords,
    recordsNormalized,
    invalidRecords,
    missingFieldsCount,
    duplicateSourceRecords,
    dataQualityScore,
  };
}
