# Mappings: evidence and annotations

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

## Lightning (5011): no colourbar
- Yellow = a detected LIS event in a 10-day roving window. The yellow-hue gate and the masks for the starfield and date dial get validated in Phase 2.
- The shipped clip is the first 70 s of 216.7 s, which covers about 2017 to early 2019 if time is linear. The visualization doesn't print exact dates, so dates in captions will be approximate (season-level).
