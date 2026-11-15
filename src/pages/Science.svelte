<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { initScrollMotion } from '../design/scroll';
  import PipelineDiagram from '../ui/PipelineDiagram.svelte';
  import { FIDELITY_HELP, FIDELITY_LABEL } from '../audio/fidelity';
  import type { Fidelity } from '../audio/types';
  import { TRACKS } from '../tracks';
  import { loadJson } from '../analysis/load';
  import { loadStats, type Stats } from '../quiz/stats';
  import MappingTable from '../ui/MappingTable.svelte';

  const base = import.meta.env.BASE_URL;
  import SiteFooter from '../ui/SiteFooter.svelte';
  import StageCanvas from '../scene/StageCanvas.svelte';
  import SiteHeader from '../ui/SiteHeader.svelte';

  interface FidelityRow { title: string; visual: string; audio: string; fidelity: string; kind: string; n: number; pearson: number | null; spearman: number | null; note?: string }
  let fidelity = $state.raw<FidelityRow[]>([]);
  let quiz = $state.raw<Stats | null>(null);
  let mainEl = $state<HTMLElement>();
  let cleanup = () => {};
  onDestroy(() => cleanup());
  onMount(() => {
    if (mainEl) cleanup = initScrollMotion(mainEl);
    loadJson<{ rows: FidelityRow[] }>('fidelity.json').then((f) => (fidelity = f.rows)).catch(() => {});
    loadStats().then((st) => (quiz = st)).catch(() => {});
  });
  const scored = $derived(fidelity.filter((r) => r.pearson !== null));
  const median = $derived.by(() => {
    const v = scored.map((r) => r.pearson!).sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  });

  const FIDELITIES = Object.keys(FIDELITY_LABEL) as Fidelity[];
</script>

<StageCanvas />
<SiteHeader current="science" lede="How a NASA picture becomes music you can trust: what is measured, what you hear, and how faithfully the sound follows the data." />

