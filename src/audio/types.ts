import type { ScaleName } from './scales';

export type Mode = 'musical' | 'data';

/**
 * How honest a mapping is (shown in the legend and docs):
 * - data-tested: colourbar inversion validated on the shipped video
 * - data-approx: inversion works but is biased (shading, blending)
 * - data-categorical: legend classes; screen area is not amount
 * - data-relative: real data with no numeric scale on screen
 * - visual: depends on rendering or camera, not data
 * - artistic: a musical device (time sweep, background bed)
 */
export type Fidelity = 'data-tested' | 'data-approx' | 'data-categorical' | 'data-relative' | 'visual' | 'artistic';

/**
 * Sustained layers (`pad`, `noise`) play continuously and are shaped by controls.
 * Triggered layers (`mallet`, `bell`, `pluck`, `drum`) play notes at a `rate` (events per second).
 */
export type LayerKind = 'pad' | 'noise' | 'mallet' | 'bell' | 'pluck' | 'drum';

/** Controllable parameters. `tone<i>Db` = gain of the i-th pad note. */
export type Param = 'gainDb' | 'pan' | 'cutoff' | 'note' | 'rate' | 'velocity' | `tone${number}Db`;

export interface LayerSpec {
  id: string;
  /** Stem name in the UI ("Scan", "Dust"). */
  label: string;
  kind: LayerKind;
  /** Plain-language description for the legend, incl. purely artistic layers. */
  description: string;
  fidelity: Fidelity;
  /** Default control values; bindings override them each tick. */
  gainDb: number;
  pan?: number;
  /** Low-pass cutoff in Hz (pad, noise). */
  cutoff?: number;
  /** Pad: one sustained note per entry, each with its own `tone<i>Db` gain and pan. */
  notes?: string[];
  tonePans?: number[];
  /** Noise colour. */
  noise?: 'pink' | 'brown';
  /** Triggered: pitch range for `note` 0–1, in the track scale (musical) or continuous (data). */
  range?: [string, string];
  /** Triggered: where pitch comes from. value = the `note` control; up/down = walk the scale. */
  pattern?: 'value' | 'up' | 'down';
  /** Triggered: scale for this layer if it differs from the track's (e.g. a minor "loss" motif). */
  scale?: ScaleName;
  rate?: number;
  velocity?: number;
  /** Hard cap on events per second (ear-fatigue and photosensitivity-adjacent safety). */
  maxRate?: number;
}

/** One row of the mapping table: a feature drives one layer parameter. */
export interface Binding {
  feature: string;
  /** Input range; values outside are clamped. Reversed ranges invert the mapping. */
  in: [number, number];
  curve?: 'linear' | 'sqrt' | 'square';
  target: `${string}.${Param}`;
  out: [number, number];
  /** Only active when this condition holds; otherwise the parameter rests (gain → silent, rate → 0). */
  when?: { feature: string; oneOf?: number[]; min?: number };
  // Documentation (Section 7 table columns), rendered into the legend and docs/mappings.md.
  visual: string;
  measured: string;
  audio: string;
  range: string;
  fidelity: Fidelity;
  why: string;
  /** The input range is a narrow slice of the possible range, stretched so changes are audible. */
  amplified?: boolean;
}

/** Fire a one-shot note on a layer whenever a feature changes value (e.g. each new year). */
export interface ChangeTrigger {
  feature: string;
  layer: string;
  note: string;
}

export interface SoundSpec {
  tonic: string;
  scale: ScaleName;
  /** Mood words for the about page and legend intro. */
  mood: string;
  layers: LayerSpec[];
  bindings: Binding[];
  changeTriggers?: ChangeTrigger[];
}

/** Layer id → param → value. */
export type Controls = Record<string, Partial<Record<Param, number>>>;

export interface NoteEvent {
  layer: string;
  /** Seconds after the start of the tick. */
  offset: number;
  hz: number;
  velocity: number;
}
