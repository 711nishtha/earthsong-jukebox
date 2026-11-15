<script lang="ts">
  import { trackAccent } from '../design/tokens';
  import type { TrackConfig } from '../tracks/types';
  import { formatTime, type Manifest } from './manifest';

  let {
    tracks,
    selected,
    manifest,
    onselect,
  }: { tracks: TrackConfig[]; selected: TrackConfig; manifest: Manifest | null; onselect: (t: TrackConfig) => void } = $props();

  const base = import.meta.env.BASE_URL;
  const two = (n: number) => String(n).padStart(2, '0');
</script>

<section aria-labelledby="pick-heading" class="strips-wrap">
  <h2 id="pick-heading" class="visually-hidden">Pick a visualization</h2>
  <ul class="strips">
    {#each tracks as t, i (t.id)}
      {@const dur = manifest?.tracks[t.id]?.video.duration}
      {@const isSel = t.id === selected.id}
      <li>
        <!-- Selected = accent border + glow + "Selected" tag. Keyboard focus = separate white ring (base.css). -->
        <button class="card" class:selected={isSel} aria-pressed={isSel} onclick={() => onselect(t)} style:--card-accent={trackAccent[t.id]}>
          <span class="thumb">
            <img src={base + t.poster} alt="" width="480" height={Math.round(480 / t.aspect)} loading="lazy" />
          </span>
          <span class="body">
            <span class="label">Track {two(i + 1)} · {t.realm}</span>
            <span class="title">{t.title}</span>
            <span class="tagline">{t.tagline}</span>
            <span class="meta">
              {#if dur}<span class="num">{formatTime(dur)}</span>{/if}
              {#if t.flashing}<span>Flashing dots</span>{/if}
              {#if isSel}<span class="tag">Selected</span>{/if}
            </span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .strips {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--s-s);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  }
  .card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
    text-align: left;
    border-radius: var(--r-m);
    border: 1px solid var(--c-hairline);
    background: var(--c-glass);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    overflow: hidden;
    font-weight: 400;
    transition: border-color var(--d-base) var(--e-out-quart), box-shadow var(--d-base) var(--e-out-quart), transform var(--d-base) var(--e-out-expo);
  }
  .card:hover:not(.selected) { background: var(--c-glass); border-color: var(--c-control); transform: translateY(-3px); }
  /* aria-pressed would otherwise pick up the base "filled toggle" style. */
  .card[aria-pressed='true'] { background: var(--c-glass); color: var(--c-text); }
  .card.selected {
    border-color: var(--card-accent);
    box-shadow: 0 0 0 1px var(--card-accent), 0 18px 60px -18px color-mix(in srgb, var(--card-accent) 60%, transparent);
  }
  .thumb { display: block; aspect-ratio: 16 / 8; overflow: hidden; background: #000; }
  img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform var(--d-slow) var(--e-out-expo), opacity var(--d-base); opacity: 0.85; }
  .card:hover img, .card.selected img { transform: scale(1.04); opacity: 1; }
  .body { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.9rem 1.1rem 1.1rem; flex: 1; }
  .label { color: var(--card-accent); font-size: 0.9rem; }
  .title { font-family: var(--f-display); font-size: 1.75rem; line-height: 1.05; letter-spacing: -0.01em; }
  .tagline { color: var(--c-text-muted); font-size: 1rem; line-height: 1.4; }
  .meta { display: flex; gap: 0.9rem; flex-wrap: wrap; margin-top: auto; padding-top: 0.5rem; color: var(--c-text-muted); font-size: 0.95rem; }
  .tag { color: var(--c-space); background: var(--card-accent); border-radius: var(--r-pill); padding: 0 0.6rem; font-weight: 600; }
  @media (max-width: 40rem) {
    .thumb, .tagline { display: none; }
  }
</style>
