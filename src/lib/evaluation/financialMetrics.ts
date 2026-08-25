/**
 * TallyKai — AI Finance Controller
 * Phase 6: Financial Metrics Aggregation
 */

import { FinancialReconciliationMetrics, DetailedRecordEvaluation } from "./types";
import { Order } from "../data/types";

export function computeFinancialMetrics(
  orders: Order[],
  evaluations: DetailedRecordEvaluation[]
): FinancialReconciliationMetrics {
  const orderAmountMap = new Map<string, number>();
  for (const o of orders) {
    orderAmountMap.set(o.order_id, Math.round(o.amount * 100)); // paise
  }

  let totalPaise = 0;
  let reconciledPaise = 0;
  let unresolvedPaise = 0;
  let incorrectPaise = 0;
  let exceptionPaise = 0;

  for (const ev of evaluations) {
    const amountPaise = orderAmountMap.get(ev.orderId) || ev.expectedAmountPaise || 0;
    totalPaise += amountPaise;

    const isMatch =
      ev.actualStatus === "MATCHED" || ev.actualStatus === "MATCHED_AFTER_ADJUSTMENTS";

    if (isMatch) {
      if (ev.isMatchCorrect) {
        reconciledPaise += amountPaise;
      } else {
        incorrectPaise += amountPaise;
      }
    } else {
      unresolvedPaise += amountPaise;
      exceptionPaise += amountPaise;
    }
  }

  const totalINR = parseFloat((totalPaise / 100).toFixed(2));
  const reconciledINR = parseFloat((reconciledPaise / 100).toFixed(2));
  const unresolvedINR = parseFloat((unresolvedPaise / 100).toFixed(2));
  const incorrectINR = parseFloat((incorrectPaise / 100).toFixed(2));
  const exceptionINR = parseFloat((exceptionPaise / 100).toFixed(2));

  const financialReconciliationRate =
    totalINR > 0 ? parseFloat(((reconciledINR / totalINR) * 100).toFixed(2)) : 0.0;

  return {
    totalOrderValuePaise: totalPaise,
    reconciledOrderValuePaise: reconciledPaise,
    unresolvedOrderValuePaise: unresolvedPaise,
    incorrectlyReconciledValuePaise: incorrectPaise,
    exceptionOrderValuePaise: exceptionPaise,
    totalOrderValueINR: totalINR,
    reconciledOrderValueINR: reconciledINR,
    unresolvedOrderValueINR: unresolvedINR,
    incorrectlyReconciledValueINR: incorrectINR,
    exceptionOrderValueINR: exceptionINR,
    financialReconciliationRate,
  };
}
