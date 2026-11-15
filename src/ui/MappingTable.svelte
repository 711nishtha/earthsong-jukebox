<script lang="ts">
  import { FIDELITY_LABEL } from '../audio/fidelity';
  import type { TrackConfig } from '../tracks/types';

  let { track, caption }: { track: TrackConfig; caption: string } = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (a scrollable region must be keyboard-focusable so it can be scrolled; axe: scrollable-region-focusable) -->
<div class="table-wrap" role="region" aria-label={caption} tabindex="0">
  <table>
    <caption class="visually-hidden">{caption}</caption>
    <thead>
      <tr><th scope="col">Visual feature</th><th scope="col">How measured</th><th scope="col">Audio parameter</th><th scope="col">Range</th><th scope="col">Data or artistic?</th><th scope="col">Why</th></tr>
    </thead>
    <tbody>
      {#each track.sound.bindings as b, i (b.target + i)}
        <tr>
          <th scope="row">{b.visual}</th><td>{b.measured}</td><td>{b.audio}</td><td>{b.range}</td>
          <td>{FIDELITY_LABEL[b.fidelity]}{b.amplified ? ', amplified' : ''}</td><td>{b.why}</td>
        </tr>
      {/each}
      {#each track.sound.layers.filter((l) => l.fidelity === 'artistic' && !track.sound.bindings.some((b) => b.target.startsWith(`${l.id}.`))) as l (l.id)}
        <tr><th scope="row">(background)</th><td>—</td><td>{l.label} layer</td><td>constant</td><td>Artistic</td><td>{l.description}</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrap { overflow-x: auto; margin-top: 0.5rem; }
  table { border-collapse: collapse; min-width: 52rem; font-size: 0.95rem; }
  th, td { text-align: left; vertical-align: top; padding: 0.45rem 0.6rem; border-bottom: 1px solid var(--rim); }
  thead th { color: var(--brass); }
  tbody th { font-weight: 700; }
</style>
