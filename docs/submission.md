# Space Apps 2026 submission: Earth Jukebox (team Earthsong)


## Project summary (≈150 words)
Earth Jukebox lets anyone *hear* NASA’s Earth Information Center visualizations.
- **How it plays.** You press Enter and fly through a quiet galaxy to Earth, with five NASA Scientific Visualization Studio animations orbiting it: ocean temperature, forest height, aerosols, night lights and lightning. Choose one and the globe becomes that live visualization. Your browser reads every frame about 15 times a second against NASA’s own colour bars and turns the values into music in real time: warmer water plays higher notes, more lightning plays more drum hits, smoke adds a dark drone.
- **Hear the change and explore.** You can compare 2012 and 2023 night lights, or two seasons of the same data, and hear only the difference. In Instrument mode you move a crosshair over the map and listen to the value under it.
- **Who it serves.** It is designed first for blind and low-vision people. Everything works by keyboard and screen reader, and every sound is labelled as tested data, approximate data or an artistic choice.
- **Proof.** We measured how closely the sound follows the data (median r = 0.93), and a close-your-eyes quiz lets visitors test it on themselves.

## How it addresses the challenge
- **Real-time pairing of frames and sound.** Computer vision on each video frame drives the synthesis live; nothing is pre-recorded. The same engine also prepares the downloadable files, so live and offline match.
- **Data, not just colour.** Colour bars are turned into lookup tables, so pitch follows °C, metres or categories. We checked the reading on the shipped video: tropical water reads 27–29 °C and Southern Ocean water 4–7 °C on the 0–32 °C bar.
- **Musical, not noise.** Values are snapped to scales chosen per story (Dorian ocean, Lydian forests, minor aerosols, pentatonic lights and storms), with layered instruments, stems and safe loudness (limiter, −1 dBFS ceiling, capped rates).
- **Accessibility at the core.**
  - WCAG 2.1 AA, with 0 axe violations.
  - Keyboard shortcuts, rate-limited aria-live narration, long audio descriptions and timed transcripts.
  - High contrast, a low-vision typeface, haptic beats on phones, and a photosensitivity warning with reduce-flashing for the lightning video.
- **Documented “why”.**
  - Every mapping lists the visual feature, how it is measured, the audio parameter, the range, data vs. artistic, and the reason.
  - The tables are generated from the code, so docs can’t drift.
  - The design follows NASA’s Caldwell 73 sonification: a radar-like sweep, position → pitch, colour → instrument.
- **Measured, not just claimed.** A script compares the shipped sound with the data at twice the resolution (median r = 0.93 over 32 data mappings). A mapping that turned out not to work (r = 0.00) was removed. The close-your-eyes quiz asks listeners to pick the hotter, taller or brighter clip by ear alone.
- **Cinematic, but never at the cost of access.** Three.js space scene, GSAP motion. Calm mode removes motion, a WebGL-free fallback keeps every feature, and Lighthouse accessibility scores 100 on all five pages.
- **Emotion.** Oceans and forests feel spacious; aerosols and storms carry quiet urgency (a tense half-step appears when smoke is heavy), without exaggerating the data.

## Tools used
Svelte 5, TypeScript and Vite (a static site; the quiz results backend is optional and free-tier); Tone.js / Web Audio; Three.js (WebGL globe and space scene); GSAP with ScrollTrigger and Lenis (motion); Fontsource (OFL fonts: Instrument Serif, Geist); Canvas 2D; Python 3 with ffmpeg, NumPy and Pillow for media preparation; Vitest; axe-core; Lighthouse; Playwright-core (headless rendering and cross-browser smoke tests); GitHub Pages and GitHub Actions. An AI coding assistant (Claude, by Anthropic) helped write the code and docs under the developer’s direction (see the disclosure below).

## NASA data used
All visualizations are by NASA’s Scientific Visualization Studio and partners, used as video:
- SVS 3912 *Global Sea Surface Currents and Temperature* (ECCO2)
- SVS 4950 *GEDI Forest Height*
- SVS 5572 *GEOS Aerosols*, linked from SVS 5669 *GEOS Aerosols (2025)*, which now holds only a still image
- SVS 5313 *Change in Night Lights between 2012 and 2023 – EIC Version* (Black Marble, VIIRS)
- SVS 5011 *Lightning Events Detected from the ISS 2017–2023* (LIS)
- Reference: SVS 13786 *Data Sonification: Caldwell 73*
- Source gallery: the EIC content database

Full credits are in the app, the README and `public/media/manifest.json`.

## AI disclosure
Earth Jukebox was built by a solo developer with an AI coding assistant (Claude, by Anthropic), which did much of the research, code, tests and documentation under the developer’s direction. No AI-generated data, imagery or audio samples are used; every sound is synthesized live from NASA’s visualizations.

## 30-second demo
Open https://711nishtha.github.io/earthsong-jukebox/?demo and press **Start the demo**. The real interface plays itself for about 30 seconds:
1. The flight to Earth.
2. Ocean Heat on the globe.
3. City lights in 2012, then 2023, then only the difference.
4. A proof card with the measured fidelity.

The shot list, the voice-over and the recording steps are in `docs/demo-script.md`.

## Links
- Live app: https://711nishtha.github.io/earthsong-jukebox/
- Code: https://github.com/711nishtha/earthsong-jukebox
- Demo: https://711nishtha.github.io/earthsong-jukebox/?demo
- The science (method, mapping tables, fidelity): https://711nishtha.github.io/earthsong-jukebox/science/
- Close-your-eyes quiz: https://711nishtha.github.io/earthsong-jukebox/quiz/
- Library (downloadable soundscapes, the fallback deliverable): https://711nishtha.github.io/earthsong-jukebox/playlist/
