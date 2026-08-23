/**
 * Tallykai — Synthetic Reconciliation Scenarios & Probability Distribution
 */

import { ScenarioType } from "./types";
import { SeededRandom } from "./random";

export const DEFAULT_SCENARIO_PROBABILITIES: Record<ScenarioType, number> = {
  EXACT_MATCH: 0.30,
  FEE_ADJUSTED: 0.18,
  TAX_ADJUSTED: 0.10,
  DATE_DRIFT: 0.08,
  FUZZY_REFERENCE: 0.08,
  AMBIGUOUS_MATCH: 0.04,
  ROUNDING_DIFFERENCE: 0.04,
  AMOUNT_MISMATCH: 0.05,
  MISSING_SETTLEMENT: 0.04,
  ORPHAN_SETTLEMENT: 0.03,
  DUPLICATE_SETTLEMENT: 0.03,
  PARTIAL_SETTLEMENT: 0.03,
  MERGED_SETTLEMENT: 0.03,
};

/**
 * Normalizes scenario probabilities and picks a scenario using the seeded PRNG.
 */
export function selectScenario(
  rng: SeededRandom,
  customProbabilities?: Partial<Record<ScenarioType, number>>
): ScenarioType {
  const merged = { ...DEFAULT_SCENARIO_PROBABILITIES, ...customProbabilities };

  const items = (Object.keys(merged) as ScenarioType[]).map((type) => ({
    item: type,
    weight: Math.max(0, merged[type] ?? 0),
  }));

  return rng.weightedChoice(items);
}

/**
 * Maps scenario type to ground truth true_status ("MATCHABLE" vs "EXCEPTION").
 */
export function getTrueStatus(scenario: ScenarioType): "MATCHABLE" | "EXCEPTION" {
  switch (scenario) {
    case "EXACT_MATCH":
    case "FEE_ADJUSTED":
    case "TAX_ADJUSTED":
    case "DATE_DRIFT":
    case "ROUNDING_DIFFERENCE":
    case "PARTIAL_SETTLEMENT":
    case "MERGED_SETTLEMENT":
    case "FUZZY_REFERENCE":
      return "MATCHABLE";
    case "AMBIGUOUS_MATCH":
    case "AMOUNT_MISMATCH":
    case "MISSING_SETTLEMENT":
    case "ORPHAN_SETTLEMENT":
    case "DUPLICATE_SETTLEMENT":
      return "EXCEPTION";
    default:
      return "EXCEPTION";
  }
}
