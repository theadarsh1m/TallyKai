/**
 * TallyKai — AI Finance Controller
 * Phase 3: Core Deterministic Matching Rules & Decision Engine
 */

import { CanonicalTransaction } from "../normalization/types";
import { fromMinorUnits } from "../normalization/money";
import {
  OrderReconciliationResult,
  EvidenceItem,
} from "./types";
import { ReconciliationEngineConfig } from "./config";
import { OrderIndex } from "./indexer";

/**
 * Calculates the settlement time lag in days between an order and a settlement.
 */
export function calculateDateDelayDays(orderTimestamp: string, settlementTimestamp: string): number {
  const orderTime = new Date(orderTimestamp).getTime();
  const settlementTime = new Date(settlementTimestamp).getTime();
  const diffMs = settlementTime - orderTime;
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Evaluates an order when 0 candidate settlements are found.
 */
export function evaluateMissingSettlement(order: CanonicalTransaction): OrderReconciliationResult {
  const evidence: EvidenceItem[] = [
    {
      type: "MISSING_RECORD",
      missingType: "SETTLEMENT",
      orderId: order.orderId,
      orderAmountMinor: order.amountMinor,
      orderTimestamp: order.timestamp,
      description: "No settlement record exists with matching order_id or transaction reference.",
    },
  ];

  return {
    orderId: order.sourceRecordId,
    status: "MISSING_SETTLEMENT",
    matchMethod: "NONE",
    settlementIds: [],
    confidence: 1.0,
    amountDifferenceMinor: order.amountMinor,
    reason: "No corresponding settlement record found in payout feed.",
    exceptionCategory: "MISSING_SETTLEMENT",
    evidence,
  };
}

/**
 * Evaluates an order when exactly 1 candidate settlement is found.
 */
export function evaluateSingleSettlement(
  order: CanonicalTransaction,
  settlement: CanonicalTransaction,
  config: ReconciliationEngineConfig,
  orderIndex: OrderIndex
): OrderReconciliationResult {
  const feeMinor = settlement.feeMinor ?? 0;
  const taxMinor = settlement.taxMinor ?? 0;
  const settlementAmountMinor = settlement.amountMinor;
  const expectedNetMinor = order.amountMinor - feeMinor - taxMinor;
  const diffMinor = settlementAmountMinor - expectedNetMinor;
  const absDiffMinor = Math.abs(diffMinor);

  const delayDays = calculateDateDelayDays(order.timestamp, settlement.timestamp);
  // Allow grace period of 2 hours for edge-of-day timestamp comparisons
  const isDateWithinWindow =
    delayDays >= config.minSettlementDelayDays - (2 / 24) &&
    delayDays <= config.maxSettlementDelayDays + (2 / 24);

  const evidence: EvidenceItem[] = [
    {
      type: "REFERENCE_MATCH",
      orderRef: order.transactionReference ?? order.sourceRecordId,
      settlementRef: settlement.transactionReference ?? settlement.sourceRecordId,
      matchedKey:
        order.orderId === settlement.orderId
          ? "order_id"
          : "transaction_reference",
    },
    {
      type: "AMOUNT_COMPARISON",
      orderAmountMinor: order.amountMinor,
      feeMinor,
      taxMinor,
      expectedSettlementMinor: expectedNetMinor,
      actualSettlementMinor: settlementAmountMinor,
      differenceMinor: diffMinor,
    },
    {
      type: "DATE_COMPARISON",
      orderTimestamp: order.timestamp,
      settlementTimestamp: settlement.timestamp,
      delayDays: parseFloat(delayDays.toFixed(2)),
      isWithinWindow: isDateWithinWindow,
    },
  ];

  if (feeMinor > 0) {
    evidence.push({ type: "FEE_ADJUSTMENT", feeMinor });
  }
  if (taxMinor > 0) {
    evidence.push({ type: "TAX_ADJUSTMENT", taxMinor });
  }

  // Check if this settlement is a merged batch settlement shared by multiple orders
  if (
    settlement.transactionReference &&
    settlement.transactionReference.startsWith("BATCH-")
  ) {
    const batchOrders = orderIndex.byReference.get(settlement.transactionReference) ?? [order];
    const batchOrderIds = batchOrders.map((o) => o.sourceRecordId);
    const batchTotalOrdersMinor = batchOrders.reduce((sum, o) => sum + o.amountMinor, 0);
    const batchExpectedNetMinor = batchTotalOrdersMinor - feeMinor - taxMinor;

    if (Math.abs(settlementAmountMinor - batchExpectedNetMinor) <= config.maxRoundingDifferenceMinor) {
      evidence.push({
        type: "MERGED_BATCH",
        batchReference: settlement.transactionReference,
        batchOrderIds,
        batchTotalMinor: batchTotalOrdersMinor,
      });

      return {
        orderId: order.sourceRecordId,
        status: "MATCHED_AFTER_ADJUSTMENTS",
        matchMethod: "MERGED_BATCH",
        settlementIds: [settlement.sourceRecordId],
        confidence: 0.98,
        amountDifferenceMinor: 0,
        reason: `Order settled as part of batch settlement ${settlement.sourceRecordId} (Ref: ${settlement.transactionReference}) with ${batchOrders.length} bundled orders.`,
        exceptionCategory: null,
        evidence,
      };
    }
  }

  // Case 1: Exact amount match (0 fee, 0 tax)
  if (absDiffMinor === 0 && feeMinor === 0 && taxMinor === 0) {
    if (isDateWithinWindow) {
      return {
        orderId: order.sourceRecordId,
        status: "MATCHED",
        matchMethod: "EXACT_REFERENCE",
        settlementIds: [settlement.sourceRecordId],
        confidence: 1.0,
        amountDifferenceMinor: 0,
        reason: `Exact reference and full gross amount match (₹${fromMinorUnits(settlementAmountMinor)}).`,
        exceptionCategory: null,
        evidence,
      };
    } else {
      return {
        orderId: order.sourceRecordId,
        status: "EXCEPTION",
        matchMethod: "EXACT_REFERENCE",
        settlementIds: [settlement.sourceRecordId],
        confidence: 0.85,
        amountDifferenceMinor: 0,
        reason: `Gross amount matches but settlement timestamp is outside permitted window (lag: ${delayDays.toFixed(1)} days).`,
        exceptionCategory: "DATE_OUT_OF_RANGE",
        evidence,
      };
    }
  }

  // Case 2: Fee and/or Tax adjusted match
  if (absDiffMinor === 0 && (feeMinor > 0 || taxMinor > 0)) {
    const matchMethod = taxMinor > 0 ? "TAX_ADJUSTED" : "FEE_ADJUSTED";
    if (isDateWithinWindow) {
      const adjustmentText =
        taxMinor > 0
          ? `₹${fromMinorUnits(feeMinor)} MDR fee and ₹${fromMinorUnits(taxMinor)} GST tax`
          : `₹${fromMinorUnits(feeMinor)} MDR fee`;

      return {
        orderId: order.sourceRecordId,
        status: "MATCHED_AFTER_ADJUSTMENTS",
        matchMethod,
        settlementIds: [settlement.sourceRecordId],
        confidence: 1.0,
        amountDifferenceMinor: 0,
        reason: `Settlement matches expected net amount after accounting for ${adjustmentText}.`,
        exceptionCategory: null,
        evidence,
      };
    } else {
      return {
        orderId: order.sourceRecordId,
        status: "EXCEPTION",
        matchMethod,
        settlementIds: [settlement.sourceRecordId],
        confidence: 0.85,
        amountDifferenceMinor: 0,
        reason: `Net settlement amount matches after fee/tax deductions, but settlement is delayed (T+${delayDays.toFixed(1)} days).`,
        exceptionCategory: "DATE_OUT_OF_RANGE",
        evidence,
      };
    }
  }

  // Case 3: Acceptable Rounding Tolerance
  if (absDiffMinor > 0 && absDiffMinor <= config.maxRoundingDifferenceMinor) {
    evidence.push({
      type: "ROUNDING_DIFFERENCE",
      diffMinor,
      maxAllowedMinor: config.maxRoundingDifferenceMinor,
    });

    if (isDateWithinWindow) {
      return {
        orderId: order.sourceRecordId,
        status: "MATCHED_AFTER_ADJUSTMENTS",
        matchMethod: "ROUNDING_TOLERANCE",
        settlementIds: [settlement.sourceRecordId],
        confidence: 0.97,
        amountDifferenceMinor: diffMinor,
        reason: `Settlement matched with acceptable minor rounding variance of ₹${(diffMinor / 100).toFixed(2)}.`,
        exceptionCategory: null,
        evidence,
      };
    } else {
      return {
        orderId: order.sourceRecordId,
        status: "EXCEPTION",
        matchMethod: "ROUNDING_TOLERANCE",
        settlementIds: [settlement.sourceRecordId],
        confidence: 0.85,
        amountDifferenceMinor: diffMinor,
        reason: `Matched with minor rounding variance but delayed outside permitted window (T+${delayDays.toFixed(1)} days).`,
        exceptionCategory: "DATE_OUT_OF_RANGE",
        evidence,
      };
    }
  }

  // Case 4: Genuine Amount Mismatch
  return {
    orderId: order.sourceRecordId,
    status: "EXCEPTION",
    matchMethod: "NONE",
    settlementIds: [settlement.sourceRecordId],
    confidence: 0.90,
    amountDifferenceMinor: diffMinor,
    reason: `Settlement amount mismatch: Settled ₹${fromMinorUnits(settlementAmountMinor)} but expected net ₹${fromMinorUnits(expectedNetMinor)} (discrepancy: ₹${(diffMinor / 100).toFixed(2)}).`,
    exceptionCategory: "AMOUNT_MISMATCH",
    evidence,
  };
}

/**
 * Evaluates an order when multiple candidate settlements correspond to the same order.
 * Distinguishes between duplicate payouts, partial settlement splits, and multi-record mismatches.
 */
export function evaluateMultipleSettlements(
  order: CanonicalTransaction,
  candidates: CanonicalTransaction[],
  config: ReconciliationEngineConfig
): OrderReconciliationResult {
  const settlementIds = candidates.map((s) => s.sourceRecordId);
  const totalSettledMinor = candidates.reduce((sum, s) => sum + s.amountMinor, 0);
  const totalFeeMinor = candidates.reduce((sum, s) => sum + (s.feeMinor ?? 0), 0);
  const totalTaxMinor = candidates.reduce((sum, s) => sum + (s.taxMinor ?? 0), 0);

  const expectedCombinedNetMinor = order.amountMinor - totalFeeMinor - totalTaxMinor;
  const combinedDiffMinor = totalSettledMinor - expectedCombinedNetMinor;
  const absCombinedDiffMinor = Math.abs(combinedDiffMinor);

  const evidence: EvidenceItem[] = [
    {
      type: "MULTIPLE_SETTLEMENTS",
      count: candidates.length,
      settlementIds,
      totalSettledMinor,
      totalFeeMinor,
      totalTaxMinor,
      expectedCombinedNetMinor,
      combinedDiffMinor,
    },
  ];

  // 1. Check for Duplicate Settlement Payouts:
  // If individual settlements each equal (or nearly equal) the order amount/expected net
  const eachMatchesExpected = candidates.every(
    (c) =>
      Math.abs(c.amountMinor - (order.amountMinor - (c.feeMinor ?? 0) - (c.taxMinor ?? 0))) <=
      config.maxRoundingDifferenceMinor
  );

  if (eachMatchesExpected && candidates.length >= 2) {
    return {
      orderId: order.sourceRecordId,
      status: "DUPLICATE",
      matchMethod: "NONE",
      settlementIds,
      confidence: 0.95,
      amountDifferenceMinor: totalSettledMinor - (order.amountMinor - (candidates[0].feeMinor ?? 0) - (candidates[0].taxMinor ?? 0)),
      reason: `Duplicate settlement detected: ${candidates.length} separate settlement records (${settlementIds.join(", ")}) paid out for a single order.`,
      exceptionCategory: "DUPLICATE_SETTLEMENT",
      evidence,
    };
  }

  // 2. Check for Valid Partial Settlements:
  // The combined settlement sum matches expected net within rounding tolerance
  if (absCombinedDiffMinor <= config.maxRoundingDifferenceMinor) {
    return {
      orderId: order.sourceRecordId,
      status: "MATCHED_AFTER_ADJUSTMENTS",
      matchMethod: "PARTIAL_SETTLEMENT",
      settlementIds,
      confidence: 0.98,
      amountDifferenceMinor: combinedDiffMinor,
      reason: `Settlement matched across ${candidates.length} partial payout records (${settlementIds.join(", ")}) totaling ₹${fromMinorUnits(totalSettledMinor)}.`,
      exceptionCategory: null,
      evidence,
    };
  }

  // 3. Multi-Record Amount Discrepancy
  return {
    orderId: order.sourceRecordId,
    status: "EXCEPTION",
    matchMethod: "NONE",
    settlementIds,
    confidence: 0.90,
    amountDifferenceMinor: combinedDiffMinor,
    reason: `Partial settlement discrepancy: Found ${candidates.length} settlement records totaling ₹${fromMinorUnits(totalSettledMinor)}, but expected net ₹${fromMinorUnits(expectedCombinedNetMinor)}.`,
    exceptionCategory: "PARTIAL_SETTLEMENT_MISMATCH",
    evidence,
  };
}

/**
 * Creates an orphan settlement result for settlements with no corresponding order ledger entry.
 */
export function createOrphanSettlementResult(settlement: CanonicalTransaction): {
  settlementId: string;
  status: "ORPHAN_SETTLEMENT";
  settlementReference: string | null;
  settlementAmountMinor: number;
  settlementTimestamp: string;
  reason: string;
  evidence: EvidenceItem[];
} {
  const evidence: EvidenceItem[] = [
    {
      type: "MISSING_RECORD",
      missingType: "ORDER",
      settlementId: settlement.sourceRecordId,
      settlementReference: settlement.transactionReference,
      settlementAmountMinor: settlement.amountMinor,
      settlementTimestamp: settlement.timestamp,
      description: "No internal order record matches this settlement reference or order ID.",
    },
  ];

  return {
    settlementId: settlement.sourceRecordId,
    status: "ORPHAN_SETTLEMENT",
    settlementReference: settlement.transactionReference,
    settlementAmountMinor: settlement.amountMinor,
    settlementTimestamp: settlement.timestamp,
    reason: `Orphan gateway settlement: ${settlement.sourceRecordId} (₹${fromMinorUnits(settlement.amountMinor)}) has no matching internal order ledger record.`,
    evidence,
  };
}
