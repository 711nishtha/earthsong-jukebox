/** Small plain-language helpers for live captions (grade-8 reading level, short sentences). */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** First day (0-based day of year) of each month, non-leap; one day of leap-year error is fine for captions. */
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** Decimal year (year + dayOfYear0/365) → month index 0–11. */
function monthIndex(decimalYear: number): number {
  const day = (decimalYear - Math.floor(decimalYear)) * 365 + 1e-6;
  let m = 0;
  while (m < 11 && day >= MONTH_START[m + 1]) m++;
  return m;
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

/** Share 0–1 → "0.42%" / "11.7%" (keeps small shares readable). */
export function pctFine(x: number): string {
  if (!Number.isFinite(x)) return '—';
  const p = x * 100;
  return `${p < 1 ? p.toFixed(2) : p.toFixed(1)}%`;
}

/** Vertical position on an equirectangular map (0 top … 1 bottom) → "8° N" / "3° S". */
export function latitude(y: number): string {
  const lat = 90 - 180 * y;
  return `${Math.abs(Math.round(lat))}° ${lat >= 0 ? 'N' : 'S'}`;
}
