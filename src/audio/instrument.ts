import * as Tone from 'tone';
import { createGraph, type SoundGraph } from './graph';
import { midiToHz } from './scales';
import type { SoundSpec } from './types';

/**
 * Instrument mode voice: a continuous pure tone whose pitch is the value under the crosshair,
 * plus soft ticks at threshold crossings. Built with the normal graph factory in data-only mode,
 * so it shares the compressor, limiter and −1 dBFS ceiling.
 */
const SPEC: SoundSpec = {
  tonic: 'C',
  scale: 'majorPentatonic',
  mood: 'Instrument mode.',
  layers: [
    // In data-only mode a noise layer is rendered as a sine whose frequency follows `cutoff`.
    { id: 'tone', label: 'Value', kind: 'noise', fidelity: 'data-tested', description: 'Pitch = value under the crosshair.', gainDb: -14, cutoff: 440 },
    { id: 'tick', label: 'Tick', kind: 'bell', fidelity: 'data-tested', description: 'Threshold crossing.', gainDb: -14, range: ['C6', 'C7'] },
  ],
  bindings: [],
};

/** 0–1 → G3 … ~D6, exponential (equal steps sound equal). */
export const normToHz = (x: number) => 196 * 2 ** (2.5 * Math.min(1, Math.max(0, x)));

export class Instrument {
  private graph: SoundGraph | null = null;

  async start(): Promise<void> {
    await Tone.start();
    if (!this.graph) {
      this.graph = await createGraph(SPEC, 'data');
      this.graph.apply({ tone: { gainDb: -Infinity, cutoff: 440 } }, Tone.now());
    }
  }

  /** norm null = nothing measurable here: the tone falls silent. */
  set(norm: number | null, pan: number): void {
    this.graph?.apply({ tone: { gainDb: norm === null ? -Infinity : -14, cutoff: norm === null ? undefined : normToHz(norm), pan } }, Tone.now() + 0.02);
  }

  tick(up: boolean): void {
    this.graph?.play([{ layer: 'tick', offset: 0, hz: midiToHz(up ? 96 : 84), velocity: 0.35 }], Tone.now() + 0.02);
  }

  stop(): void {
    const g = this.graph;
    this.graph = null;
    if (g) {
      g.silence(Tone.now());
      setTimeout(() => g.dispose(), 600);
    }
  }
}
