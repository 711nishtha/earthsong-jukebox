import type { LutData, PixelGate } from './types';

/**
 * Per-pixel classification is precomputed for every RGB colour quantized to 6 bits per channel
 * (64³ = 262,144 cells). Analysis then costs one array read per pixel instead of an HSV
 * conversion plus a colourbar search, which keeps a tick well under the 5 ms budget.
 */
export const BITS = 6;
const LEVELS = 1 << BITS;
const SHIFT = 8 - BITS;
const STEP = 256 / LEVELS;

export const cubeIndex = (r: number, g: number, b: number): number =>
  ((r >> SHIFT) << (2 * BITS)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);

/** Hue in degrees [0, 360), saturation and value in [0, 1]. */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

export const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export function passesGate(h: number, s: number, v: number, gate: PixelGate | undefined): boolean {
  if (!gate) return true;
  if (gate.minSat !== undefined && s < gate.minSat) return false;
  if (gate.maxSat !== undefined && s > gate.maxSat) return false;
  if (gate.minVal !== undefined && v < gate.minVal) return false;
  if (gate.maxVal !== undefined && v > gate.maxVal) return false;
  if (gate.hue && hueDistance(h, gate.hue.center) > gate.hue.halfWidth) return false;
  return true;
}

/** Calls fn with the centre colour of every cube cell. */
function forEachCell(fn: (i: number, r: number, g: number, b: number) => void): void {
  for (let ri = 0; ri < LEVELS; ri++)
    for (let gi = 0; gi < LEVELS; gi++)
      for (let bi = 0; bi < LEVELS; bi++) {
        const i = (ri << (2 * BITS)) | (gi << BITS) | bi;
        fn(i, ri * STEP + STEP / 2, gi * STEP + STEP / 2, bi * STEP + STEP / 2);
      }
}

/** 1 where the colour passes the gate, else 0. */
export function buildGateCube(gate: PixelGate): Uint8Array {
  const cube = new Uint8Array(LEVELS ** 3);
  forEachCell((i, r, g, b) => {
    const [h, s, v] = rgbToHsv(r, g, b);
    cube[i] = passesGate(h, s, v, gate) ? 1 : 0;
  });
  return cube;
}

/** Data value per colour, or NaN when gated out or too far from the colourbar. */
export function buildValueCube(lut: Extract<LutData, { kind: 'continuous' }>, maxDistance: number, gate?: PixelGate): Float32Array {
  const cube = new Float32Array(LEVELS ** 3);
  const samples = lut.samples;
  const sampleHues = samples.map(([r, g, b]) => rgbToHsv(r, g, b)[0]);
  forEachCell((i, r, g, b) => {
    const [h, s, v] = rgbToHsv(r, g, b);
    if (!passesGate(h, s, v, gate)) {
      cube[i] = NaN;
      return;
    }
    let best = Infinity;
    let value = NaN;
    for (let k = 0; k < samples.length; k++) {
      const d =
        lut.mode === 'hue'
          ? hueDistance(h, sampleHues[k])
          : Math.hypot(r - samples[k][0], g - samples[k][1], b - samples[k][2]);
      if (d < best) {
        best = d;
        value = samples[k][3];
      }
    }
    cube[i] = best <= maxDistance ? value : NaN;
  });
  return cube;
}

/** Category index per colour, or −1. First matching category wins (legend order). */
export function buildCategoryCube(lut: Extract<LutData, { kind: 'categorical' }>): Int8Array {
  const cube = new Int8Array(LEVELS ** 3);
  const gates: PixelGate[] = lut.categories.map((c) => ({
    hue: c.hueHalfWidth !== undefined ? { center: c.hue, halfWidth: c.hueHalfWidth } : undefined,
    minSat: c.minSat,
    maxSat: c.maxSat,
    minVal: c.minVal,
  }));
  forEachCell((i, r, g, b) => {
    const [h, s, v] = rgbToHsv(r, g, b);
    cube[i] = gates.findIndex((gate) => passesGate(h, s, v, gate));
  });
  return cube;
}
