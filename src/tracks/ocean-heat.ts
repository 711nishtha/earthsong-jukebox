import type { TrackConfig } from './types';

/** Decimal year for the SVS-stated range 2007-03-25 → 2008-03-03 (assumes evenly spaced frames). */
const START = 2007 + 83 / 365;
const END = 2008 + 62 / 366;

export const oceanHeat: TrackConfig = {
  id: 'ocean-heat',
  title: 'Ocean Heat',
  tagline: 'Sea surface temperature and currents, March 2007 to March 2008.',
  svsId: 3912,
  video: 'media/ocean-heat.mp4',
  poster: 'media/ocean-heat.webp',
  aspect: 2,
  luts: ['ocean-heat'],
  flashing: false,
  analysis: {
    width: 160,
    height: 80,
    hz: 15,
    extractors: [
      {
        // Coloured flow streaks only: gray land and the dark empty ocean fail the gate.
        kind: 'continuous',
        id: 'sst',
        lut: 'ocean-heat',
        gate: { minSat: 0.35, minVal: 0.12 },
        maxDistance: 10,
        bins: { cold: [0, 10], cool: [10, 20], warm: [20, 26], hot: [26, 33] },
        thresholds: { hot: 26 },
      },
      { kind: 'scan', id: 'scan', lut: 'ocean-heat', gate: { minSat: 0.35, minVal: 0.12 }, maxDistance: 10, periodSec: 8, bandWidth: 0.03 },
      { kind: 'motion', id: 'motion' },
      { kind: 'timeline', id: 'date', keyframes: [[0, START], [66.7, END]], interpolate: 'linear' },
    ],
    smoothing: { default: 0.5, perFeature: { 'scan.value': 0.08, 'scan.x': 0, 'date.value': 0 } },
  },
  sound: {
    tonic: 'D',
    scale: 'dorian',
    mood: 'Calm and wide, like a slow tide. Dorian mode: warm but not sugary.',
    layers: [
      {
        id: 'scan', label: 'Scan', kind: 'mallet', fidelity: 'data-tested',
        description: 'A marimba-like voice follows the bright line sweeping west to east. Each note is the sea temperature under the line.',
        gainDb: -10, range: ['D3', 'D6'], pattern: 'value', maxRate: 6, velocity: 0.55,
      },
      {
        id: 'pad', label: 'Ocean chord', kind: 'pad', fidelity: 'data-tested',
        description: 'A soft chord. Its low notes swell when more of the ocean is cold; its high notes swell when more is hot.',
        gainDb: -20, cutoff: 1200, notes: ['D2', 'A2', 'F3', 'A3', 'E4'],
      },
    ],
    bindings: [
      {
        feature: 'scan.value', in: [0, 32], target: 'scan.note', out: [0, 1],
        visual: 'Sea temperature under the scan line', measured: 'Colour → °C via the SVS colourbar (hue match), median of the scan column',
        audio: 'Pitch of the scan notes', range: '0 °C → D3 … 32 °C → D6', fidelity: 'data-tested',
        why: 'Warmer water = higher note, so every sweep sings cold poles, warm tropics, cold poles.',
      },
      {
        feature: 'scan.coverage', in: [0.12, 0.6], target: 'scan.rate', out: [2, 6], when: { feature: 'scan.coverage', min: 0.12 },
        visual: 'How much ocean is under the scan line', measured: 'Share of the scan column showing temperature colours',
        audio: 'Notes per second', range: 'silent over land; 2–6 notes/s', fidelity: 'visual',
        why: 'Continents become audible gaps, so you can follow the map by ear.',
      },
      {
        feature: 'scan.x', in: [0, 1], target: 'scan.pan', out: [-0.8, 0.8],
        visual: 'Scan line position', measured: 'Read-head position, west → east', audio: 'Stereo position',
        range: 'left (west) → right (east)', fidelity: 'artistic', why: 'Lets your ears track the sweep, like the radar in NASA’s Caldwell 73 sonification.',
      },
      {
        feature: 'sst.cold', in: [0.22, 0.29], target: 'pad.tone1Db', out: [-24, 0], amplified: true,
        visual: 'Cold water (below 10 °C)', measured: 'Share of ocean pixels whose colour means < 10 °C',
        audio: 'Loudness of the low A in the chord', range: '22–29 % of ocean → quiet to full', fidelity: 'data-tested',
        why: 'Cold water is the low, dark part of the chord.',
      },
      {
        feature: 'sst.cool', in: [0.21, 0.27], target: 'pad.tone2Db', out: [-24, 0], amplified: true,
        visual: 'Cool water (10–20 °C)', measured: 'Share of ocean pixels whose colour means 10–20 °C',
        audio: 'Loudness of the middle F', range: '21–27 % of ocean → quiet to full', fidelity: 'data-tested',
        why: 'Each temperature band owns one note of the chord.',
      },
      {
        feature: 'sst.warm', in: [0.16, 0.25], target: 'pad.tone3Db', out: [-24, 0], amplified: true,
        visual: 'Warm water (20–26 °C)', measured: 'Share of ocean pixels whose colour means 20–26 °C',
        audio: 'Loudness of the upper A', range: '16–25 % of ocean → quiet to full', fidelity: 'data-tested',
        why: 'Each temperature band owns one note of the chord.',
      },
      {
        feature: 'sst.hot', in: [0.26, 0.35], target: 'pad.tone4Db', out: [-24, 0], amplified: true,
        visual: 'Hot water (26 °C and above)', measured: 'Share of ocean pixels whose colour means ≥ 26 °C',
        audio: 'Loudness of the top E', range: '26–35 % of ocean → quiet to full', fidelity: 'data-tested',
        why: 'The hottest water is the brightest, highest note.',
      },
      {
        feature: 'motion.amount', in: [0.015, 0.04], target: 'pad.cutoff', out: [500, 2400],
        visual: 'Swirling motion of the current lines', measured: 'Average brightness change per second',
        audio: 'Brightness (filter) of the chord', range: 'calm → muffled; busy → bright', fidelity: 'visual',
        why: 'Adds life as the currents swirl; it is a property of the animation, not a measurement.',
      },
    ],
  },
};
