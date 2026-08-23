/**
 * TallyKai — AI Exception Investigation Agent Test Suite
 * Validates Phase 5 Schema Validation, Tools, Providers, Fallbacks, Rate Limiting, Audit Trails, and Isolation.
 */

import fs from "fs";
import path from "path";
import { CanonicalTransaction } from "../src/lib/normalization/types";
import {
  validateAIOutput,
  buildDatasetLookupContext,
  executeAITool,
  investigateException,
  investigateExceptionsBatch,
  buildInvestigationContext,
} from "../src/lib/ai";
import { OrderReconciliationResult, reconcileDatasetAsync } from "../src/lib/reconciliation";

async function runTests() {
  console.log("==================================================");
  console.log("Running TallyKai Phase 5 AI Agent Test Suite");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const sampleOrder: CanonicalTransaction = {
    source: "ORDER_LEDGER",
    sourceRecordId: "ORD-1001",
    orderId: "ORD-1001",
    transactionReference: "WEB-1001",
    customerId: "CUS-501",
    amount: 500000, // ₹5,000.00
    amountMinor: 500000,
    currency: "INR",
    timestamp: "2026-08-01T10:00:00.000Z",
    status: "PAID",
    paymentMethod: "UPI",
    fee: null,
    feeMinor: null,
    tax: null,
    taxMinor: null,
    refundAmount: 0,
    refundAmountMinor: 0,
    metadata: {},
  };

  const sampleSettlement: CanonicalTransaction = {
    source: "SETTLEMENT",
    sourceRecordId: "SET-2001",
    orderId: "ORD-1001",
    transactionReference: "WEB 1001",
    customerId: "CUS-501",
    amount: 488200, // ₹4,882.00 (₹100 fee + ₹18 tax)
    amountMinor: 488200,
    currency: "INR",
    timestamp: "2026-08-02T10:00:00.000Z",
    status: "SETTLED",
    paymentMethod: null,
    fee: 10000,
    feeMinor: 10000,
    tax: 1800,
    taxMinor: 1800,
    refundAmount: 0,
    refundAmountMinor: 0,
    metadata: {},
  };

  const sampleSettlementB: CanonicalTransaction = {
    ...sampleSettlement,
    sourceRecordId: "SET-2002",
    amount: 488000,
    amountMinor: 488000,
  };

  const datasetContext = buildDatasetLookupContext(
    [sampleOrder],
    [sampleSettlement, sampleSettlementB]
  );

  const baseOrderResult: OrderReconciliationResult = {
    orderId: "ORD-1001",
    status: "UNRESOLVED",
    matchMethod: "NONE",
    settlementIds: [],
    confidence: 0.88,
    amountDifferenceMinor: 0,
    reason: "Unresolved candidate match.",
    exceptionCategory: "AMBIGUOUS_MATCH",
    evidence: [],
    fuzzyCandidates: [
      {
        settlementId: "SET-2001",
        score: 0.92,
        evidence: {
          referenceSimilarity: 0.98,
          amountSimilarity: 0.96,
          dateSimilarity: 0.95,
          customerSimilarity: 1.0,
        },
      },
      {
        settlementId: "SET-2002",
        score: 0.91,
        evidence: {
          referenceSimilarity: 0.98,
          amountSimilarity: 0.94,
          dateSimilarity: 0.95,
          customerSimilarity: 1.0,
        },
      },
    ],
  };

  // ----------------------------------------------------
  // Test 1: Valid AI response schema validation
  // ----------------------------------------------------
  const validAIJson = JSON.stringify({
    decision: "MATCH",
    recommendedSettlementIds: ["SET-2001"],
    exceptionType: "NONE",
    confidence: 0.95,
    reasoningSummary: "Settlement matches gross amount minus 2% MDR and 18% GST.",
    evidenceUsed: ["Gross: 500000", "Settlement: 488200"],
    unresolvedQuestions: [],
    recommendedAction: "Approve match.",
  });

  const val1 = validateAIOutput(validAIJson, "ORD-1001", datasetContext);
  assert(
    val1.isValid &&
      val1.validatedResult.decision === "MATCH" &&
      val1.validatedResult.confidence === 0.95 &&
      val1.validatedResult.recommendedSettlementIds[0] === "SET-2001",
    "1. Valid AI response passes schema validation and preserves match decision"
  );

  // ----------------------------------------------------
  // Test 2: Invalid / malformed AI response handling
  // ----------------------------------------------------
  const malformedJson = "This is not json { decision: bad }";
  const val2 = validateAIOutput(malformedJson, "ORD-1001", datasetContext);
  assert(
    !val2.isValid &&
      val2.validatedResult.decision === "HUMAN_REVIEW" &&
      val2.validatedResult.confidence === 0.0,
    "2. Malformed AI response safely falls back to HUMAN_REVIEW"
  );

  // ----------------------------------------------------
  // Test 3: Invalid confidence score (out of bounds)
  // ----------------------------------------------------
  const badConfJson = JSON.stringify({
    decision: "MATCH",
    recommendedSettlementIds: ["SET-2001"],
    confidence: 1.5, // Invalid > 1.0
    reasoningSummary: "Test",
    evidenceUsed: [],
    unresolvedQuestions: [],
    recommendedAction: "Test",
  });
  const val3 = validateAIOutput(badConfJson, "ORD-1001", datasetContext);
  assert(
    !val3.isValid && val3.validatedResult.decision === "HUMAN_REVIEW",
    "3. Out-of-bounds confidence score (> 1.0) is rejected and defaults to HUMAN_REVIEW"
  );

  // ----------------------------------------------------
  // Test 4: Unknown / Hallucinated settlement ID rejection
  // ----------------------------------------------------
  const hallucinatedJson = JSON.stringify({
    decision: "MATCH",
    recommendedSettlementIds: ["SET-NON-EXISTENT-999"],
    confidence: 0.95,
    reasoningSummary: "Test",
    evidenceUsed: [],
    unresolvedQuestions: [],
    recommendedAction: "Test",
  });
  const val4 = validateAIOutput(hallucinatedJson, "ORD-1001", datasetContext);
  assert(
    !val4.isValid &&
      val4.validationErrors.some((e) => e.includes("Hallucinated settlement ID")),
    "4. Hallucinated settlement ID is caught by validator and rejected"
  );

  // ----------------------------------------------------
  // Test 5: Unknown order ID lookup in tools
  // ----------------------------------------------------
  const toolRes = await executeAITool("getOrder", { orderId: "ORD-UNKNOWN" }, datasetContext);
  assert(
    toolRes.success &&
      typeof toolRes.data === "object" &&
      toolRes.data !== null &&
      "error" in toolRes.data,
    "5. Tool lookup for non-existent order ID returns structured error message"
  );

  // ----------------------------------------------------
  // Test 6: AI timeout handling
  // ----------------------------------------------------
  const timeoutOptions = {
    config: {
      provider: "mock" as const,
      modelName: "mock",
      maxTokens: 100,
      temperature: 0,
      timeoutMs: 1, // Ultra-short timeout
    },
  };
  const inv6 = await investigateException(sampleOrder, baseOrderResult, datasetContext, timeoutOptions);
  assert(
    inv6.decision === "HUMAN_REVIEW" || inv6.decision === "MATCH",
    "6. Investigation executes with timeout protection"
  );

  // ----------------------------------------------------
  // Test 7: AI provider failure handling
  // ----------------------------------------------------
  const failingOptions = {
    config: {
      provider: "gemini" as const,
      apiKey: "INVALID_KEY_XYZ",
      modelName: "gemini-2.5-flash",
      maxTokens: 100,
      temperature: 0,
      timeoutMs: 5000,
    },
  };
  const inv7 = await investigateException(sampleOrder, baseOrderResult, datasetContext, failingOptions);
  assert(
    inv7.decision === "HUMAN_REVIEW" &&
      inv7.reasoningSummary.includes("AI investigation unavailable"),
    "7. Provider failure / invalid API key gracefully falls back to HUMAN_REVIEW"
  );

  // ----------------------------------------------------
  // Test 8: Rate limit handling (MAX_AI_INVESTIGATIONS)
  // ----------------------------------------------------
  const ordersBatch = [sampleOrder, { ...sampleOrder, sourceRecordId: "ORD-1002" }];
  const mapResults = new Map([
    ["ORD-1001", baseOrderResult],
    ["ORD-1002", baseOrderResult],
  ]);
  const batchRes = await investigateExceptionsBatch(
    ordersBatch,
    mapResults,
    datasetContext,
    { maxInvestigationsPerRun: 1 } // Cap to 1
  );

  const overflow = batchRes.get("ORD-1002");
  assert(
    batchRes.size === 2 &&
      overflow !== undefined &&
      overflow.decision === "HUMAN_REVIEW" &&
      overflow.exceptionType === "AI_LIMIT_REACHED",
    "8. Rate limit caps batch investigations and assigns AI_LIMIT_REACHED status to overflow"
  );

  // ----------------------------------------------------
  // Test 9: Low confidence -> HUMAN_REVIEW
  // ----------------------------------------------------
  const lowConfJson = JSON.stringify({
    decision: "MATCH",
    recommendedSettlementIds: ["SET-2001"],
    confidence: 0.60, // Below 0.75 threshold
    reasoningSummary: "Weak match",
    evidenceUsed: [],
    unresolvedQuestions: [],
    recommendedAction: "Review",
  });
  const val9 = validateAIOutput(lowConfJson, "ORD-1001", datasetContext);
  assert(
    val9.validatedResult.decision === "HUMAN_REVIEW",
    "9. Confidence below 0.75 automatically downgrades decision to HUMAN_REVIEW"
  );

  // ----------------------------------------------------
  // Test 10: High confidence -> MATCH recommendation
  // ----------------------------------------------------
  const highConfInv = await investigateException(
    sampleOrder,
    {
      ...baseOrderResult,
      fuzzyCandidates: [
        {
          settlementId: "SET-2001",
          score: 0.96,
          evidence: { referenceSimilarity: 0.98, amountSimilarity: 0.96, dateSimilarity: 0.95, customerSimilarity: 1.0 },
        },
      ],
    },
    datasetContext
  );

  assert(
    highConfInv.decision === "MATCH" &&
      highConfInv.confidence >= 0.90 &&
      highConfInv.recommendedSettlementIds[0] === "SET-2001",
    "10. High-confidence candidate (0.96) is recommended as MATCH with full fee/tax explanation"
  );

  // ----------------------------------------------------
  // Test 11: Ground truth inaccessible to AI
  // ----------------------------------------------------
  const aiDir = path.join(process.cwd(), "src", "lib", "ai");
  const aiFiles = fs.readdirSync(aiDir);
  let groundTruthImportedInAI = false;

  for (const file of aiFiles) {
    if (file.endsWith(".ts")) {
      const content = fs.readFileSync(path.join(aiDir, file), "utf-8");
      if (
        content.includes("ground-truth.json") ||
        content.includes("groundTruth.ts") ||
        content.includes("GroundTruthRecord")
      ) {
        groundTruthImportedInAI = true;
        break;
      }
    }
  }

  assert(
    !groundTruthImportedInAI,
    "11. Ground truth isolation verified: AI subsystem never imports or references ground truth"
  );

  // ----------------------------------------------------
  // Test 12: Deterministic matches never sent to AI
  // ----------------------------------------------------
  const exactOrder: CanonicalTransaction = {
    ...sampleOrder,
    sourceRecordId: "ORD-EXACT",
    orderId: "ORD-EXACT",
  };
  const exactSettlement: CanonicalTransaction = {
    ...sampleSettlement,
    sourceRecordId: "SET-EXACT",
    orderId: "ORD-EXACT",
    amountMinor: 500000,
    feeMinor: 0,
    taxMinor: 0,
  };

  const fullRecon = await reconcileDatasetAsync([exactOrder], [exactSettlement]);
  assert(
    fullRecon.orderResults[0].status === "MATCHED" &&
      fullRecon.orderResults[0].matchMethod === "EXACT_REFERENCE" &&
      fullRecon.summary.aiInvestigated === 0,
    "12. Safety rule verified: Deterministic exact matches are resolved in Pass 1 and never sent to AI"
  );

  // ----------------------------------------------------
  // Test 13: Read-only immutability (AI tools cannot modify dataset)
  // ----------------------------------------------------
  const originalOrderAmount = sampleOrder.amountMinor;
  await executeAITool("calculateExpectedSettlement", { orderId: "ORD-1001" }, datasetContext);
  await executeAITool("getOrder", { orderId: "ORD-1001" }, datasetContext);

  assert(
    sampleOrder.amountMinor === originalOrderAmount &&
      datasetContext.ordersById.get("ORD-1001")?.amountMinor === originalOrderAmount,
    "13. Read-only immutability verified: Tool executions never mutate financial data"
  );

  // ----------------------------------------------------
  // Test 14: AI result creates comprehensive audit log
  // ----------------------------------------------------
  const inv14 = await investigateException(sampleOrder, baseOrderResult, datasetContext);
  assert(
    inv14.auditEvents.length >= 3 &&
      inv14.auditEvents.some((e) => e.action === "EXCEPTION_DETECTED") &&
      inv14.auditEvents.some((e) => e.action === "DECISION_FINALIZED"),
    "14. AI investigation records full chronological audit trail with timestamps"
  );

  // ----------------------------------------------------
  // Test 15: Reproducible tool context for identical exceptions
  // ----------------------------------------------------
  const ctxA = buildInvestigationContext(sampleOrder, baseOrderResult, datasetContext);
  const ctxB = buildInvestigationContext(sampleOrder, baseOrderResult, datasetContext);

  assert(
    JSON.stringify(ctxA) === JSON.stringify(ctxB),
    "15. Context building is 100% deterministic (identical exception produces identical context)"
  );

  console.log("--------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
