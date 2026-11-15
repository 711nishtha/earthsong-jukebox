import { buildCategoryCube, buildGateCube, buildValueCube, cubeIndex } from './cube';
import type { Features, LutData, PixelGate } from './types';

/**
 * What "the value under your finger" means for a track (instrument mode). Uses the same colour
 * cubes as the analysis engine, so the explorer and the soundscape read colours identically.
 */
export type ProbeSpec =
  | {
      kind: 'value';
      /** What is being measured, e.g. "Sea temperature". */
      label: string;
      lut: string;
      gate?: PixelGate;
      maxDistance: number;
      unit: string;
      /** Soft ticks sound when the value crosses these. */
      ticks: number[];
      /** Shown when nothing under the point matches the colour bar (e.g. "land"). */
      empty: string;
      approximate?: boolean;
    }
  | { kind: 'categories'; label: string; lut: string; empty: string }
  | {
      kind: 'gates';
      label: string;
      /** Most specific first. `when` limits a gate to moments where a feature (e.g. the timeline segment) matches. */
      gates: { id: string; label: string; gate: PixelGate; when?: { feature: string; oneOf: number[] } }[];
      empty: string;
    };

export interface ProbeReading {
  /** 0–1 position used for pitch (value within the colour bar, or category slot); null = nothing here. */
  norm: number | null;
  /** Data value (continuous probes only). */
  value: number | null;
  /** Plain words for the reading, e.g. "21 °C", "dust", "no lightning here". */
  text: string;
  /** Which category or gate matched (−1 none), for timbre/ticks. */
  category: number;
  /** Mean brightness 0–1 under the point (drives loudness for categorical probes). */
  brightness: number;
}

export class Probe {
  private valueCube?: Float32Array;
  private catCube?: Int8Array;
  private gateCubes?: Uint8Array[];
  private lut?: Extract<LutData, { kind: 'continuous' }>;
  private catLabels: string[] = [];

  constructor(
    readonly spec: ProbeSpec,
    luts: Record<string, LutData>,
  ) {
    if (spec.kind === 'value') {
      const lut = luts[spec.lut];
      if (lut?.kind !== 'continuous') throw new Error(`probe LUT ${spec.lut} missing`);
      this.lut = lut;
      this.valueCube = buildValueCube(lut, spec.maxDistance, spec.gate);
    } else if (spec.kind === 'categories') {
      const lut = luts[spec.lut];
      if (lut?.kind !== 'categorical') throw new Error(`probe LUT ${spec.lut} missing`);
      this.catCube = buildCategoryCube(lut);
      this.catLabels = lut.categories.map((c) => c.label);
    } else {
      this.gateCubes = spec.gates.map((g) => buildGateCube(g.gate));
      this.catLabels = spec.gates.map((g) => g.label);
    }
  }

  /**
   * Reads a (2r+1)² neighbourhood around pixel (x, y) of RGBA `data` (width w, height h).
   * A neighbourhood, not one pixel, so thin features (flow lines, city dots) are found reliably.
   */
  read(data: Uint8ClampedArray | Uint8Array, w: number, h: number, x: number, y: number, r = 3, features: Features = {}): ProbeReading {
    const s = this.spec;
    // Gates whose `when` condition fails right now are skipped (e.g. "less light" outside the change map).
    const live = s.kind === 'gates' ? s.gates.map((g) => !g.when || g.when.oneOf.includes(Math.round(features[g.when.feature]))) : [];
    const vals: number[] = [];
    const votes = new Float64Array(this.catLabels.length);
    let lum = 0, n = 0;
    for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) {
      for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) {
        const p = (yy * w + xx) * 4;
        const R = data[p], G = data[p + 1], B = data[p + 2];
        lum += (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
        n++;
        const i = cubeIndex(R, G, B);
        if (this.valueCube) {
          const v = this.valueCube[i];
          if (v === v) vals.push(v);
        } else if (this.catCube) {
          const c = this.catCube[i];
          if (c >= 0) votes[c]++;
        } else if (this.gateCubes) {
          // First matching gate wins (gates are listed most specific first).
          const g = this.gateCubes.findIndex((cube, k) => live[k] && cube[i] === 1);
          if (g >= 0) votes[g]++;
        }
      }
    }
    const brightness = n ? lum / n : 0;

    if (s.kind === 'value') {
      if (!vals.length) return { norm: null, value: null, text: s.empty, category: -1, brightness };
      vals.sort((p, q) => p - q);
      const v = vals[vals.length >> 1]; // median: robust to anti-aliased edges
      const lut = this.lut!;
      const norm = (v - lut.min) / (lut.max - lut.min);
      const shown = lut.openEndedMax && v >= lut.max ? `${lut.max} ${s.unit} or more` : `${Math.round(v)} ${s.unit}`;
      return { norm, value: v, text: `${s.approximate ? 'about ' : ''}${shown}`, category: -1, brightness };
    }
    let best = -1, bestVotes = 0;
    votes.forEach((c, k) => {
      if (c > bestVotes) { bestVotes = c; best = k; }
    });
    if (best < 0) return { norm: null, value: null, text: s.empty, category: -1, brightness };
    const slots = this.catLabels.length;
    return { norm: slots > 1 ? best / (slots - 1) : 0.5, value: null, text: this.catLabels[best], category: best, brightness };
  }
}
