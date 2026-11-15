<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { riseIn } from './design/motion';
  import { trackAccent } from './design/tokens';
  import StageCanvas from './scene/StageCanvas.svelte';
  import { getStage } from './scene/stageStore';
  import { TRACKS } from './tracks';
  import type { TrackConfig } from './tracks/types';
  import EnterScreen from './ui/EnterScreen.svelte';
  import { loadManifest, type Manifest } from './ui/manifest';
  import Player from './ui/Player.svelte';
  import { prefs, savePrefs } from './ui/prefs.svelte';
  import SiteFooter from './ui/SiteFooter.svelte';
  import SiteHeader from './ui/SiteHeader.svelte';
  import TitleStrips from './ui/TitleStrips.svelte';

  /** Deep link: ?track=storm-drums (v1 links keep working). */
  const initial = TRACKS.find((t) => t.id === new URLSearchParams(location.search).get('track')) ?? TRACKS[0];
  let track = $state.raw<TrackConfig>(initial);
  let manifest = $state.raw<Manifest | null>(null);
  let player = $state<ReturnType<typeof Player>>();
  let manifestError = $state('');
  let entered = $state(false);
  let heading = $state<HTMLElement>();
  let mainEl = $state<HTMLElement>();

  onMount(() => {
    loadManifest().then((m) => (manifest = m)).catch(() => (manifestError = 'Credits could not be loaded. The visualizations still work.'));
  });

  // Each track tints the interface and the nebula with its own visualization's colour.
  $effect(() => {
    document.documentElement.style.setProperty('--accent', trackAccent[track.id]);
    if (entered) getStage()?.setPalette(track.id);
  });

  async function onEntered() {
    entered = true;
    await tick();
    getStage()?.setPalette(track.id);
    heading?.focus();
    if (mainEl) riseIn(mainEl.querySelectorAll('[data-rise]'), 0.1, 0.1);
  }

  function select(t: TrackConfig) {
    track = t;
    const url = new URL(location.href);
    url.searchParams.set('track', t.id);
    history.replaceState(null, '', url);
  }

  /**
   * Single-key shortcuts (can be switched off: WCAG 2.1.4). Ignored while typing or using a form
   * control, and arrow keys are left alone inside scrollable regions such as the mapping table.
   */
  function onKey(e: KeyboardEvent) {
    if (!entered || !prefs.shortcuts || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target instanceof Element ? e.target : document.body;
    if (el.closest('input, select, textarea, [contenteditable]')) return;
    const onButton = el.closest('button, summary, a');
    const k = e.key.toLowerCase();
    if ((k === 'arrowleft' || k === 'arrowright') && el.closest('[role="region"]')) return;
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

<StageCanvas />

{#if !entered}
  <main id="content">
    <EnterScreen onentered={onEntered} />
  </main>
{:else}
  <SiteHeader current="jukebox" showHero={false} />

  <main id="content" bind:this={mainEl}>
    <section class="intro scrim" aria-labelledby="listen-heading">
      <p class="label" data-rise>Five NASA visualizations · Sound made from data</p>
      <h1 id="listen-heading" tabindex="-1" bind:this={heading} data-rise>Choose a world to hear</h1>
      <p class="lede" data-rise>Each one turns a NASA picture of our changing planet into music: warmer water sings higher, more lightning drums faster, growing cities glow brighter.</p>
    </section>

    <div data-rise>
      <TitleStrips tracks={TRACKS} selected={track} {manifest} onselect={select} />
    </div>

    <div id="player" class="player-wrap" tabindex="-1" data-rise>
      {#key track.id}
        <Player bind:this={player} {track} entry={manifest?.tracks[track.id]} />
      {/key}
    </div>

    <details class="panel shortcuts">
      <summary>Keyboard shortcuts</summary>
      <label class="toggle">
        <input type="checkbox" bind:checked={prefs.shortcuts} onchange={savePrefs} />
        Use single-key shortcuts
      </label>
      <p>Screen-reader users: in browse mode your screen reader uses these keys itself, so use the buttons instead, or switch shortcuts off here.</p>
      <dl>
        <dt>Space or K</dt><dd>Play or pause</dd>
        <dt>Left / Right arrow</dt><dd>Back or forward 5 seconds</dd>
        <dt>1 to {TRACKS.length}</dt><dd>Choose a visualization by its number</dd>
        <dt>M</dt><dd>Switch between musical and data-only sound</dd>
        <dt>A</dt><dd>Audio only (hide the video)</dd>
        <dt>L</dt><dd>Jump to “What each sound means”</dd>
      </dl>
    </details>
    {#if manifestError}<p role="status">{manifestError}</p>{/if}
  </main>

  <SiteFooter />
{/if}

<style>
  main { max-width: 84rem; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem) var(--s-xl); display: grid; gap: var(--s-xl); }
  .intro { padding-top: clamp(2.5rem, 8vh, 6rem); }
  .intro h1 { font-size: var(--t-h1); max-width: 14ch; margin-top: 0.3em; }
  .intro h1:focus { outline: none; box-shadow: none; }
  .lede { font-size: var(--t-lead); color: var(--c-text-muted); max-width: 44ch; }
  .player-wrap { display: grid; gap: var(--s-l); }
  .player-wrap:focus { outline: none; }
  .shortcuts dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.35rem 1.25rem; margin: 0.5rem 0 0; }
  .shortcuts dt { font-weight: 600; }
  .shortcuts dd { margin: 0; }
  .toggle { display: flex; align-items: center; gap: 0.5rem; min-height: 44px; }
</style>