<main id="content" bind:this={mainEl}>
  <section data-reveal aria-labelledby="how">
    <h2 id="how">How it works</h2>
    <PipelineDiagram />
    <ol class="steps">
      <li><strong>Look.</strong> About 15 times a second, the browser shrinks the current video frame to a few hundred pixels and reads every colour.</li>
      <li><strong>Read the colour bar.</strong> Each visualization has a colour key, for example blue for 0 °C and red for 32 °C. We match each pixel’s colour to that key, so the sound follows the <em>data value</em> behind the colour, not just the colour itself. Where there is no numeric key, we follow brightness, area or colour type, and say so.</li>
      <li><strong>Smooth.</strong> The numbers are gently smoothed so the music doesn’t jitter.</li>
      <li><strong>Play.</strong> The smoothed numbers control synthesizers made in your browser: which notes play, how fast, how loud, and where they sit between your left and right ear.</li>
    </ol>
    <p>The same measurements, saved in advance, drive audio-only mode, the downloadable files and the transcripts, so all of them match what you hear live.</p>
  </section>

  <section data-reveal aria-labelledby="grammar">
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

  <section data-reveal aria-labelledby="honest">
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

  <section data-reveal aria-labelledby="proof">
    <h2 id="proof">Proof: does the sound carry the data?</h2>
    <p>
      We checked this two ways. First, a <strong>measurement</strong>: for every data mapping, we compare the data value measured from the video
      (at twice our normal resolution, unsmoothed) with what the sound engine actually produced (the notes it played, or how loud and how fast it played).
      A correlation of 1 would mean the sound follows the data perfectly; 0 would mean no relationship.
    </p>
    {#if median !== null}
      <p class="headline"><span class="big num">r = {median.toFixed(2)}</span> median correlation across {scored.length} data mappings.</p>
      <details class="panel">
        <summary>All {fidelity.length} measured mappings</summary>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable regions must be keyboard-focusable; axe: scrollable-region-focusable) -->
        <div class="table-wrap" role="region" aria-label="Fidelity measurements" tabindex="0">
          <table>
            <thead><tr><th scope="col">Track</th><th scope="col">Data</th><th scope="col">Sound</th><th scope="col">Pearson r</th><th scope="col">Spearman ρ</th><th scope="col">Samples</th></tr></thead>
            <tbody>
              {#each fidelity as r, i (i)}
                <tr>
                  <th scope="row">{r.title}</th><td>{r.visual}</td><td>{r.audio}</td>
                  <td class="num">{r.pearson === null ? `n/a: ${r.note}` : r.pearson.toFixed(2)}</td>
                  <td class="num">{r.spearman === null ? 'n/a' : r.spearman.toFixed(2)}</td><td class="num">{r.n}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
      <p>Weak spots, stated plainly: one City Glow map slice (slice 6) only reaches r ≈ 0.46 because very little light falls in it, and two slices never contain lights at all.</p>
    {/if}
    <p>
      Second, <strong>people</strong>: our <a href={base + 'quiz/'}>“Close your eyes” quiz</a> plays two sound-only clips per question and asks which has more city light, warmer water, more lightning, and so on.
      {#if quiz && quiz.answers > 0}
        <span class="headline"><span class="big num">{Math.round(quiz.correctRate * 100)}%</span> of {quiz.source === 'live' ? 'listeners’' : 'answers in this browser'} were right by ear ({quiz.answers} answers{quiz.source === 'live' ? ', live' : '; live results appear once the results database is connected'}). Guessing would give 50%.</span>
      {:else}
        Results appear here as people take it. Guessing would give 50%.
      {/if}
    </p>
  </section>

  <section data-reveal aria-labelledby="art">
    <h2 id="art">Artistic choices, and why</h2>
    <ul>
      <li><strong>Scales.</strong> Raw pixel-to-pitch mappings sound like noise, so notes snap to a scale chosen for each story: calm Dorian for the ocean, airy Lydian for forests, restless minor for aerosols, warm pentatonic for city lights, tense minor pentatonic for storms. Data-only mode removes the scales.</li>
      <li><strong>Quiet beds.</strong> Some tracks have a soft background chord labelled “Artistic”. It never changes with the data; it is there so silence in the data doesn’t feel like a broken player.</li>
      <li><strong>Safety first.</strong> Every track runs through a compressor, a limiter and a hard ceiling at −1 dBFS. Note rates are capped and no hit can be louder than a set level, so there are no sudden blasts.</li>
      <li><strong>Emotion.</strong> We wanted oceans and forests to feel spacious and beautiful, and aerosols and storms to carry a quiet sense of urgency (a tense half-step appears when smoke is heavy), without exaggerating the data.</li>
    </ul>
  </section>

  <section data-reveal aria-labelledby="tables">
    <h2 id="tables">Every mapping, track by track</h2>
    {#each TRACKS as t (t.id)}
      <details class="panel">
        <summary>{t.title}</summary>
        <p>{t.sound.mood}</p>
        <MappingTable track={t} caption={`Mapping table for ${t.title}`} />
      </details>
    {/each}
  </section>

  <section data-reveal aria-labelledby="access">
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

  <p class="next" data-reveal>Credits, the story behind Earth Jukebox and our AI disclosure are on the <a href={base + 'about/'}>About page</a>.</p>
</main>

<SiteFooter />

<style>
  .next { font-size: 1.15rem; }
  main { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 2.5rem; display: grid; gap: 2.25rem; }
  section { display: grid; gap: 0.6rem; }
  ul, ol { margin: 0; padding-left: 1.4rem; display: grid; gap: 0.5rem; max-width: 48.5em; }
  dl { margin: 0; max-width: 48.5em; }
  dt { font-weight: 700; margin-top: 0.6rem; }
  dd { margin: 0; color: var(--muted); }
  .grammar dt { color: var(--brass); }
  details { margin-top: 0.5rem; }
  .headline { font-size: 1.15rem; }
  .big { font-family: var(--f-display); font-size: 2.6rem; margin-right: 0.4rem; color: var(--c-ocean); }
  .table-wrap { overflow-x: auto; margin-top: 0.5rem; }
  table { border-collapse: collapse; min-width: 50rem; font-size: 0.95rem; }
  th, td { text-align: left; vertical-align: top; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--c-hairline); }
  thead th { color: var(--c-text-muted); font-weight: 500; }
</style>
