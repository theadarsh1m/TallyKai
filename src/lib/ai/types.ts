/**
 * TallyKai — AI Finance Controller
 * Phase 5: AI-Powered Exception Investigation Agent Types
 */

import { CanonicalTransaction } from "../normalization/types";

export type AIDecision = "MATCH" | "EXCEPTION" | "HUMAN_REVIEW";

export interface AIAuditEvent {
  timestamp: string;
  action: string;
  toolName?: string;
  inputParams?: Record<string, unknown>;
  outputSummary?: string;
  details?: string;
}

export interface AIInvestigationResult {
  investigationId: string;
  orderId: string;
  decision: AIDecision;
  recommendedSettlementIds: string[];
  exceptionType: string;
  confidence: number;
  reasoningSummary: string;
  evidenceUsed: string[];
  unresolvedQuestions: string[];
  recommendedAction: string;
  model: string;
  timestamp: string;
  durationMs: number;
  auditEvents: AIAuditEvent[];
}

export interface AIInvestigationContext {
  order: {
    orderId: string;
    amountMinor: number;
    amountFormatted: string;
    currency: string;
    timestamp: string;
    reference: string | null;
    customerId: string | null;
    paymentMethod: string | null;
  };
  candidates: Array<{
    settlementId: string;
    amountMinor: number;
    amountFormatted: string;
    timestamp: string;
    reference: string | null;
    orderId: string | null;
    feeMinor: number | null;
    taxMinor: number | null;
    score: number;
    evidence: Record<string, unknown>;
  }>;
  knownAdjustments: {
    estimatedFeeMinor: number;
    estimatedTaxMinor: number;
    expectedNetMinor: number;
    expectedNetFormatted: string;
  };
  exception: {
    type: string;
    reason: string;
    confidence: number;
  };
}

export interface AIProviderConfig {
  provider: "gemini" | "mock" | "openai" | "custom";
  apiKey?: string;
  modelName: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

export interface AIProvider {
  name: string;
  model: string;
  generateInvestigation(
    context: AIInvestigationContext,
    systemPrompt: string,
    toolExecutor?: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<{
    rawOutput: string;
    parsedResult?: Partial<AIInvestigationResult>;
    toolCallsCount: number;
    durationMs: number;
  }>;
}

export interface DatasetLookupContext {
  ordersById: Map<string, CanonicalTransaction>;
  settlementsById: Map<string, CanonicalTransaction>;
  settlementsByRef: Map<string, CanonicalTransaction[]>;
  settlementsByOrderId: Map<string, CanonicalTransaction[]>;
  ordersByCustomer: Map<string, CanonicalTransaction[]>;
  settlementsByCustomer: Map<string, CanonicalTransaction[]>;
  allOrders: CanonicalTransaction[];
  allSettlements: CanonicalTransaction[];
}

export interface AIInvestigationOptions {
  config?: Partial<AIProviderConfig>;
  maxInvestigationsPerRun?: number;
  enableAI?: boolean;
}
