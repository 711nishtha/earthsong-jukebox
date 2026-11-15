<script lang="ts">
  import { onMount } from 'svelte';
  import { FIDELITY_HELP, FIDELITY_LABEL } from '../audio/fidelity';
  import type { Fidelity } from '../audio/types';
  import { TRACKS } from '../tracks';
  import { loadManifest, type Manifest } from '../ui/manifest';
  import MappingTable from '../ui/MappingTable.svelte';
  import SiteFooter from '../ui/SiteFooter.svelte';
  import StageCanvas from '../scene/StageCanvas.svelte';
  import SiteHeader from '../ui/SiteHeader.svelte';

  let manifest = $state.raw<Manifest | null>(null);
  onMount(() => {
    loadManifest().then((m) => (manifest = m)).catch(() => {});
  });

  const FIDELITIES = Object.keys(FIDELITY_LABEL) as Fidelity[];
</script>

<StageCanvas />
<SiteHeader current="about" lede="Why we built Earth Jukebox, how pictures become sound, and where the sound is exact, approximate or artistic." />

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

  <section aria-labelledby="how">
    <h2 id="how">How it works</h2>
    <ol class="steps">
      <li><strong>Look.</strong> About 15 times a second, the browser shrinks the current video frame to a few hundred pixels and reads every colour.</li>
      <li><strong>Read the colour bar.</strong> Each visualization has a colour key, for example blue for 0 °C and red for 32 °C. We match each pixel’s colour to that key, so the sound follows the <em>data value</em> behind the colour, not just the colour itself. Where there is no numeric key, we follow brightness, area or colour type, and say so.</li>
      <li><strong>Smooth.</strong> The numbers are gently smoothed so the music doesn’t jitter.</li>
      <li><strong>Play.</strong> The smoothed numbers control synthesizers made in your browser: which notes play, how fast, how loud, and where they sit between your left and right ear.</li>
    </ol>
    <p>The same measurements, saved in advance, drive audio-only mode, the downloadable files and the transcripts, so all of them match what you hear live.</p>
  </section>

  <section aria-labelledby="grammar">
    <h2 id="grammar">One sound language for every track</h2>
    <p>Once you learn these rules on one track, they work on all of them.</p>
    <dl class="grammar">
      <dt>A bigger data value</dt><dd>gives a higher note (warmer water, taller trees, brighter lights).</dd>
      <dt>More of something on screen</dt><dd>makes it louder or busier.</dd>
      <dt>Left or right on screen</dt><dd>is left or right in your headphones.</dd>
      <dt>North (top of the picture)</dt><dd>is higher in pitch, where position matters.</dd>
      <dt>A different kind of thing</dt><dd>gets a different instrument (dust hiss, smoke drone, sea-salt bells, sulfate pulse).</dd>
      <dt>Something sudden</dt><dd>is a drum hit (and a short vibration on phones).</dd>
      <dt>Motion in the animation</dt><dd>only changes the brightness of the sound. It is never presented as data.</dd>
    </dl>
    <p>
      These choices follow NASA’s own sonification of the star cluster
      <a href="https://svs.gsfc.nasa.gov/13786/">Caldwell 73</a>, where a radar-like sweep maps distance from the centre to pitch and
      star colour to instrument. Our Ocean Heat track uses the same sweeping read-head idea.
    </p>
  </section>

  <section aria-labelledby="honest">
    <h2 id="honest">How honest is each sound?</h2>
    <p>Every mapping is labelled, in the jukebox legend and in the tables below.</p>
    <dl>
      {#each FIDELITIES as f (f)}
        <dt>{FIDELITY_LABEL[f]}</dt>
        <dd>{FIDELITY_HELP[f]}</dd>
      {/each}
      <dt>Amplified</dt>
      <dd>The data only changes a little, so we stretch that small range to make the change audible.</dd>
    </dl>
    <h3>Caveats we want you to know</h3>
    <ul>
      <li><strong>Ocean Heat</strong> is the most exact. On the shipped video, tropical water reads about 27–29 °C and Southern Ocean water about 4–7 °C, which matches the colour bar. We checked plausibility; we did not compare against the model’s raw numbers.</li>
      <li><strong>Forest Heights</strong> is approximate: the globe is lit from one side, so shaded forests read a little shorter.</li>
      <li><strong>Four Winds</strong> sorts colours into four kinds of particle. Where colours mix the sorting is rough, and screen area is not the amount of particles in the air.</li>
      <li><strong>City Glow</strong> has no numeric scale, so sounds follow relative brightness. The years were noted by hand from the on-screen label.</li>
      <li><strong>Storm Drums</strong>: time in the original video is not evenly spaced, so we read dates from its on-screen dial; captions give the season, not the exact day. Some “new lightning” is the globe turning, so drum hits are partly visual.</li>
    </ul>
  </section>

  <section aria-labelledby="art">
    <h2 id="art">Artistic choices, and why</h2>
    <ul>
      <li><strong>Scales.</strong> Raw pixel-to-pitch mappings sound like noise, so notes snap to a scale chosen for each story: calm Dorian for the ocean, airy Lydian for forests, restless minor for aerosols, warm pentatonic for city lights, tense minor pentatonic for storms. Data-only mode removes the scales.</li>
      <li><strong>Quiet beds.</strong> Some tracks have a soft background chord labelled “Artistic”. It never changes with the data; it is there so silence in the data doesn’t feel like a broken player.</li>
      <li><strong>Safety first.</strong> Every track runs through a compressor, a limiter and a hard ceiling at −1 dBFS. Note rates are capped and no hit can be louder than a set level, so there are no sudden blasts.</li>
      <li><strong>Emotion.</strong> We wanted oceans and forests to feel spacious and beautiful, and aerosols and storms to carry a quiet sense of urgency (a tense half-step appears when smoke is heavy), without exaggerating the data.</li>
    </ul>
  </section>

  <section aria-labelledby="tables">
    <h2 id="tables">Every mapping, track by track</h2>
    {#each TRACKS as t (t.id)}
      <details class="panel">
        <summary>{t.title}</summary>
        <p>{t.sound.mood}</p>
        <MappingTable track={t} caption={`Mapping table for ${t.title}`} />
      </details>
    {/each}
  </section>

  <section aria-labelledby="access">
    <h2 id="access">Accessibility features</h2>
    <ul>
      <li>Full keyboard control with visible focus, plus single-key shortcuts (listed on the jukebox page).</li>
      <li>Spoken captions through your screen reader, limited to one message every 9 to 16 seconds so they don’t talk over the music, with off, brief and detailed settings.</li>
      <li>A full written description of each picture, and a timed transcript of each soundscape.</li>
      <li>Audio-only mode, high-contrast mode, large text and buttons, and a typeface designed for low vision (Atkinson Hyperlegible).</li>
      <li>A photosensitivity warning and a reduce-flashing option for the lightning video; the sound is not affected.</li>
      <li>Short vibrations on drum hits on phones that support it.</li>
    </ul>
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
  main { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 2.5rem; display: grid; gap: 2.25rem; }
  section { display: grid; gap: 0.6rem; }
  ul, ol { margin: 0; padding-left: 1.4rem; display: grid; gap: 0.5rem; max-width: 72ch; }
  dl { margin: 0; max-width: 72ch; }
  dt { font-weight: 700; margin-top: 0.6rem; }
  dd { margin: 0; color: var(--muted); }
  .grammar dt { color: var(--brass); }
  details { margin-top: 0.5rem; }
  .credit-list li { color: var(--muted); }
  .credit-list strong { color: var(--text); }
</style>
