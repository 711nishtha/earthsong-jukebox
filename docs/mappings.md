# Mappings: evidence and annotations

## Mapping tables (generated from src/tracks)

<!-- GENERATED:mappings (npx vite-node scripts/gen_docs.ts) -->

### Ocean Heat (SVS 3912)

*Calm and wide, like a slow tide. Dorian mode: warm but not sugary.*

| Visual feature | How measured | Audio parameter | Range | Data or artistic? | Why |
|---|---|---|---|---|---|
| Sea temperature under the scan line | Colour → °C via the SVS colourbar (hue match), median of the scan column | Pitch of the scan notes | 0 °C → D3 … 32 °C → D6 | Data (tested) | Warmer water = higher note, so every sweep sings cold poles, warm tropics, cold poles. |
| How much ocean is under the scan line | Share of the scan column showing temperature colours | Notes per second | silent over land; 2–6 notes/s | Visual | Continents become audible gaps, so you can follow the map by ear. |
| Scan line position | Read-head position, west → east | Stereo position | left (west) → right (east) | Artistic | Lets your ears track the sweep, like the radar in NASA’s Caldwell 73 sonification. |
| How far north the hottest water is | Vertical centre of ocean pixels whose colour means ≥ 26 °C (the equator is the middle of the map) | Pitch of the slow bell | ≈5° S → D5 … ≈11° N → D6 | Data (tested), amplified | The warm belt follows the Sun: hear it climb north through the northern summer and slide back south. |
| Cold water (below 10 °C) | Share of ocean pixels whose colour means < 10 °C | Loudness of the low A in the chord | 22–29 % of ocean → quiet to full | Data (tested), amplified | Cold water is the low, dark part of the chord. |
| Cool water (10–20 °C) | Share of ocean pixels whose colour means 10–20 °C | Loudness of the middle F | 21–27 % of ocean → quiet to full | Data (tested), amplified | Each temperature band owns one note of the chord. |
| Warm water (20–26 °C) | Share of ocean pixels whose colour means 20–26 °C | Loudness of the upper A | 16–25 % of ocean → quiet to full | Data (tested), amplified | Each temperature band owns one note of the chord. |
| Hot water (26 °C and above) | Share of ocean pixels whose colour means ≥ 26 °C | Loudness of the top E | 26–35 % of ocean → quiet to full | Data (tested), amplified | The hottest water is the brightest, highest note. |
| Swirling motion of the current lines | Average brightness change per second | Brightness (filter) of the chord | calm → muffled; busy → bright | Visual | Adds life as the currents swirl; it is a property of the animation, not a measurement. |

### Forest Heights (SVS 4950)

*Open and airy, a little magical. Lydian mode, with soft woody plucks and high shimmering bells.*

| Visual feature | How measured | Audio parameter | Range | Data or artistic? | Why |
|---|---|---|---|---|---|
| Forest height on screen | Colour → metres via the SVS colourbar; 75th percentile of forest pixels | Pitch of the plucked notes | ≈5 m → G3 … ≥25 m → G5 | Data (approx.), amplified | Taller trees = higher notes. Globe shading darkens colours, so heights read a little low. |
| How much forest is in view | Share of the frame showing forest colours | Notes per second | 0.5–4 notes/s | Visual | More land in view = a busier texture. Depends on how the globe is turned. |
| Where the forest is | Horizontal centre of forest pixels | Stereo position | left ↔ right | Visual | You hear continents drift across as the globe turns. |
| Tall forest (30 m and up) | Share of forest pixels whose colour means ≥ 30 m | Loudness of the high shimmer | 2–14 % → near silent to clear | Data (approx.) | Rainforests like the Amazon and Congo ring out when they rotate into view. |
| — (background) | — | Ground layer | constant | Artistic | A quiet low chord under everything. It does not change with the data. |

### Four Winds (SVS 5572)

*Restless, with a quiet sense of urgency. A minor; each kind of particle is its own instrument.*

