import type { TrackConfig } from './types';

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
};
