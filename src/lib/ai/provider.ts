/**
 * TallyKai — AI Finance Controller
 * Phase 5: LLM Provider Abstraction & Providers
 * 
 * Implements decoupled provider architecture supporting Gemini API and
 * MockDeterministicProvider for reproducible offline tests and CI runs.
 */

import { AIInvestigationContext, AIProvider, AIProviderConfig } from "./types";
import { fromMinorUnits } from "../normalization/money";

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  provider:
    (process.env.AI_PROVIDER as AIProviderConfig["provider"]) ||
    (process.env.AI_API_KEY || process.env.GEMINI_API_KEY ? "gemini" : "mock"),
  apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "",
  modelName: process.env.AI_MODEL_NAME || "gemini-2.5-flash-lite",
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || "2048", 10),
  temperature: 0.0, // Strict zero temperature for financial determinism
  timeoutMs: 15000,
};

/**
 * Deterministic mock provider for offline execution, unit testing, and CI pipelines.
 * Employs financial arithmetic and candidate evidence rules.
 */
export class MockDeterministicProvider implements AIProvider {
  name = "MockDeterministicProvider";
  model = "mock-finance-controller";

  async generateInvestigation(
    context: AIInvestigationContext,
    systemPrompt: string,
    toolExecutor?: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<{
    rawOutput: string;
    parsedResult?: Record<string, unknown>;
    toolCallsCount: number;
    durationMs: number;
  }> {
    const startTime = performance.now();
    let toolCallsCount = 0;

    // Simulate tool execution inspection if executor provided
    if (toolExecutor) {
      toolCallsCount++;
      await toolExecutor("calculateExpectedSettlement", { orderId: context.order.orderId });
    }

    const { order, candidates, knownAdjustments, exception } = context;

    // Ambiguity Case: 2 or more candidates with close scores
    if (candidates.length >= 2) {
      const top1 = candidates[0];
      const top2 = candidates[1];
      const margin = Math.abs(top1.score - top2.score);

      if (margin < 0.05) {
        const payload = {
          decision: "HUMAN_REVIEW",
          recommendedSettlementIds: [top1.settlementId, top2.settlementId],
          exceptionType: "AMBIGUOUS_MATCH",
          confidence: 0.62,
          reasoningSummary: `Both settlements ${top1.settlementId} (${(top1.score * 100).toFixed(1)}%) and ${top2.settlementId} (${(top2.score * 100).toFixed(1)}%) have similar reference and date evidence (margin: ${(margin * 100).toFixed(1)}%). Available data is insufficient to safely determine the exact record.`,
          evidenceUsed: [
            `Order gross: ₹${fromMinorUnits(order.amountMinor)}`,
            `Candidate 1: ${top1.settlementId} (Score: ${top1.score})`,
            `Candidate 2: ${top2.settlementId} (Score: ${top2.score})`,
          ],
          unresolvedQuestions: [
            "Which settlement batch was confirmed by gateway payout notification?",
          ],
          recommendedAction: "Manual finance review required.",
        };

        return {
          rawOutput: JSON.stringify(payload, null, 2),
          parsedResult: payload,
          toolCallsCount,
          durationMs: parseFloat((performance.now() - startTime).toFixed(2)),
        };
      }
    }

    // High-Confidence Match Case: Exactly 1 strong candidate or clear winner
    if (candidates.length > 0) {
      const top = candidates[0];
      const feeMinor = top.feeMinor ?? knownAdjustments.estimatedFeeMinor;
      const taxMinor = top.taxMinor ?? knownAdjustments.estimatedTaxMinor;
      const expectedNet = order.amountMinor - feeMinor - taxMinor;
      const diff = Math.abs(top.amountMinor - expectedNet);

      if (top.score >= 0.85 || diff <= 200) {
        const payload = {
          decision: "MATCH",
          recommendedSettlementIds: [top.settlementId],
          exceptionType: "NONE",
          confidence: Math.max(0.92, top.score),
          reasoningSummary: `Settlement ${top.settlementId} (₹${fromMinorUnits(top.amountMinor)}) is fully explained by recorded MDR fee (₹${fromMinorUnits(feeMinor)}) and GST tax (₹${fromMinorUnits(taxMinor)}) for order ${order.orderId}.`,
          evidenceUsed: [
            `Order gross: ₹${fromMinorUnits(order.amountMinor)}`,
            `Settlement net: ₹${fromMinorUnits(top.amountMinor)}`,
            `MDR fee: ₹${fromMinorUnits(feeMinor)}, GST: ₹${fromMinorUnits(taxMinor)}`,
            `Matching confidence: ${(top.score * 100).toFixed(1)}%`,
          ],
          unresolvedQuestions: [],
          recommendedAction: `Approve match between ${order.orderId} and ${top.settlementId}.`,
        };

        return {
          rawOutput: JSON.stringify(payload, null, 2),
          parsedResult: payload,
          toolCallsCount,
          durationMs: parseFloat((performance.now() - startTime).toFixed(2)),
        };
      }
    }

    // Low confidence / No Candidate Case: Genuine Exception or Unresolved
    const payload = {
      decision: exception.type === "AMOUNT_MISMATCH" ? "EXCEPTION" : "HUMAN_REVIEW",
      recommendedSettlementIds: [],
      exceptionType: exception.type || "MISSING_SETTLEMENT",
      confidence: 0.50,
      reasoningSummary: `No candidate settlement met the confidence threshold for order ${order.orderId} (Exception: ${exception.reason}).`,
      evidenceUsed: [
        `Order gross: ₹${fromMinorUnits(order.amountMinor)}`,
        `Available candidates evaluated: ${candidates.length}`,
      ],
      unresolvedQuestions: ["Was this order settled in a batch payout outside the standard window?"],
      recommendedAction: "Request manual gateway statement reconciliation.",
    };

    return {
      rawOutput: JSON.stringify(payload, null, 2),
      parsedResult: payload,
      toolCallsCount,
      durationMs: parseFloat((performance.now() - startTime).toFixed(2)),
    };
  }
}

/**
 * Live Google Gemini provider using Gemini REST API with structured response format.
 */
export class GeminiProvider implements AIProvider {
  name = "GeminiProvider";
  model: string;
  private apiKey: string;
  private maxTokens: number;
  private temperature: number;
  private timeoutMs: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || "";
    this.model = config.modelName || "gemini-2.5-flash";
    this.maxTokens = config.maxTokens || 2048;
    this.temperature = config.temperature ?? 0.0;
    this.timeoutMs = config.timeoutMs || 15000;
  }

