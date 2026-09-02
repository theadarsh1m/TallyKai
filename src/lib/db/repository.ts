/**
 * TallyKai — Database Repository & Persistence Layer
 * Provides typed data-access operations for Orders, Settlements,
 * Reconciliation Runs, AI Investigations, and System Audit Trails.
 */

import { prisma } from "./prisma";
import { CanonicalTransaction } from "../normalization/types";
import {
  OrderReconciliationResult,
  ReconciliationSummary,
  ReconciliationDatasetResult,
} from "../reconciliation/types";
import { Prisma } from "@prisma/client";

/**
 * Bulk upserts canonical orders into Neon PostgreSQL.
 */
export async function upsertOrders(orders: CanonicalTransaction[]) {
  const operations = orders.map((o) =>
    prisma.order.upsert({
      where: { orderId: o.orderId || o.sourceRecordId },
      update: {
        transactionReference: o.transactionReference,
        customerId: o.customerId,
        amountMinor: BigInt(o.amountMinor),
        currency: o.currency,
        timestamp: new Date(o.timestamp),
        status: o.status,
        paymentMethod: o.paymentMethod,
        feeMinor: o.feeMinor !== null ? BigInt(o.feeMinor) : null,
        taxMinor: o.taxMinor !== null ? BigInt(o.taxMinor) : null,
        refundAmountMinor: BigInt(o.refundAmountMinor || 0),
        metadata: (o.metadata as Prisma.InputJsonValue) || {},
      },
      create: {
        orderId: o.orderId || o.sourceRecordId,
        sourceRecordId: o.sourceRecordId,
        transactionReference: o.transactionReference,
        customerId: o.customerId,
        amountMinor: BigInt(o.amountMinor),
        currency: o.currency,
        timestamp: new Date(o.timestamp),
        status: o.status,
        paymentMethod: o.paymentMethod,
        feeMinor: o.feeMinor !== null ? BigInt(o.feeMinor) : null,
        taxMinor: o.taxMinor !== null ? BigInt(o.taxMinor) : null,
        refundAmountMinor: BigInt(o.refundAmountMinor || 0),
        metadata: (o.metadata as Prisma.InputJsonValue) || {},
      },
    })
  );

  return prisma.$transaction(operations);
}

/**
 * Bulk upserts gateway settlements into Neon PostgreSQL.
 */
export async function upsertSettlements(settlements: CanonicalTransaction[]) {
  const operations = settlements.map((s) =>
    prisma.settlement.upsert({
      where: { settlementId: s.sourceRecordId },
      update: {
        orderId: s.orderId,
        transactionReference: s.transactionReference,
        customerId: s.customerId,
        amountMinor: BigInt(s.amountMinor),
        currency: s.currency,
        timestamp: new Date(s.timestamp),
        status: s.status,
        paymentMethod: s.paymentMethod,
        feeMinor: s.feeMinor !== null ? BigInt(s.feeMinor) : null,
        taxMinor: s.taxMinor !== null ? BigInt(s.taxMinor) : null,
        refundAmountMinor: BigInt(s.refundAmountMinor || 0),
        metadata: (s.metadata as Prisma.InputJsonValue) || {},
      },
      create: {
        settlementId: s.sourceRecordId,
        sourceRecordId: s.sourceRecordId,
        orderId: s.orderId,
        transactionReference: s.transactionReference,
        customerId: s.customerId,
        amountMinor: BigInt(s.amountMinor),
        currency: s.currency,
        timestamp: new Date(s.timestamp),
        status: s.status,
        paymentMethod: s.paymentMethod,
        feeMinor: s.feeMinor !== null ? BigInt(s.feeMinor) : null,
        taxMinor: s.taxMinor !== null ? BigInt(s.taxMinor) : null,
        refundAmountMinor: BigInt(s.refundAmountMinor || 0),
        metadata: (s.metadata as Prisma.InputJsonValue) || {},
      },
    })
  );

  return prisma.$transaction(operations);
}

/**
 * Persists an entire 3-pass reconciliation run and associated AI investigations.
 */
