/**
 * Cross-engine smoke test of the built site (Chromium via installed Chrome, Firefox, WebKit).
 * Presses K (a real keyboard gesture) and checks: video plays, AudioContext runs, live analysis
 * produces features, captions change, and the console has no errors.
 *
 *   npm run build && npx vite preview --port 4173 &   then   node scripts/smoke_browsers.mjs [url]
 *   (needs: npx playwright-core install firefox webkit)
 */
import { chromium, firefox, webkit } from 'playwright-core';

const URL = process.argv[2] ?? 'http://localhost:4173/?track=ocean-heat';
const ENGINES = [
  ['chrome', () => chromium.launch({ channel: 'chrome' })],
  ['firefox', () => firefox.launch({ firefoxUserPrefs: { 'media.autoplay.default': 0 } })],
  ['webkit', () => webkit.launch()],
];

// Records every AudioContext so we can read its state from the test.
const TRACK_AUDIO = `(() => {
  window.__ctx = [];
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const C = window[name];
    if (!C) continue;
    window[name] = class extends C { constructor(...a) { super(...a); window.__ctx.push(this); } };
  }
})();`;

for (const [name, launch] of ENGINES) {
  const result = { engine: name };
  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 140)));
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)));
    await page.addInitScript(TRACK_AUDIO);
    await page.goto(URL, { waitUntil: 'networkidle' });
    result.version = browser.version();
    // v2 opens on the Enter screen: Enter is the gesture that unlocks audio, then the jukebox appears.
    const enter = page.getByRole('button', { name: 'Enter', exact: true });
    if (await enter.count()) {
      await enter.click();
      await page.waitForSelector('#listen-heading', { timeout: 15000 });
      result.enteredJukebox = true;
    }
    result.mediaRequestsBeforePlay = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\.mp4/.test(e.name)).length); // not initiatorType 'video': posters use it too
    const before = await page.textContent('.caption-text');
    const t0 = Date.now();
    await page.keyboard.press('k');
    // Time from the key press until the video is actually advancing (audio graph is built before play()).
    await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.currentTime > 0.05; }, null, { timeout: 15000 }).catch(() => {});
    result.keyToPlaybackMs = Date.now() - t0;
    await page.waitForTimeout(4000);
    Object.assign(result, await page.evaluate(() => {
      const v = document.querySelector('video');
      const states = (window.__ctx || []).map((c) => c.state);
      return {
        canPlayH264: v.canPlayType('video/mp4; codecs="avc1.640028"') || 'no',
        videoPlaying: !v.paused && v.currentTime > 0.5,
        videoError: v.error ? v.error.code : null,
        rvfc: 'requestVideoFrameCallback' in v,
        audioContexts: states.join(','),
        caption: document.querySelector('.caption-text')?.textContent?.slice(0, 70),
      };
    }));
    result.captionChanged = result.caption !== before.slice(0, 70);
    await page.click('summary:has-text("Show the live numbers")');
    result.features = (await page.textContent('.inspector p'))?.match(/^\d+/)?.[0] ?? '0';
    result.consoleErrors = errors;
  } catch (e) {
    result.failure = e.message.split('\n')[0];
  } finally {
    await browser?.close();
  }
  console.log(JSON.stringify(result));
}
