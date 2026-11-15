import type { Rect, TimeWindow } from '../analysis/types';
import type { TrackConfig } from './types';
import { level, pct } from './words';

const REGION_NAMES: Record<string, string> = {
  westernEurope: 'Western Europe',
  easternMediterranean: 'the Eastern Mediterranean',
  ukraine: 'Ukraine',
  india: 'India',
};

/** Region with the highest value of `${prefix}.${region}`, or null if all are ~0. */
function topRegion(f: Record<string, number>, prefix: string): string | null {
  let best: string | null = null, v = 0.002;
  for (const r of Object.keys(REGION_NAMES)) if ((f[`${prefix}.${r}`] ?? 0) > v) { v = f[`${prefix}.${r}`]; best = r; }
  return best && REGION_NAMES[best];
}

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
  realm: 'Night',
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
  description: [
    'A flat map of the world at night, shown twice side by side. Land is dark gray, oceans are black, and cities glow warm yellow-white.',
    'First, the map steps through each year from 2012 to 2023; the year is shown in the middle. Then the lights fade and a change map appears: purple marks places with more light in 2023 than in 2012, and orange marks places with less light.',
    'The sequence then repeats with four close-up boxes: Western Europe, the Eastern Mediterranean (where the Nile shows as a bright line), Ukraine and India.',
  ],
  science: [
    'Data: NASA’s Black Marble night-lights product from the VIIRS instrument on the Suomi NPP satellite, as yearly averages.',
    'The colour scale has no numbers, so the sounds follow relative brightness and lit area, not measured light levels.',
    'The year on screen is part of the video; we noted by hand when each year appears (within half a second). The main map is analysed from the left copy only, so lights are not counted twice; the close-up boxes are analysed separately.',
  ],
  caption(f) {
    const seg = SEGMENTS[f['year.segment']]?.name;
    const year = f['year.value'];
    if (seg === 'fade') return { brief: 'The lights fade out before the change map.', detailed: 'The yearly lights fade out. Next comes the change map, comparing 2023 with 2012.' };
    if (seg === 'reset') return { brief: 'Back to 2012, now with close-ups.', detailed: 'The sequence starts again at 2012, now with close-up boxes of four regions.' };
    if (seg === 'change' || seg === 'change-zoom') {
      const more = f['more.share'] ?? 0, less = f['less.share'] ?? 0;
      const lead = more >= less * 2 ? 'purple (more light) outweighs orange → mostly rising bells' : less >= more * 2 ? 'orange (less light) outweighs purple → mostly falling notes' : 'a mix of purple and orange → rising and falling notes together';
      const gain = seg === 'change-zoom' ? topRegion(f, 'popMore') : null;
      const loss = seg === 'change-zoom' ? topRegion(f, 'popLess') : null;
      const regions = [gain && `${gain} shows the most purple`, loss && `${loss} shows the most orange`].filter(Boolean).join('; ');
      return {
        brief: `Change map: ${lead}.`,
        detailed: `Change map, 2012 to 2023: ${lead}. Purple covers ${pct(more)} and orange ${pct(less)} of the map.${regions ? ` In the close-ups, ${regions}.` : ''}`,
      };
    }
    const amount = level(f['lights.share'], 0, 0.012);
    const brightest = seg === 'series-zoom' ? topRegion(f, 'pop') : null;
    return {
      brief: `${year}: ${amount} city light → ${amount === 'high' ? 'fast' : amount === 'medium' ? 'steady' : 'slow'} pulse.${brightest ? ` Brightest close-up: ${brightest}.` : ''}`,
      detailed: `${year}. City lights cover ${pct(f['lights.share'])} of the map, so the pulse is ${amount === 'high' ? 'fast' : amount === 'medium' ? 'steady' : 'slow'}. Each slice of the map from west to east is one note of the chord.${brightest ? ` In the close-ups, ${brightest} is brightest.` : ''}`,
    };
  },
  sound: {
    tonic: 'F',
    scale: 'majorPentatonic',
    mood: 'Warm and human: a glowing F major pentatonic chord that rises where lights grew and sinks where they faded.',
    layers: [
      {
        id: 'bands', label: 'World chord', kind: 'pad', fidelity: 'data-relative',
        description: 'Eight notes, one for each slice of the map from west (low, left) to east (high, right). Each note glows with the city lights in its slice.',
        gainDb: -16, cutoff: 2200, notes: ['F3', 'G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4'],
        tonePans: [-0.8, -0.57, -0.34, -0.11, 0.11, 0.34, 0.57, 0.8],
      },
      {
        id: 'pulse', label: 'Pulse', kind: 'pluck', fidelity: 'data-relative',
        description: 'A soft electric-piano pulse. More lit area = faster pulses.',
        gainDb: -16, range: ['F3', 'F5'], pattern: 'value', maxRate: 7, velocity: 0.45,
      },
      {
        id: 'regions', label: 'Close-ups', kind: 'pad', fidelity: 'data-relative',
        description: 'During the close-ups, four notes for Western Europe, the Eastern Mediterranean, Ukraine and India (left to right), each as bright as its lights.',
        gainDb: -14, cutoff: 2600, notes: ['C4', 'F4', 'A4', 'D5'], tonePans: [-0.6, -0.25, 0.3, 0.7],
      },
      {
        id: 'more', label: 'More light', kind: 'bell', fidelity: 'data-relative',
        description: 'In the change map, rising bell notes for places that got brighter (purple).',
        gainDb: -15, range: ['F4', 'F6'], pattern: 'up', maxRate: 6, velocity: 0.45,
      },
      {
        id: 'less', label: 'Less light', kind: 'mallet', fidelity: 'data-relative',
        description: 'In the change map, falling minor notes for places that got darker (orange).',
        gainDb: -13, range: ['F3', 'F5'], pattern: 'down', scale: 'minor', maxRate: 4, velocity: 0.5,
      },
      {
        id: 'bed', label: 'Night', kind: 'pad', fidelity: 'artistic',
        description: 'A quiet, warm low chord under everything. It does not change with the data.',
        gainDb: -24, cutoff: 800, notes: ['F2', 'C3', 'A3'],
      },
      {
        id: 'chime', label: 'Year chime', kind: 'bell', fidelity: 'data-relative',
        description: 'A soft chime each time the year changes.',
        gainDb: -20, range: ['F5', 'F6'], pattern: 'value',
      },
    ],
    bindings: [
      ...Array.from({ length: 8 }, (_, i) => ({
        feature: `lights.band${i}`, in: [0, 0.035] as [number, number], curve: 'sqrt' as const,
        target: `bands.tone${i}Db` as `bands.tone${number}Db`, out: [-40, 0] as [number, number],
        when: { feature: 'year.segment', oneOf: [0, 1, 3, 4] },
        visual: `City lights in map slice ${i + 1} of 8 (west → east)`,
        measured: 'Share of the slice covered by warm light pixels',
        audio: `Loudness of chord note ${i + 1}`, range: '0–3.5 % of slice → silent to full', fidelity: 'data-relative' as const,
        why: 'Hear where on Earth the lights are: west is low and left, east is high and right.',
      })),
      {
        feature: 'lights.share', in: [0, 0.012], target: 'pulse.rate', out: [0.5, 7], when: { feature: 'year.segment', oneOf: [0, 1, 3, 4] },
        visual: 'Total city light', measured: 'Share of the map covered by warm light pixels', audio: 'Pulses per second',
        range: '0–1.2 % of map → 0.5–7 pulses/s', fidelity: 'data-relative', why: 'More lit area = busier, more energetic.',
      },
      {
        feature: 'lights.lum', in: [0.2, 0.5], target: 'pulse.note', out: [0, 1],
        visual: 'How bright the lights are', measured: 'Average brightness of light pixels', audio: 'Pitch of the pulse',
        range: 'dim → F3; bright → F5', fidelity: 'data-relative', why: 'Brighter cities ring higher.',
      },
      ...(['westernEurope', 'easternMediterranean', 'ukraine', 'india'] as const).map((r, i) => ({
        feature: `pop.${r}`, in: [0, r === 'ukraine' ? 0.03 : 0.12] as [number, number], curve: 'sqrt' as const,
        target: `regions.tone${i}Db` as `regions.tone${number}Db`, out: [-40, 0] as [number, number],
        when: { feature: 'year.segment', oneOf: [4, 5] },
        visual: `Lights in the ${['Western Europe', 'Eastern Mediterranean', 'Ukraine', 'India'][i]} close-up`,
        measured: 'Share of the close-up box covered by light pixels', audio: `Loudness of close-up note ${i + 1}`,
        range: r === 'ukraine' ? '0–3 % of box (Ukraine is darker; amplified)' : '0–12 % of box → silent to full',
        fidelity: 'data-relative' as const, amplified: r === 'ukraine',
        why: 'Each close-up region gets its own voice and place in the stereo field.',
      })),
      {
        feature: 'more.share', in: [0, 0.005], target: 'more.rate', out: [0.5, 6], when: { feature: 'year.segment', oneOf: [2, 5] },
        visual: 'Places with more light in 2023 than 2012 (purple)', measured: 'Share of the map in purple', audio: 'Rising bell notes per second',
        range: '0–0.5 % of map → 0.5–6 notes/s', fidelity: 'data-relative', why: 'Growth sounds like rising, bright notes.',
      },
      {
        feature: 'less.share', in: [0, 0.0015], target: 'less.rate', out: [0.5, 4], when: { feature: 'year.segment', oneOf: [2, 5] },
        visual: 'Places with less light in 2023 than 2012 (orange)', measured: 'Share of the map in orange', audio: 'Falling minor notes per second',
        range: '0–0.15 % of map → 0.5–4 notes/s', fidelity: 'data-relative', why: 'Loss sounds like falling, darker notes.',
      },
    ],
    changeTriggers: [{ feature: 'year.value', layer: 'chime', note: 'F5' }],
  },
};
