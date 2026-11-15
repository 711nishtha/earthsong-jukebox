<script lang="ts">
  import { gsap } from 'gsap';
  import { onMount } from 'svelte';
  import { startAmbient } from '../audio/ambient';
  import { magnetic, revealWords, riseIn } from '../design/motion';
  import { duration, ease } from '../design/tokens';
  import { whenStage } from '../scene/stageStore';
  import { isCalm, prefs, savePrefs } from './prefs.svelte';

  let { onentered }: { onentered: () => void } = $props();

  let root = $state<HTMLElement>();
  let line = $state<HTMLElement>();
  let busy = $state(false);
  let audioNote = $state('');

  onMount(() => {
    if (!line || !root) return;
    revealWords(line, 0.4);
    riseIn(root.querySelectorAll('[data-rise]'), 1.3);
  });

  /**
   * The Enter click does two jobs: it is the user gesture that unlocks audio for the whole visit
   * (browser autoplay policy), and it starts the journey.
   */
  async function enter(skip = false) {
    if (busy) return;
    busy = true;
    // Tone.start() runs synchronously inside this click (that is what unlocks audio); building the
    // drone's reverb takes a moment, so it runs alongside the visuals instead of delaying them.
    startAmbient().catch(() => {
      audioNote = 'Sound could not start in this browser. You can still explore; the playlist page has MP3s.';
    });
    const calm = skip || isCalm();
    const stage = calm ? null : await whenStage(1200);
    const out = gsap.to(root!, {
      opacity: 0,
      y: calm ? 0 : -40,
      duration: calm ? duration.crossfade : duration.slow,
      ease: ease.inOutQuart,
    });
    if (stage) await Promise.all([stage.warp(), out.then()]);
    else await out.then();
    onentered();
  }

  function toggleCalm() {
    prefs.calm = !prefs.calm;
    savePrefs();
  }
</script>

<section class="enter" bind:this={root} aria-labelledby="enter-line">
  <div class="inner scrim">
    <p class="label" data-rise>Earth Jukebox · NASA Space Apps 2026</p>
    <h1 id="enter-line" class="display" bind:this={line}>Close your eyes. Listen to the planet.</h1>
    <p class="lead" data-rise>
      Five NASA visualizations of our changing Earth, turned into sound you can understand. The music is made live, from the data on screen.
    </p>
    <div class="actions" data-rise>
      <button class="go" use:magnetic onclick={() => enter(false)} disabled={busy}>
        <span>{busy ? 'Entering…' : 'Enter'}</span>
      </button>
      <button class="quiet" onclick={() => enter(true)} disabled={busy}>Skip intro</button>
    </div>
    <div class="meta" data-rise>
      <span class="label">Headphones recommended</span>
      <button class="switch" aria-pressed={prefs.calm} onclick={toggleCalm}>Calm mode</button>
    </div>
    {#if audioNote}<p role="status" class="note">{audioNote}</p>{/if}
  </div>
</section>

<style>
  .enter {
    min-height: 100vh;
    min-height: 100svh;
    display: grid;
    align-items: center;
    padding: var(--s-l) clamp(1rem, 6vw, 7rem);
  }
  .inner { max-width: 70rem; padding: var(--s-l) 0; }
  h1 {
    font-size: var(--t-hero);
    line-height: 0.95;
    letter-spacing: -0.03em;
    margin: 0.35em 0 0.45em;
    max-width: 5.52em;
  }
  .lead { font-size: var(--t-lead); color: var(--c-text-muted); max-width: 25.5em; margin-bottom: var(--s-l); }
  .actions { display: flex; flex-wrap: wrap; gap: var(--s-s); align-items: center; }
  .go {
    position: relative;
    overflow: hidden;
    min-height: 60px;
    padding: 0 2.6rem;
    font-size: 1.15rem;
    letter-spacing: 0.02em;
    background: var(--c-text);
    color: var(--c-space);
    border-color: var(--c-text);
  }
  /* Cursor-follow glow inside the button. */
  .go::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(120px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(95, 212, 200, 0.55), transparent 70%);
    opacity: 0;
    transition: opacity var(--d-base) var(--e-out-quart);
  }
  .go:hover::before { opacity: 1; }
  .go span { position: relative; }
  .go:hover:not(:disabled) { background: var(--c-text); }
  .quiet { border-color: transparent; text-decoration: underline; text-underline-offset: 0.25em; text-decoration-color: var(--c-control); }
  .meta { display: flex; flex-wrap: wrap; gap: var(--s-m); align-items: center; margin-top: var(--s-l); }
  .note { color: var(--c-danger); margin-top: var(--s-m); }
</style>
