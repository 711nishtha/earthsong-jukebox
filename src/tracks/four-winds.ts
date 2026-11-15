import type { TrackConfig } from './types';

/** 2024-08-01 → 2024-09-14 per SVS 5572. */
export const fourWinds: TrackConfig = {
  id: 'four-winds',
  title: 'Four Winds',
  tagline: 'Dust, smoke, sea salt and pollution drifting around the globe, Aug–Sep 2024.',
  svsId: 5572,
  video: 'media/four-winds.mp4',
  poster: 'media/four-winds.webp',
  aspect: 16 / 9,
  luts: ['four-winds'],
  flashing: false,
  analysis: {
    width: 160,
    height: 90,
    hz: 15,
    extractors: [{ kind: 'categories', id: 'aer', lut: 'four-winds' }],
    smoothing: { default: 0.8 },
  },
  sound: {
    tonic: 'A',
    scale: 'minor',
    mood: 'Restless, with a quiet sense of urgency. A minor; each kind of particle is its own instrument.',
    layers: [
      {
        id: 'dust', label: 'Dust', kind: 'noise', noise: 'pink', fidelity: 'data-categorical',
        description: 'A soft, wind-like hiss that swells with desert dust (pink/purple on screen).',
        gainDb: -40, cutoff: 1200,
      },
      {
        id: 'seaSalt', label: 'Sea salt', kind: 'bell', fidelity: 'data-categorical',
        description: 'Glassy bells that sparkle with sea salt (pale, bright swirls, often around storms).',
        gainDb: -13, range: ['A4', 'A6'], pattern: 'value', maxRate: 5, velocity: 0.45,
      },
      {
        id: 'smoke', label: 'Smoke', kind: 'pad', fidelity: 'data-categorical',
        description: 'A low, dark drone that grows with smoke from fires (red/orange).',
        gainDb: -12, cutoff: 500, notes: ['A1', 'E2'],
      },
      {
        id: 'smokeTension', label: 'Smoke tension', kind: 'pad', fidelity: 'data-categorical',
        description: 'When smoke is heavy, a note a half-step above the drone adds tension.',
        gainDb: -60, cutoff: 700, notes: ['Bb2'],
      },
      {
        id: 'sulfate', label: 'Sulfate', kind: 'pluck', fidelity: 'data-categorical',
        description: 'A steady, mechanical pulse for sulfate from pollution and volcanoes (green).',
        gainDb: -16, range: ['E3', 'E4'], pattern: 'up', maxRate: 6, velocity: 0.45,
      },
      {
        id: 'bed', label: 'Air', kind: 'pad', fidelity: 'artistic',
        description: 'A quiet A minor chord under everything. It does not change with the data.',
        gainDb: -23, cutoff: 900, notes: ['A2', 'C4', 'E4'],
      },
    ],
    bindings: [
      {
        feature: 'aer.dust', in: [0, 0.08], curve: 'sqrt', target: 'dust.gainDb', out: [-48, -14],
        visual: 'Dust (pink/purple)', measured: 'Share of the globe in the dust colour class', audio: 'Loudness of the wind hiss',
        range: '0–8 % of globe → silent to clear', fidelity: 'data-categorical', why: 'Saharan dust plumes swell like wind.',
      },
      {
        feature: 'aer.dustLum', in: [0.3, 0.55], target: 'dust.cutoff', out: [500, 2600],
        visual: 'Brightness of the dust', measured: 'Average brightness of dust pixels', audio: 'Brightness of the hiss',
        range: 'dim → muffled; bright → airy', fidelity: 'data-approx', why: 'Thicker plumes are drawn brighter, so they sound brighter.',
      },
      {
        feature: 'aer.dustCx', in: [0.3, 0.7], target: 'dust.pan', out: [-0.7, 0.7],
        visual: 'Where the dust is', measured: 'Horizontal centre of dust pixels', audio: 'Stereo position',
        range: 'left ↔ right', fidelity: 'visual', why: 'Separates the instruments in space.',
      },
      {
        feature: 'aer.seaSalt', in: [0.002, 0.025], target: 'seaSalt.rate', out: [0.3, 5], when: { feature: 'aer.seaSalt', min: 0.002 },
        visual: 'Sea salt (pale bright swirls)', measured: 'Share of the globe in the sea-salt class', audio: 'Bell notes per second',
        range: '0.2–2.5 % of globe → 0.3–5 notes/s', fidelity: 'data-categorical', why: 'Storms whip up sea spray; the bells sparkle with them.',
      },
      {
        feature: 'aer.seaSaltLum', in: [0.35, 0.6], target: 'seaSalt.note', out: [0, 1],
        visual: 'Brightness of the sea salt', measured: 'Average brightness of sea-salt pixels', audio: 'Pitch of the bells',
        range: 'dim → A4; bright → A6', fidelity: 'data-approx', why: 'Denser spray is drawn brighter and rings higher.',
      },
      {
        feature: 'aer.seaSaltCx', in: [0.3, 0.7], target: 'seaSalt.pan', out: [-0.7, 0.7],
        visual: 'Where the sea salt is', measured: 'Horizontal centre of sea-salt pixels', audio: 'Stereo position',
        range: 'left ↔ right', fidelity: 'visual', why: 'Separates the instruments in space.',
      },
      {
        feature: 'aer.smoke', in: [0, 0.045], curve: 'sqrt', target: 'smoke.gainDb', out: [-48, -12],
        visual: 'Smoke from fires (red/orange)', measured: 'Share of the globe in the smoke / black-carbon class', audio: 'Loudness of the low drone',
        range: '0–4.5 % of globe → silent to strong', fidelity: 'data-categorical', why: 'Fire smoke is the dark, heavy low end.',
      },
      {
        feature: 'aer.smoke', in: [0.02, 0.045], target: 'smokeTension.gainDb', out: [-50, -22], when: { feature: 'aer.smoke', min: 0.02 },
        visual: 'Heavy smoke', measured: 'Smoke share above 2 % of the globe', audio: 'A tense half-step above the drone',
        range: 'off below 2 %; grows to 4.5 %', fidelity: 'data-categorical', why: 'Big fire seasons should feel uneasy.',
      },
      {
        feature: 'aer.sulfate', in: [0.01, 0.09], target: 'sulfate.rate', out: [1, 6],
        visual: 'Sulfate (green)', measured: 'Share of the globe in the sulfate class', audio: 'Speed of the pulse',
        range: '1–9 % of globe → 1–6 pulses/s', fidelity: 'data-categorical', why: 'Pollution as a machine-like pulse.',
      },
      {
        feature: 'aer.sulfateCx', in: [0.3, 0.7], target: 'sulfate.pan', out: [-0.7, 0.7],
        visual: 'Where the sulfate is', measured: 'Horizontal centre of sulfate pixels', audio: 'Stereo position',
        range: 'left ↔ right', fidelity: 'visual', why: 'Separates the instruments in space.',
      },
    ],
  },
};
