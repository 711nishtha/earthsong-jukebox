import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluate, MAX_VELOCITY, Sequencer } from '../src/audio/mapping';
import { noteToMidi, positionToHz, scaleNotes } from '../src/audio/scales';
import type { SoundSpec } from '../src/audio/types';
import { TRACKS } from '../src/tracks';

const spec: SoundSpec = {
  tonic: 'D', scale: 'dorian', mood: '',
  layers: [
    { id: 'm', label: 'm', kind: 'mallet', description: '', fidelity: 'data-tested', gainDb: -10, range: ['D3', 'D5'], pattern: 'value', maxRate: 4 },
    { id: 'p', label: 'p', kind: 'pad', description: '', fidelity: 'artistic', gainDb: -20, notes: ['D2', 'A2'] },
  ],
  bindings: [
    { feature: 'v', in: [0, 32], target: 'm.note', out: [0, 1], visual: '', measured: '', audio: '', range: '', fidelity: 'data-tested', why: '' },
    { feature: 'r', in: [0, 1], target: 'm.rate', out: [0, 20], visual: '', measured: '', audio: '', range: '', fidelity: 'visual', why: '' },
    { feature: 'g', in: [0, 1], target: 'p.tone1Db', out: [-30, 0], when: { feature: 'seg', oneOf: [2] }, visual: '', measured: '', audio: '', range: '', fidelity: 'data-relative', why: '' },
  ],
};

describe('scales', () => {
  it('parses notes', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(noteToMidi('F#6')).toBe(90);
  });
  it('builds scale notes in range', () => {
    expect(scaleNotes('D', 'dorian', 'D3', 'D4')).toEqual([50, 52, 53, 55, 57, 59, 60, 62]);
  });
  it('maps position → pitch monotonically in both modes', () => {
    const notes = scaleNotes('D', 'dorian', 'D3', 'D6');
    for (const mode of ['musical', 'data'] as const) {
      let prev = 0;
      for (let p = 0; p <= 1.0001; p += 0.01) {
        const hz = positionToHz(p, notes, mode);
        expect(hz).toBeGreaterThanOrEqual(prev);
        prev = hz;
      }
    }
  });
});

describe('evaluate', () => {
  it('maps, clamps, and rests on NaN / inactive conditions', () => {
    const c = evaluate(spec, { v: 16, r: 0.5, g: 1, seg: 0 });
    expect(c.m.note).toBeCloseTo(0.5);
    expect(c.m.rate).toBe(10);
    expect(c.p.tone1Db).toBe(-Infinity); // seg ≠ 2
    expect(evaluate(spec, { v: 99, r: NaN, g: 1, seg: 2 }).m.note).toBe(1);
    expect(evaluate(spec, { v: 99, r: NaN, g: 1, seg: 2 }).m.rate).toBe(0);
    expect(evaluate(spec, { v: 0, r: 0, g: 1, seg: 2 }).p.tone1Db).toBe(0);
  });
});

describe('Sequencer', () => {
  it('caps the rate and keeps offsets inside the tick', () => {
    const seq = new Sequencer(spec, 'musical');
    let n = 0;
    for (let i = 0; i < 100; i++) {
      const ev = seq.step(evaluate(spec, { v: 16, r: 1, g: 0, seg: 0 }), {}, 0.1); // asks for 20/s
      for (const e of ev) {
        expect(e.offset).toBeGreaterThanOrEqual(0);
        expect(e.offset).toBeLessThan(0.1);
        expect(e.velocity).toBeLessThanOrEqual(MAX_VELOCITY);
      }
      n += ev.length;
    }
    expect(n).toBeGreaterThanOrEqual(39); // 10 s at the 4/s cap
    expect(n).toBeLessThanOrEqual(41);
  });

  it('is deterministic', () => {
    const run = () => {
      const s = new Sequencer(spec, 'musical');
      return Array.from({ length: 50 }, (_, i) => s.step(evaluate(spec, { v: i % 32, r: 0.2, g: 0, seg: 0 }), {}, 1 / 15)).flat();
    };
    expect(run()).toEqual(run());
  });

  it('stays silent when the layer is muted by data', () => {
    const s = new Sequencer(spec, 'musical');
    const c = evaluate(spec, { v: 1, r: 1 });
    c.m.gainDb = -Infinity;
    expect(s.step(c, {}, 1)).toEqual([]);
  });
});

