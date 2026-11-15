/**
 * Builds the "Close your eyes" listening quiz from the data. For each question we take two short
 * windows of one track where a feature is clearly high vs clearly low (or the Hear-the-change
 * moments), and the right answer is whichever clip has more of it BY MEASUREMENT. Clip order is
 * shuffled deterministically. Nothing is labelled by hand.
 *
 *   npx vite-node scripts/build_quiz.ts   ->  public/quiz/questions.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isActive } from '../src/audio/mapping';
import { rowFeatures, type FeatureTrack } from '../src/audio/render';
import { snapshot } from '../src/audio/snapshot';
import { TRACKS } from '../src/tracks';
import { pctFine } from '../src/tracks/words';

const ROOT = resolve(import.meta.dirname, '..');
const WIN = 1.2; // seconds per clip window
const CLIP_SECONDS = 4; // playback length of each clip

interface Q {
  id: string;
  track: string;
  prompt: string;
  /** What "more" means, for the explanation. */
  measure: string;
  feature: string;
  mode: 'musical' | 'data';
  /** Optional fixed windows (seconds); otherwise the clearest high/low windows are found. */
  fixed?: [[number, number], [number, number]];
  /** Only consider windows where this feature is at least this value (e.g. ocean under the scan line). */
  require?: { feature: string; min: number };
  format: (v: number) => string;
}

const city = TRACKS.find((t) => t.id === 'city-glow')!.compare!;
const ocean = TRACKS.find((t) => t.id === 'ocean-heat')!.compare!;
const lat = (y: number) => `${Math.abs(Math.round(90 - 180 * y))}° ${90 - 180 * y >= 0 ? 'N' : 'S'}`;

const QUESTIONS: Q[] = [
  { id: 'city-lights', track: 'city-glow', prompt: 'Which clip has more city lights?', measure: 'lit share of the map', feature: 'lights.share', mode: 'musical', fixed: [[city.a.from, city.a.to], [city.b.from, city.b.to]], format: pctFine },
  { id: 'ocean-warm', track: 'ocean-heat', prompt: 'Which clip is scanning warmer water?', measure: 'sea temperature under the scan line', feature: 'scan.value', mode: 'musical', require: { feature: 'scan.coverage', min: 0.3 }, format: (v) => `${Math.round(v)} °C` },
  { id: 'storm-more', track: 'storm-drums', prompt: 'Which clip has more lightning?', measure: 'share of the view covered by lightning', feature: 'bolt.share', mode: 'musical', format: pctFine },
  { id: 'dust-more', track: 'four-winds', prompt: 'Which clip has more desert dust in the air?', measure: 'share of the picture in the dust colour', feature: 'aer.dust', mode: 'musical', format: pctFine },
  { id: 'forest-tall', track: 'forest-heights', prompt: 'Which clip shows taller forests?', measure: 'height of the taller trees in view (approx.)', feature: 'height.p', mode: 'musical', require: { feature: 'height.coverage', min: 0.05 }, format: (v) => `about ${Math.round(v)} m` },
  { id: 'ocean-north', track: 'ocean-heat', prompt: 'In which clip is the band of hottest water further north? (Listen to the slow, high bell.)', measure: 'how far north the hottest water is', feature: 'sst.hotCy', mode: 'musical', fixed: [[ocean.a.from, ocean.a.to], [ocean.b.from, ocean.b.to]], format: lat },
  { id: 'smoke-more', track: 'four-winds', prompt: 'Which clip has more smoke from fires? (Listen for the low drone.)', measure: 'share of the picture in the smoke colour', feature: 'aer.smoke', mode: 'musical', format: pctFine },
  { id: 'city-lights-data', track: 'city-glow', prompt: 'Same question in plain tones: which clip has more city lights?', measure: 'lit share of the map', feature: 'lights.share', mode: 'data', fixed: [[city.a.from, city.a.to], [city.b.from, city.b.to]], format: pctFine },
];

/**
 * Deterministic coin from a string (FNV-1a, a high bit), so the right answer's position is
 * irregular. A simple polynomial hash's low bit only tracks character parity and alternated 1,2,1,2.
 */
const coin = (s: string) => {
  let h = 0x811c9dc5;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 11) & 1;
};

const out = QUESTIONS.map((q) => {
  const ft = JSON.parse(readFileSync(join(ROOT, 'public', 'features', `${q.track}.json`), 'utf8')) as FeatureTrack;
  let lo: [number, number], hi: [number, number];
  if (q.fixed) {
    const [a, b] = q.fixed;
    const va = snapshot(ft, ...a)[q.feature], vb = snapshot(ft, ...b)[q.feature];
    [lo, hi] = va < vb ? [a, b] : [b, a];
  } else {
    // Slide a window over the track; keep windows where the feature (and its binding) is meaningful.
    const track = TRACKS.find((t) => t.id === q.track)!;
    const binding = track.sound.bindings.find((b) => b.feature === q.feature)!;
    const cands: { w: [number, number]; v: number }[] = [];
    const dur = ft.rows.length / ft.hz;
    for (let s = 0; s + WIN <= dur; s += 0.5) {
      const f = snapshot(ft, s, s + WIN);
      if (!Number.isFinite(f[q.feature]) || !isActive(binding, rowFeatures(ft, Math.round((s + WIN / 2) * ft.hz)))) continue;
      if (q.require && !(f[q.require.feature] >= q.require.min)) continue;
      cands.push({ w: [s, s + WIN], v: f[q.feature] });
    }
    cands.sort((a, b) => a.v - b.v);
    lo = cands[Math.floor(cands.length * 0.05)].w; // 5th / 95th percentile: clear but not freak frames
    hi = cands[Math.floor(cands.length * 0.95)].w;
  }
  // "Further north" = smaller hotCy; everywhere else "more" = larger value.
  const inverted = q.feature === 'sst.hotCy';
  const [moreW, lessW] = inverted ? [lo, hi] : [hi, lo];
  const moreFirst = coin(q.id) === 0;
  const clips = moreFirst ? [moreW, lessW] : [lessW, moreW];
  const values = clips.map((w) => snapshot(ft, w[0], w[1])[q.feature]);
  return {
    id: q.id, track: q.track, prompt: q.prompt, mode: q.mode, clipSeconds: CLIP_SECONDS,
    clips: clips.map((w) => ({ from: Math.round(w[0] * 100) / 100, to: Math.round(w[1] * 100) / 100 })),
    answer: moreFirst ? 0 : 1,
    explanation: `Clip ${moreFirst ? 1 : 2} had more: ${q.measure} ${q.format(values[moreFirst ? 0 : 1])} vs ${q.format(values[moreFirst ? 1 : 0])}.`,
  };
});

mkdirSync(join(ROOT, 'public', 'quiz'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'quiz', 'questions.json'), JSON.stringify({ version: 1, questions: out }, null, 1) + '\n');
out.forEach((q) => console.log(`${q.id}: answer clip ${q.answer + 1}. ${q.explanation}`));