| Visual feature | How measured | Audio parameter | Range | Data or artistic? | Why |
|---|---|---|---|---|---|
| Dust (pink/purple) | Share of the whole picture in the dust colour class | Loudness of the wind hiss | 0–8 % of the picture → silent to clear | Data (categorical) | Saharan dust plumes swell like wind. |
| Brightness of the dust | Average brightness of dust pixels | Brightness of the hiss | dim → muffled; bright → airy | Data (approx.) | Thicker plumes are drawn brighter, so they sound brighter. |
| Where the dust is | Horizontal centre of dust pixels | Stereo position | left ↔ right | Visual | Separates the instruments in space. |
| Sea salt (pale bright swirls) | Share of the whole picture in the sea-salt class | Bell notes per second | 0.2–2.5 % of the picture → 0.3–5 notes/s | Data (categorical) | Storms whip up sea spray; the bells sparkle with them. |
| Brightness of the sea salt | Average brightness of sea-salt pixels | Pitch of the bells | dim → A4; bright → A6 | Data (approx.) | Denser spray is drawn brighter and rings higher. |
| Where the sea salt is | Horizontal centre of sea-salt pixels | Stereo position | left ↔ right | Visual | Separates the instruments in space. |
| Smoke from fires (red/orange) | Share of the whole picture in the smoke / black-carbon class | Loudness of the low drone | 0–4.5 % of the picture → silent to strong | Data (categorical) | Fire smoke is the dark, heavy low end. |
| Heavy smoke | Smoke share above 2 % of the picture | A tense half-step above the drone | off below 2 %; grows to 4.5 % | Data (categorical) | Big fire seasons should feel uneasy. |
| Sulfate (green) | Share of the whole picture in the sulfate class | Speed of the pulse | 1–9 % of the picture → 1–6 pulses/s | Data (categorical) | Pollution as a machine-like pulse. |
| Where the sulfate is | Horizontal centre of sulfate pixels | Stereo position | left ↔ right | Visual | Separates the instruments in space. |
| — (background) | — | Air layer | constant | Artistic | A quiet A minor chord under everything. It does not change with the data. |

### City Glow (SVS 5313)

*Warm and human: a glowing F major pentatonic chord that rises where lights grew and sinks where they faded.*

| Visual feature | How measured | Audio parameter | Range | Data or artistic? | Why |
|---|---|---|---|---|---|
| City lights in map slice 1 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 1 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 2 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 2 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 3 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 3 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 4 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 4 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 5 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 5 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 6 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 6 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 7 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 7 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| City lights in map slice 8 of 8 (west → east) | Share of the slice covered by warm light pixels | Loudness of chord note 8 | 0–3.5 % of slice → silent to full | Data (relative) | Hear where on Earth the lights are: west is low and left, east is high and right. |
| Total city light | Share of the map covered by warm light pixels | Pulses per second | 0–1.2 % of map → 0.5–7 pulses/s | Data (relative) | More lit area = busier, more energetic. |
| Lights in the Western Europe close-up | Share of the close-up box covered by light pixels | Loudness of close-up note 1 | 0–12 % of box → silent to full | Data (relative) | Each close-up region gets its own voice and place in the stereo field. |
| Lights in the Eastern Mediterranean close-up | Share of the close-up box covered by light pixels | Loudness of close-up note 2 | 0–12 % of box → silent to full | Data (relative) | Each close-up region gets its own voice and place in the stereo field. |
| Lights in the Ukraine close-up | Share of the close-up box covered by light pixels | Loudness of close-up note 3 | 0–3 % of box (Ukraine is darker; amplified) | Data (relative), amplified | Each close-up region gets its own voice and place in the stereo field. |
| Lights in the India close-up | Share of the close-up box covered by light pixels | Loudness of close-up note 4 | 0–12 % of box → silent to full | Data (relative) | Each close-up region gets its own voice and place in the stereo field. |
| Places with more light in 2023 than 2012 (purple) | Share of the map in purple | Rising bell notes per second | 0–0.5 % of map → 0.5–6 notes/s | Data (relative) | Growth sounds like rising, bright notes. |
| Places with less light in 2023 than 2012 (orange) | Share of the map in orange | Falling minor notes per second | 0–0.15 % of map → 0.5–4 notes/s | Data (relative) | Loss sounds like falling, darker notes. |
| — (background) | — | Night layer | constant | Artistic | A quiet, warm low chord under everything. It does not change with the data. |

### Storm Drums (SVS 5011)

*Tense but musical: soft drums and distant thunder in E minor pentatonic.*

| Visual feature | How measured | Audio parameter | Range | Data or artistic? | Why |
|---|---|---|---|---|---|
| New lightning appearing | Share of the picture (outside the date dial) newly lit by yellow dots, per second | Drum hits per second | 0.5–6 hits/s (capped) | Data (relative) | Each burst of detected lightning is a drum hit. Some “new” dots are just the globe turning, so this is partly visual. |
| Size of the burst | Same as above | How hard each drum is hit | soft → medium (never loud) | Data (relative) | Bigger bursts hit harder, within a safe ceiling. |
| How far north the new lightning is | Vertical centre of newly lit dots | Drum pitch | south → E2; north → E3 | Visual | North = up = higher, the same rule as on the flat maps. |
| Where the new lightning is | Horizontal centre of newly lit dots | Stereo position | left ↔ right | Visual | Hear storms over Africa vs the Americas as the globe turns. |
| Amount of lightning on screen | Share of the frame covered by yellow lightning dots | Loudness of the thunder rumble | 0–3.5 % of frame → silent to clear | Data (relative) | Busy storm seasons rumble louder. |
| Amount of lightning on screen | Same as above | Brightness of the rumble | distant → closer | Data (relative) | More lightning sounds nearer. |
| — (background) | — | Night layer | constant | Artistic | A quiet, low E minor chord. It does not change with the data. |

