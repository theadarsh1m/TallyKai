/**
 * TallyKai — AI Finance Controller
 * Phase 3, Phase 4 & Phase 5: Multi-Layer Reconciliation Pipeline & Orchestrator
 * 
 * Pipeline Architecture:
 * 1. Normalized Canonical Data Ingestion
 * 2. Pass 1: Deterministic Matching (Exact ref, fee/tax adjustments, partials, duplicates)
 * 3. Pass 2: Fuzzy / Rule-Based Candidate Matching (Indexing, multi-evidence scoring, ambiguity margin)
 * 4. Pass 3: AI Exception Investigation Agent (Read-only tools, LLM reasoning, schema validation, audit trail)
 * 5. Pass 4: Final Orphan Settlement Detection
 * 6. Pass 5: Structured Telemetry & Benchmark Metrics
 * 
 * IMPORTANT SAFETY RULES:
 * - Deterministic results are NEVER overridden by fuzzy matching or AI.
 * - High-confidence fuzzy matches are NEVER overridden by AI.
 * - AI only investigates unresolved exceptions and ambiguous candidates.
 * - Engine operates strictly on normalized records and NEVER references Ground Truth.
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
import {
  buildDatasetLookupContext,
  investigateExceptionsBatch,
  AIInvestigationOptions,
} from "../ai";

export interface ReconcileOptions {
  deterministicConfig?: Partial<ReconciliationEngineConfig>;
  fuzzyConfig?: Partial<FuzzyMatchingConfig>;
  aiOptions?: AIInvestigationOptions;
  enableFuzzyMatching?: boolean;
  enableAIInvestigation?: boolean;
}

/**
 * Executes full multi-pass reconciliation asynchronously including the Phase 5 AI Investigation Agent.
 */
