/**
 * TARI — AI Finance Controller
 * Phase 2: Reference Normalization Utilities
 * 
 * Normalizes identifier and reference strings for reliable cross-source matching.
 * Trims surrounding whitespace and removes zero-width/invisible artifacts,
 * while strictly preserving structural hyphens, alphanumeric characters, and exact case/identity.
 */

/**
 * Normalizes transaction, order, customer, or settlement reference strings.
 * 
 * Rules:
 * - Trims accidental leading and trailing whitespace
 * - Strips zero-width characters (e.g. \u200B)
 * - Returns null for null, undefined, or empty string representations
 * - Preserves structural delimiters (hyphens, underscores, dots) to avoid changing identity
 * 
 * @param ref - Raw reference string
 * @returns Cleaned canonical reference string or null if empty
 */
export function normalizeReference(ref: unknown): string | null {
  if (ref === null || ref === undefined) {
    return null;
  }

  if (typeof ref !== "string") {
    // If a number was passed as reference (e.g., numeric ID 100234), convert safely
    if (typeof ref === "number" && !isNaN(ref)) {
      return String(ref);
    }
    return null;
  }

  // Remove zero-width spaces and trim surrounding whitespace
  const cleaned = ref.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

  if (cleaned.length === 0) {
    return null;
  }

  return cleaned;
}