  async generateInvestigation(
    context: AIInvestigationContext,
    systemPrompt: string,
    _toolExecutor?: (name: string, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<{
    rawOutput: string;
    parsedResult?: Record<string, unknown>;
    toolCallsCount: number;
    durationMs: number;
  }> {
    void _toolExecutor;
    const startTime = performance.now();
    const toolCallsCount = 0;

    if (!this.apiKey) {
      throw new Error("Gemini API key is not configured (AI_API_KEY / GEMINI_API_KEY missing).");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const promptText = `${systemPrompt}\n\nContext to investigate:\n${JSON.stringify(context, null, 2)}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
        responseMimeType: "application/json",
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      return {
        rawOutput: rawText,
        toolCallsCount,
        durationMs: parseFloat((performance.now() - startTime).toFixed(2)),
      };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}

/**
 * Factory creating the active AI provider based on environment configuration.
 */
export function createAIProvider(options: Partial<AIProviderConfig> = {}): AIProvider {
  const merged: AIProviderConfig = {
    ...DEFAULT_AI_CONFIG,
    ...options,
  };

  const hasApiKey = Boolean(merged.apiKey && merged.apiKey.trim().length > 0);

  if (merged.provider === "gemini" && hasApiKey) {
    return new GeminiProvider(merged);
  }

  // Fallback to deterministic mock provider
  return new MockDeterministicProvider();
}
