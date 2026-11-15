# Resources — NASA SVS sources for Earth Jukebox

All facts below were fetched live on **2026-11-15** from the SVS pages and the SVS JSON API
(`https://svs.gsfc.nasa.gov/api/<id>`), with movie metadata from `curl -I` (size) and `ffprobe`
over HTTP (codec / resolution / fps / frame count / duration). "Not probed" means the number is
from the page listing only. Nothing here is recalled from memory.

Media base URL used below: `B = https://svs.gsfc.nasa.gov/vis/a000000` (or `a010000` for 13786).

**Findings to keep in mind (recorded as found, not resolved):**
1. **5669 "GEOS Aerosols" is now a single still image** ("GEOS Aerosols (2025)", released 2026-08-10, one frame for 2025-08-19 20:00 UTC). The *animated* GEOS aerosols visualization is **5572**, which 5669 links directly (Related). 5572 is therefore an allowed source.
2. The aerosol **colorbar labels red as "Black Carbon"**, while the page text says red/orange is "smoke from fires". Both are shown on the same SVS page; we quote both.
3. **GEDI date ranges differ between media groups** on 4950: the global-with-colorbar movie says "April 2019 to April 2020"; the regional movies and the no-colorbar global say "April 2018 to April 2019".
4. **Night Lights change bar has no numbers** — only "lights out / no change / new lights" (orange → white → purple).
5. **Lightning dots are LIS events in a 10-day roving window**, not individual flashes in real time.
6. **Caldwell 73** states radius → pitch and star colour → instrument (plus "entire image → choir"). It does **not** state that luminosity maps to volume. We do not attribute that to the page.
7. Every probed movie is **silent** (no audio stream) — no existing soundtrack to conflict with.
8. Several sources are **HEVC (H.265)** or **VP8 WebM**, which won't play in every browser → everything must be transcoded to H.264.

---

## 0. Earth Information Center (EIC) gallery
- **URL:** https://svs.gsfc.nasa.gov/gallery/earth-information-center/ — page title "NASA SVS | Earth Information Center (EIC)", gallery ID 40467, released 2023-06-07, updated 2025-07-30.
- **What it is:** "content used in the hyperwall display in the Earth Information Center at NASA Headquarters." The EIC covers nine areas: sea level change, air quality, biodiversity, wildfires, greenhouse gases, energy, disasters, water resources, agriculture.
- **Sections:** Overview · EIC Dashboards (Earth Now, Climate Vital Signs, Greenhouse Gases, Carbon Dioxide Sources and Sinks, Air Quality, Wildland Fires) · EIC Videos · EIC Beauty Pieces · Media Resources · Daily Visualizations.
- **Pages linked from the gallery HTML (15):** 4950, 4960, 4993, 5011, 5196, 5313, 5425, 5533, 14371, 14507, 14568, 14606, 14696, 14700, 14713.
  - Note: **3912 and 5669 are not directly linked** from the gallery HTML (sub-galleries load more items); they're in our brief, so they're still in scope.
  - Note: produced videos such as 14696 contain licensed commercial music and third-party imagery ("may not be excised or remixed"). **We will not use produced videos**, only visualizations.

---

## 1. Data Sonification: Caldwell 73 — SVS 13786 (reference, not a track)
- **URL:** https://svs.gsfc.nasa.gov/13786/ · released 2020-12-23
- **What it does (quoted):** "As the radar scans around in this sonification, the radius of the stars is mapped to pitch, so stars farther from the center are higher pitched. The entire image is converted to the sound of a choir, while the orange and red stars are represented by a marimba, and the blue stars are represented by a glockenspiel."
- **Sonification conventions we take from it:**
  - A **scan** (a moving read-head) turns a still image into time.
  - **Spatial position → pitch** (distance from center → higher).
  - **Colour class → instrument timbre** (warm stars → marimba, blue stars → glockenspiel).
  - A **whole-image bed** (choir) under the specific events.
- **Media:** `Caldwell73_2K_Final.mp4` / `.webm` (1920×1920); `print.jpg`, `wide.jpg` (1920×1080); captions `CALDWELL73.en_US.SRT`. The captions contain only "[ PRETTY MUSIC ]", which is a useful anti-example for us: captions should describe the sound.
- **Credit line:** "Please give credit for this item to: NASA's Goddard Space Flight Center". The sonification itself is credited "SYSTEM Sounds (M. Russo, A. Santaguida)". Technical support: Aaron E. Lepsch (ADNET Systems, Inc.).

