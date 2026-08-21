/**
 * Tallykai — Synthetic Dataset Generator Main Module
 */

import {
  Order,
  Settlement,
  GroundTruthRecord,
  GeneratorOptions,
  DatasetResult,
  DatasetSummary,
  ScenarioType,
} from "./types";
import { SeededRandom } from "./random";
import { selectScenario } from "./scenarios";
import { generateSingleOrder } from "./orderGenerator";
import {
  createSettlementRecord,
  calculateMdrFee,
  calculateGstTax,
} from "./settlementGenerator";
import { createGroundTruthRecord } from "./groundTruth";
import { validateDataset } from "./validator";

export function generateDataset(options: GeneratorOptions = {}): DatasetResult {
  const count = options.count ?? 500;
  const seed = options.seed ?? 42;
  const rng = new SeededRandom(seed);

  const orders: Order[] = [];
  const settlements: Settlement[] = [];
  const groundTruth: GroundTruthRecord[] = [];

  const scenarioCounts: Record<ScenarioType, number> = {
    EXACT_MATCH: 0,
    FEE_ADJUSTED: 0,
    TAX_ADJUSTED: 0,
    DATE_DRIFT: 0,
    AMOUNT_MISMATCH: 0,
    MISSING_SETTLEMENT: 0,
    ORPHAN_SETTLEMENT: 0,
    DUPLICATE_SETTLEMENT: 0,
    PARTIAL_SETTLEMENT: 0,
    MERGED_SETTLEMENT: 0,
    ROUNDING_DIFFERENCE: 0,
  };

  let orderCounter = 1;
  let settlementCounter = 1;

  while (orders.length < count) {
    const scenario = selectScenario(rng, options.scenarioProbabilities);

    if (scenario === "MERGED_SETTLEMENT") {
      // Create a batch of 2 or 3 orders sharing 1 settlement record
      const batchSize = Math.min(rng.int(2, 3), count - orders.length);
      const batchOrders: Order[] = [];
      const batchRef = rng.reference("BATCH");
      let totalNetSettlement = 0;
      let totalFee = 0;
      let totalTax = 0;

      for (let b = 0; b < batchSize; b++) {
        const order = generateSingleOrder(orderCounter++, rng);
        batchOrders.push(order);
        orders.push(order);

        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        totalFee += fee;
        totalTax += tax;
        totalNetSettlement += order.amount - fee - tax;
      }

      const settlement = createSettlementRecord(
        settlementCounter++,
        {
          reference: batchRef,
          orderId: batchOrders[0].order_id, // Primary batch reference
          orderAmount: batchOrders.reduce((sum, o) => sum + o.amount, 0),
          timestamp: batchOrders[0].order_timestamp,
          fee: totalFee,
          tax: totalTax,
          settlementAmount: totalNetSettlement,
        },
        rng
      );
      settlements.push(settlement);

      for (const order of batchOrders) {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "MERGED_SETTLEMENT",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: order.amount - fee - tax,
            expectedResult: `Order merged into batch settlement ${settlement.settlement_id} (Ref: ${batchRef}).`,
          })
        );
      }

      scenarioCounts["MERGED_SETTLEMENT"] += batchOrders.length;
      continue;
    }

    if (scenario === "ORPHAN_SETTLEMENT") {
      // Orphan settlement without corresponding order
      const orphanRef = rng.reference("ORP");
      const orphanAmount = rng.amount();
      const fee = calculateMdrFee(orphanAmount, rng);
      const tax = calculateGstTax(fee);
      const startDate = new Date("2026-08-01T00:00:00Z");
      const endDate = new Date("2026-08-15T23:59:59Z");

      const settlement = createSettlementRecord(
        settlementCounter++,
        {
          reference: orphanRef,
          orderId: null,
          orderAmount: orphanAmount,
          timestamp: rng.timestamp(startDate, endDate),
          fee,
          tax,
          settlementAmount: orphanAmount - fee - tax,
        },
        rng
      );
      settlements.push(settlement);

      groundTruth.push(
        createGroundTruthRecord({
          orderId: null,
          scenarioType: "ORPHAN_SETTLEMENT",
          expectedSettlementIds: [settlement.settlement_id],
          expectedSettlementAmount: settlement.settlement_amount,
          expectedResult: `Orphan settlement ${settlement.settlement_id} with no internal order ledger entry.`,
        })
      );

      scenarioCounts["ORPHAN_SETTLEMENT"]++;
      continue;
    }

    // Standard single-order scenarios
    const order = generateSingleOrder(orderCounter++, rng);
    orders.push(order);

    switch (scenario) {
      case "EXACT_MATCH": {
        const settlement = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee: 0,
            tax: 0,
            settlementAmount: order.amount,
          },
          rng
        );
        settlements.push(settlement);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "EXACT_MATCH",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: order.amount,
            expectedResult: `Exact 1:1 match with full order amount ${order.amount} INR.`,
          })
        );
        break;
      }

      case "FEE_ADJUSTED": {
        const fee = calculateMdrFee(order.amount, rng);
        const settlement = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax: 0,
            settlementAmount: order.amount - fee,
          },
          rng
        );
        settlements.push(settlement);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "FEE_ADJUSTED",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: order.amount - fee,
            expectedResult: `Settlement fee deduction of ${fee} INR. Net settled: ${order.amount - fee} INR.`,
          })
        );
        break;
      }

      case "TAX_ADJUSTED": {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        const netAmount = order.amount - fee - tax;
        const settlement = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax,
            settlementAmount: netAmount,
          },
          rng
        );
        settlements.push(settlement);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "TAX_ADJUSTED",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: netAmount,
            expectedResult: `MDR fee ${fee} INR + 18% GST tax ${tax} INR deducted. Net settled: ${netAmount} INR.`,
          })
        );
        break;
      }

      case "DATE_DRIFT": {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        const daysDelay = rng.choice([1, 2, 3]);
        const netAmount = order.amount - fee - tax;
        const settlement = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax,
            settlementAmount: netAmount,
            daysDelay,
          },
          rng
        );
        settlements.push(settlement);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "DATE_DRIFT",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: netAmount,
            expectedResult: `Settlement delayed by T+${daysDelay} days. Expected amount: ${netAmount} INR.`,
          })
        );
        break;
      }

      case "ROUNDING_DIFFERENCE": {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        const diff = rng.choice([-2, -1, 1, 2]);
        const settledAmount = Math.max(1, order.amount - fee - tax + diff);
        const settlement = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax,
            settlementAmount: settledAmount,
          },
          rng
        );
        settlements.push(settlement);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "ROUNDING_DIFFERENCE",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: settledAmount,
            expectedResult: `Minor rounding variance of ${diff > 0 ? "+" : ""}${diff} INR.`,
          })
        );
        break;
      }

      case "AMOUNT_MISMATCH": {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        const expectedNet = order.amount - fee - tax;
        // Genuinely wrong settlement amount (e.g. wrong tier)
        const wrongAmount = Math.max(
          50,
          Math.round(order.amount * (rng.next() > 0.5 ? 1.4 : 0.6))
        );
        const settlement = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax,
            settlementAmount: wrongAmount,
          },
          rng
        );
        settlements.push(settlement);
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "AMOUNT_MISMATCH",
            expectedSettlementIds: [settlement.settlement_id],
            expectedSettlementAmount: expectedNet,
            expectedResult: `Discrepancy: Settled ${wrongAmount} INR but expected net ${expectedNet} INR.`,
          })
        );
        break;
      }

      case "MISSING_SETTLEMENT": {
        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "MISSING_SETTLEMENT",
            expectedSettlementIds: [],
            expectedSettlementAmount: 0,
            expectedResult: `Unsettled order. No settlement record present in payout feed.`,
          })
        );
        break;
      }

      case "DUPLICATE_SETTLEMENT": {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        const netAmount = order.amount - fee - tax;

        const set1 = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax,
            settlementAmount: netAmount,
          },
          rng
        );
        const set2 = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee,
            tax,
            settlementAmount: netAmount,
            hoursDelay: 12,
          },
          rng
        );
        settlements.push(set1, set2);

        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "DUPLICATE_SETTLEMENT",
            expectedSettlementIds: [set1.settlement_id, set2.settlement_id],
            expectedSettlementAmount: netAmount,
            expectedResult: `Duplicate settlement detected. ${set1.settlement_id} and ${set2.settlement_id} paid twice.`,
          })
        );
        break;
      }

      case "PARTIAL_SETTLEMENT": {
        const fee = calculateMdrFee(order.amount, rng);
        const tax = calculateGstTax(fee);
        const netAmount = order.amount - fee - tax;

        const part1 = Math.round(netAmount * 0.6);
        const part2 = netAmount - part1;

        const set1 = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee: Math.round(fee * 0.6),
            tax: Math.round(tax * 0.6),
            settlementAmount: part1,
          },
          rng
        );
        const set2 = createSettlementRecord(
          settlementCounter++,
          {
            reference: order.reference,
            orderId: order.order_id,
            orderAmount: order.amount,
            timestamp: order.order_timestamp,
            fee: fee - Math.round(fee * 0.6),
            tax: tax - Math.round(tax * 0.6),
            settlementAmount: part2,
            daysDelay: 1,
          },
          rng
        );
        settlements.push(set1, set2);

        groundTruth.push(
          createGroundTruthRecord({
            orderId: order.order_id,
            scenarioType: "PARTIAL_SETTLEMENT",
            expectedSettlementIds: [set1.settlement_id, set2.settlement_id],
            expectedSettlementAmount: netAmount,
            expectedResult: `Partial settlements split across ${set1.settlement_id} (${part1} INR) and ${set2.settlement_id} (${part2} INR).`,
          })
        );
        break;
      }
    }

    scenarioCounts[scenario]++;
  }

  // Validate the dataset before returning
  validateDataset(orders, settlements, groundTruth);

  const summary: DatasetSummary = {
    totalOrders: orders.length,
    totalSettlements: settlements.length,
    totalGroundTruth: groundTruth.length,
    scenarioDistribution: scenarioCounts,
    generatedAt: new Date().toISOString(),
    seed,
  };

  return {
    orders,
    settlements,
    groundTruth,
    summary,
  };
}
