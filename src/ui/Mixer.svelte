<script lang="ts">
  import { FIDELITY_LABEL } from '../audio/fidelity';
  import type { TrackConfig } from '../tracks/types';

  /** Stem mixer: one vertical fader per sound layer. Real range inputs, so keyboards and screen readers get it for free. */
  let { track, levels, onlevel }: { track: TrackConfig; levels: Record<string, number>; onlevel: (id: string, v: number) => void } = $props();
</script>

<fieldset class="mixer">
  <legend class="label">Mixer · each sound layer</legend>
  <div class="faders">
    {#each track.sound.layers as l (l.id)}
      {@const v = levels[l.id] ?? 1}
      <label class="fader">
        <span class="val num" aria-hidden="true">{Math.round(v * 100)}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={v}
          oninput={(e) => onlevel(l.id, Number(e.currentTarget.value))}
          aria-valuetext={`${l.label} ${v === 0 ? 'muted' : `${Math.round(v * 100)} percent`}`}
        />
        <span class="name">{l.label}</span>
        <span class="fid">{FIDELITY_LABEL[l.fidelity]}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .mixer { border: 1px solid var(--c-hairline); border-radius: var(--r-m); padding: var(--s-m); margin: 0; background: var(--c-glass); }
  legend { padding: 0 0.4rem; }
  .faders { display: flex; flex-wrap: wrap; gap: var(--s-m); margin-top: var(--s-s); }
  .fader { display: grid; justify-items: center; gap: 0.35rem; width: 5.5rem; text-align: center; }
  input[type='range'] {
    writing-mode: vertical-lr;
    direction: rtl; /* bottom = 0, top = 100 */
    width: 44px;
    height: 9rem;
    min-height: 0;
  }
  .val { color: var(--accent); font-size: 0.95rem; }
  .name { font-weight: 500; line-height: 1.2; }
  .fid { font-size: 0.8rem; color: var(--c-text-muted); line-height: 1.2; }
</style>
