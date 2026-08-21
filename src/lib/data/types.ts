/**
 * Tallykai — AI Finance Controller
 * Phase 1: Synthetic Data Engine Types
 */

export type ScenarioType =
  | "EXACT_MATCH"
  | "FEE_ADJUSTED"
  | "TAX_ADJUSTED"
  | "DATE_DRIFT"
  | "AMOUNT_MISMATCH"
  | "MISSING_SETTLEMENT"
  | "ORPHAN_SETTLEMENT"
  | "DUPLICATE_SETTLEMENT"
  | "PARTIAL_SETTLEMENT"
  | "MERGED_SETTLEMENT"
  | "ROUNDING_DIFFERENCE";

export type PaymentMethod = "UPI" | "Card" | "Net Banking" | "Wallet";

export type OrderStatus = "PAID";

export type SettlementStatus = "SETTLED";

export type TrueStatus = "MATCHABLE" | "EXCEPTION";

export interface Order {
  order_id: string;
  customer_id: string;
  amount: number;
  currency: "INR";
  order_timestamp: string;
  payment_method: PaymentMethod;
  order_status: OrderStatus;
  reference: string;
}

export interface Settlement {
  settlement_id: string;
  settlement_reference: string;
  order_id: string | null;
  settlement_amount: number;
  settlement_timestamp: string;
  fee: number;
  tax: number;
  settlement_status: SettlementStatus;
}

export interface GroundTruthRecord {
  order_id: string | null;
  scenario_type: ScenarioType;
  true_status: TrueStatus;
  expected_settlement_ids: string[];
  expected_settlement_amount: number;
  expected_result?: string;
}

export interface GeneratorOptions {
  count?: number;
  seed?: number;
  scenarioProbabilities?: Partial<Record<ScenarioType, number>>;
}

export interface DatasetSummary {
  totalOrders: number;
  totalSettlements: number;
  totalGroundTruth: number;
  scenarioDistribution: Record<ScenarioType, number>;
  generatedAt: string;
  seed: number;
}

export interface DatasetResult {
  orders: Order[];
  settlements: Settlement[];
  groundTruth: GroundTruthRecord[];
  summary: DatasetSummary;
}
