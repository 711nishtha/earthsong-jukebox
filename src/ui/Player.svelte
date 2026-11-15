<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { FeatureEngine } from '../analysis/engine';
  import { loadJson, loadLuts } from '../analysis/load';
  import { PrecomputedSource } from '../analysis/precomputed';
  import { FrameSampler } from '../analysis/sampler';
  import { Smoother } from '../analysis/smoother';
  import type { Features } from '../analysis/types';
  import { LivePlayer } from '../audio/live';
  import { previewBinding } from '../audio/preview';
  import type { FeatureTrack } from '../audio/render';
  import type { Binding, NoteEvent } from '../audio/types';
  import type { TrackConfig } from '../tracks/types';
  import type { Caption } from '../tracks/words';
  import FeatureInspector from './FeatureInspector.svelte';
  import Legend from './Legend.svelte';
  import TrackInfo from './TrackInfo.svelte';
  import { formatTime, type MediaEntry } from './manifest';
  import { Narrator } from './narrator';
  import { prefs, savePrefs } from './prefs.svelte';

  let { track, entry }: { track: TrackConfig; entry: MediaEntry | undefined } = $props();

  const base = import.meta.env.BASE_URL;
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
  /** Visible caption refresh: fast enough to feel live, slow enough to read. */
  const CAPTION_MS = 600;
  const HAPTIC_GAP_MS = 250;
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  /** Without Web Audio there is no sound, but the video and live captions still work. */
  const hasWebAudio = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  const NO_AUDIO_MSG = 'This browser can’t make sound (it has no Web Audio support). The video and captions still play here. To listen, open the playlist page for MP3 files, or use a current version of Chrome, Edge, Firefox or Safari.';

  let video = $state<HTMLVideoElement>();
  let paused = $state(true);
  let current = $state(0);
  let duration = $state(0);
  let speed = $state(1);
  let features = $state.raw<Features>({});
  let caption = $state.raw<Caption>({ brief: 'Press play to hear this visualization.', detailed: '' });
  let announcement = $state('');
  let muted = $state.raw(new Set<string>());
  let error = $state('');
  let loading = $state(false);

  // This component is re-created for each track ({#key} in App), so capturing the initial track is intended.
  // svelte-ignore state_referenced_locally
  const player = new LivePlayer(track.sound, prefs.mode);
  const narrator = new Narrator();
  let engine: FeatureEngine | null = null;
  let smoother: Smoother | null = null;
  let sampler: FrameSampler | null = null;
  let precomputed: PrecomputedSource | null = null;
  let featureTrack: FeatureTrack | null = null;
  let lastCaptionAt = 0;
  let lastHapticAt = 0;
  let tickMs = $state(0);

  function onFeatures(f: Features, t: number) {
    features = f;
    player.update(f, t);
    const now = performance.now();
    if (now - lastCaptionAt >= CAPTION_MS) {
      lastCaptionAt = now;
      caption = track.caption(f);
      if (!paused) {
        const text = prefs.narration === 'detailed' ? caption.detailed : caption.brief;
        const said = narrator.next(text, prefs.narration, now);
        if (said) announcement = said;
      }
    }
  }

  /** Haptic pulse for percussive events (lightning hits, year chimes), rate-limited. */
  function onEvents(events: NoteEvent[]) {
    if (!prefs.haptics || !canVibrate || !events.length) return;
    const kinds = new Set(track.sound.layers.filter((l) => l.kind === 'drum' || l.id === 'chime').map((l) => l.id));
    const hit = events.find((e) => kinds.has(e.layer));
    const now = performance.now();
    if (hit && now - lastHapticAt > HAPTIC_GAP_MS) {
      lastHapticAt = now;
      navigator.vibrate(Math.round(15 + 25 * hit.velocity));
    }
  }

  async function useSource(audioOnly: boolean) {
    if (!video) return;
    sampler?.stop();
    precomputed?.stop();
    smoother?.reset();
    engine?.reset();
    try {
      if (audioOnly) {
        featureTrack ??= await loadJson<FeatureTrack>(`features/${track.id}.json`);
        precomputed = new PrecomputedSource(video, featureTrack, onFeatures);
        precomputed.start();
      } else {
        if (!engine) {
          const a = track.analysis;
          engine = new FeatureEngine(a, await loadLuts(track.luts));
          smoother = new Smoother(a.smoothing.default, a.smoothing.perFeature);
        }
        const a = track.analysis;
        sampler = new FrameSampler(video, a.width, a.height, a.hz, (frame) => {
          const t0 = performance.now();
          const f = smoother!.step(engine!.process(frame), frame.t);
          tickMs = 0.9 * tickMs + 0.1 * (performance.now() - t0);
          onFeatures(f, frame.t);
        });
        sampler.start();
      }
      error = '';
    } catch (e) {
      error = `Could not start the analysis: ${(e as Error).message}. Try reloading the page.`;
    }
  }

  /** Audio can only start inside a user gesture (browser autoplay policy). */
  export async function togglePlay() {
    if (!video) return;
    if (video.paused) {
      loading = true;
      try {
        if (hasWebAudio) await player.start();
        else error = NO_AUDIO_MSG;
        await video.play();
        narrator.reset();
        const intro = `Playing ${track.title}. ${caption.brief}`;
        announcement = narrator.next(intro, prefs.narration === 'off' ? 'brief' : prefs.narration, performance.now(), true) ?? intro;
      } catch (e) {
        error = `Playback failed: ${(e as Error).message}`;
      } finally {
        loading = false;
      }
    } else {
      video.pause();
      announcement = 'Paused.';
    }
  }

  export function seekBy(seconds: number) {
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), duration || video.duration);
  }

  export function toggleMode() {
    prefs.mode = prefs.mode === 'musical' ? 'data' : 'musical';
    announcement = prefs.mode === 'data' ? 'Data-only mode: plain tones, no harmony.' : 'Musical mode.';
  }

  export function toggleAudioOnly() {
    prefs.audioOnly = !prefs.audioOnly;
    announcement = prefs.audioOnly ? 'Audio-only mode: video hidden.' : 'Video shown.';
  }

  function setMuted(id: string, m: boolean) {
    const next = new Set(muted);
    if (m) next.add(id);
    else next.delete(id);
    muted = next;
    player.setStemMuted(id, m);
  }

  let exportState = $state<'idle' | 'working' | 'done' | 'error'>('idle');
  let exportUrl = $state('');
  let exportMsg = $state('');

  /** Renders the whole soundscape offline (same mapping and voices as live) and offers a WAV file. */
  async function exportSoundscape() {
    exportState = 'working';
    exportMsg = `Preparing the ${prefs.mode === 'data' ? 'data-only' : 'musical'} soundscape. This takes up to a minute.`;
    try {
      featureTrack ??= await loadJson<FeatureTrack>(`features/${track.id}.json`);
      const [{ renderOffline }, { encodeWav }] = await Promise.all([import('../audio/render'), import('../audio/wav')]);
      const buffer = await renderOffline(track.sound, featureTrack, prefs.mode);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(encodeWav(buffer));
      exportState = 'done';
      exportMsg = 'Your soundscape is ready to save.';
    } catch (e) {
      exportState = 'error';
      exportMsg = `Could not prepare the file: ${(e as Error).message}`;
    }
  }

  async function preview(b: Binding, end: 'low' | 'high') {
    if (!hasWebAudio) {
      error = NO_AUDIO_MSG;
      return;
    }
    video?.pause();
    await previewBinding(track.sound, b, end, prefs.mode);
  }

  onMount(() => {
    player.onTick = (_c, events) => onEvents(events);
    useSource(prefs.audioOnly);
  });

  // Settings that change while playing.
  $effect(() => {
    player.setMode(prefs.mode);
  });
  $effect(() => {
    player.setVolume(prefs.volume);
  });
  let lastAudioOnly = prefs.audioOnly;
  $effect(() => {
    if (prefs.audioOnly !== lastAudioOnly) {
      lastAudioOnly = prefs.audioOnly;
      useSource(prefs.audioOnly);
    }
  });
  $effect(() => {
    // Read every field so any change persists.
    JSON.stringify(prefs);
    savePrefs();
  });
  $effect(() => {
    if (video) video.playbackRate = speed;
  });

  onDestroy(() => {
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    sampler?.stop();
    precomputed?.stop();
    player.dispose();
  });

  const scanX = $derived(Number.isFinite(features['scan.x']) ? features['scan.x'] : null);
  const dimmed = $derived(track.flashing && prefs.reduceFlashing);
