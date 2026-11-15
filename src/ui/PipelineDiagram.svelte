<script lang="ts">
  import { gsap } from 'gsap';
  import { onDestroy, onMount } from 'svelte';
  import { scrubTimeline } from '../design/scroll';

  /**
   * One pixel's journey, drawn as you scroll: frame → colour bar → number → note.
   * Decorative (aria-hidden): the numbered steps right after it say the same thing in words.
   */
  let svg = $state<SVGSVGElement>();
  let cleanup = () => {};

  onMount(() => {
    if (!svg) return;
    const q = (s: string) => svg!.querySelectorAll(s);
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.from(q('.st-1'), { opacity: 0.15, duration: 1 })
      .from(q('.flow-1'), { strokeDashoffset: 200, duration: 1 }, '<0.3')
      .from(q('.st-2'), { opacity: 0.15, duration: 1 })
      .from(q('.marker'), { x: -120, duration: 1 }, '<')
      .from(q('.flow-2'), { strokeDashoffset: 200, duration: 1 })
      .from(q('.st-3'), { opacity: 0.15, duration: 1 })
      .from(q('.flow-3'), { strokeDashoffset: 200, duration: 1 })
      .from(q('.st-4'), { opacity: 0.15, duration: 1 })
      .from(q('.wave'), { scaleY: 0.1, transformOrigin: '50% 50%', duration: 1 }, '<');
    cleanup = scrubTimeline(svg as unknown as HTMLElement, tl);
  });
  onDestroy(() => cleanup());
</script>

<svg bind:this={svg} class="pipe" viewBox="0 0 1000 260" aria-hidden="true">
  <defs>
    <linearGradient id="sst-bar" x1="0" x2="1">
      <stop offset="0" stop-color="#2b4bff" /><stop offset="0.3" stop-color="#22e0d0" /><stop offset="0.55" stop-color="#57e04a" />
      <stop offset="0.78" stop-color="#ffe23a" /><stop offset="1" stop-color="#ff2a1a" />
    </linearGradient>
  </defs>
  <!-- 1. A frame and the pixel being read -->
  <g class="st-1">
    <rect x="20" y="60" width="180" height="120" rx="12" class="frame" />
    {#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
      <path d={`M30 ${80 + i * 16} q 40 ${i % 2 ? -10 : 10} 80 0 t 80 0`} class="flowline" style:stroke={['#22e0d0', '#57e04a', '#ffe23a', '#ff8a1a', '#ff2a1a', '#ffe23a'][i]} />
    {/each}
    <circle cx="140" cy="128" r="9" class="pixel" />
    <text x="110" y="215" class="cap">A pixel’s colour</text>
  </g>
  <path d="M210 120 H 290" class="flow flow-1" />
  <!-- 2. The SVS colour bar -->
  <g class="st-2">
    <rect x="300" y="100" width="200" height="34" rx="6" fill="url(#sst-bar)" />
    <text x="300" y="158" class="tick">0 °C</text><text x="470" y="158" class="tick">32 °C</text>
    <g class="marker"><path d="M455 90 l8 -14 h-16 z" class="mk" /><line x1="455" y1="96" x2="455" y2="138" class="mkl" /></g>
    <text x="400" y="215" class="cap">Matched on NASA’s colour bar</text>
  </g>
  <path d="M510 120 H 590" class="flow flow-2" />
  <!-- 3. The number -->
  <g class="st-3">
    <text x="660" y="140" class="big">27 °C</text>
    <text x="660" y="215" class="cap">A data value</text>
  </g>
  <path d="M730 120 H 800" class="flow flow-3" />
  <!-- 4. The note -->
  <g class="st-4">
    <g class="wave">
      {#each Array.from({ length: 22 }, (_, i) => i) as i (i)}
        <rect x={812 + i * 7.6} y={120 - Math.abs(Math.sin(i * 0.55)) * 34} width="4" height={Math.abs(Math.sin(i * 0.55)) * 68 + 2} rx="2" class="bar" />
      {/each}
    </g>
    <text x="895" y="215" class="cap">A high note</text>
  </g>
</svg>

<style>
  .pipe { width: 100%; height: auto; margin: var(--s-m) 0; overflow: visible; }
  .frame { fill: rgba(10, 12, 22, 0.8); stroke: var(--c-hairline); }
  .flowline { fill: none; stroke-width: 3; stroke-linecap: round; opacity: 0.85; }
  .pixel { fill: none; stroke: #fff; stroke-width: 2.5; }
  .flow { fill: none; stroke: var(--c-text-muted); stroke-width: 2; stroke-dasharray: 200; stroke-dashoffset: 0; marker-end: none; }
  .tick { fill: var(--c-text-muted); font-size: 15px; font-family: var(--f-ui); }
  .mk { fill: #fff; }
  .mkl { stroke: #fff; stroke-width: 2; }
  .big { fill: var(--c-text); font-family: var(--f-display); font-size: 56px; text-anchor: middle; }
  .bar { fill: var(--c-ocean); }
  .cap { fill: var(--c-text-muted); font-size: 17px; font-family: var(--f-ui); text-anchor: middle; }
</style>
