<script lang="ts">
  import { onMount } from 'svelte';
  import { TRACKS } from './tracks';
  import type { TrackConfig } from './tracks/types';
  import { loadManifest, type Manifest } from './ui/manifest';
  import Player from './ui/Player.svelte';
  import SiteFooter from './ui/SiteFooter.svelte';
  import SiteHeader from './ui/SiteHeader.svelte';
  import TitleStrips from './ui/TitleStrips.svelte';

  /** Deep link: ?track=storm-drums */
  const initial = TRACKS.find((t) => t.id === new URLSearchParams(location.search).get('track')) ?? TRACKS[0];
  let track = $state.raw<TrackConfig>(initial);
  let manifest = $state.raw<Manifest | null>(null);
  let player = $state<ReturnType<typeof Player>>();
  let manifestError = $state('');

  onMount(() => {
    loadManifest().then((m) => (manifest = m)).catch(() => (manifestError = 'Credits could not be loaded. The visualizations still work.'));
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

<SiteHeader current="jukebox" lede="Hear NASA’s pictures of our changing planet. Pick a visualization and press play: the sound is made live from the colours, brightness and motion on screen." />

<main id="content">
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

<SiteFooter />

<style>
  main { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 2rem; display: grid; gap: 2rem; }
  .player-wrap { display: grid; gap: 2rem; }
  .player-wrap:focus { outline: none; }
  .shortcuts dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.35rem 1.25rem; margin: 0.5rem 0 0; }
  .shortcuts dt { font-weight: 700; }
  .shortcuts dd { margin: 0; }
</style>
