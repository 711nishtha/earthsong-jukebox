import { loadJson } from '../analysis/load';
import type { FeatureTrack } from '../audio/render';
import type { TrackConfig } from '../tracks/types';

const cache = new Map<string, number[]>();

/**
 * A small "waveform" for a track: the envelope of the first loudness/rate binding's feature over
 * the whole track (real data, normalised to 0–1 within the binding's input range).
 */
export async function trackEnvelope(track: TrackConfig, bars = 40): Promise<number[]> {
  const hit = cache.get(track.id);
  if (hit) return hit;
  const b = track.sound.bindings.find((x) => /gainDb|rate|tone\d+Db/.test(x.target)) ?? track.sound.bindings[0];
  const ft = await loadJson<FeatureTrack>(`features/${track.id}.json`);
  const k = ft.names.indexOf(b.feature);
  const [lo, hi] = b.in[0] < b.in[1] ? b.in : [b.in[1], b.in[0]];
  const per = Math.max(1, Math.floor(ft.rows.length / bars));
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    let s = 0, n = 0;
    for (let j = i * per; j < Math.min(ft.rows.length, (i + 1) * per); j++) {
      const v = ft.rows[j][k];
      if (v !== null) { s += Math.min(1, Math.max(0, (v - lo) / (hi - lo))); n++; }
    }
    out.push(n ? s / n : 0);
  }
  cache.set(track.id, out);
  return out;
}
