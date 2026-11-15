/**
 * Earth Jukebox v2 design tokens: the ONE place for colour, type, spacing, easing and timing.
 * CSS reads them as custom properties (applyTokens), GSAP/Three read them directly.
 *
 * Palette idea: deep space (not flat black) lit by the colours of the NASA visualizations
 * themselves: ocean teal, aerosol violet, city-light amber, forest green, lightning gold.
 * Text contrast is checked in tests/tokens.test.ts (WCAG AA minimum, most pairs AAA).
 */
export const color = {
  space: '#05060a', // page background
  spaceDeep: '#020306',
  spaceLift: '#0c0f1a', // raised surfaces before glass
  text: '#eceef5', // primary text
  textMuted: '#a7aec4', // secondary text
  textFaint: '#7f88a3', // captions on scrims only (checked ≥ 4.5:1 on space)
  hairline: 'rgba(236, 238, 245, 0.12)', // decorative dividers
  control: 'rgba(236, 238, 245, 0.55)', // interactive outlines (≥ 3:1 non-text contrast)
  glass: 'rgba(10, 12, 22, 0.58)',
  glassStrong: 'rgba(8, 10, 18, 0.82)',
  scrim: 'rgba(5, 6, 10, 0.72)',
  focus: '#ffffff',
  // Data accents, sampled from the visualizations' own colour scales.
  ocean: '#5fd4c8',
  aerosol: '#b9a2ff',
  city: '#f6b94c',
  forest: '#93d68e',
  lightning: '#ffe36e',
  danger: '#ff9f8f',
} as const;

/** Per-track accent: the hue the track's own visualization is known for. */
export const trackAccent: Record<string, string> = {
  'ocean-heat': color.ocean,
  'forest-heights': color.forest,
  'four-winds': color.aerosol,
  'city-glow': color.city,
  'storm-drums': color.lightning,
};

/** Nebula palettes (three hues each) for the WebGL background, per track and for the intro. */
export const nebula: Record<string, [string, string, string]> = {
  intro: ['#0b1030', '#2a1650', '#0c3a4a'],
  'ocean-heat': ['#06243a', '#0e4c5c', '#5a1f2a'],
  'forest-heights': ['#0b2416', '#24401c', '#2a2410'],
  'four-winds': ['#1d0f33', '#3a1640', '#0f2a2e'],
  'city-glow': ['#20140a', '#3a2408', '#140e2a'],
  'storm-drums': ['#14142a', '#2a2610', '#0a1626'],
};

export const font = {
  display: "'Instrument Serif', 'Instrument Serif Fallback', 'Iowan Old Style', Georgia, serif",
  ui: "'Geist Sans', 'Geist Fallback', 'Segoe UI', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
} as const;

/** Fluid type scale (min, preferred, max). Body never below 16px. */
export const type = {
  hero: 'clamp(3.25rem, 8.5vw, 9.5rem)',
  h1: 'clamp(2.75rem, 6vw, 6rem)',
  h2: 'clamp(2rem, 3.8vw, 3.75rem)',
  h3: 'clamp(1.35rem, 2vw, 1.75rem)',
  lead: 'clamp(1.15rem, 1.6vw, 1.45rem)',
  body: '1.0625rem',
  small: '1rem',
  label: '0.95rem', // small-caps labels render at x-height; keep the base ≥ 16px-ish
} as const;

export const space = { xs: '0.5rem', s: '0.875rem', m: '1.5rem', l: '2.5rem', xl: '4.5rem', xxl: '8rem' } as const;
export const radius = { s: '10px', m: '18px', l: '28px', pill: '999px' } as const;

/** Motion: long, calm, never bouncy. CSS cubic-béziers mirror the GSAP eases. */
export const ease = {
  outExpo: 'expo.out',
  inOutExpo: 'expo.inOut',
  outQuart: 'power4.out',
  inOutQuart: 'power4.inOut',
  css: {
    outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
    outQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  },
} as const;

/** Seconds. */
export const duration = {
  fast: 0.35,
  base: 0.8,
  slow: 1.4,
  reveal: 1.6,
  warp: 3.2,
  crossfade: 0.6,
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Writes every token as a CSS custom property on :root (called once, before the app mounts). */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  for (const [k, v] of Object.entries(color)) set(`--c-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(font)) set(`--f-${k}`, v);
  for (const [k, v] of Object.entries(type)) set(`--t-${k}`, v);
  for (const [k, v] of Object.entries(space)) set(`--s-${k}`, v);
  for (const [k, v] of Object.entries(radius)) set(`--r-${k}`, v);
  for (const [k, v] of Object.entries(ease.css)) set(`--e-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(duration)) set(`--d-${k}`, `${v}s`);
}