export async function reconcileDatasetAsync(
  orders: CanonicalTransaction[],
  settlements: CanonicalTransaction[],
  options: ReconcileOptions = {}
): Promise<ReconciliationDatasetResult> {
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
  const isAIEnabled = options.enableAIInvestigation ?? true;

  // Build dataset lookup context for read-only tools
  const datasetLookup = buildDatasetLookupContext(orders, settlements);

  // ====================================================
  // PASS 1: DETERMINISTIC RECONCILIATION
  // ====================================================
  const settlementIndex = buildSettlementIndex(settlements);
  const orderIndex = buildOrderIndex(orders);

  const deterministicResolvedMap = new Map<string, OrderReconciliationResult>();
  const pass1UnresolvedOrders: CanonicalTransaction[] = [];
  const deterministicClaimedSettlementIds = new Set<string>();

  let deterministicExactMatches = 0;
  let deterministicAdjustmentMatches = 0;

  for (const order of orders) {
    const candidates = findSettlementCandidates(order, settlementIndex);

    let result: OrderReconciliationResult;

    if (candidates.length === 0) {
      result = evaluateMissingSettlement(order);
      pass1UnresolvedOrders.push(order);
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
        // Exception from deterministic rule
        deterministicClaimedSettlementIds.add(candidates[0].sourceRecordId);
        deterministicResolvedMap.set(order.sourceRecordId, result);
      }
    } else {
      // Multiple candidates
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

  const deterministicUnresolved = pass1UnresolvedOrders.length;
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
  const pass2UnresolvedOrders: CanonicalTransaction[] = [];
  const pass2OrderResultsMap = new Map<string, OrderReconciliationResult>();

  let fuzzyHighConfidence = 0;
  let fuzzyAmbiguous = 0;
  let fuzzyRejected = 0;

  if (isFuzzyEnabled && pass1UnresolvedOrders.length > 0) {
    const unclaimedAfterDet = settlements.filter(
      (s) => !deterministicClaimedSettlementIds.has(s.sourceRecordId)
    );
    const fuzzyIndex = buildFuzzyCandidateIndex(unclaimedAfterDet);

    for (const order of pass1UnresolvedOrders) {
      const candidates = findFuzzyCandidates(order, fuzzyIndex, fuzConfig);
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
      } else {
        if (fuzzyEval.resolution === "AMBIGUOUS") {
          fuzzyAmbiguous++;
        } else {
          fuzzyRejected++;
        }
        pass2UnresolvedOrders.push(order);
        pass2OrderResultsMap.set(order.sourceRecordId, fuzzyEval.result);
      }
    }
  } else {
    fuzzyRejected = pass1UnresolvedOrders.length;
    for (const order of pass1UnresolvedOrders) {
      pass2UnresolvedOrders.push(order);
      pass2OrderResultsMap.set(order.sourceRecordId, evaluateMissingSettlement(order));
    }
  }

  // ====================================================
  // PASS 3: AI EXCEPTION INVESTIGATION AGENT
  // ====================================================
  const aiResolvedMap = new Map<string, OrderReconciliationResult>();
  const aiClaimedSettlementIds = new Set<string>();

  let aiInvestigated = 0;
  let aiResolved = 0;
  let aiHumanReview = 0;

  if (isAIEnabled && pass2UnresolvedOrders.length > 0) {
    const aiInvestigations = await investigateExceptionsBatch(
      pass2UnresolvedOrders,
      pass2OrderResultsMap,
      datasetLookup,
      options.aiOptions
    );

    aiInvestigated = aiInvestigations.size;

    for (const order of pass2UnresolvedOrders) {
      const inv = aiInvestigations.get(order.sourceRecordId);
      const pass2Result = pass2OrderResultsMap.get(order.sourceRecordId)!;

      if (!inv) {
        aiResolvedMap.set(order.sourceRecordId, pass2Result);
        continue;
      }

      // Check if AI successfully resolved a match with verified settlement ID
      if (inv.decision === "MATCH" && inv.confidence >= 0.90 && inv.recommendedSettlementIds.length > 0) {
        const topSid = inv.recommendedSettlementIds[0];
        const isAvailable =
          !deterministicClaimedSettlementIds.has(topSid) &&
          !fuzzyClaimedSettlementIds.has(topSid) &&
          !aiClaimedSettlementIds.has(topSid);

        if (isAvailable) {
          aiResolved++;
          aiClaimedSettlementIds.add(topSid);

          const targetSettlement = datasetLookup.settlementsById.get(topSid);
          const settAmount = targetSettlement?.amountMinor ?? order.amountMinor;
          const diffMinor = Math.abs(order.amountMinor - settAmount);

          const result: OrderReconciliationResult = {
            orderId: order.sourceRecordId,
            status: diffMinor === 0 ? "MATCHED" : "MATCHED_AFTER_ADJUSTMENTS",
            matchMethod: "AI_ASSISTED",
            settlementIds: [topSid],
            confidence: inv.confidence,
            amountDifferenceMinor: diffMinor,
            reason: `AI Investigation matched to ${topSid}: ${inv.reasoningSummary}`,
            exceptionCategory: null,
            evidence: [
              ...pass2Result.evidence,
              {
                type: "AI_INVESTIGATION_RESULT",
                description: `AI Agent resolved exception with ${(inv.confidence * 100).toFixed(1)}% confidence. Action: ${inv.recommendedAction}`,
                aiInvestigation: inv,
              },
            ],
            fuzzyCandidates: pass2Result.fuzzyCandidates,
            aiInvestigation: inv,
          };

          aiResolvedMap.set(order.sourceRecordId, result);
          continue;
        }
      }

      // If AI determined HUMAN_REVIEW or could not resolve with high confidence
      aiHumanReview++;

      const result: OrderReconciliationResult = {
        orderId: order.sourceRecordId,
        status: inv.decision === "HUMAN_REVIEW" ? "HUMAN_REVIEW" : pass2Result.status,
        matchMethod: "NONE",
        settlementIds: inv.recommendedSettlementIds.length > 0 ? inv.recommendedSettlementIds : pass2Result.settlementIds,
        confidence: inv.confidence,
        amountDifferenceMinor: pass2Result.amountDifferenceMinor,
        reason: `AI Investigation (${inv.decision}): ${inv.reasoningSummary}`,
        exceptionCategory:
          inv.exceptionType === "AMBIGUOUS_MATCH"
            ? "AMBIGUOUS_MATCH"
            : inv.exceptionType === "AI_LIMIT_REACHED"
            ? "AI_LIMIT_REACHED"
            : (pass2Result.exceptionCategory || "AI_UNRESOLVED"),
        evidence: [
          ...pass2Result.evidence,
          {
            type: "AI_INVESTIGATION_RESULT",
            description: `AI Agent recommended ${inv.decision} (Confidence: ${(inv.confidence * 100).toFixed(1)}%). Action: ${inv.recommendedAction}`,
            aiInvestigation: inv,
          },
        ],
        fuzzyCandidates: pass2Result.fuzzyCandidates,
        aiInvestigation: inv,
      };

      aiResolvedMap.set(order.sourceRecordId, result);
    }
  }

  // ====================================================
  // PASS 4: COMBINE ALL RESULTS & DETECT FINAL ORPHANS
  // ====================================================
  const orderResults: OrderReconciliationResult[] = [];

  for (const order of orders) {
    // PRECEDENCE SAFETY RULE: Deterministic > Fuzzy > AI > Missing
    if (deterministicResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(deterministicResolvedMap.get(order.sourceRecordId)!);
    } else if (fuzzyResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(fuzzyResolvedMap.get(order.sourceRecordId)!);
    } else if (aiResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(aiResolvedMap.get(order.sourceRecordId)!);
    } else if (pass2OrderResultsMap.has(order.sourceRecordId)) {
      orderResults.push(pass2OrderResultsMap.get(order.sourceRecordId)!);
    } else {
      orderResults.push(evaluateMissingSettlement(order));
    }
  }

  // Detect orphan settlements
  const orphanResults: OrphanReconciliationResult[] = [];
  for (const settlement of settlements) {
    const isClaimed =
      deterministicClaimedSettlementIds.has(settlement.sourceRecordId) ||
      fuzzyClaimedSettlementIds.has(settlement.sourceRecordId) ||
      aiClaimedSettlementIds.has(settlement.sourceRecordId);

    if (!isClaimed) {
      orphanResults.push(createOrphanSettlementResult(settlement));
    }
  }

  // ====================================================
  // PASS 5: COMPUTE TELEMETRY & SUMMARY METRICS
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
    } else if (res.status === "UNRESOLVED" || res.status === "AMBIGUOUS" || res.status === "HUMAN_REVIEW") {
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
    pass1UnresolvedOrders.length > 0
      ? parseFloat(((fuzzyHighConfidence / pass1UnresolvedOrders.length) * 100).toFixed(1))
      : 0;

  const aiResolutionRate =
    aiInvestigated > 0
      ? parseFloat(((aiResolved / aiInvestigated) * 100).toFixed(1))
      : 0;

  const aiFallbackRate =
    aiInvestigated > 0
      ? parseFloat(((aiHumanReview / aiInvestigated) * 100).toFixed(1))
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
    aiInvestigated,
    aiResolved,
    aiHumanReview,
    aiResolutionRate,
    aiFallbackRate,
    totalMatched,
    processingTimeMs,
  };

  return {
    orderResults,
    orphanResults,
    summary,
  };
}

