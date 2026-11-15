<script lang="ts">
  import { onMount } from 'svelte';
  import { loadJson } from '../analysis/load';
  import { rowFeatures, type FeatureTrack } from '../audio/render';
  import { TRACKS } from '../tracks';
  import type { TrackConfig } from '../tracks/types';
  import { formatTime, loadManifest, type Manifest } from '../ui/manifest';
  import SiteFooter from '../ui/SiteFooter.svelte';
  import StageCanvas from '../scene/StageCanvas.svelte';
  import SiteHeader from '../ui/SiteHeader.svelte';
  import { trackAccent } from '../design/tokens';
  import { trackEnvelope } from '../ui/waveform';

  interface AudioIndex {
    [key: string]: { file: string; bytes: number; seconds: number; peakDb: number };
  }

  const base = import.meta.env.BASE_URL;
  /** Transcript granularity: one line per this many seconds of soundscape. */
  const TRANSCRIPT_STEP = 10;

  let manifest = $state.raw<Manifest | null>(null);
  let audio = $state.raw<AudioIndex | null>(null);
  let missing = $state(false);
  let transcripts = $state.raw<Record<string, string[]>>({});
  let envelopes = $state.raw<Record<string, number[]>>({});

  onMount(async () => {
    manifest = await loadManifest().catch(() => null);
    Promise.all(TRACKS.map(async (t) => [t.id, await trackEnvelope(t, 72).catch(() => [])] as const)).then((e) => (envelopes = Object.fromEntries(e)));
    audio = await loadJson<AudioIndex>('audio/index.json').catch(() => {
      missing = true;
      return null;
    });
  });

  /** Timed text version of the soundscape: the detailed live caption every TRANSCRIPT_STEP seconds. */
  async function loadTranscript(t: TrackConfig) {
    if (transcripts[t.id]) return;
    const ft = await loadJson<FeatureTrack>(`features/${t.id}.json`);
    const lines: string[] = [];
    for (let s = 0; s * ft.hz < ft.rows.length; s += TRANSCRIPT_STEP) {
      lines.push(`${formatTime(s)}: ${t.caption(rowFeatures(ft, Math.min(ft.rows.length - 1, s * ft.hz))).detailed}`);
    }
    transcripts = { ...transcripts, [t.id]: lines };
  }

  const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
</script>

<StageCanvas />
<SiteHeader current="playlist" lede="Every soundscape, ready to play or download. Use these in a classroom, a museum, or anywhere the live jukebox can’t run." />

<main id="content">
  <p>
    Each track comes in two versions. <strong>Musical</strong> is the version you hear in the jukebox: harmonies, reverb and notes snapped to a scale.
    <strong>Data-only</strong> uses plain tones with no harmony, so you hear the mapping as directly as possible.
    Both were rendered from the same measurements as the live jukebox. Files are MP3 at 128 kbit/s.
  </p>
  {#if missing}
    <p role="status" class="panel">The audio files have not been generated yet. Run <code>node scripts/render_playlist.mjs</code>, then reload this page.</p>
  {/if}

  <ol class="tracks">
    {#each TRACKS as t, i (t.id)}
      {@const entry = manifest?.tracks[t.id]}
      <li class="panel track" style:--card-accent={trackAccent[t.id]}>
        <div class="art" aria-hidden="true">
          <img src={base + t.poster} alt="" loading="lazy" style:aspect-ratio={String(t.aspect)} />
          <svg class="wave" viewBox="0 0 144 40" preserveAspectRatio="none">
            {#each envelopes[t.id] ?? [] as v, k (k)}
              <rect x={k * 2} y={20 - v * 18 - 0.6} width="1.2" height={v * 36 + 1.2} rx="0.6" />
            {/each}
          </svg>
        </div>
        <p class="label">Track {String(i + 1).padStart(2, '0')} · {t.realm}</p>
        <h2 id={`h-${t.id}`}>{t.title}</h2>
        <p>{t.tagline}</p>
        <p class="desc">{t.description[0]}</p>

        {#if audio}
          {#each ['musical', 'data'] as mode (mode)}
            {@const a = audio[`${t.id}-${mode}`]}
            {#if a}
              <div class="version">
                <h3 id={`h-${t.id}-${mode}`}>{mode === 'musical' ? 'Musical' : 'Data-only'} ({formatTime(a.seconds)})</h3>
                <audio controls preload="none" src={base + a.file} aria-labelledby={`h-${t.id} h-${t.id}-${mode}`}></audio>
                <a href={base + a.file} download>Download {t.title}, {mode === 'musical' ? 'musical' : 'data-only'} (MP3, {mb(a.bytes)})</a>
              </div>
            {/if}
          {/each}
        {/if}

        <details ontoggle={(e) => e.currentTarget.open && loadTranscript(t)}>
          <summary>Read the transcript</summary>
          {#if transcripts[t.id]}
            <ol class="transcript">
              {#each transcripts[t.id] as line, k (k)}<li>{line}</li>{/each}
            </ol>
          {:else}
            <p role="status">Loading…</p>
          {/if}
        </details>

        <p class="credit">
          {#if entry}
            Visualization: <a href={entry.pageUrl}>{entry.title}</a>. Credit: {entry.creditLine}. Data dates: {entry.dataDates}.
          {:else}
            Visualization: <a href={`https://svs.gsfc.nasa.gov/${t.svsId}/`}>NASA SVS {t.svsId}</a>.
          {/if}
          <a href={`${base}?track=${t.id}`}>Open in the jukebox</a>.
        </p>
      </li>
    {/each}
  </ol>
</main>

<SiteFooter />

<style>
  main { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 2rem; display: grid; gap: 1.25rem; }
  /* Masonry: CSS columns, cards never split; posters keep their natural aspect so heights vary. */
  .tracks { list-style: none; padding: 0; margin: 0; columns: 2 24rem; column-gap: var(--s-m); }
  .tracks > li { break-inside: avoid; margin-bottom: var(--s-m); display: block; }
  .art { position: relative; margin: calc(-1 * var(--s-m)) calc(-1 * var(--s-m)) var(--s-s); border-radius: var(--r-m) var(--r-m) 0 0; overflow: hidden; background: #000; }
  .art img { display: block; width: 100%; height: auto; object-fit: cover; opacity: 0.8; }
  .wave { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 38%; fill: var(--card-accent); opacity: 0.9;
    background: linear-gradient(to top, rgba(5, 6, 10, 0.85), transparent); }
  .track .label { color: var(--card-accent); margin: 0; }
  .track h2 { font-size: var(--t-h3); margin: 0.1rem 0 0.4rem; }
  .desc { color: var(--muted); }
  .version { display: grid; gap: 0.4rem; margin: 0.75rem 0; }
  .version h3 { margin: 0; font-size: 1.05rem; }
  audio { width: 100%; max-width: 40rem; }
  .version a { min-height: 44px; display: inline-flex; align-items: center; }
  .transcript { margin: 0.5rem 0 0; padding-left: 1.4rem; display: grid; gap: 0.4rem; }
  .credit { font-size: 0.95rem; color: var(--muted); margin: 0.75rem 0 0; }
</style>
