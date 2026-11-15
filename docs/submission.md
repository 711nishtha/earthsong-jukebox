# Space Apps 2026 submission: Earth Jukebox (team Earthsong)

Each section below is one field of the Space Apps project form, ready to paste.

---

## Project Name
Earth Jukebox

## High-Level Project Summary
Earth Jukebox lets anyone hear NASA's pictures of our changing planet. NASA's Earth Information Center visualizations are silent, so the information in them is out of reach for blind and low-vision people.

In our web app you fly through space to a 3D Earth orbited by five NASA Scientific Visualization Studio animations: ocean temperature, forest height, aerosols, night lights and lightning. Pick one and the browser reads every frame about 15 times a second against NASA's own colour bar. It turns the values into music in real time: warmer water sings higher, more lightning drums faster, growing cities glow brighter. You can hear the change between 2012 and 2023, or explore the map by touch and hear the value under your finger.

We measured that the sound follows the data: the median correlation is r = 0.93 across 32 mappings, and every sound is labelled as data or artistic. It works fully by keyboard and screen reader, is free, and needs no install.

## Link to Project Demo
https://711nishtha.github.io/earthsong-jukebox/deck/

(7-slide deck. PDF version: https://711nishtha.github.io/earthsong-jukebox/deck/Earth-Jukebox-Team-Earthsong.pdf)

## Link to Final Project
https://711nishtha.github.io/earthsong-jukebox/

(Source code: https://github.com/711nishtha/earthsong-jukebox)

## Detailed Project Description
**What it does**

Earth Jukebox is a free website that sonifies, in real time, five visualizations from NASA's Scientific Visualization Studio (SVS) Earth Information Center collection. Sonifying means turning data into sound that isn't speech. The project is designed first for blind and low-vision listeners, and is beautiful enough that everyone else wants to listen too.

1. **Enter space.** One click unlocks audio, a soft drone swells, and you fly through a nebula to Earth. Five "moons" orbit it, one per visualization. Calm mode and Skip intro remove the motion.
2. **Listen.** Choose a world and the globe becomes that live NASA visualization. Every frame is sampled about 15 times a second, and each pixel's colour is matched back to the value on the SVS colour bar (for example 0–32 °C for sea temperature, 0–50 m for forest canopy height). Those values drive the music:
   - **Ocean Heat:** a marimba sweeps west to east playing the sea temperature under a scan line.
   - **Forest Heights:** plucked notes rise with canopy height.
   - **Four Winds:** dust, smoke, sea salt and sulfate each get their own instrument.
   - **City Glow:** a chord glows with city lights.
   - **Storm Drums:** each burst of lightning seen from the Space Station is a drum hit.
3. **Hear the change.** City lights in 2012, then in 2023, then only the difference, which plays as rising glides where light grew. In India's close-up the lit share of the box grew from 2.5 % to 11.8 %. For ocean temperature, March and August are compared and labelled as a seasonal comparison, not a climate trend.
4. **Explore by touch (Instrument mode).** Pause, then move a crosshair with a finger, mouse or arrow keys. You hear the value under it as pitch, and a screen reader announces it, for example "29 °C, latitude 7° south, longitude 72° east, Indian Ocean".
5. **Close-your-eyes quiz.** Eight audio-only questions, generated from the data, ask whether you can hear which clip is hotter, taller or brighter.
6. **Library.** Every soundscape is available as an MP3, in a musical version and a data-only version, with timed text transcripts, for classrooms and museums.

**How it works**

- A static web app (Svelte 5, TypeScript, Vite) on GitHub Pages. It needs no accounts, no API keys and no server.
- Analysis runs in a DOM-free feature engine. Colour bars are baked into 64×64×64 lookup cubes, so reading a pixel costs one array lookup. The engine extracts continuous values, scan lines, category shares, regions and motion. The same code also runs offline in Node to prepare the downloadable MP3s, so the live and offline versions match.
- The mapping layer is data: each binding maps one measured feature to one sound parameter, with its range, its reason and an honesty label. These tables are generated into the docs, so the documentation can't drift from the code.
- Sound is fully synthesized with Tone.js (Web Audio). No recorded music, samples or loops are used. Values are snapped to scales chosen per story. A compressor, a limiter and a −1 dBFS ceiling are always on.
- The visuals use Three.js (procedural nebula, globe and moons) and GSAP. The space visuals react to the same data bindings as the sound, never to an audio FFT. There is a fallback without WebGL that keeps every feature.

**Why you can trust it (validity)**

- **Fidelity is measured end to end.** We compare the pipeline's actual output with the data at twice the resolution: the median correlation is **r = 0.93 across 32 data mappings**. One mapping scored r = 0.00 and was removed. Weak results are reported on the Science page rather than hidden.
- **Readings are checked against NASA's colour bars on the shipped videos.** Tropical water reads 27–29 °C and Southern Ocean water 4–7 °C on the 0–32 °C bar.
- **Every sound is labelled** as Data (tested), Data (approximate), Data (categorical), Visual or Artistic.

**Accessibility**

- WCAG 2.1 AA. Lighthouse Accessibility 100 on all five pages, and 0 axe-core violations.
- Full keyboard control and screen-reader captions. The captions are rate-limited so they don't flood the listener.
- High-contrast mode, Calm mode (no motion), a photosensitivity warning and reduced flashing for the lightning video, haptic pulses on phones, and 16 px minimum text.

**Impact and future**

- It makes NASA Earth science perceivable for the 2.2 billion people living with a vision impairment (WHO, World report on vision, 2019).
- It could serve as a listening station beside the Earth Information Center hyperwall, and as a free classroom resource with MP3s and transcripts.
- Adding a new visualization takes one configuration file and no new engine code. Next candidates: sea level, CO₂ and wildfires.

## Use of Super Intelligence (SI)
Earth Jukebox was built by a solo developer with substantial help from an AI coding assistant (Claude, by Anthropic). Working under the developer's direction and review, it:
- researched the NASA SVS pages;
- wrote most of the code, tests and documentation;
- helped design the slide deck.

The AI did not create any data, imagery or audio:
- Every value comes from the NASA visualizations credited below.
- Every sound is synthesized live from those values.
- The screenshots in the deck are of the real app.

All fidelity numbers were computed by scripts in the repository and can be reproduced.

## NASA Data
All visualizations are by NASA's Scientific Visualization Studio and partners, from the Earth Information Center collection (https://svs.gsfc.nasa.gov/gallery/earth-information-center/):
- **SVS 3912**, Global Sea Surface Currents and Temperature (ECCO2): https://svs.gsfc.nasa.gov/3912/
- **SVS 4950**, GEDI Forest Height: https://svs.gsfc.nasa.gov/4950/
- **SVS 5572**, GEOS Aerosols, linked from SVS 5669 GEOS Aerosols (2025): https://svs.gsfc.nasa.gov/5572/
- **SVS 5313**, Change in Night Lights between 2012 and 2023 – EIC Version (Black Marble, VIIRS): https://svs.gsfc.nasa.gov/5313/
- **SVS 5011**, Lightning Events Detected from the ISS 2017–2023 (LIS): https://svs.gsfc.nasa.gov/5011/
- **Design reference:** SVS 13786, Data Sonification: Caldwell 73 (NASA Goddard; sonification by SYSTEM Sounds). Its approach (a radar-like sweep, position mapped to pitch, colour mapped to instrument) guided our design: https://svs.gsfc.nasa.gov/13786/

The videos were resized and re-encoded for the web and are served from our site, not hotlinked. Credit lines for each visualization were pulled from the SVS API and appear in the app. The NASA logo is not used, and NASA does not endorse this project.

## Space Agency Partner Data and Other References
No partner-agency data was used. Other references and open-source tools:
- WHO, World report on vision (2019), for the figure of 2.2 billion people with a vision impairment.
- Tone.js (MIT), Three.js (MIT), Svelte (MIT), GSAP (free licence), Lenis (MIT).
- Fonts: Instrument Serif and Geist (SIL Open Font License).
- ffmpeg, NumPy and Pillow for media preparation; Vitest, axe-core, Lighthouse and Playwright for testing.
