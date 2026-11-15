import type { TrackConfig } from './types';
import { pct, side } from './words';

const KINDS = [
  { id: 'dust', name: 'dust', colour: 'pink and purple', sound: 'wind hiss' },
  { id: 'smoke', name: 'smoke from fires', colour: 'orange and red', sound: 'low drone' },
  { id: 'seaSalt', name: 'sea salt', colour: 'pale swirls', sound: 'bells' },
  { id: 'sulfate', name: 'sulfate', colour: 'green', sound: 'pulse' },
] as const;

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
  description: [
    'A slowly turning globe on a black background. It shows tiny particles floating in the air, called aerosols, from 1 August to 14 September 2024.',
    'Four colours show four kinds of particles: dust in pink and purple, sea salt as pale blue-white swirls, smoke from fires in orange and red, and sulfate from pollution and volcanoes in bright green. Where they mix, the colours blend.',
    'Things to listen for: a long pink plume of dust blowing west from Africa over the Atlantic, orange smoke over Africa, sea-salt swirls around storms such as Hurricane Ernesto, and green sulfate over Asia and the Pacific.',
  ],
  science: [
    'Data: NASA’s GEOS model (GEOS-FP), which combines weather and aerosol information. Dates: 1 August to 14 September 2024 (SVS page 5572).',
    'The colour legend comes from the related still-image page (SVS 5669). The legend labels red as “Black Carbon”; the page text calls red and orange “smoke from fires”. Both are NASA’s words.',
    'We sort each pixel into one of the four classes by its colour. Where colours blend, the sorting is approximate. How much of the screen a colour covers is not the same as how much of that particle is in the air.',
  ],
  caption(f) {
    const ranked = KINDS.map((k) => ({ ...k, share: f[`aer.${k.id}`] ?? 0 })).sort((a, b) => b.share - a.share);
    const top = ranked[0];
    if (!(top.share > 0.003)) {
      return { brief: 'Little colour on the globe right now, so the air is quiet.', detailed: 'Very little of the globe shows aerosol colours right now, so only the quiet background chord plays.' };
    }
    return {
      brief: `Most visible: ${top.name} (${top.colour}, ${pct(top.share)}) → ${top.sound}.`,
      detailed: `Right now ${ranked.map((k) => `${k.name} covers ${pct(k.share)}`).join(', ')} of the globe. The strongest is ${top.name}, ${side(f[`aer.${top.id}Cx`])}, heard as the ${top.sound}.`,
    };
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
