# Space Apps 2026 submission: Earth Jukebox (team Earthsong)


## Project summary (≈150 words)
Earth Jukebox lets anyone *hear* NASA’s Earth Information Center visualizations.
- **How it plays.** Pick one of five NASA Scientific Visualization Studio animations, such as ocean temperature, forest height, aerosols, night lights or lightning, and press play. Your browser reads every frame about 15 times a second and translates the colours back into the data values on NASA’s own colour bars. It then turns those values into music in real time: warmer water plays higher notes, more lightning plays more drum hits, smoke adds a dark drone.
- **Who it serves.** It is designed first for blind and low-vision people. Everything works by keyboard and screen reader, spoken captions explain what is changing, and each sound is documented in a legend that says honestly whether it follows tested data, approximate data or an artistic choice.
- **Extras.** There is a data-only mode, an audio-only mode and downloadable soundscapes with transcripts, for classrooms and museums.

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
- **Emotion.** Oceans and forests feel spacious; aerosols and storms carry quiet urgency (a tense half-step appears when smoke is heavy), without exaggerating the data.

## Tools used
Svelte 5, TypeScript and Vite (a static site, no backend); Tone.js / Web Audio; Canvas 2D; Python 3 with ffmpeg, NumPy and Pillow for media preparation; Vitest; axe-core; Playwright-core (headless render of the playlist); GitHub Pages. An AI coding assistant (Claude, by Anthropic) helped write the code and docs under the developer’s direction (see the disclosure below).

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

## 30-second demo script
| Time | On screen | Say |
|---|---|---|
| 0–5 s | Jukebox page, title strips | “NASA’s Earth visualizations are silent. Earth Jukebox lets you hear them.” |
| 5–13 s | Press **1**, then **K**: Ocean Heat plays, the scan line sweeps | “The browser reads each frame against NASA’s colour bar. Warm tropics play high notes, cold poles play low ones.” |
| 13–20 s | Press **5**: Storm Drums, blurred by reduce-flashing | “Every burst of lightning seen from the Space Station is a drum hit. Flashing is reduced, but the sound is the same.” |
| 20–26 s | Tab to the legend, press **Hear high**; show the honesty badge | “Every sound is explained and labelled: tested data, approximate, or artistic.” |
| 26–30 s | Turn on NVDA briefly, so a caption is spoken; flash the playlist page | “It’s built for blind listeners first, and every soundscape can be downloaded with a transcript.” |

## Links
- Live app: https://711nishtha.github.io/earthsong-jukebox/
- Code: https://github.com/711nishtha/earthsong-jukebox
- Playlist (fallback deliverable): https://711nishtha.github.io/earthsong-jukebox/playlist/
