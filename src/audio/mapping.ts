import type { Features } from '../analysis/types';
import { midiToHz, noteToMidi, positionToHz, scaleNotes } from './scales';
import type { Binding, Controls, LayerSpec, Mode, NoteEvent, Param, SoundSpec } from './types';

/** Default ceiling on note rate for any triggered layer (events per second). */
export const DEFAULT_MAX_RATE = 8;
/** Velocity ceiling: no hit is ever louder than this, whatever the data does. */
export const MAX_VELOCITY = 0.8;

export const TRIGGERED = new Set<LayerSpec['kind']>(['mallet', 'bell', 'pluck', 'drum']);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Value a parameter takes when its binding is inactive or its feature is missing. */
function restValue(param: Param): number | undefined {
  if (param === 'gainDb' || param.startsWith('tone')) return -Infinity;
  if (param === 'rate') return 0;
  return undefined; // pan, cutoff, note…: keep the layer default
}

function defaults(spec: SoundSpec): Controls {
  const c: Controls = {};
  for (const l of spec.layers) {
    c[l.id] = { gainDb: l.gainDb, pan: l.pan ?? 0, cutoff: l.cutoff, rate: l.rate ?? 0, velocity: l.velocity ?? 0.6, note: 0.5 };
    l.notes?.forEach((_, i) => (c[l.id][`tone${i}Db`] = 0));
  }
  return c;
}

/** Whether a binding's `when` condition holds for these features. */
export function isActive(b: Binding, f: Features): boolean {
  if (!b.when) return true;
  const v = f[b.when.feature];
  if (!Number.isFinite(v)) return false;
  if (b.when.oneOf && !b.when.oneOf.includes(Math.round(v))) return false;
  if (b.when.min !== undefined && v < b.when.min) return false;
  return true;
}

export function mapValue(b: Binding, v: number): number {
  let x = clamp01((v - b.in[0]) / (b.in[1] - b.in[0]));
  if (b.curve === 'sqrt') x = Math.sqrt(x);
  else if (b.curve === 'square') x = x * x;
  return b.out[0] + x * (b.out[1] - b.out[0]);
}

/** Features → control values for every layer. Pure; shared by live playback, export and legend previews. */
export function evaluate(spec: SoundSpec, features: Features): Controls {
  const c = defaults(spec);
  for (const b of spec.bindings) {
    const [layer, param] = b.target.split('.') as [string, Param];
    if (!c[layer]) throw new Error(`binding target "${b.target}": no layer "${layer}"`);
    const v = features[b.feature];
    if (isActive(b, features) && Number.isFinite(v)) c[layer][param] = mapValue(b, v);
    else {
      const rest = restValue(param);
      if (rest !== undefined) c[layer][param] = rest;
    }
  }
  return c;
}

/**
 * Turns per-layer rates into note events with sample-accurate offsets. Deterministic (no randomness),
 * so live playback and offline export of the same features produce the same notes.
 */
export class Sequencer {
  private acc: Record<string, number> = {};
  private step_: Record<string, number> = {};
  private last: Record<string, number> = {};
  private notes: Record<string, number[]> = {};

  constructor(
    private spec: SoundSpec,
    private mode: Mode,
  ) {
    for (const l of spec.layers) {
      if (!TRIGGERED.has(l.kind)) continue;
      const [lo, hi] = l.range ?? ['C3', 'C5'];
      this.notes[l.id] = scaleNotes(spec.tonic, l.scale ?? spec.scale, lo, hi);
      if (!this.notes[l.id].length) throw new Error(`layer ${l.id}: empty note range`);
    }
    this.reset();
  }

  reset(): void {
    for (const id of Object.keys(this.notes)) {
      // Start near the threshold so a layer that becomes active speaks promptly.
      this.acc[id] = 0.9;
      this.step_[id] = 0;
    }
    this.last = {};
  }

  step(controls: Controls, features: Features, dt: number): NoteEvent[] {
    const events: NoteEvent[] = [];
    if (dt <= 0) return events;
    for (const l of this.spec.layers) {
      const notes = this.notes[l.id];
      if (!notes) continue;
      const c = controls[l.id];
      const rate = Math.min(c.rate ?? 0, l.maxRate ?? DEFAULT_MAX_RATE);
      if (rate <= 0 || c.gainDb === -Infinity) continue;
      let a = this.acc[l.id];
      let tau = (1 - a) / rate;
      while (tau < dt) {
        events.push({ layer: l.id, offset: Math.max(0, tau), hz: this.pitch(l, notes, c.note ?? 0.5), velocity: Math.min(MAX_VELOCITY, c.velocity ?? 0.6) });
        tau += 1 / rate;
      }
      a += rate * dt;
      this.acc[l.id] = a - Math.floor(a);
    }
    for (const t of this.spec.changeTriggers ?? []) {
      const v = features[t.feature];
      if (!Number.isFinite(v)) continue;
      const prev = this.last[t.feature];
      if (prev !== undefined && v !== prev && controls[t.layer]?.gainDb !== -Infinity) {
        events.push({ layer: t.layer, offset: 0, hz: midiToHz(noteToMidi(t.note)), velocity: 0.5 });
      }
      this.last[t.feature] = v;
    }
    return events;
  }

  private pitch(l: LayerSpec, notes: number[], note: number): number {
    if (l.pattern === 'up' || l.pattern === 'down') {
      const k = this.step_[l.id]++;
      const i = l.pattern === 'up' ? k % notes.length : notes.length - 1 - (k % notes.length);
      return midiToHz(notes[i]);
    }
    return positionToHz(note, notes, this.mode);
  }
}

/**
 * One 0–1 "activity" number for the visuals: the mean position of every active loudness/rate
 * binding within its input range. Drives the nebula, star speed and Earth's halo, so the picture
 * reacts to the same data as the sound (never to an FFT of the audio).
 */
export function activity(spec: SoundSpec, features: Features): number {
  let sum = 0, n = 0;
  for (const b of spec.bindings) {
    if (!/\.(gainDb|rate|tone\d+Db)$/.test(b.target) || !isActive(b, features)) continue;
    const v = features[b.feature];
    if (!Number.isFinite(v)) continue;
    sum += clamp01((v - b.in[0]) / (b.in[1] - b.in[0]));
    n++;
  }
  return n ? sum / n : 0;
}
