/**
 * TallyKai — AI Finance Controller
 * Phase 3 & Phase 4: Reconciliation Engine Configuration
 */

export interface ReconciliationEngineConfig {
  /** Maximum allowable settlement lag in days (default: 3.5 days, representing T+3 with grace) */
  maxSettlementDelayDays: number;
  /** Minimum allowable settlement lag in days (default: 0.0 days) */
  minSettlementDelayDays: number;
  /** Maximum acceptable rounding variance in minor units / paise (default: 200 paise = ₹2.00) */
  maxRoundingDifferenceMinor: number;
  /** Standard gateway MDR fee percentage bounds (default: 1.0% to 3.0%) */
  mdrFeeRange: {
    min: number;
    max: number;
  };
  /** Applicable GST tax rate on gateway MDR fees (default: 18%) */
  gstRate: number;
}

export interface FuzzyMatchingConfig {
  /**
   * Weights allocated to each similarity dimension.
   * Must sum to 1.0.
   * Reasoning:
   * - Reference (40%): Transaction reference stems are the strongest indicator of source intent.
   * - Amount (30%): Money must align within net payout bounds after fee/tax adjustments.
   * - Date (20%): Settlement timing follows gateway batch payout schedules (T+0 to T+3).
   * - Customer (10%): Customer ID / metadata overlap provides confirmatory context.
   */
  weights: {
    reference: number;
    amount: number;
    date: number;
    customer: number;
  };
  /** Confidence score thresholds for fuzzy matching decisions */
  thresholds: {
    /** Minimum composite score required to propose a match */
    highConfidence: number;
    /** Minimum score to qualify as a medium-confidence plausible candidate */
    mediumConfidence: number;
    /** Minimum separation margin between top candidate (#1) and runner-up (#2) to avoid ambiguity */
    ambiguityMargin: number;
  };
  /** Candidate generation and search window bounds */
  indexing: {
    /** Maximum date window in days for candidate generation (default: 7.0 days) */
    maxCandidateDateLagDays: number;
    /** Relative percentage variance for amount filtering (default: 0.15 = +/- 15%) */
    amountTolerancePercent: number;
    /** Maximum number of candidate settlements evaluated per order */
    maxCandidatesPerOrder: number;
  };
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

export const DEFAULT_FUZZY_CONFIG: FuzzyMatchingConfig = {
  weights: {
    reference: 0.40,
    amount: 0.30,
    date: 0.20,
    customer: 0.10,
  },
  thresholds: {
    highConfidence: 0.88,
    mediumConfidence: 0.75,
    ambiguityMargin: 0.05,
  },
  indexing: {
    maxCandidateDateLagDays: 7.0,
    amountTolerancePercent: 0.20,
    maxCandidatesPerOrder: 25,
  },
};
