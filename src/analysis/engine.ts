import { buildCategoryCube, buildGateCube, buildValueCube, cubeIndex } from './cube';
import { MaskCache } from './mask';
import type {
  AnalysisConfig,
  CategoriesSpec,
  ContinuousSpec,
  ExtractorSpec,
  Features,
  Frame,
  GateSpec,
  LutData,
  MotionSpec,
  RegionsSpec,
  ScanSpec,
  TimelineSpec,
} from './types';

/** Histogram resolution for percentiles of continuous values. */
const HIST_BINS = 128;
/** A sample this far from the previous one (or backwards) is a seek: drop frame-to-frame state. */
const SEEK_GAP_SEC = 0.75;

interface Shared {
  /** Per-pixel cube index, computed once per frame and shared by every extractor. */
  idx: Uint32Array;
  /** Rec. 709 luma 0–1. */
  lum: Float32Array;
  w: number;
  h: number;
  t: number;
  /**
   * Seconds since the previous sample (0 after a reset). Frame-to-frame features divide by it so
   * they are per-second rates: identical at the live 15 Hz and at any export rate.
   */
  dt: number;
}

type Extractor = { run(f: Shared, out: Features): void; reset(): void };

/**
 * Pure, DOM-free feature extraction. The browser feeds it canvas pixels; the precompute
 * script feeds it ffmpeg frames, so live and exported sound come from the same math.
 */
export class FeatureEngine {
  private extractors: Extractor[];
  private shared: Shared;
  private lastT = -Infinity;

  constructor(
    readonly config: AnalysisConfig,
    luts: Record<string, LutData>,
  ) {
    const { width: w, height: h } = config;
    this.shared = { idx: new Uint32Array(w * h), lum: new Float32Array(w * h), w, h, t: 0, dt: 0 };
    this.extractors = config.extractors.map((spec) => makeExtractor(spec, config, luts));
  }

