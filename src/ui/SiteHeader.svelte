<script lang="ts">
  import { prefs, savePrefs } from './prefs.svelte';

  let {
    current,
    lede = '',
    showHero = true,
  }: { current: 'jukebox' | 'about' | 'playlist'; lede?: string; showHero?: boolean } = $props();
  const base = import.meta.env.BASE_URL;

  const PAGES = [
    { id: 'jukebox', href: '', label: 'Listen' },
    { id: 'about', href: 'about/', label: 'Science' },
    { id: 'playlist', href: 'playlist/', label: 'Library' },
  ] as const;
  const TITLES = { jukebox: 'Earth Jukebox', about: 'How it works', playlist: 'Library' } as const;

  function toggle(key: 'highContrast' | 'calm') {
    prefs[key] = !prefs[key];
    savePrefs();
  }
</script>

<a class="skip-link" href="#content">Skip to main content</a>

<header class="bar">
  <a class="wordmark" href={base} aria-label="Earth Jukebox, home">Earth <em>Jukebox</em></a>
  <nav aria-label="Site">
    <ul>
      {#each PAGES as p (p.id)}
        <li><a href={base + p.href} aria-current={current === p.id ? 'page' : undefined}>{p.label}</a></li>
      {/each}
    </ul>
  </nav>
  <div class="toggles" role="group" aria-label="Display">
    <button aria-pressed={prefs.calm} onclick={() => toggle('calm')}>Calm</button>
    <button aria-pressed={prefs.highContrast} onclick={() => toggle('highContrast')}>High contrast</button>
  </div>
</header>

{#if showHero && current !== 'jukebox'}
  <div class="hero scrim">
    <h1>{TITLES[current]}</h1>
    {#if lede}<p class="lede">{lede}</p>{/if}
  </div>
{/if}

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-s) var(--s-m);
    padding: 0.85rem clamp(1rem, 4vw, 3rem);
    background: linear-gradient(to bottom, rgba(5, 6, 10, 0.85), rgba(5, 6, 10, 0));
  }
  .wordmark {
    font-family: var(--f-display);
    font-size: 1.6rem;
    letter-spacing: -0.01em;
    text-decoration: none;
    margin-right: auto;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .wordmark em { font-style: italic; color: var(--accent); }
  ul { list-style: none; display: flex; gap: 0.25rem 1.5rem; margin: 0; padding: 0; flex-wrap: wrap; }
  nav a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    color: var(--c-text-muted);
    font-variant-caps: all-small-caps;
    letter-spacing: 0.14em;
    font-weight: 500;
    font-size: 1.05rem;
  }
  nav a:hover { color: var(--c-text); }
  nav a[aria-current='page'] { color: var(--c-text); text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: 0.5em; }
  .toggles { display: flex; gap: 0.5rem; }
  .toggles button { font-size: 0.95rem; padding-inline: 0.9rem; }
  /* Phones: row 1 = wordmark + display toggles, row 2 = page links. */
  @media (max-width: 40rem) {
    .bar { gap: 0 0.5rem; padding-block: 0.4rem; }
    .wordmark { font-size: 1.35rem; }
    .toggles { order: 1; }
    nav { order: 2; width: 100%; }
    ul { gap: 0 1.1rem; }
    nav a { font-size: 1rem; }
    .toggles button { padding-inline: 0.65rem; font-size: 0.875rem; min-width: 44px; }
  }
  .hero { padding: clamp(3rem, 10vh, 7rem) clamp(1rem, 6vw, 7rem) var(--s-l); }
  .hero h1 { font-size: var(--t-hero); letter-spacing: -0.03em; line-height: 0.95; max-width: 14ch; }
  .lede { font-size: var(--t-lead); color: var(--c-text-muted); max-width: 46ch; }
</style>
