<script lang="ts">
  import type { TrackConfig } from '../tracks/types';
  import type { MediaEntry } from './manifest';

  let { track, entry }: { track: TrackConfig; entry: MediaEntry | undefined } = $props();
</script>

<section aria-labelledby="describe-heading" class="info">
  <div class="panel" id="track-description">
    <h2 id="describe-heading">What the picture shows</h2>
    {#each track.description as para, i (i)}<p>{para}</p>{/each}
  </div>

  <details class="panel">
    <summary>Science details</summary>
    {#each track.science as para, i (i)}<p>{para}</p>{/each}
  </details>

  {#if entry}
    <details class="panel">
      <summary>Credits for this visualization</summary>
      <p>
        <a href={entry.pageUrl}>{entry.title}</a> (SVS {entry.svsId}{entry.linkedFrom ? `, linked from SVS ${entry.linkedFrom}` : ''}), released {entry.releaseDate}.
        Credit: {entry.creditLine}.
      </p>
      <dl>
        {#each entry.credits as c (c.role)}
          <dt>{c.role}</dt>
          <dd>{c.people.join(', ')}</dd>
        {/each}
        {#if entry.datasets.length}
          <dt>Data</dt>
          <dd>
            <ul>
              {#each entry.datasets as d (d.name)}
                <li>{d.name}{d.platform || d.sensor ? ` (${[d.platform, d.sensor].filter(Boolean).join(', ')})` : ''}{d.credit ? `. ${d.credit}` : ''}</li>
              {/each}
            </ul>
          </dd>
        {/if}
        <dt>Data dates</dt>
        <dd>{entry.dataDates}</dd>
      </dl>
      <p class="note">The video was resized for the web; nothing else in it was changed. The soundscape is made by Earth Jukebox, not by NASA, and is not endorsed by NASA.</p>
    </details>
  {/if}
</section>

<style>
  .info { display: grid; gap: 0.9rem; }
  dl { margin: 0; }
  dt { font-weight: 700; margin-top: 0.6rem; }
  dd { margin: 0; color: var(--muted); }
  dd ul { margin: 0.25rem 0 0; padding-left: 1.2rem; }
  .note { color: var(--muted); font-size: 0.95rem; margin-top: 0.8rem; }
</style>
