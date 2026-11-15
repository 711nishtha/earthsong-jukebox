import type { MaskSpec, Rect } from './types';

export interface MaskInfo {
  mask: Uint8Array;
  /** Pixels inside the mask. */
  count: number;
  /** Horizontal pixel extent of the mask, so west→east bands span only the analysed area. */
  x0: number;
  x1: number;
}

const inWindow =(t: number, w: { from: number; to: number }) => t >= w.from && t < w.to;

function fill(mask: Uint8Array, w: number, h: number, r: Rect, value: 0 | 1): void {
  const x0 = Math.max(0, Math.floor(r[0] * w));
  const x1 = Math.min(w, Math.ceil(r[2] * w));
  const y0 = Math.max(0, Math.floor(r[1] * h));
  const y1 = Math.min(h, Math.ceil(r[3] * h));
  for (let y = y0; y < y1; y++) mask.fill(value, y * w + x0, y * w + x1);
}

/**
 * Builds 1-byte-per-pixel masks and caches them per set of active time windows,
 * so time-dependent exclusions (pop-out boxes) don't rebuild the mask every frame.
 */
export class MaskCache {
  private cache = new Map<string, MaskInfo>();

  constructor(
    private spec: MaskSpec | undefined,
    private width: number,
    private height: number,
  ) {}

  at(t: number): MaskInfo {
    const excl = this.spec?.exclude ?? [];
    const active = excl.map((e) => !e.when || e.when.some((w) => inWindow(t, w)));
    const key = active.map(Number).join('');
    let hit = this.cache.get(key);
    if (!hit) {
      const { width: w, height: h } = this;
      const mask = new Uint8Array(w * h);
      if (this.spec?.include?.length) for (const r of this.spec.include) fill(mask, w, h, r, 1);
      else mask.fill(1);
      excl.forEach((e, i) => active[i] && fill(mask, w, h, e.rect, 0));
      let count = 0, x0 = w, x1 = -1;
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        count++;
        const x = i % w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
      hit = { mask, count, x0: Math.min(x0, x1), x1: Math.max(x0, x1) };
      this.cache.set(key, hit);
    }
    return hit;
  }
}
