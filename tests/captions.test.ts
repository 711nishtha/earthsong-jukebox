import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRACKS } from '../src/tracks';

describe('live captions', () => {
  for (const t of TRACKS) {
    it(`${t.id}: every frame yields clean, short captions`, () => {
      const ft = JSON.parse(readFileSync(`public/features/${t.id}.json`, 'utf8')) as { hz: number; names: string[]; rows: (number | null)[][] };
      const samples: string[] = [];
      ft.rows.forEach((row, i) => {
        const f = Object.fromEntries(ft.names.map((n, k) => [n, row[k] ?? NaN]));
        const c = t.caption(f);
        for (const s of [c.brief, c.detailed]) {
          expect(s, `t=${i / ft.hz}`).not.toMatch(/NaN|undefined|null|Infinity/);
          expect(s.length).toBeGreaterThan(10);
        }
        // Brief captions are read aloud by screen readers: keep them to one short sentence.
        expect(c.brief.length, c.brief).toBeLessThanOrEqual(110);
        if (i % Math.floor(ft.rows.length / 4) === 0) samples.push(`t=${(i / ft.hz).toFixed(1)} ${c.brief}`);
      });
      if (process.env.SHOW_CAPTIONS) console.log(`${t.id}\n  ${samples.join('\n  ')}`);
    });
  }
});

describe('date words', async () => {
  const { monthYear } = await import('../src/tracks/words');
  it('reads 1 March as March and 31 December as December', () => {
    expect(monthYear(2017 + 59 / 365)).toBe('March 2017');
    expect(monthYear(2017 + 364 / 365)).toBe('December 2017');
    expect(monthYear(2007 + 83 / 365)).toBe('March 2007');
  });
});
