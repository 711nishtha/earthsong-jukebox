import * as Tone from 'tone';
import type { Features } from '../analysis/types';
import { createGraph, type SoundGraph } from './graph';
import { evaluate, isActive, mapValue, Sequencer } from './mapping';
import type { FeatureTrack } from './render';
import { midiToHz, scaleNotes } from './scales';
import type { Binding, Mode, SoundSpec } from './types';

/** Mean of every feature over a time window of the precomputed track (nulls ignored). */
export function snapshot(ft: FeatureTrack, from: number, to: number): Features {
  const rows = ft.rows.slice(Math.floor(from * ft.hz), Math.ceil(to * ft.hz));
  const out: Features = {};
  ft.names.forEach((n, k) => {
    let s = 0, c = 0;
    for (const r of rows) if (r[k] !== null) { s += r[k]!; c++; }
    out[n] = c ? s / c : NaN;
  });
  return out;
}

export interface Change {
  binding: Binding;
  /** Raw feature values at A and B. */
  a: number;
  b: number;
  /** Position within the binding's input range (0–1) at A and B. */
  xa: number;
  xb: number;
}

const norm = (b: Binding, v: number) => (mapValue({ ...b, out: [0, 1], curve: 'linear' }, v));

/**
 * What changed between two snapshots, biggest first: DATA bindings (never visual or artistic
 * devices like the scan line) active in either moment whose input moved by more than `minDelta`
 * of their range. Several bindings can share one feature
 * (e.g. a share driving loudness and brightness); each feature is listed once.
 */
export function changes(spec: SoundSpec, a: Features, b: Features, minDelta = 0.06, max = 6): Change[] {
  const seen = new Set<string>();
  const list: Change[] = [];
  for (const bd of spec.bindings) {
    if (bd.fidelity === 'visual' || bd.fidelity === 'artistic') continue;
    if (seen.has(bd.feature) || !Number.isFinite(a[bd.feature]) || !Number.isFinite(b[bd.feature])) continue;
    // Skip bindings that are switched off (e.g. by segment) in both moments.
    if (!isActive(bd, a) && !isActive(bd, b)) continue;
    const xa = norm(bd, a[bd.feature]), xb = norm(bd, b[bd.feature]);
    if (Math.abs(xb - xa) < minDelta) continue;
    seen.add(bd.feature);
    list.push({ binding: bd, a: a[bd.feature], b: b[bd.feature], xa, xb });
  }
  return list.sort((p, q) => Math.abs(q.xb - q.xa) - Math.abs(p.xb - p.xa)).slice(0, max);
}

const DELTA_SPEC: SoundSpec = {
  tonic: 'C',
  scale: 'majorPentatonic',
  mood: 'Change glides.',
  layers: [{ id: 'glide', label: 'Change', kind: 'bell', fidelity: 'data-relative', description: 'Two notes per change: from then to now.', gainDb: -8, range: ['C4', 'C6'] }],
  bindings: [],
};

/**
 * Plays a frozen moment (snapshot features) as a steady sonification, or the Δ glides.
 * Same mapping, sequencer, voices and safety chain as live playback.
 */
export class SnapshotPlayer {
  private graph: SoundGraph | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  async play(spec: SoundSpec, f: Features, mode: Mode, seconds: number, onEnd?: () => void): Promise<void> {
    await this.stop();
    await Tone.start();
    const g = (this.graph = await createGraph(spec, mode));
    const seq = new Sequencer(spec, mode);
    const dt = 1 / 15;
    const tickOnce = () => {
      const c = evaluate(spec, f);
      const at = Tone.now() + 0.06;
      g.apply(c, at);
      g.play(seq.step(c, f, dt), at);
    };
    tickOnce();
    this.timer = setInterval(tickOnce, dt * 1000);
    this.stopTimer = setTimeout(() => this.stop().then(() => onEnd?.()), seconds * 1000);
  }

  /** One two-note glide per change, 1.3 s apart: from A's pitch to B's (up = more, down = less). */
  async playChanges(list: Change[], mode: Mode, onEnd?: () => void): Promise<void> {
    await this.stop();
    await Tone.start();
    const g = (this.graph = await createGraph(DELTA_SPEC, mode));
    const notes = scaleNotes('C', 'majorPentatonic', 'C4', 'C6');
    const hz = (x: number) => midiToHz(notes[Math.round(Math.min(1, Math.max(0, x)) * (notes.length - 1))]);
    const t0 = Tone.now() + 0.1;
    g.apply({ glide: { gainDb: -8, pan: 0 } }, t0 - 0.05);
    list.forEach((c, i) => {
      const v = 0.3 + 0.4 * Math.min(1, Math.abs(c.xb - c.xa));
      g.play([{ layer: 'glide', offset: 0, hz: hz(c.xa), velocity: v * 0.8 }, { layer: 'glide', offset: 0.45, hz: hz(c.xb), velocity: v }], t0 + i * 1.3);
    });
    this.stopTimer = setTimeout(() => this.stop().then(() => onEnd?.()), (list.length * 1.3 + 1.5) * 1000);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.timer = this.stopTimer = null;
    const g = this.graph;
    this.graph = null;
    if (g) {
      g.silence(Tone.now());
      setTimeout(() => g.dispose(), 800);
    }
  }
}