export async function saveReconciliationRun(
  datasetResult: ReconciliationDatasetResult,
  runId: string = `RUN-${Date.now()}`
) {
  const { orderResults, summary } = datasetResult;

  // 1. Upsert Reconciliation Results
  const reconOps = orderResults.map((r) =>
    prisma.reconciliationResult.upsert({
      where: { orderId: r.orderId },
      update: {
        status: r.status,
        matchMethod: r.matchMethod,
        settlementIds: r.settlementIds,
        confidence: r.confidence,
        amountDifferenceMinor: BigInt(r.amountDifferenceMinor || 0),
        reason: r.reason,
        exceptionCategory: r.exceptionCategory,
        evidence: (r.evidence as unknown as Prisma.InputJsonValue) || [],
        fuzzyCandidates: (r.fuzzyCandidates as unknown as Prisma.InputJsonValue) || undefined,
      },
      create: {
        orderId: r.orderId,
        status: r.status,
        matchMethod: r.matchMethod,
        settlementIds: r.settlementIds,
        confidence: r.confidence,
        amountDifferenceMinor: BigInt(r.amountDifferenceMinor || 0),
        reason: r.reason,
        exceptionCategory: r.exceptionCategory,
        evidence: (r.evidence as unknown as Prisma.InputJsonValue) || [],
        fuzzyCandidates: (r.fuzzyCandidates as unknown as Prisma.InputJsonValue) || undefined,
      },
    })
  );

  // 2. Persist AI Investigations
  const aiOps = orderResults
    .filter((r) => Boolean(r.aiInvestigation))
    .map((r) => {
      const inv = r.aiInvestigation!;
      return prisma.aIInvestigation.upsert({
        where: { orderId: r.orderId },
        update: {
          investigationId: inv.investigationId,
          decision: inv.decision,
          recommendedSettlementIds: inv.recommendedSettlementIds,
          exceptionType: inv.exceptionType,
          confidence: inv.confidence,
          reasoningSummary: inv.reasoningSummary,
          evidenceUsed: inv.evidenceUsed,
          unresolvedQuestions: inv.unresolvedQuestions,
          recommendedAction: inv.recommendedAction,
          model: inv.model,
          durationMs: inv.durationMs,
          auditEvents: (inv.auditEvents as unknown as Prisma.InputJsonValue) || [],
        },
        create: {
          investigationId: inv.investigationId,
          orderId: r.orderId,
          decision: inv.decision,
          recommendedSettlementIds: inv.recommendedSettlementIds,
          exceptionType: inv.exceptionType,
          confidence: inv.confidence,
          reasoningSummary: inv.reasoningSummary,
          evidenceUsed: inv.evidenceUsed,
          unresolvedQuestions: inv.unresolvedQuestions,
          recommendedAction: inv.recommendedAction,
          model: inv.model,
          durationMs: inv.durationMs,
          auditEvents: (inv.auditEvents as unknown as Prisma.InputJsonValue) || [],
        },
      });
    });

  // 3. Save Summary Report
  const summaryOp = prisma.reconciliationSummaryReport.upsert({
    where: { runId },
    update: {
      totalOrders: summary.totalOrders,
      totalSettlements: summary.totalSettlements,
      matched: summary.matched,
      matchedAfterAdjustments: summary.matchedAfterAdjustments,
      missingSettlements: summary.missingSettlements,
      partialSettlements: summary.partialSettlements,
      duplicates: summary.duplicates,
      orphanSettlements: summary.orphanSettlements,
      unresolved: summary.unresolved,
      exceptions: summary.exceptions,
      totalMatched: summary.totalMatched,
      deterministicResolutionRate: summary.deterministicResolutionRate,
      fuzzyResolutionRate: summary.fuzzyResolutionRate ?? null,
      aiResolutionRate: summary.aiResolutionRate ?? null,
      processingTimeMs: summary.processingTimeMs,
    },
    create: {
      runId,
      totalOrders: summary.totalOrders,
      totalSettlements: summary.totalSettlements,
      matched: summary.matched,
      matchedAfterAdjustments: summary.matchedAfterAdjustments,
      missingSettlements: summary.missingSettlements,
      partialSettlements: summary.partialSettlements,
      duplicates: summary.duplicates,
      orphanSettlements: summary.orphanSettlements,
      unresolved: summary.unresolved,
      exceptions: summary.exceptions,
      totalMatched: summary.totalMatched,
      deterministicResolutionRate: summary.deterministicResolutionRate,
      fuzzyResolutionRate: summary.fuzzyResolutionRate ?? null,
      aiResolutionRate: summary.aiResolutionRate ?? null,
      processingTimeMs: summary.processingTimeMs,
    },
  });

  await prisma.$transaction([...reconOps, ...aiOps, summaryOp]);
  return { runId, savedOrders: orderResults.length, savedAIInvestigations: aiOps.length };
}

/**
 * Fetches exceptions needing investigation or manual review.
 */
export async function getExceptions(options: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = options;
  return prisma.reconciliationResult.findMany({
    where: {
      status: {
        in: ["EXCEPTION", "MISSING_SETTLEMENT", "AMBIGUOUS", "UNRESOLVED", "HUMAN_REVIEW"],
      },
    },
    include: {
      order: true,
      aiInvestigation: true,
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Logs an operational audit event.
 */
export async function logAuditEvent(params: {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditEvent.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      metadata: (params.metadata as Prisma.InputJsonValue) || {},
    },
  });
}
