<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { loadLuts } from '../analysis/load';
  import { Probe, type ProbeReading } from '../analysis/probe';
  import type { Features } from '../analysis/types';
  import { Instrument } from '../audio/instrument';
  import type { TrackConfig } from '../tracks/types';
  import { prefs } from './prefs.svelte';

  /**
   * Instrument mode: the paused frame becomes something you can play. Move the crosshair with a
   * pointer, a finger or the arrow keys and hear the data value under it as pitch.
   */
  let { track, video, features, onclose }: { track: TrackConfig; video: HTMLVideoElement; features: Features; onclose: () => void } = $props();

  const STEP = 0.02, BIG = 0.1;
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const inst = new Instrument();
  let probe: Probe | null = null;
  let pixels: ImageData | null = null;
  let area = $state<HTMLElement>();
  let u = $state(0.5), v = $state(0.5);
  let reading = $state.raw<ProbeReading | null>(null);
  let spoken = $state('');
  let speakTimer: ReturnType<typeof setTimeout> | null = null;
  let lastNorm: number | null = null;
  let lastCat = -1;

  /** Grab the current (paused) frame at full resolution, same-origin so pixels are readable. */
  function capture() {
    const c = document.createElement('canvas');
    c.width = video.videoWidth || 960;
    c.height = video.videoHeight || 540;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, c.width, c.height);
    pixels = ctx.getImageData(0, 0, c.width, c.height);
    update();
  }

  onMount(async () => {
    video.pause();
    probe = new Probe(track.probe, await loadLuts(track.luts));
    await inst.start();
    if (video.readyState >= 2) capture();
    else {
      // Videos aren't preloaded; if it has never played, fetch it now so there is a frame to explore.
      video.addEventListener('loadeddata', capture, { once: true });
      video.preload = 'auto';
      video.load();
    }
    video.addEventListener('seeked', capture);
    area?.focus();
    announce(`Instrument mode. ${track.probe.label}. Move with the arrow keys, or drag. Hold Shift for bigger steps, press Enter to hear the reading again, Escape to leave.`);
  });

  onDestroy(() => {
    inst.stop();
    video.removeEventListener('seeked', capture);
    if (speakTimer) clearTimeout(speakTimer);
  });

  function announce(text: string) {
    spoken = '';
    queueMicrotask(() => (spoken = text));
  }

  // Thresholds for "tick" sounds, as 0–1 positions on the colour bar.
  const tickPositions = (() => {
    const p = track.probe;
    if (p.kind !== 'value') return [] as number[];
    return p.ticks; // compared against the reading's value below
  })();

  function update() {
    if (!probe || !pixels) return;
    const x = Math.round(u * (pixels.width - 1)), y = Math.round(v * (pixels.height - 1));
    const r = probe.read(pixels.data, pixels.width, pixels.height, x, y, 3, features);
    // Ticks: crossing a threshold (continuous) or entering a different category.
    if (track.probe.kind === 'value' && r.value !== null && reading?.value != null) {
      for (const t of tickPositions) {
        if ((reading.value < t) !== (r.value < t)) {
          inst.tick(r.value > reading.value);
          if (prefs.haptics && canVibrate) navigator.vibrate(12);
        }
      }
    } else if (r.category !== lastCat && r.category >= 0) {
      inst.tick(true);
      if (prefs.haptics && canVibrate) navigator.vibrate(12);
    }
    lastCat = r.category;
    reading = r;
    if (r.norm !== lastNorm) inst.set(r.norm, u * 1.6 - 0.8);
    lastNorm = r.norm;
    // Speak only once the crosshair has settled, so a screen reader isn't flooded while dragging.
    if (speakTimer) clearTimeout(speakTimer);
    speakTimer = setTimeout(() => announce(`${r.text}. ${where()}`), 650);
  }

  /** Position in words. Lat/lon only where the projection is a true lat/lon map. */
  function where(): string {
    if (track.projection === 'equirect') {
      const lat = 90 - 180 * v, lon = -180 + 360 * u;
      const ns = `${Math.abs(Math.round(lat))}° ${lat >= 0 ? 'north' : 'south'}`;
      const ew = `${Math.abs(Math.round(lon))}° ${lon >= 0 ? 'east' : 'west'}`;
      return `Latitude ${ns}, longitude ${ew}${reading?.norm != null ? `, ${basin(lat, lon)}` : ''}`;
    }
    if (track.projection === 'flat') return `${Math.round(u * 100)}% across, ${Math.round(v * 100)}% down the picture`;
    return `${u < 0.4 ? 'left' : u > 0.6 ? 'right' : 'middle'} of the view, ${v < 0.4 ? 'upper' : v > 0.6 ? 'lower' : 'middle'} part`;
  }

  /** Very coarse ocean names by latitude/longitude boxes (approximate, for orientation only). */
  function basin(lat: number, lon: number): string {
    if (lat < -55) return 'Southern Ocean';
    if (lat > 66) return 'Arctic Ocean';
    if (lon >= -70 && lon < 20) return 'Atlantic';
    if (lon >= 20 && lon < 120 && lat < 30) return 'Indian Ocean';
    return 'Pacific';
  }

  function move(du: number, dv: number) {
    u = Math.min(1, Math.max(0, u + du));
    v = Math.min(1, Math.max(0, v + dv));
    update();
  }

  function onKey(e: KeyboardEvent) {
    const s = e.shiftKey ? BIG : STEP;
    if (e.key === 'ArrowLeft') move(-s, 0);
    else if (e.key === 'ArrowRight') move(s, 0);
    else if (e.key === 'ArrowUp') move(0, -s);
    else if (e.key === 'ArrowDown') move(0, s);
    else if (e.key === 'Home') { u = 0.5; v = 0.5; update(); }
    else if (e.key === 'Enter' || e.key === ' ') announce(`${reading?.text ?? ''}. ${where()}`);
    else if (e.key === 'Escape') onclose();
    else return;
    e.preventDefault();
    e.stopPropagation(); // keep the global shortcuts out of instrument mode
  }

  /** Map a pointer to the video's content box (object-fit: contain leaves letterbox bars). */
  function fromPointer(e: PointerEvent) {
    if (!area) return;
    const r = area.getBoundingClientRect();
    const ar = (video.videoWidth || 16) / (video.videoHeight || 9);
    let cw = r.width, ch = r.width / ar;
    if (ch > r.height) { ch = r.height; cw = r.height * ar; }
    const ox = r.left + (r.width - cw) / 2, oy = r.top + (r.height - ch) / 2;
    u = Math.min(1, Math.max(0, (e.clientX - ox) / cw));
    v = Math.min(1, Math.max(0, (e.clientY - oy) / ch));
    update();
  }