---

## 2. Change in Night Lights between 2012 and 2023 – EIC Version — SVS 5313
- **URL:** https://svs.gsfc.nasa.gov/5313/ · released 2024-06-14
- **Content:** Global flat map. It first shows a time series of annual averages from 2012 to 2023. The lights then fade to a **change map**: "regions of more light depicted in purple and regions with less light depicted in orange". The sequence then repeats with pop-out zooms of India, Ukraine, Western Europe and the Eastern Mediterranean.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a005300/a005313/nightlights_flat_series_and_change_wZooms_13_EIC_2160p30_h265.mp4` | 7680×2160 (32:9) | HEVC | 30 | 1300 | 43.3 s | 32.7 MB |
  | `…_prores.mov` | 7680×2160 | ProRes | — | — | — | 4.0 GB (not used) |
  | Frames `frames/7680x2160_32x9_30p/nightlights_2012-2023_change_flat_eic/` | 7680×2160 | PNG seq | 30 | listed "0 items" | — | — |
  | Stills `…02599_print.jpg` 1024×288, `_searchweb.png` 320×180, `_thm.png` 80×40 | | | | | | 62 KB / 50 KB / 5 KB |
- **What I saw in frames:**
  - The world map appears **twice side by side** (32:9 hyperwall layout).
  - The year (e.g. "2023") is printed in the center.
  - During the change phase there is a small on-screen colorbar in the center: "Change in Lighting Intensity from 2012 to 2023" — orange "lights out" → white "no change" → purple "new lights". It has **no numeric scale**.
  - The zoom pop-outs are framed boxes with region labels.
- **Colour meaning:** time-series phase: warm-white lights on dark ground. Brightness is relative night-light intensity, with no numeric scale given. Change phase: orange = less light, purple = more light (diverging, unitless).
- **Data:** Black Marble: Next Generation (Suomi NPP VIIRS, NASA/NOAA). Dataset credit: "NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC."
- **Credit line:** "NASA's Scientific Visualization Studio".
  - Visualizer: Kel Elkins (USRA).
  - Scientists: Zhuosen Wang (University of Maryland), Miguel Román (Leidos), Ranjay Shrestha (SSAI), Srija Chakraborty (USRA), Virginia Kalb (NASA).
- **Alt versions:** 5475 (SOS), 5477, 5276 (non-EIC).

## 3. Global Sea Surface Currents and Temperature — SVS 3912
- **URL:** https://svs.gsfc.nasa.gov/3912/#media_group_349716 · released 2012-03-16
- **Content:** "sea surface current flows … colored by corresponding sea surface temperature data". The model is ECCO2 (MIT/JPL, MITgcm), surface flows only. Time range **2007-03-25T12:00Z to 2008-03-03T12:00Z**.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a003900/a003912/ecco2_sst_flow.webmhd.webm` | 1080×540 (page lists 960×540) | VP8 | 30 | — | 66.7 s | 14.9 MB |
  | `ecco2_sst_flow.m4v` | 640×320 | H.264 | 30 | 2001 | 66.7 s | 12.1 MB |
  | `ecco2_sst_flow.mp4` | 2048×1024 | H.264 | 30 | 2001 | 66.7 s | 244.4 MB |
  | `flat_global_ecco2_2028x1024_comp_p30.mp4` | 2048×1024 | — | — | — | — | not probed |
  | `Oceanflows-UHD-2160.mp4` | 3840×2160 | — | — | — | — | not probed |
  | `pacificcurrents_1080p30.mp4` (eastern Pacific) | 1920×1080 | H.264 | 30 | 2001 | 66.7 s | 475.2 MB |
  | Frames: `frames/2048x1024_1x1_30p/orig/`, `…/with_colorbar/`, `frames/6840x3420_1x1_30p/`, Atlantic `6840x2304`, Pacific `1920x1080` | | | | | | |
  | 15 hyperwall tiles `flat_global_ecco2_6840x3420_768p30-[a-e][1-3].mp4` | 1368×768 | | | | | |
  | Group 349716: `ecco2_and_grid.jpg/.tif` (6840×3420), the model grid points overlaid on the flow (white dots). This is the anchor in the brief's link | | | | | | |
