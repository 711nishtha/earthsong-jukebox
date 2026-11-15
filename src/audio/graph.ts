import * as Tone from 'tone';
import { TRIGGERED } from './mapping';
import { midiToHz, noteToMidi } from './scales';
import type { Controls, LayerSpec, Mode, NoteEvent, SoundSpec } from './types';

/** Master ceiling. The limiter is the last node, so nothing leaves the app louder than this. */
export const LIMIT_DB = -1;
/** Gain changes ramp at least this long: no clicks, no sudden jumps. */
const GAIN_RAMP = 0.3;
const PARAM_RAMP = 0.12;
/** The user's volume slider can never boost above unity. */
const MAX_USER_GAIN = 1;
/**
 * Fixed gain between the layer mix and the compressor. Layer levels are written as a relative
 * mix (quiet beds, louder leads); this brings the sum to a comfortable listening level
 * (measured offline: ~−20 dBFS RMS) so the compressor and limiter, not the layer levels,
 * set the ceiling.
 */
export const MAKEUP_DB = 24;

const dbToGain = (db: number | undefined) => (db === undefined || db === -Infinity ? 0 : Tone.dbToGain(db));

interface LayerNodes {
  spec: LayerSpec;
  gain: Tone.Gain;
  panner: Tone.Panner;
  stem: Tone.Gain;
  filter?: Tone.Filter;
  toneGains: Tone.Gain[];
  tonePans: Tone.Panner[];
  sources: (Tone.Oscillator | Tone.FatOscillator | Tone.Noise)[];
  /** Data-mode noise layers become a sine whose pitch follows the cutoff control. */
  sineForNoise?: Tone.Oscillator;
  synth?: Tone.PolySynth;
  noteLength: number;
}

export interface SoundGraph {
  /** Ramp every layer to the given controls, starting at `time` (seconds on the graph's clock). */
  apply(controls: Controls, time: number): void;
  /** Schedule note events; their offsets are relative to `time`. */
  play(events: NoteEvent[], time: number): void;
  /** Fade everything out (pause, seek, track switch). The next apply() fades back in. */
  silence(time: number): void;
  /** Stem fader, 0–1 (0 = muted). Never boosts above the layer's designed level. */
  setStemLevel(layerId: string, level: number): void;
  /** 0–1 user volume, applied before the limiter; `seconds` sets the ramp (default: a quick 80 ms). */
  setVolume(v: number, seconds?: number): void;
  dispose(): void;
}

function makeSynth(kind: LayerSpec['kind'], mode: Mode): { synth: Tone.PolySynth; noteLength: number } {
  if (mode === 'data') {
    // Data-only mode: plain sine blips, so the only thing you hear is pitch, timing and loudness.
    return {
      synth: new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 } }),
      noteLength: 0.2,
    };
  }
  switch (kind) {
    case 'mallet': // marimba-like: FM with a near-integer ratio and a fast-decaying modulator
      return {
        synth: new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3.01, modulationIndex: 5,
          envelope: { attack: 0.002, decay: 0.6, sustain: 0, release: 0.6 },
          modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.1 },
        }),
        noteLength: 0.35,
      };
    case 'bell': // glassy bell: inharmonic ratio, long decay
      return {
        synth: new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3.5, modulationIndex: 2.5,
          envelope: { attack: 0.003, decay: 1.6, sustain: 0, release: 1.6 },
          modulationEnvelope: { attack: 0.003, decay: 0.8, sustain: 0, release: 0.8 },
        }),
        noteLength: 1.2,
      };
    case 'pluck': // soft electric-piano / woody pluck
      return {
        synth: new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 2, oscillator: { type: 'triangle' },
          envelope: { attack: 0.006, decay: 0.7, sustain: 0.05, release: 0.8 },
        }),
        noteLength: 0.5,
      };
    case 'drum': // soft tom: sine membrane with a gentle pitch drop
      return {
        synth: new Tone.PolySynth(Tone.MembraneSynth, {
          pitchDecay: 0.06, octaves: 2,
          envelope: { attack: 0.003, decay: 0.5, sustain: 0, release: 0.4 },
        }),
        noteLength: 0.4,
      };
    default:
      throw new Error(`${kind} is not a triggered layer`);
  }
}

