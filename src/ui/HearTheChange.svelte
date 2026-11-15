<script lang="ts">
  import { gsap } from 'gsap';
  import { onDestroy, onMount } from 'svelte';
  import type { Features } from '../analysis/types';
  import { loadJson } from '../analysis/load';
  import type { FeatureTrack } from '../audio/render';
  import { changes, snapshot, SnapshotPlayer, type Change } from '../audio/snapshot';
  import type { Mode } from '../audio/types';
  import { ease } from '../design/tokens';
  import type { TrackConfig } from '../tracks/types';
  import { pctFine } from '../tracks/words';
  import { isCalm } from './prefs.svelte';

  /**
   * "Hear the change": the same sonification frozen at moment A and moment B, plus only what
   * changed (one glide per change). Everything shown or played comes from the precomputed features.
   */
  let { track, mode, onbeforeplay, announce }: {
    track: TrackConfig;
    mode: Mode;
    onbeforeplay: () => void;
    announce: (text: string) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const c = track.compare!;
  const base = import.meta.env.BASE_URL;
  const SNAP_SECONDS = 7;
  const snap = new SnapshotPlayer();

  let a = $state.raw<Features | null>(null);
  let b = $state.raw<Features | null>(null);
  let list = $state.raw<Change[]>([]);
  let summary = $state('');
  let playing = $state<'' | 'a' | 'b' | 'delta'>('');
  let pos = $state(50); // % of the frame showing moment A (left) — 100 = all A
  let wipeTween: gsap.core.Tween | null = null;

  onMount(async () => {
    const ft = await loadJson<FeatureTrack>(`features/${track.id}.json`);
    a = snapshot(ft, c.a.from, c.a.to);
    b = snapshot(ft, c.b.from, c.b.to);
    list = changes(track.sound, a, b);
    summary = c.summary(a, b);
  });
  onDestroy(() => {
    snap.stop();
    wipeTween?.kill();
  });

  /** Raw feature values are shares (0–1) for these tracks' data bindings; show them as percentages. */
  const fmt = (v: number) => (Math.abs(v) <= 1 ? pctFine(v) : v.toFixed(1));

  function wipeTo(target: number, seconds: number) {
    wipeTween?.kill();
    if (isCalm()) {
      pos = target;
      return;
    }
    const o = { p: pos };
    wipeTween = gsap.to(o, { p: target, duration: seconds, ease: ease.inOutQuart, onUpdate: () => void (pos = o.p) });
  }

  async function play(which: 'a' | 'b' | 'delta') {
    if (!a || !b) return;
    if (playing === which) return stop();
    onbeforeplay();
    playing = which;
    const done = () => {
      if (playing === which) playing = '';
    };
    if (which === 'delta') {
      wipeTo(100, 0.4);
      announce(`What changed: ${list.map((ch) => `${ch.binding.visual}, ${ch.xb > ch.xa ? 'up' : 'down'}`).join('; ')}. ${summary}`);
      wipeTo(0, list.length * 1.3 + 0.6);
      await snap.playChanges(list, mode, done);
    } else {
      wipeTo(which === 'a' ? 100 : 0, 1.2);
      announce(`Playing ${which === 'a' ? c.a.label : c.b.label}.`);
      await snap.play(track.sound, which === 'a' ? a : b, mode, SNAP_SECONDS, done);
    }
  }

  function stop() {
    snap.stop();
    playing = '';
  }
</script>

<section class="change" aria-labelledby="change-heading" style:--pos={`${pos}%`} style:--ar={String(track.aspect)}>
  <p class="label">Hear the change · {c.kind === 'change' ? 'Change over time' : 'Seasons, within one year'}</p>
  <h3 id="change-heading">{c.heading}</h3>

  <div class="wipe">
    <img class="img-b" src={`${base}media/compare/${track.id}-b.webp`} alt={`${track.title}, ${c.b.label}`} />
    <img class="img-a" src={`${base}media/compare/${track.id}-a.webp`} alt={`${track.title}, ${c.a.label}`} />
    <span class="divider" aria-hidden="true"></span>
    <span class="tag tag-a" aria-hidden="true">{c.a.label}</span>
    <span class="tag tag-b" aria-hidden="true">{c.b.label}</span>
    <label class="visually-hidden" for="wipe-range">Compare {c.a.label} and {c.b.label}: wipe position</label>
    <input id="wipe-range" type="range" min="0" max="100" step="1" bind:value={pos}
      aria-valuetext={`${Math.round(pos)}% ${c.a.label}, ${Math.round(100 - pos)}% ${c.b.label}`} />
  </div>

  <div class="listen" role="group" aria-label="Listen to the comparison">
    <button aria-pressed={playing === 'a'} onclick={() => play('a')} disabled={!a}>Play {c.a.label}</button>
    <button aria-pressed={playing === 'b'} onclick={() => play('b')} disabled={!b}>Play {c.b.label}</button>
    <button class="delta" aria-pressed={playing === 'delta'} onclick={() => play('delta')} disabled={!list.length}>Play the difference</button>
  </div>

  {#if summary}<p class="summary">{summary}</p>{/if}

  {#if list.length}
    <ul class="changes" aria-label="What changed">
      {#each list as ch (ch.binding.feature)}
        <li>
          <span class="arrow" aria-hidden="true">{ch.xb > ch.xa ? '↗' : '↘'}</span>
          <span>{ch.binding.visual}</span>
          <span class="vals num">{fmt(ch.a)} → {fmt(ch.b)}<span class="visually-hidden">, {ch.xb > ch.xa ? 'up' : 'down'}</span></span>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="note">{c.note} “Play the difference” plays one rising or falling glide per change: up means more, down means less.</p>
</section>

<style>
  .change { display: grid; gap: var(--s-s); }
  .change h3 { font-size: var(--t-h2); margin: 0; }
  .wipe {
    position: relative;
    width: 100%;
    aspect-ratio: var(--ar, 2 / 1);
    border-radius: var(--r-m);
    overflow: hidden;
    background: #000;
    border: 1px solid var(--c-hairline);
  }
  .wipe img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .img-a { clip-path: inset(0 calc(100% - var(--pos)) 0 0); }
  .divider { position: absolute; top: 0; bottom: 0; left: var(--pos); width: 2px; margin-left: -1px; background: var(--c-text); box-shadow: 0 0 18px var(--accent); }
  .tag { position: absolute; top: 0.8rem; padding: 0.15rem 0.7rem; border-radius: var(--r-pill); background: var(--c-scrim); font-variant-caps: all-small-caps; letter-spacing: 0.12em; font-weight: 600; }
  .tag-a { left: 0.8rem; }
  .tag-b { right: 0.8rem; }
  /* The real control: a full-size transparent slider over the images (drag anywhere, or use arrow keys). */
  .wipe input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: ew-resize; margin: 0; }
  .wipe:has(input:focus-visible) { outline: 2px solid var(--c-focus); outline-offset: 3px; }
  .listen { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .delta[aria-pressed='false'] { border-color: var(--accent); }
  .summary { font-family: var(--f-display); font-size: clamp(1.4rem, 2.3vw, 2.1rem); line-height: 1.2; max-width: 27em; margin: 0.4rem 0 0; text-wrap: balance; }
  .changes { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; max-width: 46rem; }
  .changes li { display: grid; grid-template-columns: 1.5rem 1fr auto; gap: 0.75rem; padding: 0.45rem 0; border-bottom: 1px solid var(--c-hairline); }
  .arrow { color: var(--accent); font-weight: 600; }
  .vals { color: var(--c-text-muted); }
  .note { color: var(--c-text-muted); max-width: 43em; }
</style>