</script>

<section class="player" aria-labelledby="now-playing">
  <h2 id="now-playing">Now playing: {track.title}</h2>

  {#if track.flashing}
    <div class="warning panel" role="note">
      <p><strong>Photosensitivity warning.</strong> This video shows many small flashing dots. “Reduce flashing” dims and blurs the video; the sound is not affected.</p>
      <label class="check"><input type="checkbox" bind:checked={prefs.reduceFlashing} /> Reduce flashing</label>
    </div>
  {/if}

  <div class="stage" class:hidden={prefs.audioOnly}>
    <video
      bind:this={video}
      bind:paused
      bind:currentTime={current}
      bind:duration
      src={base + track.video}
      poster={base + track.poster}
      muted
      playsinline
      preload="metadata"
      class:dimmed
      style:aspect-ratio={track.aspect}
      aria-label={`${track.title}: NASA visualization (silent). A full description follows below.`}
      aria-describedby="track-description"
      onpause={() => player.hush()}
      onseeking={() => player.hush()}
      onended={() => {
        player.hush();
        announcement = 'Finished. Press play to hear it again.';
      }}
    ></video>
    {#if scanX !== null}
      <div class="scanline" style:left={`${scanX * 100}%`} aria-hidden="true"></div>
    {/if}
  </div>
  {#if prefs.audioOnly}
    <p class="audio-only-note panel">Audio-only mode: the video is hidden and the sound uses the same measurements, prepared in advance.</p>
  {/if}

  <div class="transport" role="group" aria-label="Playback">
    <button class="play" onclick={togglePlay} disabled={loading} aria-keyshortcuts="Space K">
      {loading ? 'Starting…' : paused ? 'Play with sound' : 'Pause'}
    </button>
    <button onclick={() => seekBy(-5)} aria-keyshortcuts="ArrowLeft">Back 5 seconds</button>
    <button onclick={() => seekBy(5)} aria-keyshortcuts="ArrowRight">Forward 5 seconds</button>
    <label class="scrub">
      <span class="visually-hidden">Position</span>
      <input type="range" min="0" max={duration || 0} step="0.1" bind:value={current}
        aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`} />
    </label>
    <span class="time" aria-hidden="true">{formatTime(current)} / {formatTime(duration)}</span>
  </div>

  <div class="settings" role="group" aria-label="Sound and display settings">
    <button aria-pressed={prefs.mode === 'data'} onclick={toggleMode} aria-keyshortcuts="M">Data-only mode</button>
    <button aria-pressed={prefs.audioOnly} onclick={toggleAudioOnly} aria-keyshortcuts="A">Audio only</button>
    <label>Volume
      <input type="range" min="0" max="1" step="0.05" bind:value={prefs.volume} aria-valuetext={`${Math.round(prefs.volume * 100)}%`} />
    </label>
    <label>Speed
      <select bind:value={speed}>
        {#each SPEEDS as s (s)}<option value={s}>{s}×</option>{/each}
      </select>
    </label>
    <label>Spoken captions
      <select bind:value={prefs.narration}>
        <option value="off">Off</option>
        <option value="brief">Brief</option>
        <option value="detailed">Detailed</option>
      </select>
    </label>
    {#if canVibrate}
      <label class="check"><input type="checkbox" bind:checked={prefs.haptics} /> Vibrate on beats</label>
    {/if}
  </div>

  <div class="caption panel">
    <h3>What you’re hearing</h3>
    <p class="caption-text">{caption.brief}</p>
    {#if prefs.narration === 'detailed' && caption.detailed}<p class="caption-detail">{caption.detailed}</p>{/if}
  </div>
  <!-- Screen-reader narration: separate from the visible caption and rate-limited (narrator.ts). -->
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>

  {#if error}<p class="error" role="alert">{error}{#if !hasWebAudio} <a href={base + 'playlist/'}>Open the playlist</a>.{/if}</p>{/if}

  <TrackInfo {track} {entry} />

  <Legend {track} mode={prefs.mode} {muted} onmute={setMuted} onpreview={preview} />

  <div class="export panel">
    <h3>Keep this soundscape</h3>
    <p>Make a WAV file of the whole track in the current mode ({prefs.mode === 'data' ? 'data-only' : 'musical'}). Ready-made MP3s are on the <a href={base + 'playlist/'}>playlist page</a>.</p>
    <div class="export-row">
      <button onclick={exportSoundscape} disabled={exportState === 'working'}>{exportState === 'working' ? 'Preparing…' : 'Make a WAV file'}</button>
      {#if exportState === 'done'}
        <a class="save" href={exportUrl} download={`earth-jukebox-${track.id}-${prefs.mode}.wav`}>Save {track.title} (WAV)</a>
      {/if}
    </div>
    <p role="status" class="export-msg">{exportMsg}</p>
  </div>

  <FeatureInspector {features} {tickMs} />
</section>

<style>
  .player { display: grid; gap: 1.25rem; }
  .warning { border-color: var(--brass); }
  .warning p { margin-bottom: 0.5rem; }
  .check { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 44px; }
  .stage { position: relative; border-radius: var(--radius-panel); overflow: hidden; background: #000; border: 1px solid var(--rim); }
  .stage.hidden { display: none; }
  video { display: block; width: 100%; height: auto; }
  video.dimmed { filter: blur(3px) brightness(0.55) saturate(0.7); }
  .scanline {
    position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1px;
    background: var(--brass);
    box-shadow: 0 0 12px var(--brass);
    pointer-events: none;
  }
  .audio-only-note { margin: 0; }
  .transport, .settings { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 0.8rem; }
  .play { background: var(--brass); color: var(--ink); border-color: var(--brass); font-weight: 700; padding-inline: 1.4rem; }
  .play:hover { filter: brightness(1.08); }
  .scrub { flex: 1 1 14rem; display: flex; align-items: center; }
  .time { font-variant-numeric: tabular-nums; color: var(--muted); min-width: 7.5ch; }
  .settings label { display: inline-flex; align-items: center; gap: 0.5rem; }
  .settings input[type='range'] { width: 8rem; }
  .caption { border-color: var(--phosphor); }
  .caption h3 { color: var(--phosphor); font-size: 1rem; margin-bottom: 0.25rem; }
  .caption-text { font-size: 1.35rem; line-height: 1.4; margin: 0; }
  .caption-detail { margin: 0.6rem 0 0; color: var(--muted); }
  .error { color: var(--danger); font-weight: 700; }
  .export h3 { margin-bottom: 0.3rem; }
  .export-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
  .save { min-height: 44px; display: inline-flex; align-items: center; font-weight: 700; }
  .export-msg { margin: 0.5rem 0 0; color: var(--muted); }
  .export-msg:empty { display: none; }
</style>
