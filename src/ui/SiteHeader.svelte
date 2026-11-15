<script lang="ts">
  import { prefs, savePrefs } from './prefs.svelte';

  let { current, lede }: { current: 'jukebox' | 'about' | 'playlist'; lede: string } = $props();
  const base = import.meta.env.BASE_URL;

  $effect(() => {
    document.documentElement.dataset.contrast = prefs.highContrast ? 'high' : 'normal';
  });

  function toggleContrast() {
    prefs.highContrast = !prefs.highContrast;
    savePrefs();
  }
</script>

<a class="skip-link" href="#content">Skip to main content</a>

<header class="masthead">
  <div class="arch" aria-hidden="true"></div>
  <div class="masthead-inner">
    {#if current === 'jukebox'}
      <h1>Earth Jukebox</h1>
    {:else}
      <p class="brand-small"><a href={base}>Earth Jukebox</a></p>
      <h1>{current === 'about' ? 'How it works' : 'Playlist and downloads'}</h1>
    {/if}
    <p class="lede">{lede}</p>
    <nav aria-label="Site">
      <a href={base} aria-current={current === 'jukebox' ? 'page' : undefined}>Jukebox</a>
      <a href={base + 'about/'} aria-current={current === 'about' ? 'page' : undefined}>How it works</a>
      <a href={base + 'playlist/'} aria-current={current === 'playlist' ? 'page' : undefined}>Playlist and downloads</a>
      <button aria-pressed={prefs.highContrast} onclick={toggleContrast}>High contrast</button>
    </nav>
  </div>
</header>

<style>
  .masthead { position: relative; overflow: hidden; border-bottom: 1px solid var(--rim); }
  /* The one decorative flourish: the warm glow of a jukebox arch rising behind the title. */
  .arch {
    position: absolute;
    left: 50%;
    top: 3.5rem;
    width: min(70rem, 160vw);
    aspect-ratio: 1;
    transform: translateX(-50%);
    border-radius: 50%;
    background:
      radial-gradient(closest-side, transparent 78%, color-mix(in srgb, var(--brass) 55%, transparent) 79%, transparent 81%),
      radial-gradient(closest-side, color-mix(in srgb, var(--brass) 18%, transparent), transparent 70%);
    pointer-events: none;
  }
  :global(:root[data-contrast='high']) .arch { display: none; }
  .masthead-inner { position: relative; max-width: 72rem; margin: 0 auto; padding: 2.5rem 1rem 1.5rem; }
  h1 { font-size: clamp(2.3rem, 6vw, 3.6rem); font-weight: 700; letter-spacing: 0.01em; line-height: 1.15; margin: 0 0 0.4rem; }
  .brand-small { font-size: 1.2rem; font-weight: 700; margin: 0 0 0.2rem; }
  .brand-small a { color: var(--brass); }
  .lede { font-size: 1.15rem; color: var(--muted); }
  nav { display: flex; flex-wrap: wrap; gap: 0.6rem 1.25rem; align-items: center; }
  nav a { min-height: 44px; display: inline-flex; align-items: center; }
  nav a[aria-current='page'] { color: var(--brass); font-weight: 700; text-decoration-thickness: 3px; }
</style>
