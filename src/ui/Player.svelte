<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { FeatureEngine } from '../analysis/engine';
  import { loadJson, loadLuts } from '../analysis/load';
  import { PrecomputedSource } from '../analysis/precomputed';
  import { FrameSampler } from '../analysis/sampler';
  import { Smoother } from '../analysis/smoother';
  import type { Features } from '../analysis/types';
  import { stopAmbient } from '../audio/ambient';
  import { LivePlayer } from '../audio/live';
  import { activity } from '../audio/mapping';
  import { previewBinding } from '../audio/preview';
  import type { FeatureTrack } from '../audio/render';
  import type { Binding, NoteEvent } from '../audio/types';
  import { getEarth, getHeroSlot, getStage } from '../scene/stageStore';
  import type { TrackConfig } from '../tracks/types';
  import type { Caption } from '../tracks/words';
  import Explorer from './Explorer.svelte';
  import FeatureInspector from './FeatureInspector.svelte';
  import HearTheChange from './HearTheChange.svelte';
  import Legend from './Legend.svelte';
  import { formatTime, type MediaEntry } from './manifest';
  import Mixer from './Mixer.svelte';
  import { Narrator } from './narrator';
  import { prefs, savePrefs } from './prefs.svelte';
  import TrackInfo from './TrackInfo.svelte';

  let { track, entry }: { track: TrackConfig; entry: MediaEntry | undefined } = $props();

  const base = import.meta.env.BASE_URL;
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
  /** Visible caption refresh: fast enough to feel live, slow enough to read. */
  const CAPTION_MS = 600;
  const HAPTIC_GAP_MS = 250;
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  /** Without Web Audio there is no sound, but the video and live captions still work. */
  const hasWebAudio = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  const NO_AUDIO_MSG = 'This browser can’t make sound (it has no Web Audio support). The video and captions still play here. To listen, open the Library for MP3 files, or use a current version of Chrome, Edge, Firefox or Safari.';

  // This component is re-created for each track ({#key} in App), so capturing the initial track is intended.
  // svelte-ignore state_referenced_locally
  const player = new LivePlayer(track.sound, prefs.mode);
  // svelte-ignore state_referenced_locally
  const canGlobe = track.projection === 'equirect';
  // svelte-ignore state_referenced_locally
  const percussive = new Set(track.sound.layers.filter((l) => l.kind === 'drum' || l.id === 'chime').map((l) => l.id));

  let video = $state<HTMLVideoElement>();
  let paused = $state(true);
  let current = $state(0);
  /** From the video once it loads; before that from the manifest (videos aren't preloaded). */
  let mediaDuration = $state(NaN);
  const duration = $derived(mediaDuration > 0 ? mediaDuration : (entry?.video.duration ?? 0));
  let speed = $state(1);
  let features = $state.raw<Features>({});
  let caption = $state.raw<Caption>({ brief: 'Press play to hear this visualization.', detailed: '' });
  let announcement = $state('');
  let levels = $state<Record<string, number>>({});
  let error = $state('');
  let loading = $state(false);
  /** Ocean Heat (a true lat/lon map) can be seen wrapped on the globe or as the flat map. */
  let view = $state<'globe' | 'map'>(canGlobe ? 'globe' : 'map');
  let screen = $state<HTMLElement>();
  let globeSlot = $state<HTMLElement>();
  let legendOpen = $state(false);
  let legendButton = $state<HTMLButtonElement>();
  let drawerHeading = $state<HTMLElement>();
  let hasEarth = $state(false);
  let exploring = $state(false);
  let viewBeforeExplore: 'globe' | 'map' = 'map';
  let screenVisible = false;

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
    // The picture reacts to the same data as the sound (the bindings), never to an FFT of the audio.
    const act = activity(track.sound, f);
    getStage()?.setEnergy(act);
    getEarth()?.setEnergy(act);
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

  /** Percussive data events (lightning hits, year chimes): a soft light swell and a haptic tap, both rate-limited. */
  function onEvents(events: NoteEvent[]) {
    const hit = events.find((e) => percussive.has(e.layer));
    if (!hit) return;
    // No light pulses in Calm mode or when the user asked for less flashing.
    if (!prefs.calm && !(track.flashing && prefs.reduceFlashing)) getStage()?.pulse(hit.velocity);
    if (!prefs.haptics || !canVibrate) return;
    const now = performance.now();
    if (now - lastHapticAt > HAPTIC_GAP_MS) {
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
        const a = track.analysis;
        if (!engine) {
          engine = new FeatureEngine(a, await loadLuts(track.luts));
          smoother = new Smoother(a.smoothing.default, a.smoothing.perFeature);
        }
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
        stopAmbient(); // the intro drone gives way to the data
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

  export async function openLegend() {
    legendOpen = true;
    await tick();
    drawerHeading?.focus();
  }

  function closeLegend() {
    legendOpen = false;
    legendButton?.focus();
  }

  /** Instrument mode reads the flat frame, so it switches to map view and restores the view after. */
  export function toggleExplore() {
    if (!exploring) {
      viewBeforeExplore = view;
      view = 'map';
      video?.pause();
      if (prefs.audioOnly) prefs.audioOnly = false;
      exploring = true;
    } else {
      exploring = false;
      view = viewBeforeExplore;
      announcement = 'Left instrument mode.';
    }
  }

  function setLevel(id: string, v: number) {
    levels[id] = v;
    player.setStemLevel(id, v);
  }

  /** Lend the globe to this player while its screen is in view (globe view only); give it back after. */
  function placeGlobe() {
    const earth = getEarth();
    if (!earth) return;
    if (canGlobe && view === 'globe' && screenVisible && globeSlot && !prefs.audioOnly) {
      earth.setAnchor(globeSlot);
      earth.setMode('focus');
    } else {
      earth.setAnchor(getHeroSlot());
      earth.setMode('orbit');
    }
  }

  let exportState = $state<'idle' | 'working' | 'done' | 'error'>('idle');
  let exportUrl = $state('');
  let exportMsg = $state('');

  /** Renders the whole soundscape offline (same mapping and voices as live) and offers a WAV file. */
  async function exportSoundscape() {
    // Tone.Offline swaps the global audio context while it renders; don't let live playback schedule into it.
    video?.pause();
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
    hasEarth = !!getEarth();
    if (canGlobe && !hasEarth) view = 'map'; // no WebGL: the flat map is the only view
    const io = new IntersectionObserver(
      ([e]) => {
        screenVisible = e.intersectionRatio >= 0.4;
        placeGlobe();
      },
      { threshold: [0, 0.4, 0.8] },
    );
    if (screen) io.observe(screen);
    return () => io.disconnect();
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
  $effect(() => {
    void view;
    void globeSlot;
    void prefs.audioOnly;
    placeGlobe();
  });

  onDestroy(() => {
    if (canGlobe) getEarth()?.setVideo(null);
    getEarth()?.setAnchor(getHeroSlot());
    getEarth()?.setMode('orbit');
    getStage()?.setEnergy(0.35);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    sampler?.stop();
    precomputed?.stop();
    player.dispose();
  });

  const scanX = $derived(Number.isFinite(features['scan.x']) ? features['scan.x'] : null);
  const dimmed = $derived(track.flashing && prefs.reduceFlashing);
  const globeView = $derived(canGlobe && view === 'globe' && hasEarth);
</script>

<svelte:window onkeydown={(e) => legendOpen && e.key === 'Escape' && closeLegend()} />

<section class="player" aria-labelledby="now-playing">
  <header class="head">
    <p class="label">{track.realm} · NASA SVS {track.svsId}{entry ? ` · ${entry.dataDates.split('(')[0].trim()}` : ''}</p>
    <h2 id="now-playing"><span class="visually-hidden">Now playing: </span>{track.title}</h2>
  </header>

  {#if track.flashing}
    <div class="warning glass" role="note">
      <p><strong>Photosensitivity warning.</strong> This video shows many small flashing dots. “Reduce flashing” dims and blurs the video and turns off light pulses; the sound is not affected.</p>
      <label class="check"><input type="checkbox" bind:checked={prefs.reduceFlashing} /> Reduce flashing</label>
    </div>
  {/if}

  <div class="screen" class:audio-only={prefs.audioOnly} class:globe-view={globeView} bind:this={screen}>
    <div class="media" class:hidden={prefs.audioOnly}>
      <video
        bind:this={video}
        bind:paused
        bind:currentTime={current}
        bind:duration={mediaDuration}
        preload="none"
        src={base + track.video}
        poster={base + track.poster}
        muted
        playsinline
        class:dimmed
        aria-label={`${track.title}: NASA visualization (silent). A full description follows below.`}
        aria-describedby="track-description"
        onplaying={() => {
          // A true lat/lon map becomes the globe's surface while it plays.
          if (canGlobe && video) getEarth()?.setVideo(video);
        }}
        onpause={() => player.hush()}
        onplay={() => {
          if (exploring) toggleExplore(); // playing again leaves instrument mode
        }}
        onseeking={() => player.hush()}
        onended={() => {
          player.hush();
          announcement = 'Finished. Press play to hear it again.';
        }}
      ></video>
      {#if scanX !== null && !globeView && !exploring}
        <div class="scanline" style:left={`${scanX * 100}%`} aria-hidden="true"></div>
      {/if}
      {#if exploring && video}
        <Explorer {track} {video} {features} onclose={toggleExplore} />
      {/if}
    </div>
    {#if globeView && !prefs.audioOnly}
      <!-- The 3D globe (stage canvas, behind) moves into this slot while the screen is in view. -->
      <div class="globe-slot" bind:this={globeSlot} aria-hidden="true"></div>
    {/if}

    <div class="caption-block scrim">
      <p class="label">What you’re hearing</p>
      <p class="caption-text">{caption.brief}</p>
      {#if prefs.narration === 'detailed' && caption.detailed}<p class="caption-detail">{caption.detailed}</p>{/if}
    </div>

    <div class="dock glass" role="group" aria-label="Playback">
      <button class="play" onclick={togglePlay} disabled={loading} aria-keyshortcuts="Space K">
        {loading ? 'Starting…' : paused ? 'Play with sound' : 'Pause'}
      </button>
      <button class="icon" onclick={() => seekBy(-5)} aria-label="Back 5 seconds" aria-keyshortcuts="ArrowLeft">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 6 5 12l6 6M19 6l-6 6 6 6" /></svg>
      </button>
      <button class="icon" onclick={() => seekBy(5)} aria-label="Forward 5 seconds" aria-keyshortcuts="ArrowRight">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 6 6 6-6 6M5 6l6 6-6 6" /></svg>
      </button>
      <label class="scrub">
        <span class="visually-hidden">Position</span>
        <input type="range" min="0" max={duration || 0} step="0.1" bind:value={current}
          aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`} />
      </label>
      <span class="time num" aria-hidden="true">{formatTime(current)} / {formatTime(duration)}</span>
      <button aria-pressed={prefs.mode === 'data'} onclick={toggleMode} aria-keyshortcuts="M">Data only</button>
      {#if canGlobe && hasEarth}
        <button aria-pressed={view === 'globe'} onclick={() => (view = view === 'globe' ? 'map' : 'globe')}>Globe view</button>
      {/if}
      <button aria-pressed={exploring} onclick={toggleExplore} aria-keyshortcuts="E">Explore by touch</button>
      <button bind:this={legendButton} aria-expanded={legendOpen} aria-controls="legend-drawer" aria-keyshortcuts="L"
        onclick={() => (legendOpen ? closeLegend() : openLegend())}>
        Sound legend
      </button>
    </div>
  </div>

  <!-- Screen-reader narration: separate from the visible caption and rate-limited (narrator.ts). -->
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>
  {#if error}<p class="error" role="alert">{error}{#if !hasWebAudio} <a href={base + 'playlist/'}>Open the Library</a>.{/if}</p>{/if}

  {#if track.compare}
    <div class="glass compare-wrap">
      <HearTheChange {track} mode={prefs.mode} onbeforeplay={() => video?.pause()} announce={(t) => (announcement = t)} />
    </div>
  {/if}

  <div class="below">
    <Mixer {track} {levels} onlevel={setLevel} />
    <div class="settings glass" role="group" aria-label="Listening settings">
      <p class="label">Listening settings</p>
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
  </div>

  <TrackInfo {track} {entry} />

  <div class="export glass">
    <h3>Keep this soundscape</h3>
    <p>Make a WAV file of the whole track in the current mode ({prefs.mode === 'data' ? 'data-only' : 'musical'}). Ready-made MP3s are in the <a href={base + 'playlist/'}>Library</a>.</p>
    <div class="export-row">
      <button onclick={exportSoundscape} disabled={exportState === 'working'}>{exportState === 'working' ? 'Preparing…' : 'Make a WAV file'}</button>
      {#if exportState === 'done'}
        <a class="save" href={exportUrl} download={`earth-jukebox-${track.id}-${prefs.mode}.wav`}>Save {track.title} (WAV)</a>
      {/if}
    </div>
    <p role="status" class="export-msg">{exportMsg}</p>
  </div>

  <FeatureInspector {features} {tickMs} />

  <aside id="legend-drawer" class="drawer" hidden={!legendOpen} aria-labelledby="drawer-title">
    <div class="drawer-head">
      <p class="label">{track.title}</p>
      <h2 id="drawer-title" tabindex="-1" bind:this={drawerHeading}>Sound legend</h2>
      <button onclick={closeLegend}>Close legend</button>
    </div>
    <Legend {track} mode={prefs.mode} onpreview={preview} />
  </aside>
</section>

<style>
  .player { display: grid; gap: var(--s-m); }
  .head h2 { font-size: var(--t-h1); margin: 0.1em 0 0; }
  .warning { border-color: var(--c-lightning); }
  .warning p { margin-bottom: 0.5rem; }
  .check { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 44px; }

  /* The cinematic screen: full-bleed, the visualization behind, caption and dock floating on top. */
  .screen {
    position: relative;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: min(88vh, 62vw);
    display: grid;
    grid-template-rows: 1fr auto auto;
    overflow: hidden;
    isolation: isolate;
  }
  .screen.audio-only { min-height: 22rem; }
  .media { position: absolute; inset: 0; display: grid; place-items: center; z-index: -1; }
  .media.hidden { display: none; }
  video { width: 100%; height: 100%; object-fit: contain; display: block; transition: opacity var(--d-slow) var(--e-out-quart); }
  /* Globe view: the video keeps playing (it feeds the analysis and the globe texture) but is not shown flat. */
  .globe-view video { opacity: 0; }
  video.dimmed { filter: blur(3px) brightness(0.55) saturate(0.7); }
  .globe-slot { grid-row: 1; justify-self: center; width: min(68vh, 88vw); aspect-ratio: 1; pointer-events: none; }
  .scanline {
    position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px;
    background: var(--accent);
    box-shadow: 0 0 14px var(--accent);
    pointer-events: none;
  }
  .caption-block { grid-row: 2; padding: 0 clamp(1rem, 5vw, 4rem) var(--s-m); max-width: 52rem; }
  .caption-block .label { margin: 0; }
  .caption-text { font-family: var(--f-display); font-size: clamp(1.5rem, 2.6vw, 2.4rem); line-height: 1.15; margin: 0.2rem 0 0; text-wrap: balance; }
  .caption-detail { margin: 0.6rem 0 0; color: var(--c-text-muted); }
  .dock {
    grid-row: 3;
    margin: 0 clamp(0.5rem, 3vw, 2.5rem) clamp(0.75rem, 2vw, 1.5rem);
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.75rem;
    padding: 0.6rem 0.8rem;
    border-radius: var(--r-l);
  }
  .play { background: var(--accent); color: var(--c-space); border-color: var(--accent); font-weight: 600; padding-inline: 1.4rem; }
  .play:hover:not(:disabled) { background: var(--accent); filter: brightness(1.08); }
  .icon { padding: 0; width: 44px; display: inline-grid; place-items: center; }
  .icon svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .scrub { flex: 1 1 12rem; display: flex; align-items: center; }
  .time { color: var(--c-text-muted); min-width: 7.5ch; }

  .compare-wrap { padding: clamp(1rem, 3vw, 2.5rem); }
  .below { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--s-m); align-items: start; }
  @media (max-width: 56rem) { .below { grid-template-columns: 1fr; } }
  .settings { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 1rem; }
  .settings .label { width: 100%; margin: 0; }
  .settings label { display: inline-flex; align-items: center; gap: 0.5rem; }
  .settings input[type='range'] { width: 8rem; }
  .error { color: var(--c-danger); font-weight: 600; }
  .export h3 { margin-bottom: 0.3rem; }
  .export-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
  .save { min-height: 44px; display: inline-flex; align-items: center; font-weight: 600; }
  .export-msg { margin: 0.5rem 0 0; color: var(--c-text-muted); }
  .export-msg:empty { display: none; }

  /* Legend drawer: a non-modal panel that slides in from the right. */
  .drawer {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: min(34rem, 100vw);
    z-index: 40;
    overflow-y: auto;
    padding: var(--s-m) var(--s-m) var(--s-xl);
    background: var(--c-glass-strong);
    border-left: 1px solid var(--c-hairline);
    -webkit-backdrop-filter: blur(24px);
    backdrop-filter: blur(24px);
    animation: drawer-in var(--d-base) var(--e-out-expo);
  }
  .drawer[hidden] { display: none; }
  @keyframes drawer-in { from { transform: translateX(40px); opacity: 0; } }
  .drawer-head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 0 1rem; margin-bottom: var(--s-m); }
  .drawer-head .label { grid-column: 1 / -1; margin: 0; }
  .drawer-head h2 { font-size: var(--t-h2); margin: 0; }
  .drawer-head h2:focus { outline: none; box-shadow: none; }
</style>
