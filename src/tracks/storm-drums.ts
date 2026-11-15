import type { TrackConfig } from './types';

/**
 * Clip = SVS 5011 from 70 s to the end (the 10-day roving window; the ISS-orbit intro is cut).
 * Time in the source is NOT linear (2017 ≈ 37 s, 2018 ≈ 24 s, later years ≈ 16 s), so dates are
 * anchored on the year changes read off the on-screen dial (±2 s, docs/mappings.md) and
 * interpolated in between: month-level precision is approximate.
 */
const YEAR_KEYFRAMES: [number, number][] = [
  [3, 2017 + 59 / 365], // dial appears at about March 2017
  [40, 2018],
  [64, 2019],
  [80, 2020],
  [96, 2021],
  [112, 2022],
  [126, 2023],
  [146.7, 2023 + 212 / 365], // SVS: data through July 2023
];

export const stormDrums: TrackConfig = {
  id: 'storm-drums',
  title: 'Storm Drums',
  tagline: 'Lightning seen from the Space Station, season by season, 2017 to 2023.',
  svsId: 5011,
  video: 'media/storm-drums.mp4',
  poster: 'media/storm-drums.webp',
  aspect: 16 / 9,
  luts: [],
  flashing: true,
  analysis: {
    // Lightning dots are ~3 px at 960 wide; 240×135 keeps most of them as distinct pixels.
    width: 240,
    height: 135,
    hz: 15,
    // The season dial (bottom right) has white and yellow-ish text.
    mask: { exclude: [{ rect: [0.84, 0.74, 1, 1] }] },
    extractors: [
      {
        // Lightning dots are saturated yellow; stars are white/blue, so a yellow hue gate drops them.
        kind: 'gate',
        id: 'bolt',
        gate: { hue: { center: 55, halfWidth: 18 }, minSat: 0.45, minVal: 0.2 },
        onsets: true,
      },
      { kind: 'timeline', id: 'date', keyframes: YEAR_KEYFRAMES, interpolate: 'linear' },
    ],
    smoothing: {
      default: 0.4,
      perFeature: { 'bolt.onsets': 0, 'bolt.onsetCx': 0, 'bolt.onsetCy': 0, 'date.value': 0 },
    },
  },
};
