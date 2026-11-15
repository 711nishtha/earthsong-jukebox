# Testing log

What was tested, how, and what was **not** tested. Most recent phase first.

## Phase 6: audits and cross-browser (2026-11-15)

### Lighthouse (production build under `/earthsong-jukebox/`, mobile emulation)
| Page | Accessibility | Best practices | SEO |
|---|---|---|---|
| Jukebox `/` | 100 | 100 | 100 |
| `/playlist/` | 100 | 100 | 100 |
| `/about/` | 100 | 100 | 100 |

The first run scored 96 for Best practices because of a missing favicon; it was added.

### Performance
- **This laptop (unthrottled):**
  - Engine 0.5–1.6 ms per tick (City Glow ~1.5 ms).
  - Pixel read ~3 ms median.
  - Total within the 5 ms budget for most ticks.
- **4× CPU throttling** (rough low-end-phone proxy), City Glow, the heaviest track:
  - Engine 6.0 ms + pixel read 4.3 ms median (8.3 ms p95) at 15 Hz.
  - **0 dropped video frames** out of 261.
  - Audio-only mode skips pixel analysis entirely (precomputed features) for weaker devices.
- **Initial load:** 151 KB transferred before a track plays (the budget is 5 MB).
  - Videos use `preload="none"`, so **no video bytes** are fetched until Play. This was verified in Chrome, Firefox and WebKit.
  - An earlier figure of 129 KB came from Resource Timing while the default video was already being fetched (`Range: bytes=0-`), so it was not a valid measurement. Fixed by moving `preload` ahead of `src`, and by taking duration from the manifest.

### Cross-engine smoke test (`node scripts/smoke_browsers.mjs`, real K key press)
| Engine (version reported by the browser) | Video bytes before Play | Key → playback | H.264 | rVFC | AudioContext | Live features | Captions change | Console errors |
|---|---|---|---|---|---|---|---|---|
| Chrome 157 (installed) | 0 | 0.24 s | yes | yes | running | 15 | yes | none |
| Firefox 159 (Playwright build) | 0 | 0.27 s | yes | yes | running | 15 | yes | none |
| WebKit 27.2 (Playwright, Windows) | 0 | 0.13 s | yes | **no**, so the timer fallback runs | **none: this build has no Web Audio API** | 15 | yes | none |

Key → playback is measured on localhost, so a real network adds the video download time. The audio graph is built before `play()`, so sound starts with the picture.

- **Found and fixed:** without Web Audio, Play threw a cryptic error and the video didn't start. Now the app explains it in plain words, links the MP3 playlist, and still plays the video with live captions. Previews are guarded the same way.
- **Safari itself is not tested.** Real Safari has Web Audio; Playwright’s Windows WebKit does not, so the audio result there says nothing about Safari.

### Fixes from the end-of-phase review
- **Four Winds wording.** Shares are a share of the *whole picture*, not of the globe; the text said "% of the globe", about 3× off. Captions, legend, docs and transcripts now say "of the picture". The audio did not change.
- **Single-key shortcuts** now have an on/off switch (WCAG 2.1.4). Screen-reader users are told that browse mode takes these keys, and that they can use the buttons instead.
- **Arrow keys** are no longer captured inside scrollable regions such as the mapping table, so those regions can be scrolled by keyboard.
- **Export** now pauses playback first, because Tone.Offline swaps the global audio context while it renders.

### Screen reader: still to do by a human
I can inspect the accessibility tree but cannot listen to a screen reader. Suggested 10-minute NVDA + Firefox (or Chrome) pass:
1. Load the site. Press `H` to step through the headings: "Earth Jukebox", then "Pick a visualization", then "Now playing: …".
2. Tab to "A2: Forest Heights …" and press Enter. NVDA should say "pressed".
3. Press `K`. Within a few seconds NVDA should say "Playing Forest Heights. …". Then about every 9 s it should speak one short caption, and never constantly.
4. Set Spoken captions to Detailed and confirm the longer captions, about every 16 s. Then set it to Off and confirm silence.
5. Tab to the Position slider and press the arrow keys. It should announce "0:25 of 0:51"-style times.
6. Press `L`, then Tab to a "Hear high: …" button and press Enter. The preview plays and the video pauses.
7. Open "What the picture shows" and "Science details" and confirm they read well.
8. Repeat steps 2–3 with VoiceOver on an iPhone (Safari) if one is available. This also tests the iOS audio unlock.

