/** Small plain-language helpers for live captions (grade-8 reading level, short sentences). */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Decimal year → month index 0–11. The small tolerance absorbs day-of-year rounding:
 * 1 March is 59/365 = 0.1616 of a year, just under 2/12, and should still read as March.
 */
function monthIndex(decimalYear: number): number {
  const frac = decimalYear - Math.floor(decimalYear);
  return Math.min(11, Math.max(0, Math.floor(frac * 12 + 0.1))); // +0.1 month ≈ 3 days
}

/** Decimal year → "June 2007". */
export function monthYear(decimalYear: number): string {
  return `${MONTHS[monthIndex(decimalYear)]} ${Math.floor(decimalYear)}`;
}

/** Decimal year → northern-hemisphere season word. */
export function season(decimalYear: number): string {
  return ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][monthIndex(decimalYear)];
}

/** Horizontal position 0–1 → "on the left", "in the middle", "on the right". */
export function side(x: number): string {
  if (!Number.isFinite(x)) return 'across the view';
  return x < 0.4 ? 'on the left' : x > 0.6 ? 'on the right' : 'in the middle';
}

/** Share 0–1 → "3%" (or "under 1%"). */
export function pct(x: number): string {
  if (!Number.isFinite(x) || x <= 0) return '0%';
  const p = x * 100;
  return p < 1 ? 'under 1%' : `${Math.round(p)}%`;
}

/** Normalized level within [lo, hi] → "low" / "medium" / "high". */
export function level(x: number, lo: number, hi: number): 'low' | 'medium' | 'high' {
  const t = (x - lo) / (hi - lo);
  return !(t > 0.33) ? 'low' : t < 0.66 ? 'medium' : 'high';
}

export interface Caption {
  /** One short sentence: what changes now, cause → sound. */
  brief: string;
  /** Two or three sentences with numbers, for "detailed" narration. */
  detailed: string;
}
