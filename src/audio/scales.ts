/** Scale intervals in semitones from the tonic. */
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
} as const;
export type ScaleName = keyof typeof SCALES;

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "D3", "F#4", "Bb2" → MIDI number. */
export function noteToMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note name "${name}"`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + acc;
}

export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** All MIDI notes of the scale between lo and hi (inclusive), ascending. `tonic` is a pitch class ("D", "F#"). */
export function scaleNotes(tonic: string, scale: ScaleName, lo: string, hi: string): number[] {
  const root = noteToMidi(`${tonic}4`) % 12;
  const out: number[] = [];
  for (let n = noteToMidi(lo); n <= noteToMidi(hi); n++) {
    if ((SCALES[scale] as readonly number[]).includes((((n - root) % 12) + 12) % 12)) out.push(n);
  }
  return out;
}

/**
 * Position 0–1 → frequency.
 * musical: snap to the nearest scale note in range (monotonic: higher position never gives a lower note).
 * data: continuous, linear in pitch (cents) between the range ends — no quantization.
 */
export function positionToHz(pos: number, notes: number[], mode: 'musical' | 'data'): number {
  const p = Math.min(1, Math.max(0, pos));
  if (mode === 'data') return midiToHz(notes[0] + p * (notes[notes.length - 1] - notes[0]));
  return midiToHz(notes[Math.round(p * (notes.length - 1))]);
}
