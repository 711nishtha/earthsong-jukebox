import { describe, expect, it } from 'vitest';
import { rgbToHsv, hueDistance } from '../src/analysis/cube';
import { FeatureEngine, sampleKeyframes } from '../src/analysis/engine';
import { Smoother } from '../src/analysis/smoother';
import type { AnalysisConfig, Frame, LutData } from '../src/analysis/types';

const W = 20, H = 10;

/** Solid frame, optionally painting some pixels another colour. */
function frame(t: number, bg: [number, number, number], paint: [number, number, [number, number, number]][] = []): Frame {
  const data = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) data.set(bg, i * 3);
  for (const [x, y, c] of paint) data.set(c, (y * W + x) * 3);
  return { data, width: W, height: H, channels: 3, t };
}

// A blue→red hue bar, 0–30 units, like the SST colourbar.
const BAR: LutData = {
  kind: 'continuous', mode: 'hue', unit: 'u', min: 0, max: 30, openEndedMax: false,
  samples: Array.from({ length: 31 }, (_, k) => {
    const hue = 240 - (240 * k) / 30; // 240° (blue) → 0° (red)
    const [r, g, b] = hsvToRgb(hue);
    return [r, g, b, k] as [number, number, number, number];
  }),
};

function hsvToRgb(h: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

const cfg = (extractors: AnalysisConfig['extractors'], mask?: AnalysisConfig['mask']): AnalysisConfig => ({
  width: W, height: H, hz: 10, mask, extractors, smoothing: { default: 0 },
});

describe('colour helpers', () => {
  it('converts RGB to HSV', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual([0, 1, 1]);
    expect(rgbToHsv(0, 0, 255)[0]).toBeCloseTo(240);
    expect(rgbToHsv(128, 128, 128)[1]).toBe(0);
  });
  it('measures hue distance around the wheel', () => {
    expect(hueDistance(350, 10)).toBe(20);
  });
});

describe('continuous LUT extractor', () => {
  const engine = new FeatureEngine(
    cfg([{ kind: 'continuous', id: 'v', lut: 'bar', gate: { minSat: 0.3 }, maxDistance: 6, thresholds: { high: 20 } }]),
    { bar: BAR },
  );

  it('recovers the data value behind a colour and ignores gray', () => {
    const c15 = hsvToRgb(240 - 8 * 15); // value 15
    const f = engine.process(frame(0, [90, 90, 90], [[0, 0, c15], [1, 0, c15], [2, 0, c15]]));
    expect(f['v.mean']).toBeCloseTo(15, 0);
    expect(f['v.coverage']).toBeCloseTo(3 / (W * H));
    expect(f['v.high']).toBe(0);
  });

  it('reports NaN when nothing on screen matches the colourbar', () => {
    const f = engine.process(frame(0.1, [90, 90, 90]));
    expect(Number.isNaN(f['v.mean'])).toBe(true);
    expect(f['v.coverage']).toBe(0);
  });
});

describe('gate extractor with onsets and bands', () => {
  const Y: [number, number, number] = [255, 230, 0];
  const make = () => new FeatureEngine(
    cfg([{ kind: 'gate', id: 'g', gate: { hue: { center: 55, halfWidth: 15 }, minSat: 0.5, minVal: 0.4 }, onsets: true, bands: 2 }],
      { include: [[0, 0, 0.5, 1]] }),
    {},
  );

  it('counts new pixels as onsets but not on the first frame or after a seek', () => {
    const e = make();
    expect(e.process(frame(0, [0, 0, 0], [[1, 1, Y]]))['g.onsets']).toBe(0);
    const f = e.process(frame(0.1, [0, 0, 0], [[1, 1, Y], [3, 3, Y]]));
    expect(f['g.onsets']).toBeCloseTo(1 / (W * H / 2));
    // Seek backwards: no phantom burst.
    expect(e.process(frame(0.0, [0, 0, 0], [[5, 5, Y], [6, 6, Y]]))['g.onsets']).toBe(0);
  });

  it('splits bands across the masked area, not the whole frame', () => {
    const e = make();
    // Mask = left half (x 0–9). Band 1 = x 5–9.
    const f = e.process(frame(0, [0, 0, 0], [[7, 2, Y], [15, 2, Y]]));
    expect(f['g.band0']).toBe(0);
    expect(f['g.band1']).toBeCloseTo(1 / 50);
    expect(f['g.share']).toBeCloseTo(1 / 100); // x=15 is outside the mask
  });
});

describe('time-dependent masks', () => {
  it('excludes a box only during its window', () => {
    const e = new FeatureEngine(
      cfg([{ kind: 'gate', id: 'g', gate: { minVal: 0.5 } }], { exclude: [{ rect: [0, 0, 0.5, 1], when: [{ from: 10, to: 20 }] }] }),
      {},
    );
    expect(e.process(frame(0, [255, 255, 255]))['g.share']).toBe(1);
    expect(e.process(frame(15, [255, 255, 255]))['g.share']).toBe(1); // share of the *remaining* area
    const before = e.process(frame(0, [0, 0, 0], [[0, 0, [255, 255, 255]]]))['g.share'];
    const during = e.process(frame(15, [0, 0, 0], [[0, 0, [255, 255, 255]]]))['g.share'];
    expect(before).toBeGreaterThan(0);
    expect(during).toBe(0);
  });
});

describe('timeline + smoothing', () => {
  it('samples keyframes', () => {
    const kf: [number, number][] = [[0, 2012], [1, 2013], [3, 2015]];
    expect(sampleKeyframes(kf, 0.5, 'step')).toBe(2012);
    expect(sampleKeyframes(kf, 2, 'linear')).toBe(2014);
    expect(sampleKeyframes(kf, 99, 'linear')).toBe(2015);
  });

  it('EMA converges with time constant and holds through NaN', () => {
    const s = new Smoother(1);
    s.step({ x: 0 }, 0);
    const after1 = s.step({ x: 1 }, 1)['x'];
    expect(after1).toBeCloseTo(1 - Math.exp(-1), 5);
    expect(s.step({ x: NaN }, 1.1)['x']).toBeCloseTo(after1, 5);
  });
});