  process(frame: Frame): Features {
    const { w, h, idx, lum } = this.shared;
    if (frame.width !== w || frame.height !== h) {
      throw new Error(`frame ${frame.width}×${frame.height} ≠ analysis size ${w}×${h}`);
    }
    const seek = frame.t <= this.lastT || frame.t - this.lastT > SEEK_GAP_SEC;
    if (seek) this.extractors.forEach((e) => e.reset());
    this.shared.dt = seek ? 0 : frame.t - this.lastT;
    this.lastT = frame.t;
    this.shared.t = frame.t;

    const d = frame.data;
    const c = frame.channels;
    for (let i = 0, p = 0; i < w * h; i++, p += c) {
      const r = d[p], g = d[p + 1], b = d[p + 2];
      idx[i] = cubeIndex(r, g, b);
      lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    const out: Features = {};
    for (const e of this.extractors) e.run(this.shared, out);
    return out;
  }

  reset(): void {
    this.lastT = -Infinity;
    this.extractors.forEach((e) => e.reset());
  }
}

function lutOf<K extends LutData['kind']>(luts: Record<string, LutData>, name: string, kind: K) {
  const lut = luts[name];
  if (!lut || lut.kind !== kind) throw new Error(`LUT "${name}" missing or not ${kind}`);
  return lut as Extract<LutData, { kind: K }>;
}

function makeExtractor(spec: ExtractorSpec, cfg: AnalysisConfig, luts: Record<string, LutData>): Extractor {
  const masks = new MaskCache(spec.mask ?? cfg.mask, cfg.width, cfg.height);
  switch (spec.kind) {
    case 'continuous':
      return continuous(spec, masks, lutOf(luts, spec.lut, 'continuous'));
    case 'scan':
      return scan(spec, masks, lutOf(luts, spec.lut, 'continuous'));
    case 'categories':
      return categories(spec, masks, lutOf(luts, spec.lut, 'categorical'));
    case 'gate':
      return gate(spec, masks);
    case 'regions':
      return regions(spec, masks);
    case 'motion':
      return motion(spec, masks);
    case 'timeline':
      return timeline(spec);
  }
}

const noReset = () => {};

function continuous(spec: ContinuousSpec, masks: MaskCache, lut: Extract<LutData, { kind: 'continuous' }>): Extractor {
  const cube = buildValueCube(lut, spec.maxDistance, spec.gate);
  const hist = new Uint32Array(HIST_BINS);
  const span = lut.max - lut.min;
  const thr = Object.entries(spec.thresholds ?? {});
  const bins = Object.entries(spec.bins ?? {});
  return {
    reset: noReset,
    run({ idx, w, h, t }, out) {
      const { mask, count } = masks.at(t);
      hist.fill(0);
      const thrN = new Float64Array(thr.length);
      const thrY = new Float64Array(thr.length);
      const binN = new Float64Array(bins.length);
      let n = 0, sum = 0, sx = 0;
      for (let y = 0, i = 0; y < h; y++) {
        for (let x = 0; x < w; x++, i++) {
          if (!mask[i]) continue;
          const v = cube[idx[i]];
          if (v !== v) continue; // NaN: not on the colourbar
          n++;
          sum += v;
          sx += x;
          hist[Math.min(HIST_BINS - 1, Math.floor(((v - lut.min) / span) * HIST_BINS))]++;
          for (let k = 0; k < thr.length; k++) if (v >= thr[k][1]) { thrN[k]++; thrY[k] += y; }
          for (let k = 0; k < bins.length; k++) if (v >= bins[k][1][0] && v < bins[k][1][1]) binN[k]++;
        }
      }
      const p = spec.id;
      out[`${p}.coverage`] = count ? n / count : 0;
      out[`${p}.mean`] = n ? sum / n : NaN;
      out[`${p}.cx`] = n ? sx / n / (w - 1) : 0.5;
      out[`${p}.p`] = n ? percentile(hist, n, spec.percentile ?? 50, lut.min, span) : NaN;
      thr.forEach(([name], k) => {
        out[`${p}.${name}`] = n ? thrN[k] / n : 0;
        out[`${p}.${name}Cy`] = thrN[k] ? thrY[k] / thrN[k] / (h - 1) : 0.5;
      });
      bins.forEach(([name], k) => (out[`${p}.${name}`] = n ? binN[k] / n : 0));
    },
  };
}

function percentile(hist: Uint32Array, n: number, pct: number, min: number, span: number): number {
  const target = (pct / 100) * n;
  let acc = 0;
  for (let k = 0; k < hist.length; k++) {
    acc += hist[k];
    if (acc >= target) return min + ((k + 0.5) / hist.length) * span;
  }
  return min + span;
}

function scan(spec: ScanSpec, masks: MaskCache, lut: Extract<LutData, { kind: 'continuous' }>): Extractor {
  const cube = buildValueCube(lut, spec.maxDistance, spec.gate);
  const hist = new Uint32Array(HIST_BINS);
  const span = lut.max - lut.min;
  return {
    reset: noReset,
    run({ idx, w, h, t }, out) {
      const { mask } = masks.at(t);
      const pos = (t / spec.periodSec) % 1;
      const half = Math.max(1, Math.round((spec.bandWidth * w) / 2));
      const xc = Math.round(pos * (w - 1));
      hist.fill(0);
      let n = 0, cells = 0, sy = 0;
      for (let y = 0; y < h; y++) {
        for (let x = Math.max(0, xc - half); x <= Math.min(w - 1, xc + half); x++) {
          const i = y * w + x;
          if (!mask[i]) continue;
          cells++;
          const v = cube[idx[i]];
          if (v !== v) continue;
          n++;
          sy += y;
          hist[Math.min(HIST_BINS - 1, Math.floor(((v - lut.min) / span) * HIST_BINS))]++;
        }
      }
      out[`${spec.id}.x`] = pos;
      out[`${spec.id}.coverage`] = cells ? n / cells : 0;
      out[`${spec.id}.value`] = n ? percentile(hist, n, 50, lut.min, span) : NaN;
      out[`${spec.id}.cy`] = n ? sy / n / (h - 1) : 0.5;
    },
  };
}

function categories(spec: CategoriesSpec, masks: MaskCache, lut: Extract<LutData, { kind: 'categorical' }>): Extractor {
  const cube = buildCategoryCube(lut);
  const k = lut.categories.length;
  return {
    reset: noReset,
    run({ idx, lum, w, t }, out) {
      const { mask, count } = masks.at(t);
      const n = new Float64Array(k), lv = new Float64Array(k), sx = new Float64Array(k);
      for (let i = 0; i < idx.length; i++) {
        if (!mask[i]) continue;
        const c = cube[idx[i]];
        if (c < 0) continue;
        n[c]++;
        lv[c] += lum[i];
        sx[c] += i % w;
      }
      lut.categories.forEach((cat, c) => {
        const p = `${spec.id}.${cat.id}`;
        out[p] = count ? n[c] / count : 0;
        out[`${p}Lum`] = n[c] ? lv[c] / n[c] : 0;
        out[`${p}Cx`] = n[c] ? sx[c] / n[c] / (w - 1) : 0.5;
      });
    },
  };
}

function gate(spec: GateSpec, masks: MaskCache): Extractor {
  const cube = buildGateCube(spec.gate);
  const bands = spec.bands ?? 0;
  // Two reusable bitmaps swapped each tick: no per-frame allocation, no GC pauses in the audio path.
  let cur: Uint8Array | null = null;
  let prev: Uint8Array | null = null;
  let hasPrev = false;
  return {
    reset: () => (hasPrev = false),
    run({ idx, lum, w, h, t, dt }, out) {
      const { mask, count, x0, x1 } = masks.at(t);
      const bandSpan = x1 - x0 + 1;
      if (!cur || cur.length !== w * h) {
        cur = new Uint8Array(w * h);
        prev = new Uint8Array(w * h);
        hasPrev = false;
      }
      const bandHit = new Float64Array(bands), bandN = new Float64Array(bands);
      let n = 0, sx = 0, sy = 0, sl = 0, on = 0, ox = 0, oy = 0;
      for (let y = 0, i = 0; y < h; y++) {
        for (let x = 0; x < w; x++, i++) {
          const hit = mask[i] && cube[idx[i]] ? 1 : 0;
          cur[i] = hit;
          if (!mask[i]) continue;
          if (bands) {
            const b = Math.min(bands - 1, Math.floor(((x - x0) / bandSpan) * bands));
            bandN[b]++;
            bandHit[b] += hit;
          }
          if (!hit) continue;
          n++; sx += x; sy += y; sl += lum[i];
          if (hasPrev && !prev![i]) { on++; ox += x; oy += y; }
        }
      }
      const p = spec.id;
      out[`${p}.share`] = count ? n / count : 0;
      out[`${p}.cx`] = n ? sx / n / (w - 1) : 0.5;
      out[`${p}.cy`] = n ? sy / n / (h - 1) : 0.5;
      out[`${p}.lum`] = n ? sl / n : 0;
      // Share of each west→east band's pixels that pass the gate.
      for (let b = 0; b < bands; b++) out[`${p}.band${b}`] = bandN[b] ? bandHit[b] / bandN[b] : 0;
      if (spec.onsets) {
        // Share of the area newly lit, per second. Without a previous frame (start or after a seek)
        // report no onsets rather than a burst.
        out[`${p}.onsets`] = hasPrev && count && dt > 0 ? on / count / dt : 0;
        out[`${p}.onsetCx`] = on ? ox / on / (w - 1) : 0.5;
        out[`${p}.onsetCy`] = on ? oy / on / (h - 1) : 0.5;
      }
      [cur, prev] = [prev, cur];
      hasPrev = true;
    },
  };
}

function regions(spec: RegionsSpec, masks: MaskCache): Extractor {
  const cube = buildGateCube(spec.gate);
  const entries = Object.entries(spec.regions);
  return {
    reset: noReset,
    run({ idx, lum, w, h, t }, out) {
      const { mask } = masks.at(t);
      for (const [name, r] of entries) {
        const x0 = Math.floor(r[0] * w), x1 = Math.ceil(r[2] * w);
        const y0 = Math.floor(r[1] * h), y1 = Math.ceil(r[3] * h);
        let cells = 0, n = 0, sl = 0;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const i = y * w + x;
            if (!mask[i]) continue;
            cells++;
            sl += lum[i];
            if (cube[idx[i]]) n++;
          }
        out[`${spec.id}.${name}`] = cells ? n / cells : 0;
        out[`${spec.id}.${name}Lum`] = cells ? sl / cells : 0;
      }
    },
  };
}