describe('Ocean Heat event log follows the data', () => {
  it('scan note pitch rises with scan temperature (rank correlation > 0.95)', () => {
    const t = TRACKS.find((x) => x.id === 'ocean-heat')!;
    const ft = JSON.parse(readFileSync('public/features/ocean-heat.json', 'utf8')) as { hz: number; names: string[]; rows: (number | null)[][] };
    const seq = new Sequencer(t.sound, 'data'); // data mode: unquantized, so ties don't hide errors
    const pairs: [number, number][] = [];
    const k = ft.names.indexOf('scan.value');
    for (const row of ft.rows) {
      const f = Object.fromEntries(ft.names.map((n, j) => [n, row[j] ?? NaN]));
      for (const e of seq.step(evaluate(t.sound, f), f, 1 / ft.hz)) if (e.layer === 'scan') pairs.push([row[k]!, e.hz]);
    }
    expect(pairs.length).toBeGreaterThan(200);
    const rank = (xs: number[]) => {
      const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
      const r = new Array<number>(xs.length);
      idx.forEach(([, i], pos) => (r[i] = pos));
      return r;
    };
    const ra = rank(pairs.map((p) => p[0])), rb = rank(pairs.map((p) => p[1]));
    const n = pairs.length;
    const d2 = ra.reduce((s, r, i) => s + (r - rb[i]) ** 2, 0);
    expect(1 - (6 * d2) / (n * (n * n - 1))).toBeGreaterThan(0.95);
  });
});

describe('track sound specs', () => {
  for (const t of TRACKS) {
    it(`${t.id}: every binding names a real feature and layer`, () => {
      const feat = JSON.parse(readFileSync(`public/features/${t.id}.json`, 'utf8')) as { names: string[] };
      const layers = new Set(t.sound.layers.map((l) => l.id));
      for (const b of t.sound.bindings) {
        expect(feat.names, b.feature).toContain(b.feature);
        if (b.when) expect(feat.names, b.when.feature).toContain(b.when.feature);
        expect(layers, b.target).toContain(b.target.split('.')[0]);
        const layer = t.sound.layers.find((l) => l.id === b.target.split('.')[0])!;
        const tone = /^tone(\d+)Db$/.exec(b.target.split('.')[1]);
        if (tone) expect(Number(tone[1]), b.target).toBeLessThan(layer.notes?.length ?? 0);
      }
      for (const ct of t.sound.changeTriggers ?? []) {
        expect(feat.names).toContain(ct.feature);
        expect(layers).toContain(ct.layer);
      }
    });

    it(`${t.id}: whole precomputed track produces sane controls and events`, () => {
      const feat = JSON.parse(readFileSync(`public/features/${t.id}.json`, 'utf8')) as { hz: number; names: string[]; rows: (number | null)[][] };
      const seq = new Sequencer(t.sound, 'musical');
      let events = 0;
      for (const row of feat.rows) {
        const f = Object.fromEntries(feat.names.map((n, k) => [n, row[k] ?? NaN]));
        const c = evaluate(t.sound, f);
        for (const [id, p] of Object.entries(c)) {
          for (const [k, v] of Object.entries(p)) {
            if (k === 'gainDb' || k.startsWith('tone')) expect(v === -Infinity || (v! <= 0 && v! >= -80), `${id}.${k}=${v}`).toBe(true);
            else if (v !== undefined) expect(Number.isFinite(v), `${id}.${k}=${v}`).toBe(true);
          }
        }
        const ev = seq.step(c, f, 1 / feat.hz);
        events += ev.length;
        for (const e of ev) expect(e.hz).toBeGreaterThan(30);
      }
      // Every track must actually make notes or audible sustained layers; triggered tracks should be busy.
      if (t.sound.layers.some((l) => l.kind !== 'pad' && l.kind !== 'noise')) expect(events).toBeGreaterThan(10);
    });
  }
});

describe('activity (visual reactivity from data)', async () => {
  const { activity } = await import('../src/audio/mapping');
  it('is 0–1, rises with the data, and ignores inactive bindings', () => {
    expect(activity(spec, { r: 0, g: 0, seg: 0 })).toBe(0);
    expect(activity(spec, { r: 1, g: 1, seg: 0 })).toBe(1); // g's binding is inactive (seg ≠ 2)
    expect(activity(spec, { r: 0.5, g: 0, seg: 2 })).toBeCloseTo(0.25);
  });
});