function buildLayer(l: LayerSpec, mode: Mode, bus: Tone.InputNode): LayerNodes {
  const stem = new Tone.Gain(1).connect(bus);
  const panner = new Tone.Panner(l.pan ?? 0).connect(stem);
  const gain = new Tone.Gain(0).connect(panner); // starts silent; first apply() fades in
  const nodes: LayerNodes = { spec: l, gain, panner, stem, toneGains: [], tonePans: [], sources: [], noteLength: 0 };

  if (TRIGGERED.has(l.kind)) {
    const { synth, noteLength } = makeSynth(l.kind, mode);
    synth.maxPolyphony = 12;
    synth.volume.value = mode === 'data' ? -10 : -6;
    nodes.synth = synth.connect(gain);
    nodes.noteLength = noteLength;
    return nodes;
  }

  nodes.filter = new Tone.Filter({ type: 'lowpass', frequency: l.cutoff ?? 2000, rolloff: -24, Q: 0.5 }).connect(gain);

  if (l.kind === 'noise') {
    if (mode === 'data') {
      nodes.sineForNoise = new Tone.Oscillator(l.cutoff ?? 400, 'sine').connect(gain).start();
      nodes.sineForNoise.volume.value = -20;
      nodes.sources.push(nodes.sineForNoise);
    } else {
      const n = new Tone.Noise(l.noise ?? 'pink').connect(nodes.filter).start();
      n.volume.value = -6;
      nodes.sources.push(n);
    }
    return nodes;
  }

  // pad: one sustained source per note, each with its own gain and stereo position
  (l.notes ?? []).forEach((note, i) => {
    const hz = midiToHz(noteToMidi(note));
    const tonePan = new Tone.Panner(l.tonePans?.[i] ?? 0).connect(nodes.filter!);
    const toneGain = new Tone.Gain(1).connect(tonePan);
    let src: Tone.Oscillator | Tone.FatOscillator;
    if (mode === 'data') {
      src = new Tone.Oscillator(hz, 'sine');
      src.volume.value = -23; // matched by ear-free loudness measurement to the musical pad (~−20 dBFS RMS mix)
    } else {
      // Three slightly detuned saws through a low-pass: a warm, slowly beating pad.
      const fat = new Tone.FatOscillator(hz, 'sawtooth', 14);
      fat.count = 3;
      fat.volume.value = -24;
      src = fat;
    }
    src.connect(toneGain).start();
    nodes.toneGains.push(toneGain);
    nodes.tonePans.push(tonePan);
    nodes.sources.push(src);
  });
  return nodes;
}

/**
 * Builds the full audio graph for one track inside the *current* Tone context, so the same code
 * serves live playback and Tone.Offline export. Chain: layers → stems → (reverb) → high-pass →
 * makeup gain → compressor → user volume → limiter → soft-clip ceiling (−1 dBFS) → destination.
 */
export async function createGraph(spec: SoundSpec, mode: Mode): Promise<SoundGraph> {
  // Tone.Limiter is a fast compressor and lets drum transients overshoot (measured +2.8 dBFS),
  // so a waveshaper after it enforces a hard ceiling: transparent below ~−4 dBFS, then a smooth
  // tanh knee that can never exceed LIMIT_DB.
  const ceiling = Tone.dbToGain(LIMIT_DB);
  const knee = Tone.dbToGain(LIMIT_DB - 3);
  const safety = new Tone.WaveShaper((x) => {
    const a = Math.abs(x);
    if (a <= knee) return x;
    return Math.sign(x) * (knee + (ceiling - knee) * Math.tanh((a - knee) / (ceiling - knee)));
  }, 4096).toDestination();
  const limiter = new Tone.Limiter(LIMIT_DB - 1).connect(safety);
  const userVol = new Tone.Gain(0.8).connect(limiter);
  const comp = new Tone.Compressor({ threshold: -20, ratio: 3, attack: 0.02, release: 0.25 }).connect(userVol);
  const makeup = new Tone.Gain(Tone.dbToGain(MAKEUP_DB)).connect(comp);
  const highpass = new Tone.Filter({ type: 'highpass', frequency: 35 }).connect(makeup);
  const bus = new Tone.Gain(1);
  const disposables: { dispose(): unknown }[] = [safety, limiter, userVol, comp, makeup, highpass, bus];
  if (mode === 'musical') {
    const reverb = new Tone.Reverb({ decay: 5, preDelay: 0.02, wet: 0.28 });
    await reverb.ready;
    bus.chain(reverb, highpass);
    disposables.push(reverb);
  } else {
    bus.connect(highpass); // data-only: dry, nothing added
  }

  const layers = new Map(spec.layers.map((l) => [l.id, buildLayer(l, mode, bus)]));

  return {
    apply(controls, time) {
      for (const [id, n] of layers) {
        const c = controls[id];
        if (!c) continue;
        n.gain.gain.rampTo(dbToGain(c.gainDb), GAIN_RAMP, time);
        if (c.pan !== undefined) n.panner.pan.rampTo(c.pan, PARAM_RAMP, time);
        if (c.cutoff !== undefined) {
          n.filter?.frequency.rampTo(c.cutoff, PARAM_RAMP, time);
          n.sineForNoise?.frequency.rampTo(c.cutoff, PARAM_RAMP, time);
        }
        n.toneGains.forEach((g, i) => g.gain.rampTo(dbToGain(c[`tone${i}Db`]), GAIN_RAMP, time));
      }
    },
    play(events, time) {
      for (const e of events) {
        const n = layers.get(e.layer);
        n?.synth?.triggerAttackRelease(e.hz, n.noteLength, time + e.offset, e.velocity);
      }
    },
    silence(time) {
      for (const n of layers.values()) n.gain.gain.rampTo(0, GAIN_RAMP, time);
    },
    setStemLevel(id, level) {
      layers.get(id)?.stem.gain.rampTo(Math.min(1, Math.max(0, level)), 0.08);
    },
    setVolume(v, seconds = 0.08) {
      userVol.gain.rampTo(Math.min(MAX_USER_GAIN, Math.max(0, v)), seconds);
    },
    dispose() {
      for (const n of layers.values()) {
        n.sources.forEach((s) => s.stop().dispose());
        n.synth?.dispose();
        [...n.toneGains, ...n.tonePans].forEach((g) => g.dispose());
        [n.filter, n.gain, n.panner, n.stem].forEach((x) => x?.dispose());
      }
      disposables.forEach((d) => d.dispose());
    },
  };
}
