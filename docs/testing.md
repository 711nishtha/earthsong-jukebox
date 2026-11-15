# Testing log

What was tested, how, and what was **not** tested. Most recent phase first.

## v2 Phases 7–8: pages, polish, audits, demo (2026-11-15)
- **Lighthouse** (mobile preset, production build served under `/earthsong-jukebox/`, the GitHub Pages sub-path), on `/`, `/science/`, `/playlist/`, `/quiz/` and `/about/`:
  - Accessibility 100, Best Practices 100 and SEO 100 on all five; 0 failed audits.
- **Found and fixed during the audit:**
  - The Library's layout shift (CLS) was 0.13 on desktop and 0.33 on a throttled phone, and the City Glow poster's aspect ratio was wrong.
  - Causes:
    - `ch`-based text widths change when the web font arrives.
    - The phone nav wrapped to two rows with the fallback font.
    - The poster was stretched.
  - Fixes: `em` widths, metric-matched fallback fonts, a one-row phone nav, and `object-fit: cover`. CLS is now about 0.001.
- **Load performance** (home, 412×823 phone, 4× CPU slowdown):
  - Fast 4G: first paint 0.8 s, FCP 2.46 s.
  - LCP 4.2 s. The LCP element is the Enter screen's lead, which rises in 1.3 s after mount on purpose.
  - Slow 4G: FCP 2.7 s, over the 2.5 s budget on that profile.
  - Unthrottled: FCP about 0.36 s.
- **Bundle:** initial JS on the home page is 155 KB gzipped (487 KB raw). The WebGL stage (91 KB gz) and three.js (47 KB gz) load lazily after first paint. Tone.js is kept eager (plan decision 18).
- **Keyboard:**
  - All 25 focus stops on the Science page get focus and show a visible ring.
  - The six scrollable table regions are reachable once their disclosures are open, and each has a name.
  - Radio groups, drawers and the Explorer were checked in earlier phases.
- **Demo (`/?demo`):** one click starts it. Ocean Heat plays at 8.4 s, the 2012 vs 2023 comparison at 16.8 s, the difference at 23.6 s, and the proof card appears at 29.5 s (development build). The proof card shows quiz stats only from the live backend.
- **Unit tests:** 50 passing; svelte-check: 0 errors, 0 warnings.
- **Not tested** (needs a person or a device): NVDA and VoiceOver end to end on the v2 pages, listening tests with blind users, and real phones (only emulated). The Supabase backend is not yet connected.

## v2 Phase 6: quiz, results backend and fidelity metrics (2026-11-15)
- **Fidelity** (`scripts/fidelity.ts` → `public/fidelity.json`, `docs/fidelity.md`), end to end:
  - Reference: data at 2× resolution, unsmoothed.
  - Compared with: the shipped pipeline's emitted pitches and control values.
  - **Median r = 0.93 across 32 data mappings.** For example, Ocean Heat scan pitch r = 0.93, warm-belt bell r = 0.99, Forest height pitch r = 0.98, Storm drum rate r = 0.85.
- **What the metrics exposed, and what we did:**
  - City Glow's brightness → pulse-pitch mapping had r = 0.00, because brightness stayed below its input range. **The mapping was removed.**
  - Two map slices never contain lights; they are reported as "n/a", not NaN.
  - Slice 6 only reaches r = 0.46; this is reported plainly on the Science page.
- **Quiz** (`scripts/build_quiz.ts` → `public/quiz/questions.json`):
  - 8 questions, generated from the data. Each compares a clearly-high and a clearly-low window (5th/95th percentile), or the Hear-the-change moments.
  - Found and fixed: the answer positions alternated 1,2,1,2, because the hash's low bit only tracked character parity. The script now uses FNV-1a with a high bit (pattern 1,1,2,2,1,1,1,2).
- **Browser run:**
  - Start, then play clip 1 (audible, −26.5 dB).
  - Answering "clip 1" every time scores 5/8, matching the generated answers.
  - The results heading gets focus.
  - The stat reads "63% of your answers… this browser only".
  - 8 answers were stored locally.
  - axe: 0 violations.
- **Backend:**
  - Supabase REST with an insert-only policy and an aggregate view (`docs/quiz-backend.md`), configured through GitHub repository variables.
  - **Not connected yet: it needs the owner's free Supabase account.**
  - Until then, all stats are local and labelled so.
- **Share:**
  - Static Open Graph images (`og-quiz.png`, `og-home.png`) rendered by `scripts/build_og.mjs` from an original design with OFL fonts.
  - The result link carries `?score=N&of=8`, and the quiz greets the visitor with the friend's score.
