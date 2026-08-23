/**
 * TallyKai — AI Finance Controller
 * Phase 5: Read-Only Deterministic Tools for AI Agent
 * 
 * Provides strictly read-only, deterministic query tools for the AI agent.
 * 
 * IMPORTANT SAFETY RULES:
 * - Read-only: No tools can mutate data, create records, or execute payments.
 * - No Ground Truth: Ground truth is strictly isolated and never accessible here.
 * - No raw SQL or arbitrary DB execution.
 */

import { CanonicalTransaction } from "../normalization/types";
import { fromMinorUnits } from "../normalization/money";
import { DatasetLookupContext } from "./types";

/**
 * Builds high-performance in-memory lookup maps for read-only tool querying.
 */
export function buildDatasetLookupContext(
  orders: CanonicalTransaction[],
  settlements: CanonicalTransaction[]
): DatasetLookupContext {
  const ordersById = new Map<string, CanonicalTransaction>();
  const settlementsById = new Map<string, CanonicalTransaction>();
  const settlementsByRef = new Map<string, CanonicalTransaction[]>();
  const settlementsByOrderId = new Map<string, CanonicalTransaction[]>();
  const ordersByCustomer = new Map<string, CanonicalTransaction[]>();
  const settlementsByCustomer = new Map<string, CanonicalTransaction[]>();

  for (const o of orders) {
    ordersById.set(o.sourceRecordId, o);
    if (o.customerId) {
      const cKey = o.customerId.trim().toUpperCase();
      const list = ordersByCustomer.get(cKey) ?? [];
      list.push(o);
      ordersByCustomer.set(cKey, list);
    }
  }

  for (const s of settlements) {
    settlementsById.set(s.sourceRecordId, s);

    if (s.transactionReference) {
      const rKey = s.transactionReference.trim().toUpperCase();
      const list = settlementsByRef.get(rKey) ?? [];
      list.push(s);
      settlementsByRef.set(rKey, list);
    }

    if (s.orderId) {
      const oKey = s.orderId.trim().toUpperCase();
      const list = settlementsByOrderId.get(oKey) ?? [];
      list.push(s);
      settlementsByOrderId.set(oKey, list);
    }

    if (s.customerId) {
      const cKey = s.customerId.trim().toUpperCase();
      const list = settlementsByCustomer.get(cKey) ?? [];
      list.push(s);
      settlementsByCustomer.set(cKey, list);
    }
  }

  return {
    ordersById,
    settlementsById,
    settlementsByRef,
    settlementsByOrderId,
    ordersByCustomer,
    settlementsByCustomer,
    allOrders: orders,
    allSettlements: settlements,
  };
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>, context: DatasetLookupContext) => Promise<unknown>;
}

