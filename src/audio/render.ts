import * as Tone from 'tone';
import type { Features } from '../analysis/types';
import { createGraph } from './graph';
import { evaluate, Sequencer } from './mapping';
import type { Mode, SoundSpec } from './types';

/** public/features/<track>.json, written by scripts/precompute.ts. */
export interface FeatureTrack {
  track: string;
  hz: number;
  names: string[];
  rows: (number | null)[][];
}

export const rowFeatures = (ft: FeatureTrack, i: number): Features =>
  Object.fromEntries(ft.names.map((n, k) => [n, ft.rows[i][k] ?? NaN]));

/** Seconds of reverb/release kept after the last frame. */
const TAIL = 3;
const SAMPLE_RATE = 44100;

/**
 * Renders a whole soundscape faster than real time from precomputed features, through the very same
 * mapping, sequencer and graph as live playback. Used by "Download soundscape" and the playlist script.
 */
export async function renderOffline(spec: SoundSpec, ft: FeatureTrack, mode: Mode): Promise<AudioBuffer> {
  const duration = ft.rows.length / ft.hz + TAIL;
  const buffer = await Tone.Offline(async () => {
    const graph = await createGraph(spec, mode);
    const seq = new Sequencer(spec, mode);
    const dt = 1 / ft.hz;
    for (let i = 0; i < ft.rows.length; i++) {
      const f = rowFeatures(ft, i);
      const t = i * dt;
      const controls = evaluate(spec, f);
      graph.apply(controls, t);
      if (i > 0) graph.play(seq.step(controls, f, dt), t);
    }
    graph.silence(ft.rows.length * dt);
  }, duration, 2, SAMPLE_RATE);
  return buffer.get()!;
}