- **Colourbar:** `sst_ecco2_cbar.png` (310×95), "Sea Surface Temp (°C)", ticks 0 / 10 / 20 / 32. The page says: "blue is 0 degrees C, green is 10-20 degrees C, yellow is about 25 degrees C, red is 32 degrees C". The bar is a **rainbow whose hue runs monotonically** blue → cyan → green → yellow → red.
- **Frames:** flat equirectangular 2:1 map, gray land, flow streaks on a near-black ocean, no on-video labels in the `ecco2_sst_flow` version.
- **Datasets:** ECCO2 High Resolution Ocean and Sea Ice Model; GTOPO30 Topography and Bathymetry.
- **Credit line:** "NASA/Goddard Space Flight Center Scientific Visualization Studio".
  - Animators: Greg Shirah (NASA/GSFC), Horace Mitchell (NASA/GSFC), Eric Sokolowsky (GST).
  - Producer: Michael Starobin. Scientists: Hong Zhang, Dimitris Menemenlis.

## 4. GEOS Aerosols — SVS 5669 (still) and SVS 5572 (animation, linked from 5669)
### 5669 "GEOS Aerosols (2025)" — https://svs.gsfc.nasa.gov/5669/ · released 2026-08-10
- **Content:** a **single still** for 2025-08-19 20:00 UTC from the GEOS model (GEOS Forward Processing 2 km Replay). It highlights Hurricane Erin pulling in African dust, with sea salt in blue spirals.
- **Media:**
  - `a005600/a005669/Aerosols_2025-08-19T20_00_00_{1920x1080,3840x2160,5760x3240,7680x4320}.png` (2.6 MB for 1080p).
  - Print versions at 1500×1179 and 4200×3300.
  - **Colourbar** `Aerosols_cbar.png` (1500×300).
- **Credit line:** "NASA's Global Modeling Assimilation Office (GMAO) and NASA's Scientific Visualization Studio (SVS)". Data visualizers: Joseph V. Ardizzone (NASA/GSFC), Helen-Nicole Kostis (Science and Technology Corporation). Scientist: Lesley Ott (NASA/GSFC).

### 5572 "GEOS Aerosols" — https://svs.gsfc.nasa.gov/5572/ · released 2025-08-08
- **Content:** aerosols from GEOS-FP, **2024-08-01 to 2024-09-14**. It shows Hurricane Ernesto pulling in Saharan dust, and Typhoons Shanshan and Ampil drawing pollution from Asia.
- **Colours (page text):** "sea salt (blue), dust (pink/magenta), smoke from fires (orange/red), and sulfates from pollution and volcanoes (green)". The colourbar from 5669 labels the four swatches **Black Carbon (red-orange), Dust (lavender), Sea Salt (gray-teal), Sulfate (green)**. It is a **categorical** legend with no concentration scale.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a005500/a005572/Aerosols_EarthRotating_1920x1080.mp4` | 1920×1080 | H.264 | 30 | 1800 | 60.0 s | 107.3 MB |
  | `Aerosols_EarthRotating_3840x2160.mp4`, `_7680x4320.mp4` | 4K / 8K | | | | | not probed |
  | `Aerosols_EarthRotating_1080x1440.mp4` (+ `_Label_`) | vertical | | | | | not probed |
  | `Aerosols_6480x3240_30p.mp4` (flat 2:1) | 6480×3240 | H.264 | 30 | 2208 | 73.6 s | 351.0 MB |
  | `Aerosols_AnnotationsLabel_6480x3240_30p.mp4` | 6480×3240 | | | | | not probed |
  | Stills `Aerosols_{08152024,08262024,08272024,09132024}_1080x1080.png` | | | | | | |
- **Frames:** rotating globe on black, with colours additively blended where aerosol types overlap (e.g. dust + smoke).
- **Credit line:** "NASA's Global Modeling Assimilation Office (GMAO) and NASA's Scientific Visualization Studio (SVS)".
  - Data visualizers: Joseph V. Ardizzone, Helen-Nicole Kostis (USRA). Scientist: Lesley Ott.
  - Technical support: Laurence Schuler, Ian Jones, Ella Kaplan.

## 5. Air Quality Model Runs — SVS 5533
- **URL:** https://svs.gsfc.nasa.gov/5533/ · released 2025-05-05
- **Content:** GEOS-CF concentrations of PM2.5, ozone (O₃), carbon monoxide (CO) and nitrogen oxides (NOx), **July 1 – September 14, 2024**, during an active North American fire season.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a005500/a005533/EIC_AirQuality_Preview_3840x1080.mp4` | 3840×1080 | H.264 | 60 | 4502 | 75.0 s | 178.8 MB |
  | `EIC_AirQuality_NMNH_7680x2160.mp4` | 7680×2160 | | | | | not probed |
  | `AirQuality_MapWithLabels_5760x3240.mp4` | 5760×3240 | H.264 | 30 | 1800 | 60.0 s | 286.2 MB |
  | `AirQuality_SphereWithLabels_5760x3240.mp4` | 5760×3240 | | | 1801 frames listed | | 285.8 MB (listed) |
  | `AirQuality_Sphere_5760x3240_long.mp4` | 5760×3240 | | | | | not probed |
  | Stills `AirQuality_WithLabels_1920x1080_0000.png` etc. | | | | | | |
