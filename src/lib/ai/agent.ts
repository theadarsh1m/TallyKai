/**
 * TallyKai — AI Finance Controller
 * Phase 5: AI Exception Investigation Agent & Pipeline Orchestrator
 * 
 * Orchestrates multi-step investigation of unresolved reconciliation exceptions,
 * maintains an immutable audit trail, enforces rate limits, validates schema compliance,
 * and handles failures gracefully with mandatory HUMAN_REVIEW fallback.
 */

import { CanonicalTransaction } from "../normalization/types";
import { OrderReconciliationResult } from "../reconciliation/types";
import {
  AIInvestigationResult,
  AIInvestigationOptions,
  AIAuditEvent,
  DatasetLookupContext,
} from "./types";
import { buildInvestigationContext } from "./schemas";
import { SYSTEM_PROMPT } from "./prompts";
import { executeAITool } from "./tools";
import { validateAIOutput } from "./validator";
import { createAIProvider } from "./provider";

/**
 * Investigates a single reconciliation exception with audit logging and fallback safety.
 */
export async function investigateException(
  order: CanonicalTransaction,
  reconResult: OrderReconciliationResult,
  datasetContext: DatasetLookupContext,
  options: AIInvestigationOptions = {}
): Promise<AIInvestigationResult> {
  const startTime = performance.now();
  const investigationId = `INV-${order.sourceRecordId.replace(/[^A-Za-z0-9]/g, "")}-${Date.now().toString().slice(-4)}`;
  const nowIso = new Date().toISOString();

  const auditEvents: AIAuditEvent[] = [];

  // Audit Event 1: Exception Detection
  auditEvents.push({
    timestamp: nowIso,
    action: "EXCEPTION_DETECTED",
    details: `Unresolved exception identified for order ${order.sourceRecordId} (Status: ${reconResult.status}, Category: ${reconResult.exceptionCategory ?? "UNKNOWN"}).`,
  });

  // Build compact investigation context
  const context = buildInvestigationContext(order, reconResult, datasetContext);

  // Audit Event 2: Investigation Initialized
  auditEvents.push({
    timestamp: new Date().toISOString(),
    action: "INVESTIGATION_INITIALIZED",
    details: `AI investigation context assembled with ${context.candidates.length} candidate settlement(s). Estimated fee: ₹${(context.knownAdjustments.estimatedFeeMinor / 100).toFixed(2)}, tax: ₹${(context.knownAdjustments.estimatedTaxMinor / 100).toFixed(2)}.`,
  });

  const provider = createAIProvider(options.config);

  // Tool execution callback with audit logging
  const toolExecutor = async (toolName: string, args: Record<string, unknown>) => {
    const toolCallStart = performance.now();
    const result = await executeAITool(toolName, args, datasetContext);
    const duration = (performance.now() - toolCallStart).toFixed(1);

    auditEvents.push({
      timestamp: new Date().toISOString(),
      action: "TOOL_EXECUTED",
      toolName,
      inputParams: args,
      outputSummary: result.success ? "Success" : `Failed: ${result.error}`,
      details: `Tool ${toolName} executed in ${duration}ms.`,
    });

    return result.data;
  };

  try {
    // Generate AI investigation
    const response = await provider.generateInvestigation(
      context,
      SYSTEM_PROMPT,
      toolExecutor
    );

    // Audit Event 3: LLM Inference Completed
    auditEvents.push({
      timestamp: new Date().toISOString(),
      action: "INFERENCE_COMPLETED",
      details: `Model ${provider.model} responded in ${response.durationMs}ms with ${response.toolCallsCount} tool interaction(s).`,
    });

    // Validate structured response
    const validation = validateAIOutput(
      response.rawOutput,
      order.sourceRecordId,
      datasetContext
    );

    if (!validation.isValid) {
      auditEvents.push({
        timestamp: new Date().toISOString(),
        action: "VALIDATION_FAILED",
        details: `AI output failed validation: ${validation.validationErrors.join("; ")}. Defaulting to HUMAN_REVIEW.`,
      });
    }

    const { validatedResult } = validation;

    // Audit Event 4: Decision Finalized
    auditEvents.push({
      timestamp: new Date().toISOString(),
      action: "DECISION_FINALIZED",
      details: `Decision: ${validatedResult.decision} (Confidence: ${(validatedResult.confidence * 100).toFixed(1)}%). Action: ${validatedResult.recommendedAction}`,
    });

    const totalDurationMs = parseFloat((performance.now() - startTime).toFixed(2));

    return {
      investigationId,
      orderId: order.sourceRecordId,
      decision: validatedResult.decision,
      recommendedSettlementIds: validatedResult.recommendedSettlementIds,
      exceptionType: validatedResult.exceptionType,
      confidence: validatedResult.confidence,
      reasoningSummary: validatedResult.reasoningSummary,
      evidenceUsed: validatedResult.evidenceUsed,
      unresolvedQuestions: validatedResult.unresolvedQuestions,
      recommendedAction: validatedResult.recommendedAction,
      model: provider.model,
      timestamp: new Date().toISOString(),
      durationMs: totalDurationMs,
      auditEvents,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    auditEvents.push({
      timestamp: new Date().toISOString(),
      action: "INVESTIGATION_FAILED",
      details: `AI investigation encountered error: ${errorMsg}. Defaulting safely to HUMAN_REVIEW.`,
    });

    const totalDurationMs = parseFloat((performance.now() - startTime).toFixed(2));

    return {
      investigationId,
      orderId: order.sourceRecordId,
      decision: "HUMAN_REVIEW",
      recommendedSettlementIds: [],
      exceptionType: reconResult.exceptionCategory || "AI_UNRESOLVED",
      confidence: 0.0,
      reasoningSummary: `AI investigation unavailable due to provider/network failure (${errorMsg}).`,
      evidenceUsed: [],
      unresolvedQuestions: ["AI provider failed during investigation. Manual review required."],
      recommendedAction: "Escalate to finance operations for manual audit.",
      model: provider.model,
      timestamp: new Date().toISOString(),
      durationMs: totalDurationMs,
      auditEvents,
    };
  }
}

/**
 * Investigates a batch of unresolved exceptions with rate limiting and concurrency management.
 */
export async function investigateExceptionsBatch(
  unresolvedOrders: CanonicalTransaction[],
  orderResultsMap: Map<string, OrderReconciliationResult>,
  datasetContext: DatasetLookupContext,
  options: AIInvestigationOptions = {}
): Promise<Map<string, AIInvestigationResult>> {
  const maxLimit = options.maxInvestigationsPerRun ?? 100;
  const isAIEnabled = options.enableAI ?? true;
  const results = new Map<string, AIInvestigationResult>();

  if (!isAIEnabled || unresolvedOrders.length === 0) {
    return results;
  }

  // Cap batch to configured rate limit
  const targetOrders = unresolvedOrders.slice(0, maxLimit);
  const overflowOrders = unresolvedOrders.slice(maxLimit);

  // Process target orders sequentially or in small parallel batches
  for (const order of targetOrders) {
    const reconRes = orderResultsMap.get(order.sourceRecordId);
    if (reconRes) {
      const investigation = await investigateException(
        order,
        reconRes,
        datasetContext,
        options
      );
      results.set(order.sourceRecordId, investigation);
    }
  }

  // Handle rate-limited overflow cases
  for (const order of overflowOrders) {
    const nowIso = new Date().toISOString();
    results.set(order.sourceRecordId, {
      investigationId: `INV-LIMIT-${order.sourceRecordId}`,
      orderId: order.sourceRecordId,
      decision: "HUMAN_REVIEW",
      recommendedSettlementIds: [],
      exceptionType: "AI_LIMIT_REACHED",
      confidence: 0.0,
      reasoningSummary: `Batch AI investigation cap of ${maxLimit} reached. Order queued for manual finance review.`,
      evidenceUsed: [],
      unresolvedQuestions: ["AI rate limit reached during batch run."],
      recommendedAction: "Manual finance review required.",
      model: "rate-limiter",
      timestamp: nowIso,
      durationMs: 0,
      auditEvents: [
        {
          timestamp: nowIso,
          action: "RATE_LIMIT_CAPPED",
          details: `Investigation capped at maximum threshold (${maxLimit} records).`,
        },
      ],
    });
  }

  return results;
}