function motion(spec: MotionSpec, masks: MaskCache): Extractor {
  let prev: Float32Array | null = null;
  let hasPrev = false;
  return {
    reset: () => (hasPrev = false),
    run({ lum, t, dt }, out) {
      const { mask, count } = masks.at(t);
      if (!prev || prev.length !== lum.length) {
        prev = new Float32Array(lum.length);
        hasPrev = false;
      }
      let s = 0;
      if (hasPrev) for (let i = 0; i < lum.length; i++) if (mask[i]) s += Math.abs(lum[i] - prev[i]);
      // Mean luminance change per second.
      out[`${spec.id}.amount`] = hasPrev && count && dt > 0 ? s / count / dt : 0;
      prev.set(lum);
      hasPrev = true;
    },
  };
}

function timeline(spec: TimelineSpec): Extractor {
  const kf = [...spec.keyframes].sort((a, b) => a[0] - b[0]);
  return {
    reset: noReset,
    run({ t }, out) {
      out[`${spec.id}.value`] = sampleKeyframes(kf, t, spec.interpolate);
      if (spec.segments) out[`${spec.id}.segment`] = spec.segments.findIndex((s) => t >= s.from && t < s.to);
    },
  };
}

export function sampleKeyframes(kf: [number, number][], t: number, mode: 'step' | 'linear'): number {
  if (!kf.length) return NaN;
  if (t <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    if (t < kf[i][0]) {
      if (mode === 'step') return kf[i - 1][1];
      const [t0, v0] = kf[i - 1], [t1, v1] = kf[i];
      return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
    }
  }
  return kf[kf.length - 1][1];
}
