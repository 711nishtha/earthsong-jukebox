import * as Tone from 'tone';
import type { Features } from '../analysis/types';
import { createGraph, type SoundGraph } from './graph';
import { evaluate, Sequencer } from './mapping';
import type { Controls, Mode, NoteEvent, SoundSpec } from './types';

/** Schedule slightly ahead of "now" so ramps and notes never land in the past (no glitches). */
const LOOKAHEAD = 0.06;
/** A video-time jump larger than this (or backwards) is a seek. */
const SEEK_GAP = 0.75;

/**
 * Live sonification: receives smoothed features from the analysis loop (video time `t`) and
 * drives the audio graph. Pause / seek / end / track switch all fade to silence and reset state.
 */
export class LivePlayer {
  private graph: SoundGraph | null = null;
  private seq: Sequencer;
  private lastT = NaN;
  private muted = new Set<string>();
  private volume = 0.8;
  /** Latest controls and events, for captions, haptics and tests. */
  onTick: ((c: Controls, events: NoteEvent[], f: Features) => void) | null = null;

  constructor(
    private spec: SoundSpec,
    private mode: Mode,
  ) {
    this.seq = new Sequencer(spec, mode);
  }

  /** Must run inside a user gesture the first time (browser autoplay policy). */
  async start(): Promise<void> {
    await Tone.start();
    if (!this.graph) {
      this.graph = await createGraph(this.spec, this.mode);
      this.graph.setVolume(this.volume);
      this.muted.forEach((id) => this.graph!.setStemMuted(id, true));
    }
  }

  update(features: Features, t: number): void {
    if (!this.graph) return;
    const dt = t - this.lastT;
    const seek = !(dt > 0) || dt > SEEK_GAP;
    if (seek) this.seq.reset();
    this.lastT = t;
    const controls = evaluate(this.spec, features);
    const events = seek ? [] : this.seq.step(controls, features, dt);
    const at = Tone.now() + LOOKAHEAD;
    this.graph.apply(controls, at);
    this.graph.play(events, at);
    this.onTick?.(controls, events, features);
  }

  /** Paused, seeking, ended: fade out; the next update() fades back in. */
  hush(): void {
    this.graph?.silence(Tone.now());
    this.seq.reset();
    this.lastT = NaN;
  }

  async setMode(mode: Mode): Promise<void> {
    if (mode === this.mode) return;
    this.mode = mode;
    this.seq = new Sequencer(this.spec, mode);
    const old = this.graph;
    if (old) {
      old.silence(Tone.now());
      setTimeout(() => old.dispose(), 600);
      this.graph = null;
      await this.start();
    }
  }

  setStemMuted(id: string, muted: boolean): void {
    if (muted) this.muted.add(id);
    else this.muted.delete(id);
    this.graph?.setStemMuted(id, muted);
  }

  setVolume(v: number): void {
    this.volume = v;
    this.graph?.setVolume(v);
  }

  dispose(): void {
    const g = this.graph;
    this.graph = null;
    if (g) {
      g.silence(Tone.now());
      setTimeout(() => g.dispose(), 600);
    }
  }
}
