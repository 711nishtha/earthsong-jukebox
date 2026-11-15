import { loadJson } from '../analysis/load';
import type { FeatureTrack } from '../audio/render';
import type { TrackConfig } from '../tracks/types';

const cache = new Map<string, number[]>();

/**
 * A small "waveform" for a track: the envelope, over the whole track, of the loudness/rate data
 * binding whose feature varies most within its input range (real data, normalised 0–1).
 * Picking the most varied one avoids flat lines from features that never change (e.g. a dark map slice).
 */
export async function trackEnvelope(track: TrackConfig, bars = 40): Promise<number[]> {
  const key = `${track.id}:${bars}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const ft = await loadJson<FeatureTrack>(`features/${track.id}.json`);
  const column = (feature: string) => {
    const k = ft.names.indexOf(feature);
    return ft.rows.map((r) => r[k]);
  };
  const relSpread = (feature: string, lo: number, hi: number) => {
    const v = column(feature).filter((x): x is number => x !== null);
    return v.length ? (Math.max(...v) - Math.min(...v)) / Math.abs(hi - lo) : 0;
  };
  const candidates = track.sound.bindings.filter(
    (x) => /\.(gainDb|rate|tone\d+Db)$/.test(x.target) && x.fidelity !== 'visual' && x.fidelity !== 'artistic',
  );
  const b = [...candidates].sort((p, q) => relSpread(q.feature, ...q.in) - relSpread(p.feature, ...p.in))[0] ?? track.sound.bindings[0];
  const values = column(b.feature);
  const [lo, hi] = b.in[0] < b.in[1] ? b.in : [b.in[1], b.in[0]];
  const per = Math.max(1, Math.floor(values.length / bars));
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    let s = 0, n = 0;
    for (let j = i * per; j < Math.min(values.length, (i + 1) * per); j++) {
      const v = values[j];
      if (v !== null) {
        s += Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
        n++;
      }
    }
    out.push(n ? s / n : 0);
  }
  cache.set(key, out);
  return out;
}
