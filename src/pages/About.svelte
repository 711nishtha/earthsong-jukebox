<script lang="ts">
  import { onMount } from 'svelte';
  import StageCanvas from '../scene/StageCanvas.svelte';
  import { TRACKS } from '../tracks';
  import { loadManifest, type Manifest } from '../ui/manifest';
  import SiteFooter from '../ui/SiteFooter.svelte';
  import SiteHeader from '../ui/SiteHeader.svelte';

  const base = import.meta.env.BASE_URL;
  let manifest = $state.raw<Manifest | null>(null);
  onMount(() => {
    loadManifest().then((m) => (manifest = m)).catch(() => {});
  });
</script>

<StageCanvas />
<SiteHeader current="about" lede="Why we built Earth Jukebox, who it is for, and the NASA work it stands on." />

<main id="content">
  <section aria-labelledby="problem">
    <h2 id="problem">The problem</h2>
    <p>
      NASA’s Scientific Visualization Studio makes beautiful animations of our changing planet for the Earth Information Center.
      But they are silent pictures. If you are blind or have low vision, most of what they say is out of reach.
    </p>
    <p>
      <strong>Sonification</strong> means turning data into sound that isn’t speech. Earth Jukebox plays a sonification of each
      visualization as it runs, so you can hear what the picture shows: warm and cold water, tall and short forests, dust and smoke,
      lights growing and fading, storms coming and going.
    </p>
  </section>

  <section aria-labelledby="who">
    <h2 id="who">Who it is for</h2>
    <ul>
      <li><strong>Blind and low-vision listeners.</strong> Everything works by keyboard and screen reader. For you the audio <em>is</em> the visualization, so every track follows the same rules, and spoken captions explain what is changing.</li>
      <li><strong>Students and the public.</strong> No science background needed. A “Science details” section is there if you want it.</li>
      <li><strong>Teachers and museums.</strong> Ready-made audio files, transcripts and a legend for every sound are on the playlist page.</li>
    </ul>
  </section>

  <section aria-labelledby="earthsong">
    <h2 id="earthsong">Team Earthsong</h2>
    <p>
      Earth Jukebox was built by a solo developer for the 2026 NASA Space Apps Challenge (“Earth Jukebox” challenge), in a few days.
      The goal: when you open it, you should feel you have left Earth and are floating in quiet space, then find our planet and hear its data
      turn into music you can understand. And it had to work just as well with your eyes closed.
    </p>
    <p>The full method, the mapping tables and the proof that the sound carries the data are on <a href={base + 'science/'}>the Science page</a>.</p>
  </section>

  <section aria-labelledby="credits">
    <h2 id="credits">Credits</h2>
    <p>All visualizations were made by NASA’s Scientific Visualization Studio (SVS) and partners. We resized the videos for the web and did not otherwise change them. The NASA logo is not used, and this project is not endorsed by NASA.</p>
    {#if manifest}
      <ul class="credit-list">
        {#each TRACKS as t (t.id)}
          {@const e = manifest.tracks[t.id]}
          {#if e}
            <li>
              <strong>{t.title}:</strong> <a href={e.pageUrl}>{e.title}</a> (SVS {e.svsId}). Credit: {e.creditLine}.
              {e.credits.map((c) => `${c.role}: ${c.people.join(', ')}`).join('. ')}.
              {#if e.datasets.length}Data: {e.datasets.map((d) => d.name).join('; ')}.{/if}
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
    <p>Reference: <a href="https://svs.gsfc.nasa.gov/13786/">Data Sonification: Caldwell 73</a> (NASA’s Goddard Space Flight Center; sonification by SYSTEM Sounds, M. Russo and A. Santaguida). Source gallery: <a href="https://svs.gsfc.nasa.gov/gallery/earth-information-center/">Earth Information Center content</a>.</p>
  </section>

  <section aria-labelledby="built">
    <h2 id="built">How it was built</h2>
    <p>
      A static website: Svelte and TypeScript, built with Vite. Sound is made with Tone.js, an open-source Web Audio library; no recorded music or samples are used.
      Media preparation used Python and ffmpeg. No accounts, API keys or servers are needed.
    </p>
    <p>
      <strong>AI disclosure.</strong> Team Earthsong (one person) built this with help from an AI coding assistant (Claude, by Anthropic),
      which wrote much of the code and documentation under the team’s direction. All data and imagery come from the NASA pages credited above.
    </p>
  </section>
</main>

<SiteFooter />

<style>
  main { max-width: 72rem; margin: 0 auto; padding: 1.5rem clamp(1rem, 5vw, 3rem) var(--s-xl); display: grid; gap: var(--s-l); }
  section { display: grid; gap: 0.6rem; }
  ul { margin: 0; padding-left: 1.4rem; display: grid; gap: 0.5rem; max-width: 48.5em; }
  .credit-list li { color: var(--c-text-muted); }
  .credit-list strong { color: var(--c-text); }
</style>
