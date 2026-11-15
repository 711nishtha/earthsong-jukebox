import type { Features } from './types';

/**
 * Time-based exponential moving average, so smoothing feels the same at any sample rate
 * (live ~15 Hz, precompute 10 Hz). NaN inputs ("nothing on screen") hold the last value.
 */
export class Smoother {
  private state: Features = {};
  private lastT = NaN;

  constructor(
    private defaultTau: number,
    private perFeature: Record<string, number> = {},
  ) {}

  step(raw: Features, t: number): Features {
    const dt = Number.isFinite(this.lastT) && t > this.lastT ? t - this.lastT : 0;
    this.lastT = t;
    const out: Features = {};
    for (const [k, v] of Object.entries(raw)) {
      const tau = this.perFeature[k] ?? this.defaultTau;
      const prev = this.state[k];
      if (Number.isNaN(v)) {
        out[k] = prev ?? NaN;
        continue;
      }
      // First sample, seek (dt=0) or unsmoothed feature: take the value as is.
      const next = tau <= 0 || dt === 0 || prev === undefined || Number.isNaN(prev) ? v : prev + (1 - Math.exp(-dt / tau)) * (v - prev);
      this.state[k] = next;
      out[k] = next;
    }
    return out;
  }

  reset(): void {
    this.state = {};
    this.lastT = NaN;
  }
}
