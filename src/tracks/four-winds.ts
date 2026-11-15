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
};
