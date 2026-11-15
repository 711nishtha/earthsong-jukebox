<script lang="ts">
  import { onMount } from 'svelte';
  import { loadJson } from '../analysis/load';
  import { rowFeatures, type FeatureTrack } from '../audio/render';
  import { TRACKS } from '../tracks';
  import type { TrackConfig } from '../tracks/types';
  import { formatTime, loadManifest, type Manifest } from '../ui/manifest';
  import SiteFooter from '../ui/SiteFooter.svelte';
  import SiteHeader from '../ui/SiteHeader.svelte';

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

  onMount(async () => {
    manifest = await loadManifest().catch(() => null);
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
      <li class="panel track">
        <h2 id={`h-${t.id}`}><span class="code">A{i + 1}</span> {t.title}</h2>
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
  .tracks { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.25rem; }
  .track h2 { display: flex; gap: 0.75rem; align-items: baseline; }
  .code { background: var(--strip); color: var(--ink); border-radius: var(--radius-strip); padding: 0 0.5rem; font-variant-numeric: tabular-nums; }
  .desc { color: var(--muted); }
  .version { display: grid; gap: 0.4rem; margin: 0.75rem 0; }
  .version h3 { margin: 0; font-size: 1.05rem; }
  audio { width: 100%; max-width: 40rem; }
  .version a { min-height: 44px; display: inline-flex; align-items: center; }
  .transcript { margin: 0.5rem 0 0; padding-left: 1.4rem; display: grid; gap: 0.4rem; }
  .credit { font-size: 0.95rem; color: var(--muted); margin: 0.75rem 0 0; }
</style>