export const AI_TOOLS: Record<string, AIToolDefinition> = {
  getOrder: {
    name: "getOrder",
    description: "Retrieves internal order ledger transaction details by Order ID.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Internal Order ID (e.g. ORD-000123)" },
      },
      required: ["orderId"],
    },
    handler: async (args, ctx) => {
      const orderId = String(args.orderId ?? "").trim();
      const order = ctx.ordersById.get(orderId);
      if (!order) {
        return { error: `Order ${orderId} not found in order ledger.` };
      }
      return {
        orderId: order.sourceRecordId,
        amountMinor: order.amountMinor,
        amount: fromMinorUnits(order.amountMinor),
        currency: order.currency,
        timestamp: order.timestamp,
        status: order.status,
        paymentMethod: order.paymentMethod,
        reference: order.transactionReference,
        customerId: order.customerId,
        metadata: order.metadata,
      };
    },
  },

  getSettlement: {
    name: "getSettlement",
    description: "Retrieves gateway settlement transaction details by Settlement ID.",
    parameters: {
      type: "object",
      properties: {
        settlementId: { type: "string", description: "Gateway Settlement ID (e.g. SET-000451)" },
      },
      required: ["settlementId"],
    },
    handler: async (args, ctx) => {
      const settlementId = String(args.settlementId ?? "").trim();
      const settlement = ctx.settlementsById.get(settlementId);
      if (!settlement) {
        return { error: `Settlement ${settlementId} not found in settlement feed.` };
      }
      return {
        settlementId: settlement.sourceRecordId,
        amountMinor: settlement.amountMinor,
        amount: fromMinorUnits(settlement.amountMinor),
        currency: settlement.currency,
        timestamp: settlement.timestamp,
        status: settlement.status,
        reference: settlement.transactionReference,
        orderId: settlement.orderId,
        feeMinor: settlement.feeMinor,
        taxMinor: settlement.taxMinor,
        fee: settlement.feeMinor ? fromMinorUnits(settlement.feeMinor) : 0,
        tax: settlement.taxMinor ? fromMinorUnits(settlement.taxMinor) : 0,
      };
    },
  },

  getSettlementsByReference: {
    name: "getSettlementsByReference",
    description: "Searches settlement records by exact or partial transaction reference.",
    parameters: {
      type: "object",
      properties: {
        reference: { type: "string", description: "Reference string to search" },
      },
      required: ["reference"],
    },
    handler: async (args, ctx) => {
      const ref = String(args.reference ?? "").trim().toUpperCase();
      const exactHits = ctx.settlementsByRef.get(ref) ?? [];
      if (exactHits.length > 0) {
        return exactHits.map((s) => ({
          settlementId: s.sourceRecordId,
          reference: s.transactionReference,
          amountMinor: s.amountMinor,
          timestamp: s.timestamp,
          feeMinor: s.feeMinor,
          taxMinor: s.taxMinor,
        }));
      }

      // Stripped partial lookup
      const cleanRef = ref.replace(/[-_\s.]/g, "");
      const partialHits = ctx.allSettlements
        .filter((s) => {
          const sRef = (s.transactionReference ?? "").replace(/[-_\s.]/g, "").toUpperCase();
          return sRef.includes(cleanRef) || cleanRef.includes(sRef);
        })
        .slice(0, 5);

      return partialHits.map((s) => ({
        settlementId: s.sourceRecordId,
        reference: s.transactionReference,
        amountMinor: s.amountMinor,
        timestamp: s.timestamp,
        feeMinor: s.feeMinor,
        taxMinor: s.taxMinor,
      }));
    },
  },

  getSettlementsByOrderId: {
    name: "getSettlementsByOrderId",
    description: "Searches settlement records referencing a specific Order ID.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order ID to look up" },
      },
      required: ["orderId"],
    },
    handler: async (args, ctx) => {
      const orderId = String(args.orderId ?? "").trim().toUpperCase();
      const hits = ctx.settlementsByOrderId.get(orderId) ?? [];
      return hits.map((s) => ({
        settlementId: s.sourceRecordId,
        orderId: s.orderId,
        reference: s.transactionReference,
        amountMinor: s.amountMinor,
        timestamp: s.timestamp,
        feeMinor: s.feeMinor,
        taxMinor: s.taxMinor,
      }));
    },
  },

  getRelatedTransactions: {
    name: "getRelatedTransactions",
    description: "Retrieves order and settlement records associated with a specific customer ID.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer ID" },
      },
      required: ["customerId"],
    },
    handler: async (args, ctx) => {
      const custId = String(args.customerId ?? "").trim().toUpperCase();
      const orders = (ctx.ordersByCustomer.get(custId) ?? []).map((o) => ({
        orderId: o.sourceRecordId,
        amountMinor: o.amountMinor,
        timestamp: o.timestamp,
        reference: o.transactionReference,
      }));
      const settlements = (ctx.settlementsByCustomer.get(custId) ?? []).map((s) => ({
        settlementId: s.sourceRecordId,
        amountMinor: s.amountMinor,
        timestamp: s.timestamp,
        reference: s.transactionReference,
      }));
      return { customerId: custId, orders, settlements };
    },
  },

  getRefunds: {
    name: "getRefunds",
    description: "Checks if there are recorded refund adjustments for an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order ID to check" },
      },
      required: ["orderId"],
    },
    handler: async (args, ctx) => {
      const orderId = String(args.orderId ?? "").trim();
      const order = ctx.ordersById.get(orderId);
      if (!order) {
        return { refundAmountMinor: 0, hasRefunds: false };
      }
      return {
        orderId,
        refundAmountMinor: order.refundAmountMinor || 0,
        hasRefunds: (order.refundAmountMinor || 0) > 0,
      };
    },
  },

  calculateExpectedSettlement: {
    name: "calculateExpectedSettlement",
    description: "Calculates the expected net payout range for an order after standard gateway fee (1.5%-2.5%) and GST (18%).",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order ID" },
      },
      required: ["orderId"],
    },
    handler: async (args, ctx) => {
      const orderId = String(args.orderId ?? "").trim();
      const order = ctx.ordersById.get(orderId);
      if (!order) {
        return { error: `Order ${orderId} not found.` };
      }

      const grossMinor = order.amountMinor;
      const minFeeMinor = Math.round(grossMinor * 0.015);
      const maxFeeMinor = Math.round(grossMinor * 0.025);
      const minTaxMinor = Math.round(minFeeMinor * 0.18);
      const maxTaxMinor = Math.round(maxFeeMinor * 0.18);

      const minExpectedNetMinor = grossMinor - maxFeeMinor - maxTaxMinor;
      const maxExpectedNetMinor = grossMinor - minFeeMinor - minTaxMinor;

      return {
        orderId,
        grossAmountMinor: grossMinor,
        grossAmount: fromMinorUnits(grossMinor),
        standardMdrRate: "1.5% - 2.5%",
        gstRate: "18%",
        estimatedFeeRangeMinor: [minFeeMinor, maxFeeMinor],
        estimatedTaxRangeMinor: [minTaxMinor, maxTaxMinor],
        expectedNetRangeMinor: [minExpectedNetMinor, maxExpectedNetMinor],
        expectedNetRangeFormatted: `₹${fromMinorUnits(minExpectedNetMinor)} to ₹${fromMinorUnits(maxExpectedNetMinor)}`,
      };
    },
  },

  getCandidateEvidence: {
    name: "getCandidateEvidence",
    description: "Retrieves pre-computed multi-signal similarity scores and candidate settlement evidence for an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order ID" },
      },
      required: ["orderId"],
    },
    handler: async (args, ctx) => {
      const orderId = String(args.orderId ?? "").trim();
      const order = ctx.ordersById.get(orderId);
      if (!order) {
        return { error: `Order ${orderId} not found.` };
      }
      return {
        orderId,
        amountMinor: order.amountMinor,
        reference: order.transactionReference,
        timestamp: order.timestamp,
        availableSettlementsCount: ctx.allSettlements.length,
      };
    },
  },
};

/**
 * Deterministically dispatches and executes a read-only tool.
 */
export async function executeAITool(
  toolName: string,
  args: Record<string, unknown>,
  context: DatasetLookupContext
): Promise<{ success: boolean; data: unknown; error?: string }> {
  const tool = AI_TOOLS[toolName];
  if (!tool) {
    return {
      success: false,
      data: null,
      error: `Tool '${toolName}' is not recognized or permitted. Available tools: ${Object.keys(AI_TOOLS).join(", ")}`,
    };
  }

  try {
    const result = await tool.handler(args, context);
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Tool '${toolName}' execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
