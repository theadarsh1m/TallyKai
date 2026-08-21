/**
 * Tallykai — Ground Truth Engine
 * Generates unexposed ground-truth evaluation mappings.
 */

import { GroundTruthRecord, ScenarioType, TrueStatus } from "./types";
import { getTrueStatus } from "./scenarios";

export function createGroundTruthRecord(params: {
  orderId: string | null;
  scenarioType: ScenarioType;
  expectedSettlementIds: string[];
  expectedSettlementAmount: number;
  expectedResult?: string;
  overrideTrueStatus?: TrueStatus;
}): GroundTruthRecord {
  return {
    order_id: params.orderId,
    scenario_type: params.scenarioType,
    true_status: params.overrideTrueStatus ?? getTrueStatus(params.scenarioType),
    expected_settlement_ids: params.expectedSettlementIds,
    expected_settlement_amount: params.expectedSettlementAmount,
    expected_result:
      params.expectedResult ??
      `Scenario: ${params.scenarioType}. Expected settlement amount: ${params.expectedSettlementAmount}.`,
  };
}
