<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { trackAccent } from '../design/tokens';
  import { getEarth } from '../scene/stageStore';
  import type { TrackConfig } from '../tracks/types';
  import { formatTime, type Manifest } from './manifest';
  import { trackEnvelope } from './waveform';

  /**
   * Pointer convenience layer over the 3D moons: invisible hit areas that follow each moon,
   * plus a glass hover card. aria-hidden and out of the tab order on purpose: the real,
   * accessible chooser is the radio group below (TitleStrips).
   */
  let {
    tracks,
    selected,
    manifest,
    onselect,
  }: { tracks: TrackConfig[]; selected: TrackConfig; manifest: Manifest | null; onselect: (t: TrackConfig) => void } = $props();

  type Pos = { x: number; y: number; r: number; front: boolean } | null;
  let positions = $state.raw<Pos[]>([]);
  let hover = $state(-1);
  let envelope = $state.raw<number[]>([]);
  let raf = 0;

  onMount(() => {
    const tick = () => {
      positions = getEarth()?.moonPositions() ?? [];
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  onDestroy(() => cancelAnimationFrame(raf));

  async function enter(i: number) {
    hover = i;
    envelope = [];
    const env = await trackEnvelope(tracks[i]).catch(() => []);
    if (hover === i) envelope = env;
  }
</script>

<div class="moons" aria-hidden="true">
  {#each positions as p, i (i)}
    {#if p}
      <button
        class="hit"
        class:back={!p.front}
        tabindex="-1"
        aria-label={tracks[i].title}
        style:left={`${p.x}px`}
        style:top={`${p.y}px`}
        style:width={`${p.r * 2}px`}
        style:height={`${p.r * 2}px`}
        onpointerenter={() => enter(i)}
        onpointerleave={() => (hover = -1)}
        onclick={() => onselect(tracks[i])}
      ></button>
      {#if hover === i}
        {@const t = tracks[i]}
        {@const dur = manifest?.tracks[t.id]?.video.duration}
        <div class="card glass" style:left={`${p.x + p.r + 14}px`} style:top={`${p.y}px`} style:--card-accent={trackAccent[t.id]}>
          <span class="label">Track {String(i + 1).padStart(2, '0')} · {t.realm}</span>
          <span class="title">{t.title}</span>
          <span class="line">{t.tagline}</span>
          <svg class="wave" viewBox="0 0 80 16" preserveAspectRatio="none">
            {#each envelope as v, k (k)}
              <rect x={k * 2} y={8 - v * 7 - 0.5} width="1.2" height={v * 14 + 1} rx="0.6" />
            {/each}
          </svg>
          <span class="meta">{dur ? formatTime(dur) : ''}{t.id === selected.id ? ' · Selected' : ' · Click to choose'}</span>
        </div>
      {/if}
    {/if}
  {/each}
</div>

<style>
  .moons { position: fixed; inset: 0; pointer-events: none; z-index: 5; }
  .hit {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: none;
    background: transparent;
    padding: 0;
    min-width: 0;
    min-height: 0;
    pointer-events: auto;
    cursor: pointer;
  }
  .hit.back { pointer-events: none; }
  .hit:hover { background: transparent; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.15); }
  .card {
    position: absolute;
    transform: translateY(-50%);
    width: 16rem;
    display: grid;
    gap: 0.2rem;
    padding: 0.85rem 1rem;
    pointer-events: none;
    border-color: color-mix(in srgb, var(--card-accent) 50%, transparent);
  }
  .label { color: var(--card-accent); font-size: 0.85rem; }
  .title { font-family: var(--f-display); font-size: 1.6rem; line-height: 1.05; }
  .line { color: var(--c-text-muted); font-size: 0.95rem; line-height: 1.35; }
  .wave { width: 100%; height: 22px; margin-top: 0.35rem; fill: var(--card-accent); opacity: 0.85; }
  .meta { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
