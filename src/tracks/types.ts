import type { AnalysisConfig, Features } from '../analysis/types';
import type { SoundSpec } from '../audio/types';
import type { Caption } from './words';

/** Everything about one visualization lives in one config; adding a track = adding a file. */
export interface TrackConfig {
  id: string;
  title: string;
  /** One line for the jukebox card. */
  tagline: string;
  svsId: number;
  /** Paths relative to the site base (public/). */
  video: string;
  poster: string;
  /** Video aspect ratio, width / height. */
  aspect: number;
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
}
