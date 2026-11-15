/**
 * Fidelity metrics: how faithfully does the SOUND follow the DATA, end to end?
 *
 * Reference ("the data"): each feature measured from the video frames at 2× the analysis
 * resolution with no smoothing (an independent, finer measurement of the same colour-bar value).
 * Output ("the sound"): what the shipped pipeline actually produces from the normal analysis
 * (normal resolution, smoothing, scale quantization, sequencer): emitted note frequencies for
 * pitch mappings, and control values (dB, notes/s) for loudness and rate mappings.
 * We report Pearson r and Spearman ρ between the two, per data mapping. Visual/artistic
 * mappings are excluded: they make no data claim.
 *
 *   npx vite-node scripts/fidelity.ts   ->  public/fidelity.json, docs/fidelity.md
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FeatureEngine } from '../src/analysis/engine';
import type { Features, LutData } from '../src/analysis/types';
import { evaluate, isActive, Sequencer } from '../src/audio/mapping';
import { rowFeatures, type FeatureTrack } from '../src/audio/render';
import { FIDELITY_LABEL } from '../src/audio/fidelity';
import { TRACKS } from '../src/tracks';
import type { TrackConfig } from '../src/tracks/types';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');
const REF_SCALE = 2;
const REF_HZ = 5; // reference sampling rate (frames per second of video)

async function* frames(video: string, w: number, h: number, hz: number): AsyncGenerator<Uint8Array> {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=${hz},scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const size = w * h * 3;
  let buf = Buffer.alloc(0);
  for await (const chunk of ff.stdout) {
    buf = Buffer.concat([buf, chunk as Buffer]);
    while (buf.length >= size) {
      yield new Uint8Array(buf.subarray(0, size));
      buf = buf.subarray(size);
    }
  }
}

function pearson(x: number[], y: number[]): number {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}
const ranks = (v: number[]) => {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(v.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2; // average ranks for ties
    i = j + 1;
  }
  return r;
};
const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y));

/** Reference features: 2× resolution, unsmoothed, sampled at REF_HZ. */
async function reference(t: TrackConfig): Promise<{ t: number; f: Features }[]> {
  const luts = Object.fromEntries(t.luts.map((n) => [n, JSON.parse(readFileSync(join(PUBLIC, 'luts', `${n}.json`), 'utf8')) as LutData]));
  const a = { ...t.analysis, width: t.analysis.width * REF_SCALE, height: t.analysis.height * REF_SCALE };
  const engine = new FeatureEngine(a, luts);
  const out: { t: number; f: Features }[] = [];
  let i = 0;
  for await (const data of frames(join(PUBLIC, t.video), a.width, a.height, REF_HZ)) {
    const time = i++ / REF_HZ;
    out.push({ t: time, f: engine.process({ data, width: a.width, height: a.height, channels: 3, t: time }) });
  }
  return out;
}

/** pearson/spearman are null when either series never varies (e.g. a map slice that is always dark). */
interface Row { track: string; title: string; visual: string; audio: string; fidelity: string; kind: 'pitch' | 'level/rate'; n: number; pearson: number | null; spearman: number | null; note?: string }

const results: Row[] = [];
for (const t of TRACKS) {
  const ref = await reference(t);
  const ft = JSON.parse(readFileSync(join(PUBLIC, 'features', `${t.id}.json`), 'utf8')) as FeatureTrack;
  const at = (time: number) => rowFeatures(ft, Math.min(ft.rows.length - 1, Math.round(time * ft.hz)));

  // Sequencer run over the shipped features: note events with their times.
  const seq = new Sequencer(t.sound, 'musical');
  const events: { t: number; layer: string; hz: number }[] = [];
  for (let i = 1; i < ft.rows.length; i++) {
    const f = rowFeatures(ft, i);
    for (const e of seq.step(evaluate(t.sound, f), f, 1 / ft.hz)) events.push({ t: i / ft.hz + e.offset, layer: e.layer, hz: e.hz });
  }

  for (const b of t.sound.bindings) {
    if (b.fidelity === 'visual' || b.fidelity === 'artistic') continue;
    const [layer, param] = b.target.split('.');
    const x: number[] = [], y: number[] = [];
    if (param === 'note') {
      // Each emitted note's pitch (log2 Hz) vs the reference data value at that moment.
      for (const e of events.filter((ev) => ev.layer === layer)) {
        const r = ref[Math.min(ref.length - 1, Math.round(e.t * REF_HZ))].f;
        const v = r[b.feature];
        if (!Number.isFinite(v)) continue;
        x.push(v);
        y.push(Math.log2(e.hz));
      }
    } else {
      for (const { t: time, f: r } of ref) {
        const shipped = at(time);
        if (!isActive(b, shipped)) continue;
        const v = r[b.feature];
        const out = evaluate(t.sound, shipped)[layer]?.[param as never] as number | undefined;
        if (!Number.isFinite(v) || out === undefined || !Number.isFinite(out)) continue;
        x.push(v);
        y.push(out);
      }
    }
    if (x.length < 20) continue;
    // A reversed input range (e.g. north = higher) is a deliberate inversion: report the magnitude.
    const sign = b.in[1] < b.in[0] ? -1 : 1;
    const constant = (v: number[]) => v.every((q) => q === v[0]);
    const flat = constant(x) || constant(y);
    const p = pearson(x, y), s = spearman(x, y);
    results.push({
      track: t.id, title: t.title, visual: b.visual, audio: b.audio, fidelity: FIDELITY_LABEL[b.fidelity] + (b.amplified ? ', amplified' : ''),
      kind: param === 'note' ? 'pitch' : 'level/rate', n: x.length,
      pearson: flat || !Number.isFinite(p) ? null : Math.round(sign * p * 1000) / 1000,
      spearman: flat || !Number.isFinite(s) ? null : Math.round(sign * s * 1000) / 1000,
      ...(flat ? { note: constant(x) ? 'no variation in the data (e.g. this slice is always dark)' : 'the sound never varies' } : {}),
    });
  }
  console.log(`${t.id}: ${results.filter((r) => r.track === t.id).length} data mappings measured`);
}

writeFileSync(join(PUBLIC, 'fidelity.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), refScale: REF_SCALE, refHz: REF_HZ, rows: results }, null, 1) + '\n');
const md = [
  '# Fidelity metrics (generated)',
  '',
  'Generated by `npx vite-node scripts/fidelity.ts`. **Reference** = each data feature measured from the video at 2× analysis resolution, unsmoothed, 5 samples/s. **Sound** = what the shipped pipeline outputs (normal resolution, smoothing, scale quantization, sequencer): emitted note pitch (log₂ Hz) for pitch mappings, control values for loudness/rate. Visual and artistic mappings are excluded. Sign is flipped for deliberately inverted mappings (e.g. north = higher).',
  '',
  '| Track | Data | Sound | Label | n | Pearson r | Spearman ρ |',
  '|---|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.title} | ${r.visual} | ${r.audio} | ${r.fidelity} | ${r.n} | ${r.pearson === null ? `n/a: ${r.note}` : r.pearson.toFixed(2)} | ${r.spearman === null ? 'n/a' : r.spearman.toFixed(2)} |`),
  '',
];
writeFileSync(join(ROOT, 'docs', 'fidelity.md'), md.join('\n'));