## Phase 5: export, playlist, about (2026-11-15)
- **In-app "Make a WAV file":** Forest Heights rendered in 15 s, giving a valid 9.6 MB WAV with a descriptive file name. Progress and done messages go through a `role="status"` region.
- **Playlist render** (`node scripts/render_playlist.mjs`, the app's own renderer in Chrome): 10 MP3s, 12 MB in total. Measured peaks:

  | Track | Musical | Data-only |
  |---|---|---|
  | Ocean Heat | −6.5 | −2.1 |
  | Forest Heights | −8.1 | −1.3 |
  | Four Winds | −5.6 | −2.4 |
  | City Glow | −10.4 | −3.4 |
  | Storm Drums | −3.1 | −5.7 |

  All are under the −1 dBFS ceiling (dBFS).
  - Found and fixed: the render script's Vite server hot-reloaded the page mid-render when files changed. HMR and file watching are now off.
- **axe on `/about/` and `/playlist/`:** 0 violations (47 and 35 passes). Fixed along the way: the subpages had no `<h1>`.
- **Playlist:** all 10 `<audio>` players load (e.g. Ocean Heat, 69.7 s). Transcripts generate one line per 10 s from the same caption code (39 lines across all 5 tracks).
- **Production build under a GitHub Pages sub-path** (`BASE_PATH=/earthsong-jukebox/ vite build` + `vite preview`):
  - Every page, nav link, media file and JSON resolves, with no 404s.
  - 129 KB was measured here; this was later shown to be invalid (see Phase 6: 151 KB, with no video bytes before Play).
  - Found and fixed: the earlier relative base (`./`) would have broken fetches and links on `/about/` and `/playlist/`.

## Phase 4: jukebox UI and accessibility (2026-11-15)

### Automated
- **axe-core 4.14** in Chrome, every `<details>` opened, tags `wcag2a wcag2aa wcag21a wcag21aa best-practice`:
  - **0 violations, 55 passes.**
  - Fixed along the way: seek buttons' visible text vs accessible name (label-in-name).
  - Left "incomplete" (needs a human): `color-contrast` over images, which was checked by hand below; `video-caption`, which doesn't apply because the source videos have no sound, and the live caption plus long description cover the content.
- **Colour contrast**, computed for every token pair:
  - Text 9.7–16.5:1, so AAA everywhere.
  - Control borders 4.1–4.8:1, which meets WCAG 1.4.11's 3:1. The first border colour was 1.8:1 and was fixed.
- **Captions** (`tests/captions.test.ts`):
  - Every frame of every track yields captions with no NaN, undefined or null.
  - Brief captions are ≤ 110 characters.
  - Date words are correct at month boundaries. A bug that read 1 March as "February" was fixed.

### Manual, in Chrome (driven through DevTools)
- **Keyboard only:**
  - `5` selects Storm Drums (and the URL updates). `K` starts playback *with sound* (a key press counts as a user gesture).
  - ←/→ seek, `M` toggles data-only mode, `A` toggles audio-only, `L` focuses the legend heading.
  - Shortcuts are ignored inside form controls. Space is ignored on buttons, so it doesn't double-fire.
  - A skip link to the player is the first focusable element.
- **Screen-reader semantics** (accessibility-tree review; see "Not tested" below):
  - Landmarks: banner, nav, main, contentinfo. Headings h1 → h2 → h3.
  - Title strips are buttons with `aria-pressed` and names like "A1: Ocean Heat …".
  - The sliders have `aria-valuetext` ("0:23 of 1:06", "80%").
  - The ~40 preview buttons have unique names ("Hear high: Sea temperature under the scan line").
- **Narration:**
  - The `aria-live="polite"` region announced "Playing Ocean Heat. …" on play.
  - After that, announcements came at ~9.6 s intervals (brief mode, 9 s minimum gap), only when the text changed.
  - The visible caption updated every ~0.6 s without being announced.
- **Audio-only mode:** the video is hidden (`display: none`), while sound and captions continue from the precomputed features.
- **Previews:** "Hear high" pauses the video and plays ~2 s of that one layer, measured at −18.5 dB.
- **Photosensitivity:** Storm Drums shows the warning, and "Reduce flashing" is on by default (blur + dim). Analysis reads the unfiltered video, so the sound is unchanged.
- **Phone width (390 px, touch emulation):**
  - No horizontal scroll.
  - Strip thumbnails hide, so the five strips take 518 px.
  - All targets are ≥ 44 px except the checkboxes, which sit inside ≥ 44 px clickable labels.
- **High contrast:** pure black/white with a yellow focus and selection; the decorative arch is hidden.

### Not tested yet
- **No real screen reader yet** (NVDA, JAWS, VoiceOver, TalkBack). The checks above use the accessibility tree and axe; a human pass with NVDA + Firefox is still to do (Phase 6).
- Firefox and Safari behaviour; real phones (vibration, iOS audio unlock).
- Lighthouse (Phase 6).

## Phase 3: sonification engine (2026-11-15)

### Automated (`npm test`, 27 tests)
- **Scales:** note parsing, scale note sets, and position → pitch is **monotonic** in both modes (higher value never gives a lower note).
- **Mapping:** clamping, curves, rest on NaN or inactive `when` conditions (gain → silent, rate → 0).
- **Sequencer:**
  - The rate cap holds (asks for 20/s, gets 4/s).
  - Offsets stay inside the tick, and velocity is ≤ 0.8.
  - Output is deterministic.
  - A muted layer produces no notes.
- **Every track config:**
  - Each binding's feature exists in the precomputed feature file, each target layer exists, and pad tone indices are in range.
  - Replaying the whole precomputed track gives finite controls, gains ≤ 0 dB, and frequencies > 30 Hz.
- **Event log follows the data:** Ocean Heat scan-note pitch vs `scan.value` has a Spearman rank correlation > 0.95 (data-only mode, so quantization can't hide errors).

### Offline render measurements (Chrome, `Tone.Offline`, whole track)
Peak and RMS are measured from the rendered buffer, not taken from the limiter setting.

| Track (mode) | Peak dBFS | RMS p10 / p50 / p90 dBFS | First audible | NaN |
|---|---|---|---|---|
| Ocean Heat (musical) | −6.3 | −24.9 / −20.7 / −18.5 | 0.0 s | 0 |
| Ocean Heat (data-only) | −2.1 | −25.6 / −17.8 / −15.6 | 0.0 s | 0 |
| Forest Heights (musical) | −8.1 | −30.8 / −25.3 / −21.8 | 0.1 s | 0 |
| Four Winds (musical) | −6.5 | −33.9 / −27.3 / −20.7 | 0.1 s | 0 |
| City Glow (musical) | −10.7 | −33.9 / −26.6 / −22.9 | 0.0 s | 0 |
| Storm Drums (musical) | −3.3 | −34.0 / −25.1 / −16.7 | 0.1 s | 0 |
| Storm Drums (data-only) | −5.7 | −26.6 / −24.3 / −20.4 | 0.0 s | 0 |

Findings fixed along the way:
1. **Everything was ~25 dB too quiet** at first (Ocean Heat RMS −45 dBFS). Fixed with a fixed makeup gain before the compressor.
2. **Storm Drums peaked at +2.8 dBFS.** `Tone.Limiter` is a fast compressor, not a brickwall, so drum transients overshot it. Fixed with:
   - a final **soft-clip waveshaper** that cannot exceed −1 dBFS;
   - a lower drum level.
3. **Data-only mode was ~6 dB louder than musical.** Rebalanced to within ~3 dB.

### Live playback (Chrome, Tone.Meter on the destination)
- Play with sound: the AudioContext is running and the level is ≈ −20 to −25 dB, matching the offline render.
- Pause: fades out (−20.6 → −32.6 dB after 1.5 s; the remainder is the reverb tail).
- Seek, then play: sound returns within ~0.5 s.
- Mode switch while playing: works; loudness is within a few dB.

### Not tested yet
- **Nobody has listened to it.** All checks above are measurements. A human listening pass is needed for musical quality and ear fatigue.
- Firefox (timer fallback path), Safari/iOS (AudioContext unlock), Android.
- Live parity on small features: in Chrome, `bolt.onsets` reads ~10–30 % higher than the precompute, and coverage features ~5–30 % (GPU bilinear vs ffmpeg area downscale). Rate caps bound the effect.

## Phase 2: analysis engine
See [mappings.md](mappings.md) § Performance and the LUT validation sections.
