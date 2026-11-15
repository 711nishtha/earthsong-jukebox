<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { riseIn } from './design/motion';
  import { trackAccent } from './design/tokens';
  import StageCanvas from './scene/StageCanvas.svelte';
  import { getEarth, getStage, setHeroSlot, whenStage } from './scene/stageStore';
  import { TRACKS } from './tracks';
  import type { TrackConfig } from './tracks/types';
  import EnterScreen from './ui/EnterScreen.svelte';
  import { loadManifest, type Manifest } from './ui/manifest';
  import OrbitMoons from './ui/OrbitMoons.svelte';
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
  const SEEN = 'earth-jukebox:entered';
  /** `/?demo`: the 30-second recording sequence (always starts from the beginning). */
  const demoMode = new URLSearchParams(location.search).has('demo');
  let proof = $state(false);
  let proofNumbers = $state.raw<{ r: number | null; quiz: string }>({ r: null, quiz: '' });
  /** Once per visit: coming back from another page goes straight to the jukebox (Play still unlocks audio). */
  let entered = $state(!demoMode && sessionFlag());

  function sessionFlag(): boolean {
    try {
      return sessionStorage.getItem(SEEN) === '1';
    } catch {
      return false;
    }
  }
  let heading = $state<HTMLElement>();
  let mainEl = $state<HTMLElement>();
  let globeSlot = $state<HTMLElement>();

  onMount(() => {
    if (entered) whenStage().then(() => onEntered(false));
    loadManifest().then((m) => (manifest = m)).catch(() => (manifestError = 'Credits could not be loaded. The visualizations still work.'));
  });

  // Each track tints the interface and the nebula with its own visualization's colour.
  $effect(() => {
    document.documentElement.style.setProperty('--accent', trackAccent[track.id]);
    if (entered) {
      getStage()?.setPalette(track.id);
      getEarth()?.setAccent(trackAccent[track.id]);
      getEarth()?.setSelected(TRACKS.indexOf(track));
    }
  });

  /** The globe fades and lifts away as you scroll down to the player. */
  function onScroll() {
    getEarth()?.setPresence(1 - Math.min(1, Math.max(0, scrollY / (innerHeight * 0.7))));
  }

  /** `moveFocus` only after a deliberate Enter, not when a return visit skips the intro. */
  async function onEntered(moveFocus = true) {
    entered = true;
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {
      /* storage blocked: the intro simply shows again next time */
    }
    await tick();
    getStage()?.setPalette(track.id);
    const earth = getEarth();
    earth?.setAccent(trackAccent[track.id]);
    earth?.setSelected(TRACKS.indexOf(track));
    setHeroSlot(globeSlot ?? null);
    earth?.setAnchor(globeSlot ?? null);
    earth?.reveal();
    if (moveFocus) heading?.focus();
    if (mainEl) riseIn(mainEl.querySelectorAll('[data-rise]'), 0.1, 0.1);
  }

  async function startDemo() {
    const [{ runDemo }, { loadJson }, { loadStats }] = await Promise.all([import('./ui/demo'), import('./analysis/load'), import('./quiz/stats')]);
    loadJson<{ rows: { pearson: number | null }[] }>('fidelity.json')
      .then((f) => {
        const v = f.rows.map((r) => r.pearson).filter((x): x is number => x !== null).sort((p, q) => p - q);
        proofNumbers = { ...proofNumbers, r: v.length ? v[Math.floor(v.length / 2)] : null };
      })
      .catch(() => {});
    loadStats()
      // Only real, pooled results go on the demo card; this browser's own test answers would mislead.
      .then((st) => (proofNumbers = { ...proofNumbers, quiz: st.source === 'live' && st.answers ? `${Math.round(st.correctRate * 100)}% of ${st.answers} quiz answers right by ear` : '' }))
      .catch(() => {});
    await runDemo({
      enter: () => onEntered(false),
      selectTrack: async (id) => {
        const t = TRACKS.find((x) => x.id === id);
        if (t) select(t);
        await tick();
      },
      showProof: () => (proof = true),
    });
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
    else if (k === 'l') player?.openLegend();
    else if (k === 'e') player?.toggleExplore();
    else if (/^[1-9]$/.test(k) && TRACKS[Number(k) - 1]) select(TRACKS[Number(k) - 1]);
    else return;
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKey} onscroll={onScroll} />

<StageCanvas />

