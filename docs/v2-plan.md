# Earth Jukebox v2: "Enter Space": plan

v1 (live) is the accessible core: track configs, analysis engine, mapping and sequencer, Tone graph, captions and narration, legend, playlist and credits. **v2 keeps all of it** and rebuilds the *experience* on top: a cinematic space entry, a 3D Earth that becomes the data, proof that listeners can hear the data, and "hear the change" comparisons.

Rule for every conflict: **science and accessibility win over effects.**

## Phases (each one is committed and deployed when done)
| # | Phase | Ships |
|---|---|---|
| 1 | Design system, typography, Enter sequence | `src/design/tokens.ts` (the single token file); self-hosted Instrument Serif + Geist; WebGL starfield/nebula (procedural GLSL); Enter screen with a serif line and Enter button (audio unlock + low drone swell); warp fly-through; skip intro; Calm mode; v1 bug fixes |
| 2 | Globe + orbit selector | Three.js Earth with fresnel atmosphere and a day/night terminator; five orbiting "moons" with looping thumbnails; glass hover card; an accessible radio group underneath; flat maps (Ocean Heat, City Glow) wrapped onto the globe as live video textures; globe renders shown in a floating viewport |
| 3 | Immersion player + data-reactive visuals | Full-bleed player, floating glass controls, an editorial caption block; nebula colour, particle speed and Earth halo driven by **analysis features** (not FFT); vertical stem faders; slide-in legend |
| 4 | Hear the Change | A (then) / B (now) / Δ (difference) playback with a wipe slider; one-line summaries computed from features by a script |
| 5 | Instrument mode | Pause, then pointer/touch/arrow-key exploration: the value under a crosshair (colour-bar lookup) as continuous pitch, threshold ticks, lat/long announcements where the projection is known, haptics |
| 6 | Quiz + fidelity metrics | "Close your eyes" quiz (6–8 audio-only questions, local scoring, shareable result with OG image); anonymous logging to a free backend, with local-only fallback; a fidelity script publishing real correlations |
| 7 | Pages + polish + perf + a11y | Science long-read (scroll diagrams, tables, metrics, quiz stats, caveats), masonry Library, About; route transitions; adaptive quality; axe, Lighthouse, keyboard and screen-reader passes |
| 8 | Demo + docs + deploy | `/demo` auto-playing a 30 s cinematic sequence; `docs/demo-script.md`; final deploy |

