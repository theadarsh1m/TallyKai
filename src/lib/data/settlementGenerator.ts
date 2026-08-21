/**
 * Tallykai — Settlement Records Generator
 */

import { Settlement } from "./types";
import { SeededRandom } from "./random";

export function createSettlementRecord(
  idIndex: number,
  params: {
    reference: string;
    orderId: string | null;
    orderAmount: number;
    timestamp: string;
    fee?: number;
    tax?: number;
    settlementAmount?: number;
    daysDelay?: number;
    hoursDelay?: number;
  },
  rng: SeededRandom
): Settlement {
  const settlementId = `SET-${idIndex.toString().padStart(6, "0")}`;
  const fee = params.fee ?? 0;
  const tax = params.tax ?? 0;
  const settlementAmount =
    params.settlementAmount ?? Math.max(1, params.orderAmount - fee - tax);

  const days = params.daysDelay ?? 0;
  const hours = params.hoursDelay ?? rng.int(2, 6);
  const settlementTimestamp = rng.addOffset(params.timestamp, days, hours);

  return {
    settlement_id: settlementId,
    settlement_reference: params.reference,
    order_id: params.orderId,
    settlement_amount: settlementAmount,
    settlement_timestamp: settlementTimestamp,
    fee,
    tax,
    settlement_status: "SETTLED",
  };
}

/**
 * Calculates realistic MDR Fee (1.5% - 2.5%) for an order amount.
 */
export function calculateMdrFee(amount: number, rng: SeededRandom): number {
  const rate = 0.015 + rng.next() * 0.01; // 1.5% to 2.5%
  return Math.max(1, Math.round(amount * rate));
}

/**
 * Calculates 18% GST Tax on a fee amount.
 */
export function calculateGstTax(fee: number): number {
  return Math.max(1, Math.round(fee * 0.18));
}
