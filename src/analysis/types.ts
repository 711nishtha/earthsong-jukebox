/** Normalized rectangle (0–1 of frame width/height): [x0, y0, x1, y1]. */
export type Rect = readonly [number, number, number, number];

/** Seconds of video time, half-open [from, to). */
export interface TimeWindow {
  from: number;
  to: number;
}

/** One analysis frame: tightly packed RGB or RGBA bytes (canvas gives RGBA, ffmpeg gives RGB). */
export interface Frame {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  channels: 3 | 4;
  /** Video time in seconds. */
  t: number;
}

export type Features = Record<string, number>;

/**
 * HSV pixel test. Hue in degrees. All fields optional; a pixel passes when every given test passes.
 * Baked into an RGB cube once, so it costs nothing per frame.
 */
export interface PixelGate {
  hue?: { center: number; halfWidth: number };
  minSat?: number;
  maxSat?: number;
  minVal?: number;
  maxVal?: number;
}

export interface MaskSpec {
  /** Only these areas are analysed (default: whole frame). */
  include?: Rect[];
  /** Areas ignored, optionally only during some time windows (e.g. pop-out boxes). */
  exclude?: { rect: Rect; when?: TimeWindow[] }[];
}

interface Base {
  /** Feature names are prefixed with this id: `${id}.${stat}`. */
  id: string;
  /** Overrides the track-level mask for this extractor. */
  mask?: MaskSpec;
}

/** Colourbar → data value for every gated pixel. Emits mean, percentile, coverage, threshold shares, bin shares, centroid. */
export interface ContinuousSpec extends Base {
  kind: 'continuous';
  lut: string;
  gate?: PixelGate;
  /** Max colour distance to the bar: degrees of hue (hue LUTs) or RGB units (rgb LUTs). */
  maxDistance: number;
  percentile?: number;
  /** name → value: share of matched pixels at or above it (+ `${name}Cy`, their vertical centroid). */
  thresholds?: Record<string, number>;
  /** name → [lo, hi): share of matched pixels in each value band. */
  bins?: Record<string, [number, number]>;
}

/** A read-head sweeping west→east (the Caldwell 73 "radar" idea): value under the head. */
export interface ScanSpec extends Base {
  kind: 'scan';
  lut: string;
  gate?: PixelGate;
  maxDistance: number;
  periodSec: number;
  /** Width of the read-head column as a fraction of frame width. */
  bandWidth: number;
}

/** Categorical legend (e.g. aerosol types): share, brightness and centroid per class. */
export interface CategoriesSpec extends Base {
  kind: 'categories';
  lut: string;
}

/** Pixels passing a gate: share, centroid, brightness; optional west→east bands and new-pixel onsets. */
export interface GateSpec extends Base {
  kind: 'gate';
  gate: PixelGate;
  bands?: number;
  onsets?: boolean;
}

/** Named sub-areas (e.g. pop-out boxes): share of gated pixels and mean luminance in each. */
export interface RegionsSpec extends Base {
  kind: 'regions';
  gate: PixelGate;
  regions: Record<string, Rect>;
}

/** Mean absolute luminance change since the previous sample. Visual, never data. */
export interface MotionSpec extends Base {
  kind: 'motion';
}

/** Values that come from annotation or the page's stated date range, not pixels. */
export interface TimelineSpec extends Base {
  kind: 'timeline';
  /** [t, value] pairs. */
  keyframes: [number, number][];
  interpolate: 'step' | 'linear';
  /** Named segments; emits `${id}.segment` as the index of the active one (−1 if none). */
  segments?: (TimeWindow & { name: string })[];
}

export type ExtractorSpec =
  | ContinuousSpec
  | ScanSpec
  | CategoriesSpec
  | GateSpec
  | RegionsSpec
  | MotionSpec
  | TimelineSpec;

export interface AnalysisConfig {
  /** Analysis resolution; keep the video's aspect ratio. */
  width: number;
  height: number;
  /** Samples per second. */
  hz: number;
  mask?: MaskSpec;
  extractors: ExtractorSpec[];
  /** EMA time constants in seconds per feature name; 0 = unsmoothed (onsets). */
  smoothing: { default: number; perFeature?: Record<string, number> };
}

/** public/luts/*.json */
export type LutData =
  | {
      kind: 'continuous';
      mode: 'hue' | 'rgb';
      unit: string;
      min: number;
      max: number;
      openEndedMax: boolean;
      samples: [number, number, number, number][];
    }
  | {
      kind: 'categorical';
      categories: {
        id: string;
        label: string;
        rgb: [number, number, number];
        hue: number;
        hueHalfWidth?: number;
        minSat?: number;
        maxSat?: number;
        minVal: number;
      }[];
    };