## Architecture changes
- **Layers.** The page gets a fixed `<canvas>` "stage" (Three.js) behind an HTML layer that holds all the semantic controls. Every 3D object is **decorative or mirrored**: the orbit moons mirror a real `role="radiogroup"`. Screen readers never have to deal with the canvas (`aria-hidden`).
- **Lazy loading.** The Enter screen paints with CSS only (a gradient + CSS star dots) so first paint is fast. Three.js, GSAP and Tone load after first paint and during the Enter interaction. Target: initial JS under 400 KB gzipped (v1 is 107 KB including Tone, so there's room).
- **Render vs audio.** Three.js runs on `requestAnimationFrame` and reads the *latest* feature snapshot from a tiny store. It never calls into audio. Audio keeps its lookahead scheduling. The render loop pauses when the tab is hidden, and quality adapts (pixel ratio, particle count) to the measured frame time.
- **Single motion system.** GSAP for timelines and Lenis for smooth scroll, both disabled in Calm mode and under `prefers-reduced-motion` (crossfades only). The easing and duration tokens live in `tokens.ts`.
- **Fallback.** If WebGL is unavailable, the device is low-end (`hardwareConcurrency ≤ 2`, or a failed context, or under 30 fps over the first 2 s), or Calm mode is on, the page shows a static CSS galaxy (gradients plus a still poster) with **identical controls**.

## Decisions (logged as they are made)
1. **Stay on Svelte 5 + Vite + vanilla Three.js** (no React, so no R3F). This keeps the v1 code and the small bundle.
2. **Fonts (all OFL, self-hosted with Fontsource):**
   - **Instrument Serif** for display (high-contrast, elegant, tight).
   - **Geist Sans** for UI and data, with `tabular-nums`. Its default zero is *not* slashed, which fixes the v1 complaint.
   - **Geist Mono** for small code-like labels only; any digits in it are checked for slashed zeros.
   - Atkinson Hyperlegible is dropped as the default because of its slashed zero. I may offer it again as an optional "Readable type" setting in Phase 7.
3. **GSAP licence:** the GSAP "Standard no-charge" licence (free, including SplitText). This meets "free tools only". No motionsites.ai code or assets are used.
4. **Earth texture (no new data sources).** The idle globe uses a **land/ocean mask derived from the SVS 3912 SST frame**. That source is a true 2:1 equirectangular map: gray land against coloured or dark ocean. The globe is stylised and monochrome, with a fresnel atmosphere and a procedural terminator. No Blue Marble or other imagery is added.
5. **Wrapping maps onto the globe.**
   - Ocean Heat (3912) is full equirectangular, so it wraps exactly.
   - City Glow (5313) is two map copies in 32:9. Each copy is not a 2:1 frame; its latitude range must be measured by registering it against the 3912 land mask. If the registration is not good to within about 2°, City Glow stays in the flat viewport. Measured in Phase 2.
   - The globe-rendered tracks (4950, 5572, 5011) play in a floating viewport.
6. **Quiz backend.** Every free backend (Supabase, Firebase, Google Apps Script) needs the owner's account. The quiz ships with a pluggable `VITE_QUIZ_ENDPOINT` (Supabase REST, insert-only with row-level security) and works fully offline. I'll add setup steps; **the user creates the free project** (a choice about their own account, not code). Until then, stats come from local results only and are labelled as such.
8. **(Phase 2) City Glow is NOT wrapped onto the globe.**
   - Registering its land outline against the SVS 3912 land mask (searching longitude offset, longitude span and latitude range) peaked at **88 % pixel agreement**, with an unexplained ~11° longitude shift. That is not the ±2° we required.
   - It stays flat, labelled `projection: 'flat'` in its config.
   - Ocean Heat (true 2:1) wraps exactly; its land lines up with the mask because both come from SVS 3912.
9. **(Phase 2) The globe is positioned by CSS.** An empty `.globe-slot` element in the hero grid is projected into the 3D scene every frame. The layout (side by side on wide screens, stacked on phones) is plain CSS, and the globe scrolls with the page.
10. **(Phase 2) Orbit selector = mirrored.**
    - The 3D moons are decorative.
    - A pointer-only hit layer (`aria-hidden`, `tabindex=-1`) adds hover cards and click selection.
    - The **real chooser is an HTML `radiogroup`**: roving tabindex, arrow/Home/End keys, number keys.
    - Moons on globe-render tracks sample the central (lit) part of the poster.

11. **(Phase 3) Visual reactivity comes from the bindings, not the audio.** `activity(spec, features)` is the mean normalised input of the active loudness and rate bindings, so a judge can trust that brighter or faster visuals mean "more of the data", exactly as the sound does. Light pulses only come from percussive data events, are rate-limited, and are off in Calm mode and with reduce-flashing.
12. **(Phase 3) The player borrows the globe.** For Ocean Heat in Globe view, an IntersectionObserver moves the Earth from the hero slot into the player screen while at least 40 % of the screen is visible, and gives it back afterwards. The video keeps playing invisibly, because it feeds both the analysis and the globe texture.

13. **(Phase 4) Hear the Change.**
    - A and B are *frozen-moment sonifications*: the mean of the precomputed features over a window, played through the normal mapping.
    - Δ is one glide per data change (up = more).
    - Storm Drums is excluded (confounded by globe rotation).
    - Ocean Heat gained a warm-belt latitude → bell-pitch mapping, so the seasonal shift is actually audible.

14. **(Phase 6) Fidelity is measured end to end.** The reference is the data at 2× resolution, unsmoothed; it is compared with the shipped pipeline's actual output. This avoids the trivial r = 1 of correlating a feature with a function of itself. Dead or weak mappings found this way are removed or reported, never hidden.
15. **(Phase 6) Quiz answers are generated from the data**, never hand-labelled. The backend is optional, anonymous and insert-only. It stays unconnected until the owner creates the free Supabase project (`docs/quiz-backend.md`).

7. **Hear the Change, kept honest.**
   - City Glow 2012 → 2023 is real change over time.
   - Ocean Heat and Storm Drums compare **seasons within the data**, and are labelled as *seasonal* comparisons, not climate trends.
   - No CO₂ track is added in v2 unless time allows (it would need new media; SVS 5196 is already in resources.md).

## Risks
| Risk | Mitigation |
|---|---|
| Visual layer regresses accessibility | Every 3D thing is mirrored by semantic HTML; axe + Lighthouse + keyboard pass every phase |
| WebGL cost on phones | Adaptive DPR and particles, pause when hidden, CSS fallback |
| Audio glitches from rendering | Audio is scheduled ahead (LOOKAHEAD), and rendering never touches audio |
| Bundle bloat | Lazy-load Three/GSAP/Tone after first paint; check the bundle size every phase |
| Over-claiming in comparisons and metrics | Summaries and correlations are generated by scripts from features; caveats live next to the numbers |
| Time (8 phases) | Each phase deploys on its own; v1 stays reachable through `?classic=1` until v2 matches its feature set |

## v1 bugs to fix (Phase 1)
- **Two strips looked selected.** The brass focus ring on A1 looked the same as the brass "selected" style on A5. Fix: focus and selection get visually distinct styles.
- **Slashed zero in dates.** Fixed by the font change, and verified with a screenshot.
- **City Glow thumbnail is nearly black.** Fix: a brighter frame (the zoom-segment pop-outs) plus a mild exposure lift on the poster only.
