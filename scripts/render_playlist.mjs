/**
 * Pre-renders every track to MP3 (musical and data-only) for the /playlist fallback.
 * Uses the app's own renderOffline() inside a real browser (Web Audio needs one), so the files
 * match what the live jukebox plays for the same features.
 *
 *   node scripts/render_playlist.mjs            # all tracks
 *   node scripts/render_playlist.mjs ocean-heat # one track
 *
 * Requires: an installed Google Chrome (playwright-core channel "chrome") and ffmpeg on PATH.
 * Writes public/audio/<track>-<mode>.mp3 and public/audio/index.json (sizes, durations, peaks).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'audio');
const MODES = ['musical', 'data'];
const BITRATE = '128k';

// No HMR or file watching: an edit elsewhere in the repo must not reload the page mid-render.
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: true, hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('http://localhost:5199/');

const wanted = process.argv.slice(2);
const ids = await page.evaluate(async () => (await import('/src/tracks/index.ts')).TRACKS.map((t) => t.id));
mkdirSync(OUT, { recursive: true });
const index = {};

for (const id of ids.filter((x) => !wanted.length || wanted.includes(x))) {
  for (const mode of MODES) {
    const t0 = Date.now();
    // Render in the page, return 16-bit WAV bytes as base64 plus a measured peak (dBFS).
    const { b64, peakDb, seconds } = await page.evaluate(async ({ id, mode }) => {
      const { TRACKS } = await import('/src/tracks/index.ts');
      const { renderOffline } = await import('/src/audio/render.ts');
      const { encodeWav } = await import('/src/audio/wav.ts');
      const track = TRACKS.find((t) => t.id === id);
      const ft = await (await fetch(`/features/${id}.json`)).json();
      const buf = await renderOffline(track.sound, ft, mode);
      let peak = 0;
      for (let c = 0; c < buf.numberOfChannels; c++) for (const x of buf.getChannelData(c)) peak = Math.max(peak, Math.abs(x));
      const bytes = new Uint8Array(await encodeWav(buf).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { b64: btoa(bin), peakDb: 20 * Math.log10(peak), seconds: buf.duration };
    }, { id, mode });

    const wav = join(OUT, `${id}-${mode}.wav`);
    const mp3 = join(OUT, `${id}-${mode}.mp3`);
    writeFileSync(wav, Buffer.from(b64, 'base64'));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', BITRATE,
      '-metadata', `title=Earth Jukebox: ${id} (${mode})`, '-metadata', 'artist=Earth Jukebox (team Earthsong)',
      '-metadata', 'comment=Sonification of a NASA SVS visualization; see the playlist page for credits', mp3]);
    rmSync(wav);
    index[`${id}-${mode}`] = { file: `audio/${id}-${mode}.mp3`, bytes: statSync(mp3).size, seconds: Math.round(seconds * 10) / 10, peakDb: Math.round(peakDb * 100) / 100 };
    console.log(`${id} ${mode}: ${seconds.toFixed(1)} s, peak ${peakDb.toFixed(2)} dBFS, ${(statSync(mp3).size / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
await browser.close();
await server.close();
