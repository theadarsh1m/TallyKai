/**
 * TallyKai — AI Finance Controller
 * Phase 3: Deterministic Reconciliation Engine Configuration
 */

export interface ReconciliationEngineConfig {
  /** Maximum allowable settlement lag in days (default: 3.0 days, representing T+3) */
  maxSettlementDelayDays: number;
  /** Minimum allowable settlement lag in days (default: 0.0 days) */
  minSettlementDelayDays: number;
  /** Maximum acceptable rounding variance in minor units / paise (default: 200 paise = ₹2.00) */
  maxRoundingDifferenceMinor: number;
  /** Standard gateway MDR fee percentage bounds (default: 1.5% to 2.5%) */
  mdrFeeRange: {
    min: number;
    max: number;
  };
  /** Applicable GST tax rate on gateway MDR fees (default: 18%) */
  gstRate: number;
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationEngineConfig = {
  maxSettlementDelayDays: 3.5,
  minSettlementDelayDays: 0.0,
  maxRoundingDifferenceMinor: 200, // 200 paise = ₹2.00
  mdrFeeRange: {
    min: 0.01,
    max: 0.03,
  },
  gstRate: 0.18,
};
