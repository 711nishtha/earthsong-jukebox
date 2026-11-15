/**
 * Renders the Open Graph share images (1200×630) with headless Chrome: original design, our
 * self-hosted OFL fonts, procedural stars (no external imagery).
 *
 *   node scripts/build_og.mjs   ->  public/og-quiz.png, public/og-home.png
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(import.meta.dirname, '..');
const font = (p) => readFileSync(join(ROOT, 'node_modules', p)).toString('base64');
const serif = font('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2');
const sans = font('@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff2');

// Deterministic star field.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 260 }, () => `<i style="left:${rnd() * 100}%;top:${rnd() * 100}%;opacity:${0.25 + rnd() * 0.75};transform:scale(${0.5 + rnd() * 1.5})"></i>`).join('');

const page = (label, title, sub) => `<!doctype html><html><head><style>
@font-face { font-family: S; src: url(data:font/woff2;base64,${serif}); }
@font-face { font-family: G; src: url(data:font/woff2;base64,${sans}); }
body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background:
  radial-gradient(60% 70% at 78% 30%, rgba(42,22,80,.75), transparent 70%),
  radial-gradient(55% 60% at 20% 85%, rgba(12,58,74,.7), transparent 70%),
  radial-gradient(40% 40% at 60% 110%, rgba(95,212,200,.35), transparent 70%), #05060a; color: #eceef5; font-family: G; position: relative; }
i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #fff; }
.c { position: absolute; left: 80px; top: 120px; right: 80px; }
.l { font-variant-caps: all-small-caps; letter-spacing: .18em; font-size: 26px; color: #a7aec4; }
h1 { font-family: S; font-weight: 400; font-size: 132px; line-height: .95; letter-spacing: -.03em; margin: 22px 0 26px; }
p { font-size: 30px; color: #a7aec4; margin: 0; max-width: 900px; }
.arc { position: absolute; right: -180px; bottom: -560px; width: 900px; height: 900px; border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(95,212,200,.55), 0 0 90px rgba(95,212,200,.35); background: radial-gradient(circle at 40% 30%, #0e2a3a, #05060a 70%); }
</style></head><body>${stars}<div class="arc"></div><div class="c"><div class="l">${label}</div><h1>${title}</h1><p>${sub}</p></div></body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [file, html] of [
  ['og-quiz.png', page('Earth Jukebox · listening quiz', 'Can you hear<br>the planet?', 'Eight audio-only questions made from NASA Earth visualizations. Close your eyes and listen.')],
  ['og-home.png', page('Earth Jukebox · NASA Space Apps 2026', 'Close your eyes.<br>Listen to the planet.', 'NASA Earth visualizations turned into sound you can understand, live from the data.')],
]) {
  await tab.setContent(html);
  await tab.waitForTimeout(300);
  await tab.screenshot({ path: join(ROOT, 'public', file) });
  console.log(`wrote public/${file}`);
}
await browser.close();