- **Science page:** a "Proof" section with the median r, the full fidelity table and the quiz stat. axe: 0 violations. Found and fixed: the hero needed a landmark, and its name clashed with a section heading.

## v2 Phase 5: instrument mode (2026-11-15)
- **Probe** (`src/analysis/probe.ts`):
  - It uses the same colour cubes as the analysis engine.
  - Unit tests check:
    - Ocean Heat reads > 28 °C on a near-red colour-bar sample.
    - Gray land reads as empty.
    - City Glow's orange counts as "less light" only during change-map segments. This guards a real trap: the orange gate overlaps warm city lights.
- **Keyboard walk** on Ocean Heat (March 2007 frame). The readings match real geography:

  | Position | Reading |
  |---|---|
  | 0°, 0° (Gulf of Guinea) | 30 °C |
  | 54° S | 5 °C |
  | 36° N, 0° (W. Mediterranean) | 14 °C |
  | 18° S, 108° E (Indian Ocean) | 28 °C |
  | 0°, 72° W (Amazon) | "land" |

- **Screen reader:**
  - `role="application"` with a roledescription and help text; focus moves in when instrument mode opens.
  - The reading plus position is announced after the crosshair settles (650 ms debounce), not on every step.
  - Esc leaves instrument mode.
- **Audio** (Tone meter): about −16 dB over water, fading toward silence over land. Pitch glides with a 120 ms ramp. Ticks sound at 10/20/26 °C crossings.
- **axe:** 0 violations, 49 passes, with the explorer open.
- **Positions in words:**
  - Latitude/longitude only for the true lat/lon map (Ocean Heat).
  - "% across / down" for City Glow, whose projection is unregistered.
  - "left/middle/right" on globe renders.
  - Ocean names come from coarse lat/lon boxes and are for orientation only.

## v2 Phase 4: Hear the Change (2026-11-15)
- **Comparisons offered** (config-driven; see `docs/hear-the-change.md`, generated from the features):
  - **City Glow, 2012 → 2023** (change over time).
  - **Ocean Heat, March → late August 2007** (seasonal, labelled as not a trend).
  - **Storm Drums: deliberately not offered.** The rotating globe confounds season with which side of Earth faces the camera.
- **New data mapping for Ocean Heat (live too): the latitude of the hottest water drives a slow bell's pitch.**
  - The centre of ≥ 26 °C water moves from about 3° S (March) to about 8° N (late August) and back.
  - Measured every 6 s through the year, it gives a clean seasonal curve.
- **Tests:**
  - Summaries contain no NaN.
  - Every listed change moves ≥ 6 % of its binding's range.
  - Only data-labelled bindings can appear as "changes": visual and artistic devices (scan line, swirl) are excluded. This was found and fixed during the build.
  - 48 tests total.
