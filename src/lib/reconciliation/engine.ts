/**
 * TallyKai — AI Finance Controller
 * Phase 3 & Phase 4: Multi-Layer Reconciliation Pipeline & Orchestrator
 * 
 * Pipeline Architecture:
 * 1. Normalized Canonical Data Ingestion
 * 2. Deterministic Matching Pass (Exact reference, fee/tax, rounding, partials, duplicates)
 * 3. Fuzzy / Rule-Based Candidate Matching Pass on Unresolved Records
 * 4. High-Confidence Resolution & Ambiguity Classification
 * 5. Final Orphan Detection & Structured Telemetry
 * 
 * IMPORTANT SAFETY RULES:
 * - Deterministic results are NEVER overridden by fuzzy matching.
 * - This engine operates strictly on normalized records and NEVER references Ground Truth.
 */

import { CanonicalTransaction } from "../normalization/types";
import {
  ReconciliationDatasetResult,
  OrderReconciliationResult,
  OrphanReconciliationResult,
  ReconciliationSummary,
} from "./types";
import {
  ReconciliationEngineConfig,
  FuzzyMatchingConfig,
  DEFAULT_RECONCILIATION_CONFIG,
  DEFAULT_FUZZY_CONFIG,
} from "./config";
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
import {
  buildFuzzyCandidateIndex,
  findFuzzyCandidates,
} from "./candidateIndex";
import { evaluateFuzzyOrder } from "./fuzzyMatcher";

export interface ReconcileOptions {
  deterministicConfig?: Partial<ReconciliationEngineConfig>;
  fuzzyConfig?: Partial<FuzzyMatchingConfig>;
  enableFuzzyMatching?: boolean;
}

/**
 * Reconciles an internal order ledger against gateway settlements using multi-layer deterministic and fuzzy pipelines.
 * 
 * @param orders - Normalized canonical order transactions
 * @param settlements - Normalized canonical settlement transactions
 * @param options - Pipeline configuration overrides
 * @returns Complete reconciliation dataset results with individual outcomes and aggregate summary
 */