<!-- /GENERATED:mappings -->

This file records **why** each mapping carries the fidelity label it does. The mapping tables themselves are in [plan.md §6](plan.md); they will move here when the track configs are final (Phase 3).

Fidelity labels:
- **Data (tested):** the colourbar inversion passed a round-trip check on the shipped H.264 file at analysis resolution.
- **Data (approx.):** the inversion works but is biased (shading, blending).
- **Data (categorical):** classes come from the legend; how much screen area a class covers is not the same as how much of that substance there is.
- **Data (relative):** real data, but the source shows no numeric scale.
- **Visual:** depends on rendering or camera, not on data.

## LUT validation on shipped media (Phase 1, 2026-11-15)
Run: `python scripts/validate_luts.py`. Frames are sampled with ffmpeg area-downscaling to 160×90 (160×80 for the 2:1 SST map).

### Ocean Heat (3912): hue LUT, 0–32 °C → **Data (tested)**
| t | coloured px | hue-matched | 55–65°N | 10°S–10°N | 50–60°S |
|---|---|---|---|---|---|
| 5 s | 50 % | 100 % | 5.5 °C | 28.8 °C | 6.3 °C |
| 30 s | 51 % | 100 % | 10.7 °C | 27.5 °C | 4.5 °C |
| 60 s | 50 % | 100 % | 5.3 °C | 27.5 °C | 7.0 °C |

- Tropical values sit near the "yellow ≈ 25 °C / red 32 °C" end of the bar, and polar values sit near the blue end, consistent with the SVS colourbar description.
- The 55–65°N band warms mid-series (t = 30 s ≈ boreal late summer, using the linear date assumption) and cools again, which is the expected seasonal cycle.
- This is a **plausibility** check, not a comparison against ECCO2 numbers.
- Why hue and not RGB: the thin flow streaks mix with the dark ocean when downscaled. That mixing changes brightness but preserves hue (an RGB nearest match failed in Phase 0, median ΔRGB 85).

### Forest Heights (4950): RGB LUT, 0–≥50 m → **Data (approx.)**
| t | vegetation px | within ΔRGB 40 | median ΔRGB | height p10 / p50 / p90 |
|---|---|---|---|---|
| 10 s | 16 % | 84 % | 22.3 | 0 / 4.8 / 22.2 m |
| 30 s | 12 % | 90 % | 20.4 | 0 / 7.9 / 24.6 m |
| 45 s | 4 % | 73 % | 24.4 | 0 / 10.3 / 29.7 m |

- The globe is lit, so the shaded side darkens the colours, which biases heights low.
- The mapping will use relative changes (the 75th percentile and the share above 30 m) and present heights as approximate in all UI copy.

### Four Winds (5572): categorical gates → **Data (categorical, approx.)**
Share of globe pixels per class:

| t | smoke | dust | sea salt | sulfate |
|---|---|---|---|---|
| 5 s (Pacific) | 0 % | 0 % | 0 % | 8 % |
| 20 s (Atlantic/Africa) | 12 % | 22 % | 15 % | 6 % |
| 40 s (Pacific/Asia) | 0 % | 1 % | 1 % | 23 % |

- **First try (rejected):** nearest-RGB/chromaticity to the legend swatches classified only 24–55 % of saturated pixels. The render does not reproduce the swatch colours: sulfate is a vivid green, and sea salt is pale, bright swirls.
- **Now:** hue sectors centred on each swatch hue, with saturation/brightness gates, stored in `public/luts/four-winds.json`.
- **Visual check:** the t=20 Atlantic frame shows the Saharan dust plume, the African smoke belt and sea-salt swirls; t=40 is dominated by green sulfate over Asia and the Pacific. The numbers match what the frames show.
- **Known gap:** faint, dim sea-salt swirls (t=5) fall under the brightness gate. To be tuned in Phase 2 against the live view.

## Night Lights (5313): timeline annotation (manual)
The year is burned into the video, so it can't be read as data. I read the centre label at 2 fps from the 8K source (contact sheet of crops) and recorded these segments. Times refer to `public/media/city-glow.mp4` (43.33 s).

| Segment | Start | End | What's on screen |
|---|---|---|---|
| series | 0.0 | 9.0 | Annual averages 2012 → 2023 (≈ 0.5 s per year; 2015 is held for 1 s) |
| fade | 9.0 | 10.5 | Lights fade out |
| change | 10.5 | 20.5 | Change map: purple = more light, orange = less light, with centre colourbar |
| reset | 20.5 | 22.0 | Back to 2012 |
| series-zoom | 22.0 | 36.5 | 2012 held while pop-outs build (to 27.5), then 2013 → 2023 by 33.5, held to 36.5 |
| change-zoom | 36.5 | 43.33 | Change map with pop-outs |

