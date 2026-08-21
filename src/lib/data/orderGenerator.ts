/**
 * Tallykai — Internal Order Ledger Generator
 */

import { Order, PaymentMethod } from "./types";
import { SeededRandom } from "./random";

const PAYMENT_METHODS: { item: PaymentMethod; weight: number }[] = [
  { item: "UPI", weight: 50 },
  { item: "Card", weight: 25 },
  { item: "Net Banking", weight: 15 },
  { item: "Wallet", weight: 10 },
];

export function generateSingleOrder(
  idIndex: number,
  rng: SeededRandom,
  overrideTimestamp?: string,
  overrideAmount?: number
): Order {
  const orderId = `ORD-${idIndex.toString().padStart(6, "0")}`;
  const startDate = new Date("2026-08-01T00:00:00Z");
  const endDate = new Date("2026-08-15T23:59:59Z");

  return {
    order_id: orderId,
    customer_id: rng.customerId(),
    amount: overrideAmount ?? rng.amount(),
    currency: "INR",
    order_timestamp: overrideTimestamp ?? rng.timestamp(startDate, endDate),
    payment_method: rng.weightedChoice(PAYMENT_METHODS),
    order_status: "PAID",
    reference: rng.reference("WEB"),
  };
}