/**
 * Synchronous wrapper for standard reconciliation execution.
 */
export function reconcileDataset(
  orders: CanonicalTransaction[],
  settlements: CanonicalTransaction[],
  options: ReconcileOptions = {}
): ReconciliationDatasetResult {
  // Execute deterministic + fuzzy synchronous core
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

  // Pass 1: Deterministic
  const settlementIndex = buildSettlementIndex(settlements);
  const orderIndex = buildOrderIndex(orders);

  const deterministicResolvedMap = new Map<string, OrderReconciliationResult>();
  const pass1UnresolvedOrders: CanonicalTransaction[] = [];
  const deterministicClaimedSettlementIds = new Set<string>();

  let deterministicExactMatches = 0;
  let deterministicAdjustmentMatches = 0;

  for (const order of orders) {
    const candidates = findSettlementCandidates(order, settlementIndex);

    let result: OrderReconciliationResult;

    if (candidates.length === 0) {
      result = evaluateMissingSettlement(order);
      pass1UnresolvedOrders.push(order);
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
        deterministicClaimedSettlementIds.add(candidates[0].sourceRecordId);
        deterministicResolvedMap.set(order.sourceRecordId, result);
      }
    } else {
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

  const deterministicUnresolved = pass1UnresolvedOrders.length;
  const deterministicResolvedCount = deterministicExactMatches + deterministicAdjustmentMatches;
  const deterministicResolutionRate =
    orders.length > 0
      ? parseFloat(((deterministicResolvedCount / orders.length) * 100).toFixed(1))
      : 0;

  // Pass 2: Fuzzy
  const fuzzyResolvedMap = new Map<string, OrderReconciliationResult>();
  const fuzzyClaimedSettlementIds = new Set<string>();
  const pass2UnresolvedOrders: CanonicalTransaction[] = [];
  const pass2OrderResultsMap = new Map<string, OrderReconciliationResult>();

  let fuzzyHighConfidence = 0;
  let fuzzyAmbiguous = 0;
  let fuzzyRejected = 0;

  if (isFuzzyEnabled && pass1UnresolvedOrders.length > 0) {
    const unclaimedAfterDet = settlements.filter(
      (s) => !deterministicClaimedSettlementIds.has(s.sourceRecordId)
    );
    const fuzzyIndex = buildFuzzyCandidateIndex(unclaimedAfterDet);

    for (const order of pass1UnresolvedOrders) {
      const candidates = findFuzzyCandidates(order, fuzzyIndex, fuzConfig);
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
      } else {
        if (fuzzyEval.resolution === "AMBIGUOUS") {
          fuzzyAmbiguous++;
        } else {
          fuzzyRejected++;
        }
        pass2UnresolvedOrders.push(order);
        pass2OrderResultsMap.set(order.sourceRecordId, fuzzyEval.result);
      }
    }
  }

  // Combine Results
  const orderResults: OrderReconciliationResult[] = [];

  for (const order of orders) {
    if (deterministicResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(deterministicResolvedMap.get(order.sourceRecordId)!);
    } else if (fuzzyResolvedMap.has(order.sourceRecordId)) {
      orderResults.push(fuzzyResolvedMap.get(order.sourceRecordId)!);
    } else if (pass2OrderResultsMap.has(order.sourceRecordId)) {
      orderResults.push(pass2OrderResultsMap.get(order.sourceRecordId)!);
    } else {
      orderResults.push(evaluateMissingSettlement(order));
    }
  }

  const orphanResults: OrphanReconciliationResult[] = [];
  for (const settlement of settlements) {
    const isClaimed =
      deterministicClaimedSettlementIds.has(settlement.sourceRecordId) ||
      fuzzyClaimedSettlementIds.has(settlement.sourceRecordId);

    if (!isClaimed) {
      orphanResults.push(createOrphanSettlementResult(settlement));
    }
  }

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
    } else if (res.status === "UNRESOLVED" || res.status === "AMBIGUOUS" || res.status === "HUMAN_REVIEW") {
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
    pass1UnresolvedOrders.length > 0
      ? parseFloat(((fuzzyHighConfidence / pass1UnresolvedOrders.length) * 100).toFixed(1))
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
    aiInvestigated: 0,
    aiResolved: 0,
    aiHumanReview: 0,
    aiResolutionRate: 0,
    aiFallbackRate: 0,
    totalMatched,
    processingTimeMs,
  };

  return {
    orderResults,
    orphanResults,
    summary,
  };
}