Year keyframes (seconds → year):
- **First series:** 0→2012, 0.5→2013, 1.0→2014, 1.5→2015, 2.5→2016, 3.0→2017, 3.5→2018, 4.0→2019, 4.5→2020, 5.0→2021, 6.0→2022, 6.5→2023.
- **Second series:** 27.5→2013, 28.5→2014, 29.0→2015, 29.5→2016, 30.0→2017, 30.5→2018, 31.0→2019, 32.0→2020, 32.5→2021, 33.0→2022, 33.5→2023.
- Resolution: ±0.5 s.

**Pop-out boxes**, normalized to the 1280×360 frame (x0, y0, x1, y1), read from a frame at t=30 s:
- Western Europe: 0.090, 0.342, 0.259, 0.953
- Eastern Mediterranean: 0.309, 0.056, 0.420, 0.586
- Ukraine: 0.604, 0.047, 0.748, 0.422
- India: 0.789, 0.478, 0.922, 0.967

The centre year label and change colourbar sit at about x 0.46–0.58, y 0.44–0.66, and are masked from analysis.

## Lightning (5011): no colourbar; clip and timeline (Phase 2)
- **Phase 1's clip was wrong.**
  - The first ~68 s of the source is an **intro**: a zoomed ISS swath with a real-time timestamp starting "Mar 01 2017".
  - The 10-day roving-window globe with the year dial starts at ~70 s.
  - The shipped clip is now **70 s → end (146.7 s, 14.5 MB)**.
- **Time is not linear.** Year changes, read off the dial at 2 s steps (clip time, ±2 s):

  | Clip time | Dial |
  |---|---|
  | 3 s | dial appears (~Mar 2017) |
  | 40 s | 2018 |
  | 64 s | 2019 |
  | 80 s | 2020 |
  | 96 s | 2021 |
  | 112 s | 2022 |
  | 126 s | 2023 |
  | 146.7 s | end (SVS: data through July 2023) |

  - So 2017 lasts about 37 s, 2018 about 24 s, and later years about 16 s.
  - Dates between these anchors are interpolated, so captions give season-level dates only, marked approximate.
- **Gate:** yellow hue 55° ± 18°, S ≥ 0.45, V ≥ 0.2, at 240×135. At 160×90 most dots blurred below the gate.
- **Masks:** the dial at x 0.84–1, y 0.74–1 is masked. Stars are white/blue and fail the hue gate.
- **Precompute:** `bolt.share` 0.1–4 % of the frame. Since Phase 3, onsets are a *rate*: up to 0.17 of the area newly lit per second (earlier per-sample figures are obsolete).
- **Label:** Data (relative): LIS events per 10-day window, with no numeric scale.

## City Glow (5313): gates and resolution (Phase 2)
- At 192×54, city lights average away: the brightest pixel had V 0.2 against land at 0.13.
- **Lights gate:** warm hue 50° ± 25°, S ≥ 0.15, V ≥ 0.18, at **320×90**.
  - The land is a near-neutral gray (S ≈ 0.09), so it fails the gate.
  - 384×108 worked too, but cost 3.7 ms per tick in Chrome, over budget with the pixel read.
- **Change-map gates:**
  - Purple ("more light"): 265° ± 35°.
  - Orange ("less light"): 25° ± 14°.
  - Orange overlaps warm city lights, so the sound layers will only listen to `more`/`less` during the `change` and `change-zoom` segments.

## Performance (Phase 2, this Windows laptop)
| Track | Node engine tick, median / p95 | Chrome engine tick (EMA) |
|---|---|---|
| Ocean Heat 160×80 | 0.64 / 2.05 ms | 1.6 ms |
| Forest Heights 160×90 | 0.53 / 1.42 ms | 0.7 ms |
| Four Winds 160×90 | 0.58 / 1.26 ms | 0.5 ms |
| City Glow 320×90 | 1.36 / 2.63 ms | ~1.5 ms (Phase 6, 320×90); 6.0 ms at 4× CPU throttle |
| Storm Drums 240×135 | 0.96 / 1.67 ms | 1.4 ms |

**Pixel read** (`drawImage` + `getImageData`, Chrome):
- ~3 ms median with a GPU canvas.
- ~6.5 ms with `willReadFrequently`, which forces CPU-side scaling of the full frame. We don't use that option.

**Two traps found and fixed:**
- A deep Svelte `$state` proxy around the track config made the pixel loop ~30× slower. Configs are now `$state.raw`.
- Per-frame buffer allocation. Gate and motion extractors now reuse double buffers.
