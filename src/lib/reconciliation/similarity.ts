/**
 * TallyKai — AI Finance Controller
 * Phase 4: Multi-Signal Similarity Calculation Utilities
 * 
 * Provides pure, deterministic, and isolated similarity functions across:
 * 1. Reference similarity (Levenshtein distance, stripped alphanumeric identity, prefix/suffix tokens)
 * 2. Amount similarity (Integer minor units / paise, MDR fee tolerance, rounding bounds)
 * 3. Date similarity (Settlement batch lag T+0..T+3 window scoring)
 * 4. Customer / Metadata similarity (Identity overlap or conflict detection)
 */

import { CanonicalTransaction } from "../normalization/types";

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // Deletion
        dp[i][j - 1] + 1,       // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculates deterministic reference similarity between an order reference and a settlement reference.
 * 
 * Strategy:
 * 1. Exact string equality -> 1.0
 * 2. Stripped alphanumeric equality (ignoring hyphens, spaces, underscores, casing) -> 0.98
 *    (e.g., "ORD-00125" vs "ORD00125" -> 0.98, "WEB-AB123" vs "WEB AB123" -> 0.98)
 * 3. Levenshtein edit distance ratio combined with common prefix/suffix weighting.
 * 4. Distinct numeric mismatch penalty (e.g. "ORD-00125" vs "ORD-99125" -> ~0.60).
 * 
 * @param ref1 - First reference string (e.g. order reference or order_id)
 * @param ref2 - Second reference string (e.g. settlement reference or settlement order_id)
 * @returns Bounded similarity score [0.0, 1.0]
 */