- **Colour meaning:**
  - The map is split into vertical **strips, one per pollutant**, each with its own colour ramp:
    - CO: yellow→red
    - PM2.5: cream→brown
    - NOx: green
    - O₃: gray→purple
  - Each strip carries a **text label only, no numeric colourbar** (checked frame 0). Concentration values can't be recovered.
- **Credit line:** "NASA's Scientific Visualization Studio and NASA's Global Modeling and Assimilation Office".
  - Data visualizers: Helen-Nicole Kostis (USRA), Joseph V. Ardizzone (NASA/GSFC). Scientist: Lesley Ott.
  - Technical support: Laurence Schuler, Ian Jones, Ella Kaplan.

## 6. Perpetual Ocean 2: Western Boundary Currents — SVS 5425
- **URL:** https://svs.gsfc.nasa.gov/5425/ · released 2025-02-27
- **Content:**
  - Starts with a rotating globe of ocean currents, then zooms to the Kuroshio, the Agulhas and the Gulf Stream.
  - Uses ECCO2 3D velocity, 2021–2023, with virtual particles and trails.
  - Dates range 15 Jan 2021 – 25 Dec 2023.
  - The narrated version was selected for SIGGRAPH 2025 Electronic Theater (14745).
- **Media (1080p30 versions, all 9503 frames, 316.8 s):**
  - beauty: `perpetual_ocean2_CLOSE_093_clean_noDate_1080p30.mp4`, 1224.3 MB
  - temperature: `perpetual_ocean2_CLOSE_096_temperature_1080p30.mp4`, 903.8 MB
  - salinity: `perpetual_ocean2_CLOSE_103_salinity_1080p30.mp4`
  - 4K/60p versions and layer passes: 600 m-and-below, equator, sea ice, land, land mask, dates
  - frame sets at 3840×2160 60p and 9600×3240 30p
  - **Very large files.**
- **Colourbars:**
  - **Beauty:** surface to 600 m is all white; below 600 m uses blue→cyan→white for **−3 to 22 °C**.
  - **Temperature:** dark blue→purple→orange→yellow, **0 to 25 °C**.
  - **Salinity:** greenish-cyan→gray→orange→red, **33 to 36 PSU**.
- **Datasets:** ECCO2; Blue Marble: Next Generation (Terra/Aqua MODIS, "courtesy of Reto Stockli (NASA/GSFC)"); ETOPO-30.
- **Credit line:** "NASA's Scientific Visualization Studio".
  - Visualizers: Greg Shirah, Horace Mitchell. Technical support: Laurence Schuler, Ian Jones.
  - Scientists: Atousa Saberi, Josh Willis. Producer: Kathleen Gaeta.

