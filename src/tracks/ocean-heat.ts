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
};
