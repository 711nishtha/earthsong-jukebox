<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { prefs } from '../ui/prefs.svelte';
  import { getStage, setStage } from './stageStore';

  /** The galaxy behind every page. CSS fallback first; WebGL fades in once loaded, if the device can take it. */
  let canvas = $state<HTMLCanvasElement>();
  let live = $state(false);
  let disposed = false;

  onMount(() => {
    // Load Three.js after first paint so the Enter screen appears immediately.
    const start = () => {
      if (disposed || prefs.highContrast || !canvas) return setStage(null);
      import('./stage')
        .then(({ createStage, webglAvailable }) => {
          if (disposed || !webglAvailable()) return setStage(null);
          const s = createStage(canvas!, {
            calm: prefs.calm,
            onLowPerf: () => {
              live = false;
              getStage()?.dispose();
              setStage(null);
            },
          });
          setStage(s);
          requestAnimationFrame(() => (live = true));
        })
        .catch(() => setStage(null));
    };
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 600 });
    else setTimeout(start, 200);
  });

  // Mounted on every page (including the Enter screen), so it owns the root display attributes.
  $effect(() => {
    document.documentElement.dataset.contrast = prefs.highContrast ? 'high' : 'normal';
    document.documentElement.dataset.calm = String(prefs.calm);
    getStage()?.setCalm(prefs.calm);
  });

  onDestroy(() => {
    disposed = true;
    getStage()?.dispose();
  });
</script>

<div class="galaxy-fallback" aria-hidden="true"></div>
<canvas bind:this={canvas} class="stage" class:live aria-hidden="true"></canvas>

<style>
  .stage {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    opacity: 0;
    transition: opacity 1.8s var(--e-out-quart);
    pointer-events: none;
  }
  .stage.live { opacity: 1; }
  :global(:root[data-contrast='high']) .stage { display: none; }
</style>
