import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Probe } from '../src/analysis/probe';
import type { LutData } from '../src/analysis/types';
import { TRACKS } from '../src/tracks';

const W = 21, H = 21;
function rgba(fill: [number, number, number], spot?: [number, number, [number, number, number]]) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) d.set([...fill, 255], i * 4);
  if (spot) for (let y = spot[1] - 1; y <= spot[1] + 1; y++) for (let x = spot[0] - 1; x <= spot[0] + 1; x++) d.set([...spot[2], 255], (y * W + x) * 4);
  return d;
}
const lut = (n: string) => JSON.parse(readFileSync(`public/luts/${n}.json`, 'utf8')) as LutData;
const track = (id: string) => TRACKS.find((t) => t.id === id)!;

describe('instrument-mode probe', () => {
  it('reads the colour bar value under the point (Ocean Heat), and land as empty', () => {
    const t = track('ocean-heat');
    const p = new Probe(t.probe, { 'ocean-heat': lut('ocean-heat') });
    const bar = (lut('ocean-heat') as Extract<LutData, { kind: 'continuous' }>).samples;
    const red = bar[bar.length - 2]; // near 32 °C
    const r = p.read(rgba([90, 90, 90], [10, 10, [red[0], red[1], red[2]]]), W, H, 10, 10, 1);
    expect(r.value).toBeGreaterThan(28);
    expect(r.text).toMatch(/°C/);
    expect(p.read(rgba([90, 90, 90]), W, H, 10, 10).norm).toBeNull(); // gray land
  });

  it('only reports change-map colours during change segments (City Glow)', () => {
    const t = track('city-glow');
    const p = new Probe(t.probe, {});
    const warm = rgba([10, 10, 10], [10, 10, [230, 170, 90]]); // warm orange-ish light
    const series = p.read(warm, W, H, 10, 10, 1, { 'year.segment': 0 });
    expect(series.text).not.toMatch(/less light/);
    const change = p.read(rgba([10, 10, 10], [10, 10, [235, 140, 60]]), W, H, 10, 10, 1, { 'year.segment': 2 });
    expect(change.text).toMatch(/less light/);
  });
});
