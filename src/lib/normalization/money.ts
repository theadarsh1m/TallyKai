/**
 * TARI — AI Finance Controller
 * Phase 2: Integer Minor Units Money Utilities
 * 
 * Financial calculations must NOT rely on floating-point arithmetic.
 * All internal money values are represented as integer minor units (paise for INR).
 * 1 INR = 100 paise.
 */

/**
 * Converts a standard major currency amount (e.g. ₹2499 or ₹2499.50) into integer minor units (paise).
 * Uses robust float-safe rounding to prevent precision errors (e.g. 2499.5 * 100 -> 249950).
 * 
 * @param amount - Currency amount in major units
 * @returns Integer minor units (paise)
 * @throws Error if amount is NaN or not finite
 */
export function toMinorUnits(amount: number): number {
  if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    throw new Error(`Invalid monetary amount: received ${String(amount)}`);
  }
  // Math.round ensures floating point multiplication (e.g. 19.99 * 100 = 1998.9999999999998) rounds to exact integer
  return Math.round(amount * 100);
}

/**
 * Converts integer minor units (paise) back to a standard major currency amount.
 * 
 * @param minorUnits - Integer minor units (paise)
 * @returns Currency amount in major units (e.g. 249950 -> 2499.50)
 * @throws Error if minorUnits is NaN or not finite
 */
export function fromMinorUnits(minorUnits: number): number {
  if (typeof minorUnits !== "number" || isNaN(minorUnits) || !isFinite(minorUnits)) {
    throw new Error(`Invalid minor units amount: received ${String(minorUnits)}`);
  }
  return Math.round(minorUnits) / 100;
}

/**
 * Formats integer minor units into a human-readable localized currency string.
 * Example: 249900 -> "₹2,499.00"
 * 
 * @param minorUnits - Integer minor units (paise)
 * @param currency - ISO 4217 currency code (default: "INR")
 * @returns Formatted currency string
 */
export function formatCurrency(minorUnits: number, currency = "INR"): string {
  const majorAmount = fromMinorUnits(minorUnits);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorAmount);
  } catch {
    // Fallback in case of unsupported currency locale
    return `${currency.toUpperCase()} ${majorAmount.toFixed(2)}`;
  }
}
