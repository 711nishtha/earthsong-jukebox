# 30-second demo: shot list and voice-over

**How to record (one take):**
1. Open `https://711nishtha.github.io/earthsong-jukebox/?demo` in Chrome, full screen (F11), 1920×1080 if possible. Use headphones to monitor; record **system audio**.
2. Start the screen recorder, then press **Start the demo**. That one click is the browser's required gesture for sound.
3. The sequence runs by itself for about 30 s and ends on the proof card. Stop recording 2 s later.

Timings below were measured on the development build: Ocean Heat plays at 8.4 s, 2012 at 16.8 s, the difference at 23.6 s, and the proof card at 29.5 s.

| Time | On screen (automatic) | Voice-over (read calmly; ~75 words) |
|---|---|---|
| 0–4 s | A drone swells; stars streak; the flight through the galaxy | “NASA’s pictures of our changing planet are silent.” |
| 4–8 s | Earth fades in with five orbiting moons, one per visualization | “Earth Jukebox lets anyone hear them, and it was built for blind listeners first.” |
| 8–15 s | Ocean Heat: the globe becomes live sea-surface temperature; the scan marimba plays | “Every frame is read against NASA’s own colour bar. Warmer water sings higher.” |
| 15–23 s | City Glow, Hear the change: 2012, then 2023, with a wipe | “Hear the change. City lights in 2012… and in 2023.” |
| 23–29 s | “Play the difference”: rising glides; India’s close-up quadruples | “Only what changed: every rising glide is more light. India’s lights grew more than four times.” |
| 29–31 s | Proof card: r = 0.93, the URL | “The sound follows the data, measured. Close your eyes. Listen to the planet.” |

**Checked facts used in the voice-over** (from `docs/hear-the-change.md` and `docs/fidelity.md`):
- India's close-up: 2.5 % → 11.8 % of its box lit, which is more than 4×.
- Median end-to-end correlation: r = 0.93 over 32 data mappings.
- The quiz statistic appears on the card only when the live results backend is connected (`docs/quiz-backend.md`).

**Alternative cut (accessibility-first, 30 s):** start a second take on the same URL, but before pressing Start, turn on NVDA (or VoiceOver) so a spoken caption is captured over the Ocean Heat segment. Then cut 5 s of instrument mode: press `E` on Ocean Heat and use the arrow keys while the reading is spoken, for example "30 °C. Latitude 0° north, longitude 0° east, Atlantic".