- **Date bug found and fixed:** month boundaries now use an exact day-of-year table. The Storm Drums end keyframe was 1 day late (it read "August 2023"); it is now 31 July, and the features were regenerated.
- **Browser** (City Glow):
  - "Play 2012", "Play 2023" and "Play the difference" all produce sound (≈ −23 dB on Tone's meter).
  - The wipe sweeps during the difference, and the `aria-pressed` states are correct.
  - The wipe is a real slider ("50% 2012, 50% 2023").
  - The summary and change list render.
  - axe: 0 violations.
- **Playlist:** Ocean Heat MP3s re-rendered with the new layer (peaks −6.6 and −2.0 dBFS).

## v2 Phase 3: immersion player and data-reactive visuals (2026-11-15)
- **Visual check:**
  - Ocean Heat in Globe view: the globe moves from the hero into the full-bleed player screen and fills it with the live SST video.
  - Serif "What you’re hearing" caption and glass dock.
  - Found and fixed: the hero's scroll fade also hid the globe once the player had borrowed it. Focus mode now ignores that fade.
- **Keyboard and screen reader:**
  - `L` opens the legend drawer with focus on its title (`aria-expanded=true`); Esc closes it and returns focus to "Sound legend".
  - The stem fader is a real slider that announces e.g. "Scan muted" or "Dust 80 percent".
  - The Globe/Map toggle is `aria-pressed`. Map view restores the flat video and its scan line.
- **axe:** 0 violations, 56 passes.
- **Performance** (1440×900, Ocean Heat playing with globe video texture + analysis + audio): **95 fps** average on this display, worst frame 33 ms; analysis 0.8 ms per tick.
- **Data-reactive visuals:**
  - `activity()` is the mean position of active loudness/rate bindings within their ranges; it is unit-tested.
  - It drives nebula brightness, star drift and Earth's halo.
  - Percussive events give a soft light swell, capped at about 3 per second and switched off in Calm mode and with "Reduce flashing".
  - No FFT is used anywhere.

## v2 Phase 2: globe and orbit selector (2026-11-15)
- **Visual checks** (screenshots, 1440×900):
  - The Earth appears after the warp: land mask from SVS 3912, teal atmosphere, five moons on a hairline orbit, each with its own visualization and accent glow.
  - Hover card shows track number and realm, title, line, duration and a real-data mini waveform.
  - **Playing Ocean Heat wraps the live temperature video onto the globe**, and its land lines up with the mask.
  - Found and fixed:
    - The globe overlapped the headline on tall windows. It is now anchored to a CSS layout slot.
    - The atmosphere and moon halos ended in hard rings. The back-face falloff was rewritten.
    - Moons for globe-render tracks were black discs. Those posters are now cropped.
- **Radio group, keyboard:**
  - → moves selection and focus together, and updates `?track=`.
  - End selects the last track, Home the first.
  - Exactly one tab stop.
- **axe:** 0 violations, 56 passes.
- **Phone** (390×844, touch):
  - No horizontal overflow. Found and fixed: the feathered scrim widened the page to 453 px; `overflow-x: clip` now prevents it.
  - The top bar is two rows (101 px).
  - The globe sits above the headline.
- **City Glow registration:** 88 % best agreement, so it is not wrapped (see v2-plan decision 8).

## v2 Phase 1: design system, typography, Enter sequence (2026-11-15)
- **Tokens:** `tests/tokens.test.ts` checks 12 contrast pairs:
  - Text on space: 7:1 or more.
  - Muted and faint text on space, and text on glass over a bright nebula patch: 4.5:1 or more.
  - All five data accents: 4.5:1 or more.
  - Focus ring and control outlines: 3:1 or more.
  - All pass.
- **axe** (Chrome, after Enter, all `<details>` open): **0 violations, 56 passes**. Fixed along the way: the Play button had light text on an accent fill (1.54:1); it now uses dark text.
- **Visual checks** (screenshots):
  - **Enter screen:** Instrument Serif hero with a word reveal and small-caps label; zeros render without slashes ("2026").
  - **Warp:** radial star streaks, then the listening view.
  - **Per-track palette:** for example, the teal nebula for Ocean Heat.
  - Found and fixed:
    - The nebula rendered almost black, because hex colours were converted to linear but never converted back in the raw shader.
    - Streaks vanished when adaptive quality rebuilt the geometry mid-warp.
    - The text scrim showed a box edge.
    - The visuals waited for the reverb to generate before starting.
- **Focus and selection** (v1 bug): only the selected card shows the accent border, glow and "Selected" tag. Focus is a separate white ring. The programmatically focused heading shows no stray halo.
- **Calm mode:** Enter crossfades with no warp; Enter to the listening view takes **0.67 s**. The `data-calm`/`data-contrast` attributes now apply on the Enter screen too.
- **Screen readers:** the word-split heading is still exposed as one sentence ("Close your eyes. Listen to the planet."). After Enter, focus moves to the "Choose a world to hear" heading.
- **Bundle** (gzipped): initial JS ≈ 142 KB (budget 400 KB); the Three.js stage is 133 KB, lazy-loaded after first paint.
- **City Glow thumbnail:** now taken from the close-up segment, with a gamma lift on the poster only (the analysed video is unchanged).
- **Not yet:**
  - The 60 fps / 30 fps targets on a real phone. Adaptive DPR and star count, and a CSS fallback after sustained frame drops, are built in.
  - A screen-reader pass with real NVDA.

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

### Live site (https://711nishtha.github.io/earthsong-jukebox/, first deploy 2026-11-15)
- The GitHub Actions run on Linux passed type-check, tests and the build, then deployed. This was the first case-sensitive build.
- `smoke_browsers.mjs` against the live URL:
  - Chrome 157: key → playback **1.1 s** (5 s target).
  - Firefox 159: 0.32 s.
  - WebKit: 0.08 s, with the no-audio fallback.
  - All engines: 0 video bytes before Play, AudioContext running (Chrome, Firefox), 15 live features, captions changing, no console errors.
- `/`, `/about/`, `/playlist/`, the manifest, features, video and MP3 URLs all return 200.

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
