/**
 * Precompute feature tracks with the SAME TypeScript engine the browser uses, fed by ffmpeg.
 * Output (public/features/<id>.json) drives "Download soundscape", low-power mode and tests.
 *
 *   npx vite-node scripts/precompute.ts [trackId ...]
 *
 * Also prints per-tick timing (performance budget: < 5 ms) and min/median/max per feature,
 * which is what the mapping ranges in the track configs are tuned against.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { FeatureEngine } from '../src/analysis/engine';
import { Smoother } from '../src/analysis/smoother';
import type { LutData } from '../src/analysis/types';
import { TRACKS } from '../src/tracks';
import type { TrackConfig } from '../src/tracks/types';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');

function loadLuts(track: TrackConfig): Record<string, LutData> {
  return Object.fromEntries(
    track.luts.map((n) => [n, JSON.parse(readFileSync(join(PUBLIC, 'luts', `${n}.json`), 'utf8')) as LutData]),
  );
}

/** Streams raw RGB frames at analysis size. `area` downscaling approximates the browser's high-quality drawImage. */
async function* frames(video: string, w: number, h: number, hz: number): AsyncGenerator<Uint8Array> {
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=${hz},scale=${w}:${h}:flags=area`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
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

async function run(track: TrackConfig): Promise<void> {
  const { analysis: a } = track;
  const engine = new FeatureEngine(a, loadLuts(track));
  const smoother = new Smoother(a.smoothing.default, a.smoothing.perFeature);
  const rows: number[][] = [];
  let names: string[] = [];
  const times: number[] = [];
  let i = 0;
  for await (const data of frames(join(PUBLIC, track.video), a.width, a.height, a.hz)) {
    // Same rate as live sampling, so smoothing and frame-to-frame features see identical timing.
    const t = i++ / a.hz;
    const t0 = performance.now();
    const raw = engine.process({ data, width: a.width, height: a.height, channels: 3, t });
    const f = smoother.step(raw, t);
    times.push(performance.now() - t0);
    if (!names.length) names = Object.keys(f);
    rows.push(names.map((n) => (Number.isFinite(f[n]) ? Math.round(f[n] * 1e4) / 1e4 : NaN)));
  }

  mkdirSync(join(PUBLIC, 'features'), { recursive: true });
  // NaN isn't valid JSON; null means "nothing measurable on screen".
  writeFileSync(join(PUBLIC, 'features', `${track.id}.json`),
    JSON.stringify({ track: track.id, hz: a.hz, names, rows }).replace(/NaN/g, 'null'));

  times.sort((x, y) => x - y);
  const pct = (p: number) => times[Math.floor((p / 100) * (times.length - 1))].toFixed(2);
  console.log(`\n[${track.id}] ${rows.length} samples · tick median ${pct(50)} ms, p95 ${pct(95)} ms, max ${pct(100)} ms`);
  names.forEach((n, k) => {
    const col = rows.map((r) => r[k]).filter(Number.isFinite).sort((x, y) => x - y);
    if (!col.length) return console.log(`  ${n.padEnd(28)} (no values)`);
    const q = (p: number) => col[Math.floor(p * (col.length - 1))].toFixed(3);
    console.log(`  ${n.padEnd(28)} min ${q(0)}  p50 ${q(0.5)}  p95 ${q(0.95)}  max ${q(1)}`);
  });
}

const wanted = process.argv.slice(2);
for (const t of TRACKS.filter((t) => !wanted.length || wanted.includes(t.id))) await run(t);