## 7. DYAMOND Global Carbon Dioxide — SVS 5196
- **URL:** https://svs.gsfc.nasa.gov/5196/ · released 2024-07-22
- **Content:**
  - Global CO₂ (ppm) for **January–March 2020** from GEOS, run at DYAMOND high resolution.
  - The page explains the visible **pulsing**: fires flare by day, and plants take up CO₂ by day through photosynthesis.
  - Emissions come mostly from power plants, industry and vehicles over China, the US and South Asia, and mostly from fires in Africa and South America.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a005100/a005196/dyamondPointCloud_12-1-2023b_dyamond_co2_anim_globe_orbit_1080p30_h265.mp4` (orbit) | 1920×1080 | HEVC | 30 | 1176 | 39.2 s | 6.9 MB |
  | `…_orbit_2160p30.mp4` | 3840×2160 | | | | | not probed |
  | `dyamondPointCloud_3-29-2023a_dyamond_co2_anim_globe_zoom_1080p30.mp4` (zoom E. US) | 1920×1080 | H.264 | 30 | 1176 | 39.2 s | 43.5 MB |
  | `…zoomwest_3x3hyperwall_1080p30_2.mp4` (zoom W. US), `…_globe_tilt_1080p30.mp4` (fly-through; "middle is quite dark") | 1080p | | | | | not probed |
- **Colourbar:** `dyamondCbar_6-27-2024a.png`. "Color bar showing the range, color, and opacity transfer functions": **380–460 ppm**. Below ~420 ppm it's gray/white and mostly transparent (checkerboard); above that it runs tan → orange → red at 460. Because of the **opacity transfer**, pixel colour is blended with what's behind it.
- **Credit line:** "NASA's Scientific Visualization Studio".
  - Visualizers: AJ Christensen (SSAI), Greg Shirah, Helen-Nicole Kostis, Mark SubbaRao.
  - Technical support: Laurence Schuler, Ian Jones.
  - Scientists: Lesley Ott, Brad Weir, William Putman, Tomohiro Oda.

## 8. Lightning Events Detected from the ISS 2017–2023 — SVS 5011
- **URL:** https://svs.gsfc.nasa.gov/5011/ · released 2023-10-19
- **Content:**
  - "Lightning events detected by the LIS sensor on the ISS between January 2017 and July 2023 using a 10-day roving window." The data is from the quality-controlled science dataset.
  - Each point has a latitude, longitude and detection time. LIS covers tropical and mid-latitude regions.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a005000/a005011/iss_lightning_sphere_07312023.mp4` | 1920×1080 | H.264 | 30 | 6501 | 216.7 s | 127.0 MB |
  | `iss_lightning_sphere_07312023_60p4k.mp4` | 3840×2160 | | 60 | | | not probed |
  | `iss_lightning_eic_display_2160p30_h2652.mp4` | 7680×2160 | HEVC | | | | not probed |
  | `iss_lightning_sos_yearly_07312023_2048p60.mp4` (SOS, equirect) | 4096×2048 | H.264 | 60 | 6002 | 100.0 s | 334.0 MB |
  | Still `iss_lightning_preview.jpg` 1024×576 | | | | | | |
- **Frames:** rotating dark-gray globe on a **starfield**, with lightning as **yellow dots**. A **date dial** sits bottom-right ("10 Day Roving Window", year, March/June/Sept./Dec. ring). There is no colourbar: yellow = a detected event.
- **Datasets:**
  - Quality Controlled LIS on ISS Science Data V1.
  - CPC Cloud Composite.
  - Gray Earth with Shaded Relief.
  - MODIS Land Cover CMG: "Friedl, M., D. Sulla-Menashe. MCD12C1 … V006. 2015, distributed by NASA EOSDIS Land Processes DAAC, https://doi.org/10.5067/MODIS/MCD12C1.006".
  - Related paper: Blakeslee, R. J. 2020.
- **Credit line:** "NASA's Scientific Visualization Studio". Visualizers: Michala Garrison (SSAI), Greg Shirah, Kel Elkins (USRA), Alex Kekesi (GST).
- **Photosensitivity:** dense flickering yellow points → needs the warning and reduce-flashing option.

