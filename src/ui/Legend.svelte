<script lang="ts">
  import { FIDELITY_HELP, FIDELITY_LABEL } from '../audio/fidelity';
  import type { Binding, Mode } from '../audio/types';
  import type { TrackConfig } from '../tracks/types';
  import MappingTable from './MappingTable.svelte';

  let {
    track,
    mode,
    muted,
    onmute,
    onpreview,
  }: {
    track: TrackConfig;
    mode: Mode;
    muted: Set<string>;
    onmute: (layerId: string, muted: boolean) => void;
    onpreview: (b: Binding, end: 'low' | 'high') => Promise<void>;
  } = $props();

  let previewing = $state('');

  async function preview(b: Binding, end: 'low' | 'high', key: string) {
    if (previewing) return;
    previewing = key;
    try {
      await onpreview(b, end);
    } finally {
      previewing = '';
    }
  }

  const bindingsFor = (layerId: string) => track.sound.bindings.filter((b) => b.target.startsWith(`${layerId}.`));
  const usedFidelities = $derived([...new Set([...track.sound.layers.map((l) => l.fidelity), ...track.sound.bindings.map((b) => b.fidelity)])]);
</script>

<section aria-labelledby="legend-heading" class="legend">
  <h2 id="legend-heading" tabindex="-1">What each sound means</h2>
  <p class="mood">{track.sound.mood}</p>

  <ul class="layers">
    {#each track.sound.layers as layer (layer.id)}
      {@const rows = bindingsFor(layer.id)}
      <li class="layer panel">
        <div class="layer-head">
          <h3>{layer.label}</h3>
          <span class="badge">{FIDELITY_LABEL[layer.fidelity]}</span>
          <label class="mute">
            <input type="checkbox" checked={!muted.has(layer.id)} onchange={(e) => onmute(layer.id, !e.currentTarget.checked)} />
            Play {layer.label.toLowerCase()}
          </label>
        </div>
        <p>{layer.description}</p>
        {#if rows.length}
          <ul class="rows">
            {#each rows as b, i (b.target + i)}
              {@const key = `${b.target}:${i}`}
              <li>
                <p class="rule"><strong>{b.visual}</strong> → {b.audio} <span class="range">({b.range})</span>
                  <span class="badge small">{FIDELITY_LABEL[b.fidelity]}{b.amplified ? ', amplified' : ''}</span></p>
                <div class="hear" role="group" aria-label={`Preview: ${b.visual}`}>
                  <button disabled={!!previewing} onclick={() => preview(b, 'low', key + 'low')} aria-describedby="preview-note"
                    aria-label={`Hear low: ${b.visual}`}>
                    {previewing === key + 'low' ? 'Playing…' : 'Hear low'}
                  </button>
                  <button disabled={!!previewing} onclick={() => preview(b, 'high', key + 'high')} aria-describedby="preview-note"
                    aria-label={`Hear high: ${b.visual}`}>
                    {previewing === key + 'high' ? 'Playing…' : 'Hear high'}
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
  <p id="preview-note" class="note">Previews pause the video and play about two seconds of that one sound{mode === 'data' ? ' in data-only mode' : ''}.</p>

  <details class="panel key">
    <summary>How honest is each sound?</summary>
    <dl>
      {#each usedFidelities as f (f)}
        <dt>{FIDELITY_LABEL[f]}</dt>
        <dd>{FIDELITY_HELP[f]}</dd>
      {/each}
      <dt>Amplified</dt>
      <dd>The data only changes a little here, so we stretch that small range to make the change audible.</dd>
    </dl>
  </details>

  <details class="panel">
    <summary>Full mapping table</summary>
    <MappingTable {track} caption={`Mapping table for ${track.title}`} />
  </details>
</section>

<style>
  .legend { display: grid; gap: 0.9rem; }
  .mood { color: var(--muted); }
  .layers, .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
  .layer-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin-bottom: 0.35rem; }
  .layer-head h3 { margin: 0; }
  .mute { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; min-height: 44px; }
  .badge {
    border: 1px solid var(--phosphor);
    color: var(--phosphor);
    border-radius: 999px;
    padding: 0.05rem 0.6rem;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .badge.small { margin-left: 0.25rem; }
  .rows li { border-top: 1px solid var(--rim); padding-top: 0.6rem; }
  .rule { margin-bottom: 0.4rem; }
  .range { color: var(--muted); }
  .hear { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .note { color: var(--muted); font-size: 0.95rem; }
  dl { margin: 0.5rem 0 0; }
  dt { font-weight: 700; margin-top: 0.6rem; }
  dd { margin: 0; color: var(--muted); }
</style>
