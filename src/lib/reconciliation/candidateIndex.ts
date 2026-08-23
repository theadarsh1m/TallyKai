/**
 * TallyKai — AI Finance Controller
 * Phase 4: High-Performance Multi-Index Lookup for Fuzzy Candidate Generation
 * 
 * Pre-indexes unclaimed settlement records by amount buckets, date windows,
 * reference token stems, and customer IDs to avoid O(N * M) cartesian product comparisons.
 */

import { CanonicalTransaction } from "../normalization/types";
import { FuzzyMatchingConfig } from "./config";

export interface FuzzyCandidateIndex {
  /** Map of amount bucket (rounded to ₹500 / 50,000 paise intervals) to settlements */
  byAmountBucket: Map<number, CanonicalTransaction[]>;
  /** Map of epoch day integer (Math.floor(timeMs / 86400000)) to settlements */
  byEpochDay: Map<number, CanonicalTransaction[]>;
  /** Map of 3-character prefix and alphanumeric stems to settlements */
  byReferenceStem: Map<string, CanonicalTransaction[]>;
  /** Map of customer IDs to settlements */
  byCustomerId: Map<string, CanonicalTransaction[]>;
  /** Complete pool of unclaimed settlements */
  allSettlements: Map<string, CanonicalTransaction>;
}

const AMOUNT_BUCKET_SIZE_MINOR = 50000; // ₹500 intervals

/**
 * Builds indexing structures for unresolved/unclaimed settlement records.
 * 
 * @param settlements - Pool of unclaimed settlements from deterministic matching
 * @returns Multi-index candidate lookup structure
 */
export function buildFuzzyCandidateIndex(settlements: CanonicalTransaction[]): FuzzyCandidateIndex {
  const byAmountBucket = new Map<number, CanonicalTransaction[]>();
  const byEpochDay = new Map<number, CanonicalTransaction[]>();
  const byReferenceStem = new Map<string, CanonicalTransaction[]>();
  const byCustomerId = new Map<string, CanonicalTransaction[]>();
  const allSettlements = new Map<string, CanonicalTransaction>();

  for (const s of settlements) {
    const sId = s.sourceRecordId;
    allSettlements.set(sId, s);

    // 1. Amount Bucket Index
    const bucket = Math.floor(s.amountMinor / AMOUNT_BUCKET_SIZE_MINOR);
    const amountList = byAmountBucket.get(bucket) ?? [];
    amountList.push(s);
    byAmountBucket.set(bucket, amountList);

    // 2. Date Epoch Day Index
    const timeMs = new Date(s.timestamp).getTime();
    if (!isNaN(timeMs)) {
      const epochDay = Math.floor(timeMs / (1000 * 60 * 60 * 24));
      const dayList = byEpochDay.get(epochDay) ?? [];
      dayList.push(s);
      byEpochDay.set(epochDay, dayList);
    }

    // 3. Reference Stems & Prefix Index
    const refs = [s.transactionReference, s.orderId, s.sourceRecordId].filter(
      (r): r is string => Boolean(r)
    );

    for (const ref of refs) {
      const clean = ref.replace(/[-_\s.]/g, "").toUpperCase();
      if (clean.length >= 3) {
        // Index first 3 and 4 character prefixes
        const prefix3 = clean.substring(0, 3);
        const prefix4 = clean.substring(0, 4);
        const numPart = clean.replace(/[^0-9]/g, "");

        for (const stem of [prefix3, prefix4, numPart]) {
          if (stem.length >= 3) {
            const stemList = byReferenceStem.get(stem) ?? [];
            stemList.push(s);
            byReferenceStem.set(stem, stemList);
          }
        }
      }
    }

    // 4. Customer ID Index
    if (s.customerId) {
      const custKey = s.customerId.trim().toUpperCase();
      const custList = byCustomerId.get(custKey) ?? [];
      custList.push(s);
      byCustomerId.set(custKey, custList);
    }
  }

  return {
    byAmountBucket,
    byEpochDay,
    byReferenceStem,
    byCustomerId,
    allSettlements,
  };
}

