/**
 * TallyKai — AI Finance Controller
 * Phase 3: Deterministic Reconciliation Pipeline & Orchestrator
 * 
 * Ingests normalized canonical records, executes deterministic multi-pass reconciliation,
 * detects exceptions, orphans, duplicates, and returns structured results and summary metrics.
 * 
 * IMPORTANT: This engine operates strictly on normalized records and NEVER references Ground Truth.
 */

import { CanonicalTransaction } from "../normalization/types";
import {
  ReconciliationDatasetResult,
  OrderReconciliationResult,
  OrphanReconciliationResult,
  ReconciliationSummary,
} from "./types";
import { ReconciliationEngineConfig, DEFAULT_RECONCILIATION_CONFIG } from "./config";
import {
  buildSettlementIndex,
  buildOrderIndex,
  findSettlementCandidates,
} from "./indexer";
import {
  evaluateMissingSettlement,
  evaluateSingleSettlement,
  evaluateMultipleSettlements,
  createOrphanSettlementResult,
} from "./rules";

export interface ReconcileOptions {
  config?: Partial<ReconciliationEngineConfig>;
}

/**
 * Reconciles an internal order ledger against gateway settlements deterministically.
 * 
 * @param orders - Normalized canonical order transactions
 * @param settlements - Normalized canonical settlement transactions
 * @param options - Engine configuration overrides
 * @returns Complete reconciliation dataset results with individual outcomes and aggregate summary
 */
export function reconcileDataset(
  orders: CanonicalTransaction[],
  settlements: CanonicalTransaction[],
  options: ReconcileOptions = {}
): ReconciliationDatasetResult {
  const startTime = performance.now();
  const config: ReconciliationEngineConfig = {
    ...DEFAULT_RECONCILIATION_CONFIG,
    ...options.config,
  };

  // 1. Build high-speed indexing maps
  const settlementIndex = buildSettlementIndex(settlements);
  const orderIndex = buildOrderIndex(orders);

  const orderResults: OrderReconciliationResult[] = [];
  const claimedSettlementIds = new Set<string>();

  // 2. Process all orders against candidate settlements
  for (const order of orders) {
    const candidates = findSettlementCandidates(order, settlementIndex);

    let result: OrderReconciliationResult;

    if (candidates.length === 0) {
      result = evaluateMissingSettlement(order);
    } else if (candidates.length === 1) {
      result = evaluateSingleSettlement(order, candidates[0], config, orderIndex);
      claimedSettlementIds.add(candidates[0].sourceRecordId);
    } else {
      result = evaluateMultipleSettlements(order, candidates, config);
      for (const c of candidates) {
        claimedSettlementIds.add(c.sourceRecordId);
      }
    }

    orderResults.push(result);
  }

  // 3. Detect orphan settlements (settlements with no corresponding order)
  const orphanResults: OrphanReconciliationResult[] = [];
  for (const settlement of settlements) {
    if (!claimedSettlementIds.has(settlement.sourceRecordId)) {
      orphanResults.push(createOrphanSettlementResult(settlement));
    }
  }

  // 4. Calculate dynamic summary statistics
  let matched = 0;
  let matchedAfterAdjustments = 0;
  let missingSettlements = 0;
  let partialSettlements = 0;
  let duplicates = 0;
  let unresolved = 0;
  let directExceptions = 0;

  for (const res of orderResults) {
    if (res.status === "MATCHED") {
      matched++;
    } else if (res.status === "MATCHED_AFTER_ADJUSTMENTS") {
      matchedAfterAdjustments++;
      if (res.matchMethod === "PARTIAL_SETTLEMENT") {
        partialSettlements++;
      }
    } else if (res.status === "MISSING_SETTLEMENT") {
      missingSettlements++;
      directExceptions++;
    } else if (res.status === "DUPLICATE") {
      duplicates++;
      directExceptions++;
    } else if (res.status === "UNRESOLVED") {
      unresolved++;
      directExceptions++;
    } else if (res.status === "EXCEPTION") {
      directExceptions++;
    }
  }

  const orphanSettlements = orphanResults.length;
  const totalExceptions = directExceptions + orphanSettlements;
  const successfullyResolvedOrders = matched + matchedAfterAdjustments;
  const deterministicResolutionRate =
    orders.length > 0
      ? parseFloat(((successfullyResolvedOrders / orders.length) * 100).toFixed(1))
      : 0;

  const processingTimeMs = parseFloat((performance.now() - startTime).toFixed(2));

  const summary: ReconciliationSummary = {
    totalOrders: orders.length,
    totalSettlements: settlements.length,
    matched,
    matchedAfterAdjustments,
    missingSettlements,
    partialSettlements,
    duplicates,
    orphanSettlements,
    unresolved,
    exceptions: totalExceptions,
    deterministicResolutionRate,
    processingTimeMs,
  };

  return {
    orderResults,
    orphanResults,
    summary,
  };
}
