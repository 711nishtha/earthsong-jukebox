import type { TrackConfig } from './types';
import { level, pct, side } from './words';

export const forestHeights: TrackConfig = {
  id: 'forest-heights',
  title: 'Forest Heights',
  tagline: 'How tall Earth’s forests are, measured by a laser on the Space Station.',
  svsId: 4950,
  video: 'media/forest-heights.mp4',
  poster: 'media/forest-heights.webp',
  aspect: 16 / 9,
  luts: ['forest-heights'],
  flashing: false,
  analysis: {
    width: 160,
    height: 90,
    hz: 15,
    // The on-video colourbar (bottom left) would read as a strip of every height at once.
    mask: { exclude: [{ rect: [0, 0.86, 0.27, 1] }] },
    extractors: [
      {
        // Brown → green → cream vegetation; blue ocean, black space and gray clouds fail the hue gate.
        kind: 'continuous',
        id: 'height',
        lut: 'forest-heights',
        gate: { hue: { center: 60, halfWidth: 50 }, minSat: 0.06, minVal: 0.12 },
        maxDistance: 40,
        percentile: 75,
        thresholds: { tall: 30 },
      },
    ],
    smoothing: { default: 0.6 },
  },
  description: [
    'A slowly turning globe. Oceans are blue and space is black. On land, forests rise from the surface like a thick carpet. Their height is exaggerated so it can be seen from space.',
    'The colour of the forest shows tree height: dark brown and dark green for short vegetation, bright green for medium, and pale cream-white for the tallest forests, 50 metres or more. A colour bar in the lower-left corner shows 0 to 50 metres.',
    'As the globe turns, different continents come into view. Tropical rainforests appear as large, bright, tall patches.',
  ],
  science: [
    'GEDI (Global Ecosystem Dynamics Investigation) is a laser instrument, called a lidar, on the International Space Station. It measures the 3D structure of forests.',
    'The SVS page says this global view uses data from April 2019 to April 2020. Other versions on the same page say April 2018 to April 2019; we report what is stated for this video.',
    'We read heights by matching colours to the 0–50 m colour bar. The globe is lit from one side, so shaded forests look darker and read a little shorter than they really are. Treat heights as approximate.',
  ],
  caption(f) {
    if (!(f['height.coverage'] >= 0.01)) {
      return { brief: 'Mostly ocean in view, so the trees fall quiet.', detailed: 'Mostly ocean is in view right now, so the plucked notes fall quiet until land turns into view.' };
    }
    const h = Math.round(f['height.p']);
    const pitch = h < 12 ? 'low' : h < 19 ? 'middle' : 'high';
    const shimmer = level(f['height.tall'], 0.02, 0.14);
    return {
      brief: `Forest ${side(f['height.cx'])}, tall trees around ${h} m → ${pitch} plucks, ${shimmer} shimmer.`,
      detailed: `Forest is mostly ${side(f['height.cx'])} of the globe. The taller trees in view are around ${h} metres (approximate), so the plucks are ${pitch}. ${pct(f['height.tall'])} of the forest in view is 30 metres or taller, giving a ${shimmer} high shimmer.`,
    };
  },
  sound: {
    tonic: 'G',
    scale: 'lydian',
    mood: 'Open and airy, a little magical. Lydian mode, with soft woody plucks and high shimmering bells.',
    layers: [
      {
        id: 'melody', label: 'Trees', kind: 'pluck', fidelity: 'data-approx',
        description: 'Soft plucked notes. Taller forest on screen plays higher notes; more forest plays more notes.',
        gainDb: -5, range: ['G3', 'G5'], pattern: 'value', maxRate: 5, velocity: 0.5,
      },
      {
        id: 'canopy', label: 'Canopy', kind: 'pad', fidelity: 'data-approx',
        description: 'High shimmering chord that grows when the tallest forests (30 m and up) turn into view.',
        gainDb: -12, cutoff: 5000, notes: ['B5', 'D6', 'F#6'],
      },
      {
        id: 'ground', label: 'Ground', kind: 'pad', fidelity: 'artistic',
        description: 'A quiet low chord under everything. It does not change with the data.',
        gainDb: -20, cutoff: 800, notes: ['G2', 'D3'],
      },
    ],
    bindings: [
      {
        feature: 'height.p', in: [5, 25], target: 'melody.note', out: [0, 1], amplified: true,
        visual: 'Forest height on screen', measured: 'Colour → metres via the SVS colourbar; 75th percentile of forest pixels',
        audio: 'Pitch of the plucked notes', range: '≈5 m → G3 … ≥25 m → G5', fidelity: 'data-approx',
        why: 'Taller trees = higher notes. Globe shading darkens colours, so heights read a little low.',
      },
      {
        feature: 'height.coverage', in: [0.02, 0.16], target: 'melody.rate', out: [0.5, 4], when: { feature: 'height.coverage', min: 0.01 },
        visual: 'How much forest is in view', measured: 'Share of the frame showing forest colours',
        audio: 'Notes per second', range: '0.5–4 notes/s', fidelity: 'visual',
        why: 'More land in view = a busier texture. Depends on how the globe is turned.',
      },
      {
        feature: 'height.cx', in: [0.3, 0.7], target: 'melody.pan', out: [-0.8, 0.8],
        visual: 'Where the forest is', measured: 'Horizontal centre of forest pixels', audio: 'Stereo position',
        range: 'left ↔ right', fidelity: 'visual', why: 'You hear continents drift across as the globe turns.',
      },
      {
        feature: 'height.tall', in: [0.02, 0.14], target: 'canopy.gainDb', out: [-36, -10],
        visual: 'Tall forest (30 m and up)', measured: 'Share of forest pixels whose colour means ≥ 30 m',
        audio: 'Loudness of the high shimmer', range: '2–14 % → near silent to clear', fidelity: 'data-approx',
        why: 'Rainforests like the Amazon and Congo ring out when they rotate into view.',
      },
    ],
  },
};
