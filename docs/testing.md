# Testing log

What was tested, how, and what was **not** tested. Most recent phase first.

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