## 9. A 3D View of an Atmospheric River from an Earth System Model — SVS 4960
- **URL:** https://svs.gsfc.nasa.gov/4960/ · released 2022-01-25
- **Content:**
  - Clouds and precipitation from **MERRA-2** reanalysis.
  - Mid-latitude winds carry clouds west→east. The ITCZ forms along the equator.
  - Atmospheric rivers carry most of the poleward water-vapour transport.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a004900/a004960/atmos_river_HD.mp4` (non-narrated) | 1920×1080 | H.264 | 59.94 | 17486 | 291.7 s | 789.4 MB |
  | `atmos_river_HD.webm`, `atmos_river_4k.mp4` | | | | | | not probed |
  | Narrated: `atmos_rivers_narrated_HD.webm` 68.6 MB, `…_HD.mp4` 410.9 MB, `…_4k.mp4` 646.9 MB (listed) | | | | | | |
  | Frames 3840×2160 60p, 9600×3240 30p, 7680×2160 30p; date overlay `atmos_river_DATE_ONLY_HD.mp4` | | | | | | |
- **Colourbars** (`atmo_rivers_cbars01.png`, stacked layers, top to bottom):
  - Snow: white.
  - Liquid Precipitation: dark blue→purple→orange→yellow, **0 to 0.001 kg/m²/s**.
  - Snow Depth: gray→white→cyan, **0.25 to 1.5 m**.
  - Soil Moisture: white→brown→green→blue-gray, **0 to 1** (surface soil wetness).
  - Ocean: gray.
  - Low values become transparent.
- **Datasets:** MERRA-2; MERRA-2 winds; GTOPO30.
- **Credit line:** "NASA's Scientific Visualization Studio".
  - Visualizers: Greg Shirah, Horace Mitchell, Cindy Starr (GST), Kel Elkins (USRA).
  - Scientists: Allison Collow (UMBC), Natalie Thomas (UMBC), Michael Bosilovich.
  - Producers: Jefferson Beck, LK Ward.

## 10. GEDI Forest Height — SVS 4950
- **URL:** https://svs.gsfc.nasa.gov/4950/ · released 2021-10-29
- **Content:**
  - Forest canopy height from the **GEDI** lidar on the ISS. "Brown and dark green represent shorter vegetation. Bright green and white represent taller vegetation."
  - "Height is exaggerated to depict variation at this scale."
  - Date range: see Finding 3 above.
- **Media:**
  | File | Res | Codec | fps | Frames | Duration | Size |
  |---|---|---|---|---|---|---|
  | `a004900/a004950/GEDI_global_w_colorbar_1080p60.mp4` | 1920×1080 | H.264 | 60 | 3089 | 51.5 s | 17.7 MB |
  | `GEDI_CA_w_colorbar_1080p60.mp4` (US west coast, data drawn over time) | 1920×1080 | H.264 | 60 | 1401 | 23.4 s | 24.5 MB |
  | Also FL, Goddard, Laurentides, Senegal, each with and without colorbar, at 1080p60 / 2160p30 / 2160p60, + `.webm` | | | | | | not probed |
  | Stills `GEDI_global_w_colorbar_{0230,0600,1055,1900}_print.tif`, `GEDI_CA_w_colorbar_{0150,0300,1000,1400}_print.tif` (3840×2160) | | | | | | |
- **Colourbars:** `GEDI_colorbar_0to50_01.tif`, `…0to75_01.tif`, `…0to40_01.tif` (3840×2160 transparent overlays, ~66 MB each).
  - "Height Above Ground (meters)": dark brown → green → yellow-green → near-white.
  - The on-video bar in the global movie reads **0–50 m** with an open-ended arrow, so 50 means "≥ 50 m".
- **Frames:** a 3D lit globe with extruded vegetation. The ocean is blue, space is black, and the colourbar sits bottom-left.
- **Dataset:** GEDI Relative Height.
- **Credit line:** "NASA's Scientific Visualization Studio".
  - Visualizers: Kel Elkins (USRA), Horace Mitchell, Greg Shirah. Technical support: Laurence Schuler, Ian Jones.
  - Scientists: Temilola Fatoyinbo, Atticus Stovall.

---

## Colourbar → value feasibility (scratch round-trip test, 2026-11-15)
I downscaled sample frames to analysis size and inverted the colourbar for each pixel. This is a scratch test, not project code.
- **SST (3912):** RGB nearest-match **fails** (median ΔRGB 85), because thin flow streaks blend with the dark ocean when downscaled. **Hue-only** matching against the bar (blue 0 °C → red 32 °C) worked:
  - It matched 100% of saturated pixels at both 160×80 and 320×160.
  - The resulting values are physically plausible: tropics (10°S–10°N) ≈ 27.7 °C; Southern Ocean (50–60°S) ≈ 4.2 °C; 55–65°N ≈ 11 °C.
  - Verdict: *plausible and stable*, not verified against ECCO2 numbers.
- **GEDI (4950):** median ΔRGB 18.5; 95% of vegetation pixels fall within ΔRGB 40 of the 0–50 m bar.
  - Median inferred height ≈ 7 m, with a 10th–90th percentile range of 0–24 m.
  - The **3D lighting/shading darkens the colours**, so values are biased low.
  - Verdict: *approximate*.
- **Not tested (judged from the legend type):**
  - CO₂: the opacity blend makes it approximate.
  - Aerosols: categorical, with blending.
  - Night Lights and Lightning: no numeric bar, so values are relative only.
