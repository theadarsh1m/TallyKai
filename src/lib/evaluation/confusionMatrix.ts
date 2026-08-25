/**
 * TallyKai — AI Finance Controller
 * Phase 6: Confusion Matrix Calculation
 */

import { ConfusionMatrix, DetailedRecordEvaluation } from "./types";

export function computeConfusionMatrix(
  evaluations: DetailedRecordEvaluation[]
): ConfusionMatrix {
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  for (const ev of evaluations) {
    switch (ev.classification) {
      case "CORRECT":
        if (ev.groundTruthStatus === "MATCHABLE") {
          truePositives++;
        } else {
          trueNegatives++;
        }
        break;
      case "UNRESOLVED":
        trueNegatives++;
        break;
      case "FALSE_POSITIVE":
      case "INCORRECT":
        falsePositives++;
        break;
      case "MISSED":
        falseNegatives++;
        break;
    }
  }

  return {
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    totalRecords: evaluations.length,
  };
}
