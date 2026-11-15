import * as Tone from 'tone';
import { createGraph, type SoundGraph } from './graph';
import { evaluate } from './mapping';
import type { SoundSpec } from './types';

/**
 * The low drone that swells when you press Enter. It is purely atmospheric (no data), built from
 * the same graph factory, so it goes through the same compressor, limiter and −1 dBFS ceiling.
 */
const AMBIENT: SoundSpec = {
  tonic: 'D',
  scale: 'dorian',
  mood: 'Deep space: a slow open D drone with distant air.',
  layers: [
    { id: 'drone', label: 'Drone', kind: 'pad', fidelity: 'artistic', description: 'Open D drone.', gainDb: -12, cutoff: 520, notes: ['D2', 'A2', 'D3', 'E3'] },
    { id: 'air', label: 'Air', kind: 'noise', noise: 'brown', fidelity: 'artistic', description: 'Distant air.', gainDb: -30, cutoff: 320 },
  ],
  bindings: [],
};

let graph: SoundGraph | null = null;

/** Must run inside the Enter click: this is the user gesture that unlocks audio for the whole visit. */
export async function startAmbient(level = 0.55, swellSeconds = 5): Promise<void> {
  await Tone.start();
  if (graph) return;
  graph = await createGraph(AMBIENT, 'musical');
  graph.setVolume(0, 0);
  graph.apply(evaluate(AMBIENT, {}), Tone.now() + 0.05);
  graph.setVolume(level, swellSeconds);
}

/** Fade the drone away (when a track starts, or on leaving). */
export function stopAmbient(seconds = 2.5): void {
  const g = graph;
  graph = null;
  if (!g) return;
  g.setVolume(0, seconds);
  setTimeout(() => g.dispose(), (seconds + 0.5) * 1000);
}
