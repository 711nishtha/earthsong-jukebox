<script lang="ts">
  import { onDestroy } from 'svelte';
  import { FeatureEngine } from './analysis/engine';
  import { loadLuts } from './analysis/load';
  import { FrameSampler } from './analysis/sampler';
  import { Smoother } from './analysis/smoother';
  import type { Features } from './analysis/types';
  import { TRACKS } from './tracks';
  import type { TrackConfig } from './tracks/types';
  import FeatureInspector from './ui/FeatureInspector.svelte';

  const base = import.meta.env.BASE_URL;

  // $state.raw: a deep $state proxy would wrap the track config, and the per-pixel analysis loop
  // would then read thresholds through Proxies (measured ~30× slower).
  let track = $state.raw<TrackConfig>(TRACKS[0]);
  let video = $state<HTMLVideoElement>();
  let features = $state.raw<Features>({});
  let tickMs = $state(0);
  let error = $state('');
  let sampler: FrameSampler | null = null;

  async function attach(t: TrackConfig, el: HTMLVideoElement) {
    sampler?.stop();
    features = {};
    try {
      const a = t.analysis;
      const engine = new FeatureEngine(a, await loadLuts(t.luts));
      const smoother = new Smoother(a.smoothing.default, a.smoothing.perFeature);
      sampler = new FrameSampler(el, a.width, a.height, a.hz, (frame) => {
        const t0 = performance.now();
        const f = smoother.step(engine.process(frame), frame.t);
        tickMs = 0.9 * tickMs + 0.1 * (performance.now() - t0);
        features = f;
      });
      sampler.start();
      error = '';
    } catch (e) {
      error = (e as Error).message;
    }
  }

  $effect(() => {
    if (video) attach(track, video);
  });
  onDestroy(() => sampler?.stop());
</script>

<main>
  <h1>Earth Jukebox</h1>
  <label>
    Visualization
    <select bind:value={track}>
      {#each TRACKS as t (t.id)}<option value={t}>{t.title}: {t.tagline}</option>{/each}
    </select>
  </label>
  {#key track.id}
    <!-- svelte-ignore a11y_media_has_caption (sound-less source video; captions arrive with the sonification in Phase 4) -->
    <video bind:this={video} src={base + track.video} poster={base + track.poster} controls muted playsinline preload="metadata"
      style:aspect-ratio={track.aspect}></video>
  {/key}
  {#if error}<p role="alert">{error}</p>{/if}
  <FeatureInspector {features} {tickMs} />
</main>

<style>
  :global(body) { margin: 0; background: #0b1020; color: #eef2ff; font: 18px/1.5 system-ui, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 1rem; }
  video { width: 100%; background: #000; display: block; margin-top: 1rem; }
  select { font: inherit; min-height: 44px; max-width: 100%; }
</style>
