import type { ProbeSpec } from '../analysis/probe';
import type { AnalysisConfig, Features } from '../analysis/types';
import type { SoundSpec } from '../audio/types';
import type { Caption } from './words';

/** One side of a comparison: a window of the clip (seconds) and the frame used for its still. */
export interface CompareMoment {
  label: string;
  from: number;
  to: number;
  still: number;
}

/**
 * "Hear the change": play the sonification of moment A, moment B, and only what changed (Δ).
 * Snapshots are the mean precomputed features over each window; the summary is written from them.
 */
export interface CompareSpec {
  /** change = over the years; season = within one year (never presented as a trend). */
  kind: 'change' | 'season';
  heading: string;
  a: CompareMoment;
  b: CompareMoment;
  /** One plain-English sentence from the two snapshots. Real values only. */
  summary: (a: Features, b: Features) => string;
  /** The honest caveat shown under the summary. */
  note: string;
  /** Optional ffmpeg filter for the display stills only (e.g. lifting dark night frames). */
  stillFilter?: string;
}

/** Everything about one visualization lives in one config; adding a track = adding a file. */
export interface TrackConfig {
  id: string;
  title: string;
  /** One line for the jukebox card. */
  tagline: string;
  /** One-word realm for editorial labels ("Track 01 · Ocean"). */
  realm: string;
  svsId: number;
  /** Paths relative to the site base (public/). */
  video: string;
  poster: string;
  /** Video aspect ratio, width / height. */
  aspect: number;
  /**
   * How the visualization relates to the 3D globe:
   * - equirect: a true 2:1 lat/lon map, wrapped onto the globe as a live texture
   * - flat: a map whose projection we could not register precisely; shown flat, never wrapped
   * - globe: already a rendered globe; shown in a floating viewport
   */
  projection: 'equirect' | 'flat' | 'globe';
  /** LUT files this track's analysis needs (public/luts/<name>.json). */
  luts: string[];
  /** Show a photosensitivity warning and default to reduced flashing. */
  flashing: boolean;
  analysis: AnalysisConfig;
  sound: SoundSpec;
  /** Long-form audio description of the visualization for blind and low-vision users. */
  description: string[];
  /** "Science details" expander: what the data is and its caveats. */
  science: string[];
  /** Live caption from the current (smoothed) features. */
  caption: (f: Features) => Caption;
  /** Optional "Hear the change" comparison. */
  compare?: CompareSpec;
  /** Instrument mode: what the value under the crosshair means. */
  probe: ProbeSpec;
}
