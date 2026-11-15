<script lang="ts">
  import { onMount } from 'svelte';
  import { TRACKS } from './tracks';
  import type { TrackConfig } from './tracks/types';
  import { loadManifest, type Manifest } from './ui/manifest';
  import Player from './ui/Player.svelte';
  import { prefs } from './ui/prefs.svelte';
  import TitleStrips from './ui/TitleStrips.svelte';

  const base = import.meta.env.BASE_URL;

  /** Deep link: ?track=storm-drums */
  const initial = TRACKS.find((t) => t.id === new URLSearchParams(location.search).get('track')) ?? TRACKS[0];
  let track = $state.raw<TrackConfig>(initial);
  let manifest = $state.raw<Manifest | null>(null);
  let player = $state<ReturnType<typeof Player>>();
  let manifestError = $state('');

  onMount(() => {
    loadManifest().then((m) => (manifest = m)).catch(() => (manifestError = 'Credits could not be loaded. The visualizations still work.'));
  });

  $effect(() => {
    document.documentElement.dataset.contrast = prefs.highContrast ? 'high' : 'normal';
  });

  function select(t: TrackConfig) {
    track = t;
    const url = new URL(location.href);
    url.searchParams.set('track', t.id);
    history.replaceState(null, '', url);
  }

  /** Single-key shortcuts, ignored while typing or using a form control. */
  function onKey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target instanceof Element ? e.target : document.body;
    if (el.closest('input, select, textarea, [contenteditable]')) return;
    const onButton = el.closest('button, summary, a');
    const k = e.key.toLowerCase();
    if ((k === ' ' && !onButton) || k === 'k') player?.togglePlay();
    else if (k === 'arrowleft') player?.seekBy(-5);
    else if (k === 'arrowright') player?.seekBy(5);
    else if (k === 'm') player?.toggleMode();
    else if (k === 'a') player?.toggleAudioOnly();
    else if (k === 'l') document.getElementById('legend-heading')?.focus();
    else if (/^[1-9]$/.test(k) && TRACKS[Number(k) - 1]) select(TRACKS[Number(k) - 1]);
    else return;
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKey} />

<a class="skip-link" href="#player">Skip to the player</a>

<header class="masthead">
  <div class="arch" aria-hidden="true"></div>
  <div class="masthead-inner">
    <h1>Earth Jukebox</h1>
    <p class="lede">Hear NASA’s pictures of our changing planet. Pick a visualization and press play: the sound is made live from the colours, brightness and motion on screen.</p>
    <nav aria-label="Site">
      <a href={base + 'about/'}>How it works</a>
      <a href={base + 'playlist/'}>Download the soundscapes</a>
      <button aria-pressed={prefs.highContrast} onclick={() => (prefs.highContrast = !prefs.highContrast)}>High contrast</button>
    </nav>
  </div>
</header>

<main>
  <TitleStrips tracks={TRACKS} selected={track} {manifest} onselect={select} />

  <div id="player" class="player-wrap" tabindex="-1">
    {#key track.id}
      <Player bind:this={player} {track} entry={manifest?.tracks[track.id]} />
    {/key}
  </div>

  <details class="panel shortcuts">
    <summary>Keyboard shortcuts</summary>
    <dl>
      <dt>Space or K</dt><dd>Play or pause</dd>
      <dt>Left / Right arrow</dt><dd>Back or forward 5 seconds</dd>
      <dt>1 to {TRACKS.length}</dt><dd>Choose a visualization by its code</dd>
      <dt>M</dt><dd>Switch between musical and data-only sound</dd>
      <dt>A</dt><dd>Audio only (hide the video)</dd>
      <dt>L</dt><dd>Jump to “What each sound means”</dd>
    </dl>
  </details>
  {#if manifestError}<p role="status">{manifestError}</p>{/if}
</main>

<footer>
  <p>
    Visualizations by <a href="https://svs.gsfc.nasa.gov/">NASA’s Scientific Visualization Studio</a> and partners, credited on each track.
    Earth Jukebox is an independent project for the 2026 NASA Space Apps Challenge (team Earthsong). It is not made or endorsed by NASA.
    All sounds are synthesized in your browser; no recorded music or samples are used.
  </p>
</footer>

<style>
  .masthead { position: relative; overflow: hidden; border-bottom: 1px solid var(--rim); }
  /* The one decorative flourish: the warm glow of a jukebox arch rising behind the title. */
  .arch {
    position: absolute;
    left: 50%;
    top: 3.5rem;
    width: min(70rem, 160vw);
    aspect-ratio: 1;
    transform: translateX(-50%);
    border-radius: 50%;
    background:
      radial-gradient(closest-side, transparent 78%, color-mix(in srgb, var(--brass) 55%, transparent) 79%, transparent 81%),
      radial-gradient(closest-side, color-mix(in srgb, var(--brass) 18%, transparent), transparent 70%);
    pointer-events: none;
  }
  :global(:root[data-contrast='high']) .arch { display: none; }
  .masthead-inner { position: relative; max-width: 72rem; margin: 0 auto; padding: 2.5rem 1rem 1.5rem; }
  h1 { font-size: clamp(2.3rem, 6vw, 3.6rem); letter-spacing: 0.01em; margin-bottom: 0.4rem; }
  .lede { font-size: 1.15rem; color: var(--muted); }
  nav { display: flex; flex-wrap: wrap; gap: 0.6rem 1.25rem; align-items: center; }
  nav a { min-height: 44px; display: inline-flex; align-items: center; }
  main { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 2rem; display: grid; gap: 2rem; }
  .player-wrap { display: grid; gap: 2rem; }
  .player-wrap:focus { outline: none; }
  .shortcuts dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.35rem 1.25rem; margin: 0.5rem 0 0; }
  .shortcuts dt { font-weight: 700; }
  .shortcuts dd { margin: 0; }
  footer { border-top: 1px solid var(--rim); padding: 1.5rem 1rem 2.5rem; }
  footer p { max-width: 72rem; margin: 0 auto; color: var(--muted); }
</style>
