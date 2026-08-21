/**
 * Tallykai — Synthetic Data Validator
 * Performs sanity checks to guarantee dataset integrity before saving.
 */

import { Order, Settlement, GroundTruthRecord } from "./types";

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDataset(
  orders: Order[],
  settlements: Settlement[],
  groundTruth: GroundTruthRecord[]
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Order ID Uniqueness & Amount/Currency Validation
  const orderIds = new Set<string>();
  for (const order of orders) {
    if (orderIds.has(order.order_id)) {
      errors.push(`Duplicate order_id found: ${order.order_id}`);
    }
    orderIds.add(order.order_id);

    if (order.amount <= 0) {
      errors.push(`Invalid order amount for ${order.order_id}: ${order.amount}`);
    }
    if (order.currency !== "INR") {
      errors.push(`Invalid currency for ${order.order_id}: ${order.currency}`);
    }
    if (isNaN(Date.parse(order.order_timestamp))) {
      errors.push(`Invalid order timestamp for ${order.order_id}: ${order.order_timestamp}`);
    }
  }

  // 2. Settlement ID Uniqueness & Amount Validation
  const settlementIds = new Set<string>();
  for (const settlement of settlements) {
    if (settlementIds.has(settlement.settlement_id)) {
      errors.push(`Duplicate settlement_id found: ${settlement.settlement_id}`);
    }
    settlementIds.add(settlement.settlement_id);

    if (settlement.settlement_amount <= 0) {
      errors.push(
        `Invalid settlement amount for ${settlement.settlement_id}: ${settlement.settlement_amount}`
      );
    }
    if (isNaN(Date.parse(settlement.settlement_timestamp))) {
      errors.push(
        `Invalid settlement timestamp for ${settlement.settlement_id}: ${settlement.settlement_timestamp}`
      );
    }
  }

  // 3. Ground Truth Reference Validation
  for (const gt of groundTruth) {
    if (gt.order_id && !orderIds.has(gt.order_id)) {
      // Check if it's an orphan or invalid reference
      if (gt.scenario_type !== "ORPHAN_SETTLEMENT") {
        errors.push(`Ground truth references non-existent order_id: ${gt.order_id}`);
      }
    }
    for (let i = 0; i < gt.expected_settlement_ids.length; i++) {
      const setSid = gt.expected_settlement_ids[i];
      if (!settlementIds.has(setSid)) {
        errors.push(`Ground truth references non-existent settlement_id: ${setSid}`);
      }
    }
  }

  // 4. Scenario Distribution Sanity Warning
  if (orders.length >= 100) {
    const scenarioCounts: Record<string, number> = {};
    for (const gt of groundTruth) {
      scenarioCounts[gt.scenario_type] = (scenarioCounts[gt.scenario_type] || 0) + 1;
    }
    if (!scenarioCounts["EXACT_MATCH"] || scenarioCounts["EXACT_MATCH"] === 0) {
      warnings.push("Scenario distribution lacks EXACT_MATCH entries.");
    }
  }

  const valid = errors.length === 0;

  if (!valid) {
    throw new Error(
      `Dataset validation failed with ${errors.length} errors:\n - ${errors.join("\n - ")}`
    );
  }

  return { valid, errors, warnings };
}
