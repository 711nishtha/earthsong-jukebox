import { describe, expect, it } from 'vitest';
import { color } from '../src/design/tokens';

/** Parses #rrggbb or rgba(r, g, b, a) and alpha-composites it over `under`. */
function rgb(c: string, under: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
  const [r, g, b, a] = c.match(/[\d.]+/g)!.map(Number);
  return [r, g, b].map((v, i) => v * a + under[i] * (1 - a)) as [number, number, number];
}
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('design token contrast (WCAG)', () => {
  const space = rgb(color.space);
  // Worst case for text on glass: glass over a bright nebula patch (#3a2a60-ish).
  const glassOverNebula = rgb(color.glass, [70, 50, 110]);

  it.each([
    ['text on space', color.text, space, 7],
    ['muted on space', color.textMuted, space, 4.5],
    ['faint on space', color.textFaint, space, 4.5],
    ['text on glass over bright nebula', color.text, glassOverNebula, 4.5],
    ['muted on glass over bright nebula', color.textMuted, glassOverNebula, 4.5],
    ['ocean accent on space', color.ocean, space, 4.5],
    ['aerosol accent on space', color.aerosol, space, 4.5],
    ['city accent on space', color.city, space, 4.5],
    ['forest accent on space', color.forest, space, 4.5],
    ['lightning accent on space', color.lightning, space, 4.5],
    ['focus ring on space', color.focus, space, 3],
  ] as const)('%s ≥ %s:1', (_n, fg, bg, min) => {
    expect(ratio(rgb(fg, bg as [number, number, number]), bg as number[])).toBeGreaterThanOrEqual(min);
  });

  it('interactive outlines meet 3:1 non-text contrast', () => {
    expect(ratio(rgb(color.control, space), space)).toBeGreaterThanOrEqual(3);
  });
});
