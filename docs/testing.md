# Testing log

What was tested, how, and what was **not** tested. Most recent phase first.

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
