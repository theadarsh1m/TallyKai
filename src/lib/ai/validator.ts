/**
 * TallyKai — AI Finance Controller
 * Phase 5: Structured Output Validator & Hallucination Prevention
 * 
 * Enforces schema compliance, validates referenced IDs against actual dataset records,
 * and ensures safe fallback to HUMAN_REVIEW on validation failures.
 */

import { AIDecision, DatasetLookupContext } from "./types";

export interface ValidationOutcome {
  isValid: boolean;
  validatedResult: {
    decision: AIDecision;
    recommendedSettlementIds: string[];
    exceptionType: string;
    confidence: number;
    reasoningSummary: string;
    evidenceUsed: string[];
    unresolvedQuestions: string[];
    recommendedAction: string;
  };
  validationErrors: string[];
}

/**
 * Parses and sanitizes raw LLM output text into a JSON object.
 */
export function extractAndParseJSON(rawText: string): Record<string, unknown> | null {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  let cleaned = rawText.trim();

  // Strip Markdown code block wrappers
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Attempt substring extraction if LLM included leading/trailing commentary
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sub = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(sub);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Validates structured AI output against domain rules and active dataset state.
 */
export function validateAIOutput(
  rawOutput: string,
  orderId: string,
  datasetContext: DatasetLookupContext
): ValidationOutcome {
  const errors: string[] = [];
  const parsed = extractAndParseJSON(rawOutput);

  if (!parsed) {
    errors.push("Failed to parse response as valid JSON object.");
    return {
      isValid: false,
      validatedResult: {
        decision: "HUMAN_REVIEW",
        recommendedSettlementIds: [],
        exceptionType: "AI_UNRESOLVED",
        confidence: 0.0,
        reasoningSummary: "AI response could not be parsed as valid JSON.",
        evidenceUsed: [],
        unresolvedQuestions: ["Malformed response from AI provider."],
        recommendedAction: "Manual finance review required.",
      },
      validationErrors: errors,
    };
  }

  // 1. Validate Decision Enum
  let decision: AIDecision = "HUMAN_REVIEW";
  if (
    parsed.decision === "MATCH" ||
    parsed.decision === "EXCEPTION" ||
    parsed.decision === "HUMAN_REVIEW"
  ) {
    decision = parsed.decision as AIDecision;
  } else {
    errors.push(`Invalid decision '${String(parsed.decision)}'. Must be MATCH, EXCEPTION, or HUMAN_REVIEW.`);
  }

  // 2. Validate Confidence Score [0.0, 1.0]
  let confidence = 0.0;
  if (typeof parsed.confidence === "number" && !isNaN(parsed.confidence)) {
    if (parsed.confidence >= 0.0 && parsed.confidence <= 1.0) {
      confidence = parseFloat(parsed.confidence.toFixed(4));
    } else {
      errors.push(`Confidence ${parsed.confidence} is out of bounds [0.0, 1.0].`);
    }
  } else {
    errors.push("Missing or non-numeric confidence value.");
  }

  // 3. Validate Recommended Settlement IDs
  const recommendedSettlementIds: string[] = [];
  if (Array.isArray(parsed.recommendedSettlementIds)) {
    for (const sid of parsed.recommendedSettlementIds) {
      if (typeof sid === "string" && sid.trim().length > 0) {
        const cleanSid = sid.trim();
        // Check hallucination: Must exist in datasetContext
        if (datasetContext.settlementsById.has(cleanSid)) {
          recommendedSettlementIds.push(cleanSid);
        } else {
          errors.push(`Hallucinated settlement ID '${cleanSid}' does not exist in settlement records.`);
        }
      }
    }
  } else if (decision === "MATCH") {
    errors.push("Decision is MATCH but recommendedSettlementIds is not an array.");
  }

  // If decision is MATCH but no valid settlement ID was provided
  if (decision === "MATCH" && recommendedSettlementIds.length === 0) {
    errors.push("Decision is MATCH but 0 valid settlement IDs were verified.");
  }

  // 4. Validate Strings and Arrays
  const exceptionType =
    typeof parsed.exceptionType === "string" && parsed.exceptionType.trim().length > 0
      ? parsed.exceptionType.trim()
      : decision === "MATCH"
      ? "NONE"
      : "UNKNOWN";

  const reasoningSummary =
    typeof parsed.reasoningSummary === "string" && parsed.reasoningSummary.trim().length > 0
      ? parsed.reasoningSummary.trim()
      : "AI provided no reasoning summary.";

  const recommendedAction =
    typeof parsed.recommendedAction === "string" && parsed.recommendedAction.trim().length > 0
      ? parsed.recommendedAction.trim()
      : decision === "MATCH"
      ? "Approve matched settlement."
      : "Conduct manual finance review.";

  const evidenceUsed = Array.isArray(parsed.evidenceUsed)
    ? parsed.evidenceUsed.filter((e): e is string => typeof e === "string")
    : [];

  const unresolvedQuestions = Array.isArray(parsed.unresolvedQuestions)
    ? parsed.unresolvedQuestions.filter((q): q is string => typeof q === "string")
    : [];

  // Enforce Human Review Policy if validation had critical errors or confidence is low
  if (errors.length > 0) {
    return {
      isValid: false,
      validatedResult: {
        decision: "HUMAN_REVIEW",
        recommendedSettlementIds: [],
        exceptionType: "AI_UNRESOLVED",
        confidence: 0.0,
        reasoningSummary: `AI validation failed: ${errors.join("; ")}`,
        evidenceUsed,
        unresolvedQuestions: errors,
        recommendedAction: "Manual finance review required.",
      },
      validationErrors: errors,
    };
  }

  // Enforce confidence threshold policy (< 0.75 -> HUMAN_REVIEW)
  if (decision === "MATCH" && confidence < 0.75) {
    decision = "HUMAN_REVIEW";
  }

  return {
    isValid: true,
    validatedResult: {
      decision,
      recommendedSettlementIds,
      exceptionType,
      confidence,
      reasoningSummary,
      evidenceUsed,
      unresolvedQuestions,
      recommendedAction,
    },
    validationErrors: [],
  };
}
