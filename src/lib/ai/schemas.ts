/**
 * TallyKai — AI Finance Controller
 * Phase 5: Structured Context Builders & JSON Schemas
 */

import { CanonicalTransaction } from "../normalization/types";
import { formatCurrency } from "../normalization/money";
import { OrderReconciliationResult } from "../reconciliation/types";
import { AIInvestigationContext, DatasetLookupContext } from "./types";

/**
 * Builds a compact, relevant investigation context for a specific unresolved exception.
 * Keeps token payload small and deterministic.
 */
export function buildInvestigationContext(
  order: CanonicalTransaction,
  reconResult: OrderReconciliationResult,
  dataset: DatasetLookupContext
): AIInvestigationContext {
  // Estimate expected standard deductions (2% MDR fee + 18% GST)
  const estFeeMinor = Math.round(order.amountMinor * 0.02);
  const estTaxMinor = Math.round(estFeeMinor * 0.18);
  const expectedNetMinor = order.amountMinor - estFeeMinor - estTaxMinor;

  // Extract candidate settlement details from fuzzy candidates or related lookup
  const candidates: AIInvestigationContext["candidates"] = [];

  if (reconResult.fuzzyCandidates && reconResult.fuzzyCandidates.length > 0) {
    for (const cand of reconResult.fuzzyCandidates.slice(0, 5)) {
      const s = dataset.settlementsById.get(cand.settlementId);
      if (s) {
        candidates.push({
          settlementId: s.sourceRecordId,
          amountMinor: s.amountMinor,
          amountFormatted: formatCurrency(s.amountMinor, s.currency || "INR"),
          timestamp: s.timestamp,
          reference: s.transactionReference,
          orderId: s.orderId,
          feeMinor: s.feeMinor,
          taxMinor: s.taxMinor,
          score: cand.score,
          evidence: cand.evidence,
        });
      }
    }
  }

  // If no fuzzy candidates attached, check by customer ID or reference
  if (candidates.length === 0) {
    if (order.customerId) {
      const custHits = dataset.settlementsByCustomer.get(order.customerId.trim().toUpperCase()) ?? [];
      for (const s of custHits.slice(0, 3)) {
        candidates.push({
          settlementId: s.sourceRecordId,
          amountMinor: s.amountMinor,
          amountFormatted: formatCurrency(s.amountMinor, s.currency || "INR"),
          timestamp: s.timestamp,
          reference: s.transactionReference,
          orderId: s.orderId,
          feeMinor: s.feeMinor,
          taxMinor: s.taxMinor,
          score: 0.5,
          evidence: { customerMatch: true },
        });
      }
    }
  }

  return {
    order: {
      orderId: order.sourceRecordId,
      amountMinor: order.amountMinor,
      amountFormatted: formatCurrency(order.amountMinor, order.currency || "INR"),
      currency: order.currency || "INR",
      timestamp: order.timestamp,
      reference: order.transactionReference,
      customerId: order.customerId,
      paymentMethod: order.paymentMethod,
    },
    candidates,
    knownAdjustments: {
      estimatedFeeMinor: estFeeMinor,
      estimatedTaxMinor: estTaxMinor,
      expectedNetMinor,
      expectedNetFormatted: formatCurrency(expectedNetMinor, order.currency || "INR"),
    },
    exception: {
      type: reconResult.exceptionCategory || reconResult.status,
      reason: reconResult.reason,
      confidence: reconResult.confidence,
    },
  };
}

/**
 * Expected JSON output schema definition for the AI agent.
 */
export const AI_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    decision: {
      type: "string",
      enum: ["MATCH", "EXCEPTION", "HUMAN_REVIEW"],
      description: "Final investigation decision",
    },
    recommendedSettlementIds: {
      type: "array",
      items: { type: "string" },
      description: "Settlement IDs recommended for matching (empty array if no match)",
    },
    exceptionType: {
      type: "string",
      description: "Standard exception category if decision is EXCEPTION or HUMAN_REVIEW",
    },
    confidence: {
      type: "number",
      minimum: 0.0,
      maximum: 1.0,
      description: "Confidence score between 0.0 and 1.0",
    },
    reasoningSummary: {
      type: "string",
      description: "Clear, concise financial explanation supporting the decision",
    },
    evidenceUsed: {
      type: "array",
      items: { type: "string" },
      description: "List of factual evidence data points used in the decision",
    },
    unresolvedQuestions: {
      type: "array",
      items: { type: "string" },
      description: "Any remaining gaps or ambiguities that require human attention",
    },
    recommendedAction: {
      type: "string",
      description: "Concrete next operational action for the finance controller",
    },
  },
  required: [
    "decision",
    "recommendedSettlementIds",
    "exceptionType",
    "confidence",
    "reasoningSummary",
    "evidenceUsed",
    "unresolvedQuestions",
    "recommendedAction",
  ],
};