export function reconcileDataset(
  orders: CanonicalTransaction[],
  settlements: CanonicalTransaction[],
  options: ReconcileOptions = {}
): ReconciliationDatasetResult {
  const startTime = performance.now();
  const detConfig: ReconciliationEngineConfig = {
    ...DEFAULT_RECONCILIATION_CONFIG,
    ...options.deterministicConfig,
  };
  const fuzConfig: FuzzyMatchingConfig = {
    ...DEFAULT_FUZZY_CONFIG,
    ...options.fuzzyConfig,
    weights: {
      ...DEFAULT_FUZZY_CONFIG.weights,
      ...(options.fuzzyConfig?.weights ?? {}),
    },
    thresholds: {
      ...DEFAULT_FUZZY_CONFIG.thresholds,
      ...(options.fuzzyConfig?.thresholds ?? {}),
    },
    indexing: {
      ...DEFAULT_FUZZY_CONFIG.indexing,
      ...(options.fuzzyConfig?.indexing ?? {}),
    },
  };
  const isFuzzyEnabled = options.enableFuzzyMatching ?? true;

  // ====================================================
  // PASS 1: DETERMINISTIC RECONCILIATION
  // ====================================================
  const settlementIndex = buildSettlementIndex(settlements);
  const orderIndex = buildOrderIndex(orders);

  const deterministicResolvedMap = new Map<string, OrderReconciliationResult>();
  const unresolvedOrders: CanonicalTransaction[] = [];
  const deterministicClaimedSettlementIds = new Set<string>();

  let deterministicExactMatches = 0;
  let deterministicAdjustmentMatches = 0;

  for (const order of orders) {
    const candidates = findSettlementCandidates(order, settlementIndex);

    let result: OrderReconciliationResult;

    if (candidates.length === 0) {
      result = evaluateMissingSettlement(order);
      unresolvedOrders.push(order);
    } else if (candidates.length === 1) {
      result = evaluateSingleSettlement(order, candidates[0], detConfig, orderIndex);
      if (result.status === "MATCHED") {
        deterministicExactMatches++;
        deterministicClaimedSettlementIds.add(candidates[0].sourceRecordId);
        deterministicResolvedMap.set(order.sourceRecordId, result);
      } else if (result.status === "MATCHED_AFTER_ADJUSTMENTS") {
        deterministicAdjustmentMatches++;
        deterministicClaimedSettlementIds.add(candidates[0].sourceRecordId);
        deterministicResolvedMap.set(order.sourceRecordId, result);
      } else {
        // Exception (e.g. amount mismatch or date out of range)
        deterministicClaimedSettlementIds.add(candidates[0].sourceRecordId);
        deterministicResolvedMap.set(order.sourceRecordId, result);
      }
    } else {
      // Multiple candidates (duplicates, partials)
      result = evaluateMultipleSettlements(order, candidates, detConfig);
      for (const c of candidates) {
        deterministicClaimedSettlementIds.add(c.sourceRecordId);
      }
      if (result.status === "MATCHED_AFTER_ADJUSTMENTS") {
        deterministicAdjustmentMatches++;
      }
      deterministicResolvedMap.set(order.sourceRecordId, result);
    }
  }

  const deterministicUnresolved = unresolvedOrders.length;
  const deterministicResolvedCount = deterministicExactMatches + deterministicAdjustmentMatches;
  const deterministicResolutionRate =
    orders.length > 0
      ? parseFloat(((deterministicResolvedCount / orders.length) * 100).toFixed(1))
      : 0;

  // ====================================================
  // PASS 2: FUZZY / RULE-BASED CANDIDATE MATCHING
  // ====================================================
  const fuzzyResolvedMap = new Map<string, OrderReconciliationResult>();
  const fuzzyClaimedSettlementIds = new Set<string>();

  let fuzzyHighConfidence = 0;
  let fuzzyAmbiguous = 0;
  let fuzzyRejected = 0;

  if (isFuzzyEnabled && unresolvedOrders.length > 0) {
    // Collect unclaimed settlements for fuzzy candidate pool
    const unclaimedSettlements = settlements.filter(
      (s) => !deterministicClaimedSettlementIds.has(s.sourceRecordId)
    );

    // Build multi-index on unclaimed settlements
    const fuzzyIndex = buildFuzzyCandidateIndex(unclaimedSettlements);

    for (const order of unresolvedOrders) {
      // Find candidate settlements using multi-index lookup
      const candidates = findFuzzyCandidates(order, fuzzyIndex, fuzConfig);

      // Filter out settlements already claimed during this fuzzy pass
      const availableCandidates = candidates.filter(
        (c) => !fuzzyClaimedSettlementIds.has(c.sourceRecordId)
      );

      const fuzzyEval = evaluateFuzzyOrder(order, availableCandidates, fuzConfig);

      if (fuzzyEval.resolution === "RESOLVED") {
        fuzzyHighConfidence++;
        if (fuzzyEval.candidateSettlement) {
          fuzzyClaimedSettlementIds.add(fuzzyEval.candidateSettlement.sourceRecordId);
        }
        fuzzyResolvedMap.set(order.sourceRecordId, fuzzyEval.result);
      } else if (fuzzyEval.resolution === "AMBIGUOUS") {
        fuzzyAmbiguous++;
        fuzzyResolvedMap.set(order.sourceRecordId, fuzzyEval.result);
      } else {
        fuzzyRejected++;
        fuzzyResolvedMap.set(order.sourceRecordId, fuzzyEval.result);
      }
    }
  } else {
    fuzzyRejected = unresolvedOrders.length;
  }

  // ====================================================
  // PASS 3: COMBINE RESULTS & DETECT ORPHANS
  // ====================================================
  const orderResults: OrderReconciliationResult[] = [];

  for (const order of orders) {
    // SAFETY RULE: Deterministic match results always take precedence
    if (deterministicResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(deterministicResolvedMap.get(order.sourceRecordId)!);
    } else if (fuzzyResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(fuzzyResolvedMap.get(order.sourceRecordId)!);
    } else {
      orderResults.push(evaluateMissingSettlement(order));
    }
  }

  // Detect orphan settlements (unclaimed by deterministic matching AND fuzzy matching)
  const orphanResults: OrphanReconciliationResult[] = [];
  for (const settlement of settlements) {
    const isClaimedByDet = deterministicClaimedSettlementIds.has(settlement.sourceRecordId);
    const isClaimedByFuz = fuzzyClaimedSettlementIds.has(settlement.sourceRecordId);

    if (!isClaimedByDet && !isClaimedByFuz) {
      orphanResults.push(createOrphanSettlementResult(settlement));
    }
  }

  // ====================================================
  // PASS 4: COMPUTE TELEMETRY & SUMMARY METRICS
  // ====================================================
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
    } else if (res.status === "UNRESOLVED" || res.status === "AMBIGUOUS") {
      unresolved++;
      directExceptions++;
    } else if (res.status === "EXCEPTION") {
      directExceptions++;
    }
  }

  const orphanSettlements = orphanResults.length;
  const totalExceptions = directExceptions + orphanSettlements;
  const totalMatched = matched + matchedAfterAdjustments;
  const fuzzyResolutionRate =
    unresolvedOrders.length > 0
      ? parseFloat(((fuzzyHighConfidence / unresolvedOrders.length) * 100).toFixed(1))
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
    deterministicExactMatches,
    deterministicAdjustmentMatches,
    deterministicUnresolved,
    deterministicResolutionRate,
    fuzzyHighConfidence,
    fuzzyAmbiguous,
    fuzzyRejected,
    fuzzyResolutionRate,
    totalMatched,
    processingTimeMs,
  };

  return {
    orderResults,
    orphanResults,
    summary,
  };
}
