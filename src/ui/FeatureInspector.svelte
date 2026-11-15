<script lang="ts">
  import type { Features } from '../analysis/types';

  let { features, tickMs }: { features: Features; tickMs: number } = $props();

  const fmt = (v: number) => (Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(3)) : '—');
</script>

<details class="inspector">
  <summary>Live numbers ({Object.keys(features).length} features · analysis {tickMs.toFixed(2)} ms per frame)</summary>
  <table>
    <caption class="visually-hidden">Live features measured from the current video frame</caption>
    <thead><tr><th scope="col">Feature</th><th scope="col">Value</th></tr></thead>
    <tbody>
      {#each Object.entries(features) as [name, value] (name)}
        <tr><th scope="row"><code>{name}</code></th><td>{fmt(value)}</td></tr>
      {/each}
    </tbody>
  </table>
</details>

<style>
  .inspector { margin-top: 1rem; }
  summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; }
  table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 0.15rem 0.75rem 0.15rem 0; font-weight: normal; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
