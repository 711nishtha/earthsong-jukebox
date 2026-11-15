<script lang="ts">
  import type { TrackConfig } from '../tracks/types';
  import { formatTime, type Manifest } from './manifest';

  let {
    tracks,
    selected,
    manifest,
    onselect,
  }: { tracks: TrackConfig[]; selected: TrackConfig; manifest: Manifest | null; onselect: (t: TrackConfig) => void } = $props();

  const base = import.meta.env.BASE_URL;
</script>

<section aria-labelledby="pick-heading" class="strips-wrap">
  <h2 id="pick-heading">Pick a visualization</h2>
  <p class="hint">Choose a strip, or press its number key (1 to {tracks.length}) when keyboard shortcuts are on.</p>
  <ul class="strips">
    {#each tracks as t, i (t.id)}
      {@const dur = manifest?.tracks[t.id]?.video.duration}
      <li>
        <button class="strip" aria-pressed={t.id === selected.id} onclick={() => onselect(t)}>
          <img src={base + t.poster} alt="" width="480" height={Math.round(480 / t.aspect)} loading="lazy" />
          <span class="code" aria-hidden="true">A{i + 1}</span>
          <span class="text">
            <span class="title"><span class="visually-hidden">A{i + 1}: </span>{t.title}</span>
            <span class="tagline">{t.tagline}</span>
            <span class="meta">
              {#if dur}{formatTime(dur)}{/if}
              {#if t.flashing}<span class="flash">Contains flashing dots</span>{/if}
            </span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .hint { color: var(--muted); }
  .strips {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15.5rem), 1fr));
  }
  /* A jukebox title strip: cream card, selection code on the left, two-line title. */
  .strip {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr;
    gap: 0;
    padding: 0;
    text-align: left;
    background: var(--strip);
    color: var(--ink);
    border: 3px solid var(--strip);
    border-radius: var(--radius-strip);
    overflow: hidden;
  }
  .strip:hover { border-color: var(--brass); }
  .strip[aria-pressed='true'] {
    background: var(--strip);
    color: var(--ink);
    border-color: var(--brass);
    box-shadow: 0 0 0 3px var(--brass), 0 0 28px 2px color-mix(in srgb, var(--brass) 45%, transparent);
  }
  img {
    grid-column: 1 / -1;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 7;
    object-fit: cover;
    display: block;
    background: #000;
  }
  .code {
    font-weight: 700;
    font-size: 1.5rem;
    padding: 0.55rem 0.7rem;
    border-right: 2px solid color-mix(in srgb, var(--ink) 35%, transparent);
    font-variant-numeric: tabular-nums;
  }
  .strip[aria-pressed='true'] .code { background: var(--brass); }
  .text { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.55rem 0.8rem 0.7rem; }
  .title { font-weight: 700; font-size: 1.15rem; }
  .tagline { font-size: 0.95rem; line-height: 1.35; }
  .meta { font-size: 0.9rem; display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: auto; padding-top: 0.25rem; }
  .flash { font-weight: 700; }
  /* Phones: thumbnails are decorative, so drop them and keep five compact strips above the player. */
  @media (max-width: 40rem) {
    img { display: none; }
    .tagline { display: none; }
  }
</style>
