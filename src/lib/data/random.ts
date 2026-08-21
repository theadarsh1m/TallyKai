/**
 * Tallykai — Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% deterministic reproducibility across dataset generation runs.
 */

export class SeededRandom {
  private s: number;

  constructor(seed: number = 42) {
    this.s = seed >>> 0;
  }

  /** Returns pseudo-random float in range [0, 1) */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns integer in inclusive range [min, max] */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Selects random element from array */
  choice<T>(items: readonly T[]): T {
    const idx = this.int(0, items.length - 1);
    return items[idx];
  }

  /** Selects item based on array of weights */
  weightedChoice<T>(items: readonly { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let r = this.next() * totalWeight;
    for (const entry of items) {
      if (r < entry.weight) return entry.item;
      r -= entry.weight;
    }
    return items[items.length - 1].item;
  }

  /** Generates realistic Indian transaction amounts in INR */
  amount(): number {
    const realisticTiers = [
      199, 299, 399, 499, 599, 799, 899, 999,
      1299, 1499, 1799, 1999, 2499, 2999, 3499, 3999,
      4999, 5999, 7999, 8999, 9999, 12999, 14999, 19999, 24999,
    ];
    return this.choice(realisticTiers);
  }

  /** Generates random alpha-numeric reference string */
  reference(prefix: string = "WEB"): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < 5; i++) {
      res += chars[this.int(0, chars.length - 1)];
    }
    return `${prefix}-${res}`;
  }

  /** Generates random customer ID */
  customerId(): string {
    const num = this.int(100, 9999);
    return `CUS-${num.toString().padStart(5, "0")}`;
  }

  /** Generates ISO 8601 timestamp between startDate and endDate */
  timestamp(startDate: Date, endDate: Date): string {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const t = startTime + this.next() * (endTime - startTime);
    return new Date(t).toISOString();
  }

  /** Adds specified offset to an ISO timestamp string */
  addOffset(
    isoStr: string,
    days: number,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0
  ): string {
    const d = new Date(isoStr);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(d.getUTCHours() + hours);
    d.setUTCMinutes(d.getUTCMinutes() + minutes);
    d.setUTCSeconds(d.getUTCSeconds() + seconds);
    return d.toISOString();
  }
}
