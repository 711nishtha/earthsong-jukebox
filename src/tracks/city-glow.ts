import type { Rect, TimeWindow } from '../analysis/types';
import type { TrackConfig } from './types';

/** Timeline read by hand from the burned-in year label (docs/mappings.md). */
const SEGMENTS: (TimeWindow & { name: string })[] = [
  { name: 'series', from: 0, to: 9 },
  { name: 'fade', from: 9, to: 10.5 },
  { name: 'change', from: 10.5, to: 20.5 },
  { name: 'reset', from: 20.5, to: 22 },
  { name: 'series-zoom', from: 22, to: 36.5 },
  { name: 'change-zoom', from: 36.5, to: 44 },
];
const ZOOM: TimeWindow[] = [{ from: 22, to: 44 }];

/** Pop-out boxes, inset slightly so their frames aren't counted as lights. */
const POPOUTS: Record<string, Rect> = {
  westernEurope: [0.095, 0.36, 0.254, 0.94],
  easternMediterranean: [0.314, 0.07, 0.415, 0.57],
  ukraine: [0.609, 0.065, 0.743, 0.405],
  india: [0.794, 0.495, 0.917, 0.95],
};

// City lights are warm yellow-white; the land underneath is a near-neutral gray (sat ≈ 0.09),
// so a warm-hue + saturation gate separates them even when they're dim after downscaling.
const LIGHTS = { hue: { center: 50, halfWidth: 25 }, minSat: 0.15, minVal: 0.18 };
const MORE = { hue: { center: 265, halfWidth: 35 }, minSat: 0.15, minVal: 0.12 };
const LESS = { hue: { center: 25, halfWidth: 14 }, minSat: 0.3, minVal: 0.15 };

/** The world map is drawn twice (32:9); analyse the left copy only so nothing is counted twice. */
const LEFT_COPY_MASK = {
  include: [[0, 0, 0.5, 1] as Rect],
  exclude: [
    { rect: [0.46, 0.44, 0.58, 0.66] as Rect }, // year label + change colourbar
    { rect: POPOUTS.westernEurope, when: ZOOM },
    { rect: POPOUTS.easternMediterranean, when: ZOOM },
  ],
};

export const cityGlow: TrackConfig = {
  id: 'city-glow',
  title: 'City Glow',
  tagline: 'Earth’s night lights from 2012 to 2023, and where they grew or faded.',
  svsId: 5313,
  video: 'media/city-glow.mp4',
  poster: 'media/city-glow.webp',
  aspect: 32 / 9,
  luts: [],
  flashing: false,
  analysis: {
    // City lights are a few pixels across; 320×90 keeps them from averaging away into the dark
    // (192×54 lost them) while staying inside the 5 ms tick budget (384×108 did not).
    width: 320,
    height: 90,
    hz: 15,
    mask: LEFT_COPY_MASK,
    extractors: [
      { kind: 'gate', id: 'lights', gate: LIGHTS, bands: 8 },
      { kind: 'gate', id: 'more', gate: MORE },
      { kind: 'gate', id: 'less', gate: LESS },
      // Pop-outs sit on both map copies, so they get their own whole-frame mask.
      { kind: 'regions', id: 'pop', gate: LIGHTS, regions: POPOUTS, mask: {} },
      { kind: 'regions', id: 'popMore', gate: MORE, regions: POPOUTS, mask: {} },
      { kind: 'regions', id: 'popLess', gate: LESS, regions: POPOUTS, mask: {} },
      {
        kind: 'timeline',
        id: 'year',
        interpolate: 'step',
        segments: SEGMENTS,
        keyframes: [
          [0, 2012], [0.5, 2013], [1, 2014], [1.5, 2015], [2.5, 2016], [3, 2017], [3.5, 2018], [4, 2019],
          [4.5, 2020], [5, 2021], [6, 2022], [6.5, 2023], [20.5, 2012], [27.5, 2013], [28.5, 2014],
          [29, 2015], [29.5, 2016], [30, 2017], [30.5, 2018], [31, 2019], [32, 2020], [32.5, 2021],
          [33, 2022], [33.5, 2023],
        ],
      },
    ],
    smoothing: { default: 0.35, perFeature: { 'year.value': 0, 'year.segment': 0 } },
  },
};