export function calculateReferenceSimilarity(
  ref1: string | null | undefined,
  ref2: string | null | undefined
): number {
  if (!ref1 || !ref2) {
    return 0.0;
  }

  const s1 = ref1.trim().toUpperCase();
  const s2 = ref2.trim().toUpperCase();

  if (s1.length === 0 || s2.length === 0) {
    return 0.0;
  }

  // 1. Exact match
  if (s1 === s2) {
    return 1.0;
  }

  // 2. Stripped alphanumeric match (handles delimiter omission / spacing differences)
  const strip1 = s1.replace(/[-_\s.]/g, "");
  const strip2 = s2.replace(/[-_\s.]/g, "");

  if (strip1 === strip2 && strip1.length > 0) {
    return 0.98;
  }

  // 3. Substring inclusion check (e.g. "ORD-12345" vs "12345" or "TXN-ORD-12345")
  if (strip1.length > 0 && strip2.length > 0) {
    if (strip1.includes(strip2) || strip2.includes(strip1)) {
      const lenRatio = Math.min(strip1.length, strip2.length) / Math.max(strip1.length, strip2.length);
      if (lenRatio >= 0.6) {
        return parseFloat((0.82 + 0.14 * lenRatio).toFixed(2));
      }
    }
  }

  // 4. Levenshtein edit distance on stripped stems
  const maxLen = Math.max(strip1.length, strip2.length);
  if (maxLen === 0) return 0.0;

  const levDist = calculateLevenshteinDistance(strip1, strip2);
  const rawLevRatio = Math.max(0, 1 - levDist / maxLen);

  // 5. Common prefix bonus (Jaro-Winkler style)
  let commonPrefix = 0;
  const maxPrefix = Math.min(4, Math.min(strip1.length, strip2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (strip1[i] === strip2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }

  const prefixBonus = commonPrefix * 0.03;
  let score = Math.min(1.0, rawLevRatio + prefixBonus);

  // 6. Penalty if numeric parts conflict significantly (e.g. "ORD00125" vs "ORD99125")
  const nums1 = strip1.replace(/[^0-9]/g, "");
  const nums2 = strip2.replace(/[^0-9]/g, "");
  if (nums1.length > 0 && nums2.length > 0 && nums1 !== nums2) {
    const numDist = calculateLevenshteinDistance(nums1, nums2);
    const numDiffRatio = numDist / Math.max(nums1.length, nums2.length);
    if (numDiffRatio >= 0.4) {
      score = Math.max(0, score - 0.20);
    }
  }

  return parseFloat(score.toFixed(2));
}

/**
 * Compares expected settlement amount against actual settlement amount in minor units (paise).
 * 
 * Strategy:
 * 1. Exact amount match (0 variance) -> 1.0
 * 2. Minor rounding variance (<= 200 paise / ₹2.00) -> 0.98
 * 3. Amount matches expected net within standard MDR fee range (1%-3%) + 18% GST -> 0.96
 * 4. Minor percentage deviations (1% - 5%) -> 0.85 - 0.94
 * 5. Large amount deviations (> 20%) -> decays steeply (< 0.30)
 * 
 * @param expectedAmountMinor - Expected gross or net amount in paise
 * @param actualAmountMinor - Actual settled amount in paise
 * @param mdrRange - MDR fee percentage bounds (default: 1% to 3%)
 * @param gstRate - GST tax rate on fees (default: 18%)
 * @returns Bounded amount similarity score [0.0, 1.0]
 */
export function calculateAmountSimilarity(
  expectedAmountMinor: number,
  actualAmountMinor: number,
  mdrRange = { min: 0.01, max: 0.03 },
  gstRate = 0.18
): number {
  if (expectedAmountMinor <= 0 || actualAmountMinor <= 0) {
    return 0.0;
  }

  const diffMinor = Math.abs(expectedAmountMinor - actualAmountMinor);

  // 1. Exact amount match
  if (diffMinor === 0) {
    return 1.0;
  }

  // 2. Acceptable rounding tolerance (<= 200 paise = ₹2.00)
  if (diffMinor <= 200) {
    return 0.98;
  }

  // 3. Check if actualAmountMinor aligns with standard MDR fee + GST deducted net amount
  const minFee = Math.round(expectedAmountMinor * mdrRange.min);
  const maxFee = Math.round(expectedAmountMinor * mdrRange.max);
  const minTax = Math.round(minFee * gstRate);
  const maxTax = Math.round(maxFee * gstRate);

  const minExpectedNet = expectedAmountMinor - maxFee - maxTax;
  const maxExpectedNet = expectedAmountMinor - minFee - minTax;

  if (
    actualAmountMinor >= minExpectedNet - 200 &&
    actualAmountMinor <= maxExpectedNet + 200
  ) {
    return 0.96;
  }

  // 4. Proportional relative deviation calculation
  const maxAmount = Math.max(expectedAmountMinor, actualAmountMinor);
  const relDiff = diffMinor / maxAmount;

  if (relDiff <= 0.01) {
    return 0.94;
  }
  if (relDiff <= 0.03) {
    return 0.90;
  }
  if (relDiff <= 0.05) {
    return 0.82;
  }
  if (relDiff <= 0.10) {
    return 0.65;
  }
  if (relDiff <= 0.15) {
    return 0.45;
  }
  if (relDiff <= 0.25) {
    return 0.25;
  }

  // Large variance (e.g. ₹2,474 vs ₹3,900)
  return parseFloat(Math.max(0.0, 1 - relDiff * 2.5).toFixed(2));
}

/**
 * Calculates date proximity similarity score based on settlement batch timing.
 * 
 * Scoring curve:
 * - Same day (T+0): 1.0
 * - T+1 (0.5 to 1.5 days): 0.95
 * - T+2 (1.5 to 2.5 days): 0.85
 * - T+3 (2.5 to 3.5 days): 0.75
 * - T+4 to T+5 (3.5 to 5.5 days): 0.55
 * - T+6 to T+7 (5.5 to 7.0 days): 0.30
 * - Beyond 7 days or negative (< -0.5 days): 0.0 (rejected candidate)
 * 
 * @param orderTimestamp - ISO 8601 UTC timestamp of order
 * @param settlementTimestamp - ISO 8601 UTC timestamp of settlement
 * @param maxDays - Maximum permissible candidate window in days (default: 7.0)
 * @returns Bounded date similarity score [0.0, 1.0] and delay in days
 */
export function calculateDateSimilarity(
  orderTimestamp: string,
  settlementTimestamp: string,
  maxDays = 7.0
): { score: number; delayDays: number } {
  const orderTime = new Date(orderTimestamp).getTime();
  const settlementTime = new Date(settlementTimestamp).getTime();

  if (isNaN(orderTime) || isNaN(settlementTime)) {
    return { score: 0.0, delayDays: 0.0 };
  }

  const diffMs = settlementTime - orderTime;
  const delayDays = parseFloat((diffMs / (1000 * 60 * 60 * 24)).toFixed(2));

  // Settlement before order (allowing 4 hours grace for timezone/clock drift)
  if (delayDays < -0.16) {
    return { score: 0.0, delayDays };
  }

  if (delayDays <= 0.5) {
    return { score: 1.0, delayDays };
  }
  if (delayDays <= 1.5) {
    return { score: 0.95, delayDays };
  }
  if (delayDays <= 2.5) {
    return { score: 0.85, delayDays };
  }
  if (delayDays <= 3.5) {
    return { score: 0.75, delayDays };
  }
  if (delayDays <= 5.5) {
    return { score: 0.55, delayDays };
  }
  if (delayDays <= maxDays) {
    return { score: 0.30, delayDays };
  }

  // Outside permitted window
  return { score: 0.0, delayDays };
}

/**
 * Evaluates customer identity and metadata evidence between order and settlement records.
 * 
 * Rules:
 * - Matching customer IDs -> 1.0 (strong positive signal)
 * - Conflicting customer IDs -> 0.0 (strong negative signal)
 * - Missing customer ID on either side -> 0.5 (neutral signal)
 * 
 * @param order - Canonical order transaction
 * @param settlement - Canonical settlement transaction
 * @returns Bounded customer similarity score [0.0, 1.0]
 */
export function calculateCustomerSimilarity(
  order: CanonicalTransaction,
  settlement: CanonicalTransaction
): number {
  const orderCust = order.customerId?.trim().toUpperCase() ?? null;
  const settCust = settlement.customerId?.trim().toUpperCase() ?? null;

  // 1. Both records have explicit customer IDs
  if (orderCust && settCust) {
    return orderCust === settCust ? 1.0 : 0.0;
  }

  // 2. Check metadata fields for customer ID
  const settMetaCust =
    (typeof settlement.metadata?.customerId === "string"
      ? settlement.metadata.customerId
      : typeof settlement.metadata?.customer_id === "string"
      ? settlement.metadata.customer_id
      : null
    )?.trim().toUpperCase() ?? null;

  if (orderCust && settMetaCust) {
    return orderCust === settMetaCust ? 1.0 : 0.0;
  }

  // 3. Neutral baseline when customer information is not captured by payment gateway feed
  return 0.5;
}
