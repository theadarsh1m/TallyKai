/**
 * TARI — AI Finance Controller
 * Phase 2: Date & Timestamp Normalization Utilities
 * 
 * Standardizes raw date/time strings and timestamps into canonical ISO 8601 UTC strings.
 */

/**
 * Normalizes any supported date representation into a canonical ISO 8601 UTC string.
 * Supports:
 * - Standard ISO 8601 strings (e.g., "2026-08-01T10:32:14.647Z")
 * - Slash formats like "DD/MM/YYYY hh:mm A" or "DD/MM/YYYY HH:mm:ss" (e.g. "01/08/2026 10:32 AM")
 * - SQL style formats like "YYYY-MM-DD HH:mm:ss"
 * - Date instances
 * - Numeric unix timestamps (milliseconds)
 * 
 * @param input - Raw timestamp input
 * @returns Standard ISO 8601 UTC string (e.g. "2026-08-01T10:32:14.000Z") or null if invalid
 */
export function normalizeTimestamp(input: unknown): string | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  // If already a Date object
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input.toISOString();
  }

  // If numeric unix timestamp (in ms or seconds)
  if (typeof input === "number") {
    if (isNaN(input) || !isFinite(input) || input <= 0) {
      return null;
    }
    // If likely in seconds (< 10^11), convert to milliseconds
    const ms = input < 10000000000 ? input * 1000 : input;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof input !== "string") {
    return null;
  }

  const str = input.trim();
  if (!str) {
    return null;
  }

  // Check for Indian / UK date format: DD/MM/YYYY [HH:mm[:ss] [AM|PM]]
  const dmyMatch = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?)?$/
  );

  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    const year = parseInt(dmyMatch[3], 10);
    let hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const meridiem = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null;

    if (meridiem === "PM" && hours < 12) {
      hours += 12;
    } else if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    const parsedDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    // Sanity check: Ensure date components match to catch impossible dates like 31/02/2026
    if (
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month &&
      parsedDate.getUTCDate() === day
    ) {
      return parsedDate.toISOString();
    }
    return null;
  }

  // Standard Date.parse for ISO 8601, RFC2822, and other standard formats
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const date = new Date(parsed);
    return date.toISOString();
  }

  return null;
}

/**
 * Checks whether the given input can be successfully parsed into a valid timestamp.
 */
export function isValidTimestamp(input: unknown): boolean {
  return normalizeTimestamp(input) !== null;
}
