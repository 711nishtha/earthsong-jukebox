import type { Mode } from '../audio/types';
import type { NarrationLevel } from './narrator';

export interface Prefs {
  mode: Mode;
  narration: NarrationLevel;
  highContrast: boolean;
  audioOnly: boolean;
  haptics: boolean;
  /** Dim and blur flashing videos. The audio is unaffected. */
  reduceFlashing: boolean;
  volume: number;
  /** Single-key shortcuts; WCAG 2.1.4 requires a way to turn them off. */
  shortcuts: boolean;
}

const KEY = 'earth-jukebox:prefs';
const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const moreContrast = typeof matchMedia !== 'undefined' && matchMedia('(prefers-contrast: more)').matches;

const DEFAULTS: Prefs = {
  mode: 'musical',
  narration: 'brief',
  highContrast: moreContrast,
  audioOnly: false,
  haptics: true,
  reduceFlashing: true,
  volume: 0.8,
  shortcuts: true,
};

function load(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Per-viewer settings, remembered in this browser when storage is available. */
export const prefs: Prefs = $state(load());

export function savePrefs(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode or blocked storage: settings still work for this visit */
  }
}

export const prefersReducedMotion = reducedMotion;
