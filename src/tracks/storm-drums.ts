import type { TrackConfig } from './types';
import { level, monthYear, season, side } from './words';

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
  description: [
    'A slowly turning, dark gray globe against a starry sky. Each small yellow dot is a lightning event detected by the Lightning Imaging Sensor on the International Space Station.',
    'The dots show a moving 10-day window, so the picture changes through the seasons from 2017 to 2023. A dial in the lower-right corner shows the year and the time of year.',
    'Lightning appears in clusters over land, and the busiest areas move as the seasons change. NASA made this view to show those seasonal patterns.',
  ],
  science: [
    'Data: the quality-controlled Lightning Imaging Sensor (LIS) on the International Space Station. The SVS page describes January 2017 to July 2023; the part we play starts around March 2017 on the video’s dial. LIS sees the tropics and mid-latitudes.',
    'We cut the opening introduction (a close-up of the Space Station’s path) and kept the 10-day-window part. Time in this video is not evenly spaced: 2017 takes about 37 seconds and later years about 16 seconds. We read the year changes from the on-screen dial, so dates in captions are approximate.',
    'Drum hits follow newly appearing dots. Some “new” dots are just the globe turning, so this mapping is partly visual.',
  ],
  caption(f) {
    const d = f['date.value'];
    const when = Number.isFinite(d) ? `Around ${monthYear(d)} (northern ${season(d)})` : 'Now';
    const burst = level(f['bolt.onsets'], 0.02, 0.14);
    const amount = level(f['bolt.share'], 0, 0.035);
    const drums = burst === 'low' ? 'few drum hits' : burst === 'medium' ? 'steady drums' : 'fast drums';
    return {
      brief: `${when}: ${burst} new lightning ${side(f['bolt.onsetCx'])} → ${drums}.`,
      detailed: `${when}. New lightning is ${burst}, mostly ${side(f['bolt.onsetCx'])} of the globe, so you hear ${drums}. Overall lightning on screen is ${amount}, which sets how loud the thunder rumble is.`,
    };
  },
  sound: {
    tonic: 'E',
    scale: 'minorPentatonic',
    mood: 'Tense but musical: soft drums and distant thunder in E minor pentatonic.',
    layers: [
      {
        id: 'toms', label: 'Drums', kind: 'drum', fidelity: 'data-relative',
        description: 'Soft drums. Each burst of newly detected lightning is a hit; northern storms play higher drums.',
        gainDb: -15, range: ['E2', 'E3'], pattern: 'value', maxRate: 6, velocity: 0.5,
      },
      {
        id: 'rumble', label: 'Thunder', kind: 'noise', noise: 'brown', fidelity: 'data-relative',
        description: 'A low rumble that grows with the amount of lightning on screen.',
        gainDb: -40, cutoff: 250,
      },
      {
        id: 'bed', label: 'Night', kind: 'pad', fidelity: 'artistic',
        description: 'A quiet, low E minor chord. It does not change with the data.',
        gainDb: -24, cutoff: 700, notes: ['E2', 'B2', 'G3'],
      },
    ],
    bindings: [
      {
        feature: 'bolt.onsets', in: [0.02, 0.14], target: 'toms.rate', out: [0.5, 6], when: { feature: 'bolt.onsets', min: 0.02 },
        visual: 'New lightning appearing', measured: 'Share of the picture (outside the date dial) newly lit by yellow dots, per second',
        audio: 'Drum hits per second', range: '0.5–6 hits/s (capped)', fidelity: 'data-relative',
        why: 'Each burst of detected lightning is a drum hit. Some “new” dots are just the globe turning, so this is partly visual.',
      },
      {
        feature: 'bolt.onsets', in: [0.02, 0.16], target: 'toms.velocity', out: [0.3, 0.7],
        visual: 'Size of the burst', measured: 'Same as above', audio: 'How hard each drum is hit',
        range: 'soft → medium (never loud)', fidelity: 'data-relative', why: 'Bigger bursts hit harder, within a safe ceiling.',
      },
      {
        feature: 'bolt.onsetCy', in: [0.7, 0.2], target: 'toms.note', out: [0, 1],
        visual: 'How far north the new lightning is', measured: 'Vertical centre of newly lit dots', audio: 'Drum pitch',
        range: 'south → E2; north → E3', fidelity: 'visual', why: 'North = up = higher, the same rule as on the flat maps.',
      },
      {
        feature: 'bolt.onsetCx', in: [0.3, 0.7], target: 'toms.pan', out: [-0.8, 0.8],
        visual: 'Where the new lightning is', measured: 'Horizontal centre of newly lit dots', audio: 'Stereo position',
        range: 'left ↔ right', fidelity: 'visual', why: 'Hear storms over Africa vs the Americas as the globe turns.',
      },
      {
        feature: 'bolt.share', in: [0, 0.035], curve: 'sqrt', target: 'rumble.gainDb', out: [-46, -20],
        visual: 'Amount of lightning on screen', measured: 'Share of the frame covered by yellow lightning dots',
        audio: 'Loudness of the thunder rumble', range: '0–3.5 % of frame → silent to clear', fidelity: 'data-relative',
        why: 'Busy storm seasons rumble louder.',
      },
      {
        feature: 'bolt.share', in: [0, 0.035], target: 'rumble.cutoff', out: [150, 500],
        visual: 'Amount of lightning on screen', measured: 'Same as above', audio: 'Brightness of the rumble',
        range: 'distant → closer', fidelity: 'data-relative', why: 'More lightning sounds nearer.',
      },
    ],
  },
};