</script>

<!-- role="application" is the ARIA pattern for custom 2D keyboard and pointer control. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="explorer"
  bind:this={area}
  role="application"
  aria-roledescription="data explorer"
  aria-label={`Explore ${track.title}: ${track.probe.label}`}
  aria-describedby="explorer-help"
  tabindex="0"
  onkeydown={onKey}
  onpointerdown={(e) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    fromPointer(e);
  }}
  onpointermove={(e) => e.buttons && fromPointer(e)}
  style:--u={u}
  style:--v={v}
  style:--ar={String(track.aspect)}
>
  <div class="content">
    <span class="h" aria-hidden="true"></span>
    <span class="vline" aria-hidden="true"></span>
    <span class="reticle" aria-hidden="true"></span>
  </div>
  <div class="readout glass" aria-hidden="true">
    <span class="label">{track.probe.label}</span>
    <span class="value">{reading?.text ?? '…'}</span>
    <span class="where">{where()}</span>
  </div>
  <p id="explorer-help" class="visually-hidden">Arrow keys move the crosshair, Shift with an arrow moves further, Home returns to the centre, Enter repeats the reading, Escape leaves instrument mode. The pitch is the value under the crosshair; a tick sounds when it crosses a threshold.</p>
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">{spoken}</p>
</div>

<style>
  .explorer {
    position: absolute;
    inset: 0;
    z-index: 2;
    cursor: crosshair;
    touch-action: none;
    display: grid;
    place-items: center;
    container-type: size;
  }
  .explorer:focus-visible { outline: 2px solid var(--c-focus); outline-offset: -4px; box-shadow: none; }
  /* The crosshair lives in a box with the video's own aspect ratio (matches object-fit: contain). */
  .content { position: relative; width: min(100cqw, calc(100cqh * var(--ar))); aspect-ratio: var(--ar); }
  .h, .vline { position: absolute; background: rgba(255, 255, 255, 0.55); pointer-events: none; }
  .h { left: 0; right: 0; height: 1px; top: calc(var(--v) * 100%); }
  .vline { top: 0; bottom: 0; width: 1px; left: calc(var(--u) * 100%); }
  .reticle {
    position: absolute;
    left: calc(var(--u) * 100%);
    top: calc(var(--v) * 100%);
    width: 34px; height: 34px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid var(--accent);
    box-shadow: 0 0 0 4px rgba(5, 6, 10, 0.55), 0 0 22px var(--accent);
  }
  .readout {
    position: absolute;
    top: clamp(4.5rem, 9vh, 6rem); /* clear of the sticky site header */
    right: clamp(0.75rem, 3vw, 1.5rem);
    display: grid;
    gap: 0.15rem;
    min-width: 16rem;
    pointer-events: none;
  }
  .value { font-family: var(--f-display); font-size: 2rem; line-height: 1.05; }
  .where { color: var(--c-text-muted); font-size: 0.95rem; }
</style>
