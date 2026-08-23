/**
 * TallyKai — AI Finance Controller
 * Phase 3: High-Performance Multi-Index Lookup for Financial Records
 * 
 * Provides O(1) candidate lookup by Order ID and Transaction Reference,
 * eliminating O(N^2) cartesian product comparisons.
 */

import { CanonicalTransaction } from "../normalization/types";

export interface SettlementIndex {
  byOrderId: Map<string, CanonicalTransaction[]>;
  byReference: Map<string, CanonicalTransaction[]>;
  allSettlements: Map<string, CanonicalTransaction>;
  allSettlementIds: Set<string>;
}

export interface OrderIndex {
  byOrderId: Map<string, CanonicalTransaction>;
  byReference: Map<string, CanonicalTransaction[]>;
  allOrderIds: Set<string>;
}

/**
 * Builds indexing structures for normalized settlement records.
 */
export function buildSettlementIndex(settlements: CanonicalTransaction[]): SettlementIndex {
  const byOrderId = new Map<string, CanonicalTransaction[]>();
  const byReference = new Map<string, CanonicalTransaction[]>();
  const allSettlements = new Map<string, CanonicalTransaction>();
  const allSettlementIds = new Set<string>();

  for (const s of settlements) {
    const sId = s.sourceRecordId;
    allSettlements.set(sId, s);
    allSettlementIds.add(sId);

    // Index by orderId
    if (s.orderId) {
      const existing = byOrderId.get(s.orderId) ?? [];
      existing.push(s);
      byOrderId.set(s.orderId, existing);
    }

    // Index by transactionReference
    if (s.transactionReference) {
      const existing = byReference.get(s.transactionReference) ?? [];
      existing.push(s);
      byReference.set(s.transactionReference, existing);
    }
  }

  return {
    byOrderId,
    byReference,
    allSettlements,
    allSettlementIds,
  };
}

/**
 * Builds indexing structures for normalized order records.
 */
export function buildOrderIndex(orders: CanonicalTransaction[]): OrderIndex {
  const byOrderId = new Map<string, CanonicalTransaction>();
  const byReference = new Map<string, CanonicalTransaction[]>();
  const allOrderIds = new Set<string>();

  for (const o of orders) {
    const oId = o.sourceRecordId;
    allOrderIds.add(oId);
    byOrderId.set(oId, o);

    if (o.transactionReference) {
      const existing = byReference.get(o.transactionReference) ?? [];
      existing.push(o);
      byReference.set(o.transactionReference, existing);
    }
  }

  return {
    byOrderId,
    byReference,
    allOrderIds,
  };
}

/**
 * Finds all candidate settlements matching an order via exact order_id or transaction reference.
 * Deduplicates multiple hits of the same settlement record.
 */
export function findSettlementCandidates(
  order: CanonicalTransaction,
  index: SettlementIndex
): CanonicalTransaction[] {
  const candidateMap = new Map<string, CanonicalTransaction>();

  // 1. Check direct Order ID match
  if (order.orderId) {
    const byId = index.byOrderId.get(order.orderId);
    if (byId) {
      for (const s of byId) {
        candidateMap.set(s.sourceRecordId, s);
      }
    }
  }

  // 2. Check Transaction Reference match
  if (order.transactionReference) {
    const byRef = index.byReference.get(order.transactionReference);
    if (byRef) {
      for (const s of byRef) {
        candidateMap.set(s.sourceRecordId, s);
      }
    }
  }

  return Array.from(candidateMap.values());
}