{#if !entered && demoMode}
  <main id="content" class="demo-gate">
    <p class="label">Earth Jukebox · demo</p>
    <h1>Thirty seconds, one take.</h1>
    <p class="lede">Start your screen recording, then press the button. Sound included.</p>
    <button class="demo-go" onclick={startDemo}>Start the demo</button>
  </main>
{:else if !entered}
  <main id="content">
    <EnterScreen onentered={() => onEntered()} />
  </main>
{:else}
  <SiteHeader current="jukebox" showHero={false} />

  <main id="content" bind:this={mainEl}>
    <div class="hero">
      <section class="intro scrim" aria-labelledby="listen-heading">
        <p class="label" data-rise>Five NASA visualizations · Sound made from data</p>
        <h1 id="listen-heading" tabindex="-1" bind:this={heading} data-rise>Choose a world to hear</h1>
        <p class="lede" data-rise>Each one turns a NASA picture of our changing planet into music: warmer water sings higher, more lightning drums faster, growing cities glow brighter.</p>
      </section>
      <!-- Empty slot: the 3D Earth (behind, in the stage canvas) centres itself in this box. -->
      <div class="globe-slot" bind:this={globeSlot} aria-hidden="true"></div>
    </div>

    <OrbitMoons tracks={TRACKS} selected={track} {manifest} onselect={select} />

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
        <dt>L</dt><dd>Open the sound legend</dd>
        <dt>E</dt><dd>Explore by touch: pause and play the picture with the arrow keys</dd>
      </dl>
    </details>
    {#if manifestError}<p role="status">{manifestError}</p>{/if}
  </main>

  <SiteFooter />
{/if}

{#if proof}
  <div class="proof-backdrop" aria-hidden="true"></div>
  <section class="proof glass" aria-labelledby="proof-title">
    <p class="label">Earth Jukebox · NASA Space Apps 2026</p>
    <h2 id="proof-title">Close your eyes. Listen to the planet.</h2>
    <ul>
      {#if proofNumbers.r !== null}<li><span class="num">r = {proofNumbers.r.toFixed(2)}</span> the sound follows the data (median of 32 measured mappings)</li>{/if}
      {#if proofNumbers.quiz}<li>{proofNumbers.quiz}</li>{/if}
      <li>Built for blind and low-vision listeners first</li>
    </ul>
    <p class="url">711nishtha.github.io/earthsong-jukebox</p>
    <button onclick={() => (proof = false)}>Close</button>
  </section>
{/if}

<style>
  main { max-width: 84rem; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem) var(--s-xl); display: grid; gap: var(--s-xl); }
  /* First screen: headline on the left, the 3D Earth (in the stage canvas) in the slot on the right. */
  .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); align-items: center; gap: var(--s-l); min-height: min(82vh, 56rem); }
  .intro { padding-top: clamp(2rem, 6vh, 4rem); }
  .globe-slot { align-self: stretch; min-height: 26rem; }
  @media (max-width: 56rem) {
    .hero { grid-template-columns: 1fr; min-height: 0; gap: 0; }
    .globe-slot { order: -1; min-height: 0; height: min(84vw, 26rem); }
    .intro { padding-top: 0; }
  }
  .intro h1 { font-size: var(--t-h1); max-width: 6.44em; margin-top: 0.3em; }
  .intro h1:focus { outline: none; box-shadow: none; }
  .lede { font-size: var(--t-lead); color: var(--c-text-muted); max-width: 29.5em; }
  .player-wrap { display: grid; gap: var(--s-l); }
  .player-wrap:focus { outline: none; }
  .shortcuts dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.35rem 1.25rem; margin: 0.5rem 0 0; }
  .shortcuts dt { font-weight: 600; }
  .shortcuts dd { margin: 0; }
  .toggle { display: flex; align-items: center; gap: 0.5rem; min-height: 44px; }
  .demo-gate { min-height: 100vh; align-content: center; padding-top: 0; }
  .demo-gate h1 { font-size: var(--t-hero); line-height: 0.95; max-width: 5.52em; }
  .demo-go { min-height: 60px; padding: 0 2.4rem; font-size: 1.15rem; background: var(--c-text); color: var(--c-space); justify-self: start; }
  .proof {
    position: fixed; z-index: 60; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(44rem, 92vw); padding: clamp(1.5rem, 4vw, 3rem); text-align: left;
    background: var(--c-glass-strong);
    animation: proof-in 1.2s var(--e-out-expo);
  }
  .proof h2 { font-size: var(--t-h2); }
  .proof ul { list-style: none; padding: 0; display: grid; gap: 0.5rem; font-size: 1.15rem; }
  .proof .num { font-family: var(--f-display); font-size: 1.8rem; color: var(--accent); margin-right: 0.5rem; }
  .proof .url { color: var(--c-text-muted); font-variant-caps: all-small-caps; letter-spacing: 0.14em; }
  .proof-backdrop { position: fixed; inset: 0; z-index: 59; background: rgba(5, 6, 10, 0.7); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: fade-in 1s ease-out; }
  @keyframes fade-in { from { opacity: 0; } }
  @keyframes proof-in { from { opacity: 0; transform: translate(-50%, -46%); } }
</style>