/**
 * Rapidly filters and generates candidate settlement records for an unresolved order.
 * Queries indices using amount tolerances, date window bounds, reference stems, and customer ID.
 * 
 * @param order - Unresolved canonical order transaction
 * @param index - Pre-computed fuzzy candidate index
 * @param config - Fuzzy reconciliation configuration
 * @returns Deduplicated list of plausible candidate settlement transactions
 */
export function findFuzzyCandidates(
  order: CanonicalTransaction,
  index: FuzzyCandidateIndex,
  config: FuzzyMatchingConfig
): CanonicalTransaction[] {
  // If the total pool is small (<= 30 settlements), test all of them directly
  if (index.allSettlements.size <= 30) {
    return Array.from(index.allSettlements.values());
  }

  const candidateMap = new Map<string, CanonicalTransaction>();

  // 1. Reference & Identifier Match (Highest priority)
  const orderRefs = [order.transactionReference, order.orderId, order.sourceRecordId].filter(
    (r): r is string => Boolean(r)
  );

  for (const ref of orderRefs) {
    const clean = ref.replace(/[-_\s.]/g, "").toUpperCase();
    if (clean.length >= 3) {
      const prefix3 = clean.substring(0, 3);
      const prefix4 = clean.substring(0, 4);
      const numPart = clean.replace(/[^0-9]/g, "");

      for (const stem of [prefix3, prefix4, numPart]) {
        if (stem.length >= 3) {
          const hits = index.byReferenceStem.get(stem);
          if (hits) {
            for (const s of hits) {
              candidateMap.set(s.sourceRecordId, s);
            }
          }
        }
      }
    }
  }

  // 2. Customer ID Match
  if (order.customerId) {
    const custKey = order.customerId.trim().toUpperCase();
    const custHits = index.byCustomerId.get(custKey);
    if (custHits) {
      for (const s of custHits) {
        candidateMap.set(s.sourceRecordId, s);
      }
    }
  }

  // 3. Amount & Date Window Multi-Lookup
  const orderTimeMs = new Date(order.timestamp).getTime();
  if (!isNaN(orderTimeMs)) {
    const orderEpochDay = Math.floor(orderTimeMs / (1000 * 60 * 60 * 24));
    const maxLagDays = Math.ceil(config.indexing.maxCandidateDateLagDays);

    // Amount range
    const tol = config.indexing.amountTolerancePercent;
    const minAmount = Math.round(order.amountMinor * (1 - tol));
    const maxAmount = Math.round(order.amountMinor * (1 + 0.05)); // Slight upper margin

    const minBucket = Math.floor(minAmount / AMOUNT_BUCKET_SIZE_MINOR);
    const maxBucket = Math.floor(maxAmount / AMOUNT_BUCKET_SIZE_MINOR);

    // Intersect settlements across date window and amount buckets
    for (let day = orderEpochDay; day <= orderEpochDay + maxLagDays; day++) {
      const daySettlements = index.byEpochDay.get(day);
      if (daySettlements) {
        for (const s of daySettlements) {
          if (s.amountMinor >= minAmount && s.amountMinor <= maxAmount) {
            candidateMap.set(s.sourceRecordId, s);
          }
        }
      }
    }

    // Also check amount buckets
    for (let b = minBucket; b <= maxBucket; b++) {
      const bucketHits = index.byAmountBucket.get(b);
      if (bucketHits) {
        for (const s of bucketHits) {
          const sTime = new Date(s.timestamp).getTime();
          const sLag = (sTime - orderTimeMs) / (1000 * 60 * 60 * 24);
          if (sLag >= -0.25 && sLag <= config.indexing.maxCandidateDateLagDays) {
            candidateMap.set(s.sourceRecordId, s);
          }
        }
      }
    }
  }

  // If candidate filtering found few or no records, fallback to all settlements up to cap
  if (candidateMap.size === 0 && index.allSettlements.size <= 100) {
    return Array.from(index.allSettlements.values());
  }

  const result = Array.from(candidateMap.values());

  // Cap candidates per order to configured limit
  if (result.length > config.indexing.maxCandidatesPerOrder) {
    return result.slice(0, config.indexing.maxCandidatesPerOrder);
  }

  return result;
}
