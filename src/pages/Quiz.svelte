<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { loadJson } from '../analysis/load';
  import type { FeatureTrack } from '../audio/render';
  import { snapshot, SnapshotPlayer } from '../audio/snapshot';
  import { riseIn } from '../design/motion';
  import { trackAccent } from '../design/tokens';
  import { backendConfigured, loadStats, logAnswer, newSession, type Stats } from '../quiz/stats';
  import StageCanvas from '../scene/StageCanvas.svelte';
  import { TRACKS } from '../tracks';
  import SiteFooter from '../ui/SiteFooter.svelte';
  import SiteHeader from '../ui/SiteHeader.svelte';

  interface Question {
    id: string;
    track: string;
    prompt: string;
    mode: 'musical' | 'data';
    clipSeconds: number;
    clips: { from: number; to: number }[];
    answer: number;
    explanation: string;
  }

  const base = import.meta.env.BASE_URL;
  const params = new URLSearchParams(location.search);
  const sharedScore = params.get('score');
  const session = newSession();
  const snap = new SnapshotPlayer();
  const featureCache = new Map<string, FeatureTrack>();

  let questions = $state.raw<Question[]>([]);
  let stage = $state<'intro' | 'question' | 'results'>('intro');
  let index = $state(0);
  let choice = $state<number | null>(null);
  let checked = $state(false);
  let playing = $state(-1);
  let correctCount = $state(0);
  let results = $state<{ q: Question; correct: boolean }[]>([]);
  let stats = $state.raw<Stats | null>(null);
  let shown = 0;
  let heading = $state<HTMLElement>();
  let live = $state('');
  let copied = $state(false);

  onMount(async () => {
    questions = (await loadJson<{ questions: Question[] }>('quiz/questions.json')).questions;
    riseIn(document.querySelectorAll('[data-rise]'), 0.2);
  });
  onDestroy(() => snap.stop());

  const q = $derived(questions[index]);
  const track = $derived(q ? TRACKS.find((t) => t.id === q.track)! : null);

  async function focusHeading() {
    await tick();
    heading?.focus();
  }

  async function start() {
    stage = 'question';
    index = 0;
    correctCount = 0;
    results = [];
    resetQuestion();
    focusHeading();
  }

  function resetQuestion() {
    choice = null;
    checked = false;
    playing = -1;
    shown = performance.now();
    snap.stop();
  }

  async function play(clip: number) {
    if (!q || !track) return;
    if (playing === clip) {
      snap.stop();
      playing = -1;
      return;
    }
    let ft = featureCache.get(q.track);
    if (!ft) {
      ft = await loadJson<FeatureTrack>(`features/${q.track}.json`);
      featureCache.set(q.track, ft);
    }
    const c = q.clips[clip];
    playing = clip;
    live = `Playing clip ${clip + 1}.`;
    await snap.play(track.sound, snapshot(ft, c.from, c.to), q.mode, q.clipSeconds, () => {
      if (playing === clip) playing = -1;
    });
  }

  function check() {
    if (choice === null || !q) return;
    snap.stop();
    playing = -1;
    checked = true;
    const correct = choice === q.answer;
    if (correct) correctCount++;
    results = [...results, { q, correct }];
    live = `${correct ? 'Correct.' : 'Not quite.'} ${q.explanation}`;
    logAnswer({ session, question: q.id, correct, mode: q.mode, ms: Math.round(performance.now() - shown) });
  }

  async function next() {
    if (index + 1 < questions.length) {
      index++;
      resetQuestion();
      focusHeading();
    } else {
      stage = 'results';
      snap.stop();
      focusHeading();
      stats = await loadStats();
    }
  }

  const shareUrl = $derived(`${location.origin}${base}quiz/?score=${correctCount}&of=${questions.length}`);

  async function share() {
    const text = `I heard the planet: ${correctCount}/${questions.length} on the Earth Jukebox listening quiz. Can you tell NASA's Earth data apart by ear?`;
    try {
      if (navigator.share) await navigator.share({ title: 'Earth Jukebox: Close your eyes', text, url: shareUrl });
      else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        copied = true;
        live = 'Link copied.';
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }
</script>

<StageCanvas />
<SiteHeader current="quiz" showHero={false} />

<main id="content" style:--accent={track ? trackAccent[track.id] : undefined}>
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">{live}</p>

  {#if stage === 'intro'}
    <section class="intro scrim" aria-labelledby="quiz-title">
      <p class="label" data-rise>Listening quiz · {questions.length || 8} questions · about 3 minutes</p>
      <h1 id="quiz-title" data-rise>Close your eyes.</h1>
      <p class="lede" data-rise>
        Each question plays two short clips made from NASA Earth data, sound only. Which clip has more city light, warmer water, more lightning? Let’s find out if you can hear the planet.
      </p>
      {#if sharedScore}<p class="shared" data-rise>A friend heard {sharedScore} out of {params.get('of') ?? 8}. Your turn.</p>{/if}
      <div data-rise><button class="go" onclick={start} disabled={!questions.length}>Start listening</button></div>
      <p class="fine" data-rise>Headphones help. Your answers are counted anonymously{backendConfigured ? '' : ' in this browser only'}; no personal information is collected.</p>
    </section>
  {:else if stage === 'question' && q && track}
    <section class="question" aria-labelledby="q-heading">
      <p class="label">Question {index + 1} of {questions.length} · {track.realm}{q.mode === 'data' ? ' · plain tones' : ''}</p>
      <h1 id="q-heading" tabindex="-1" bind:this={heading}>{q.prompt}</h1>

      <div class="clips" role="group" aria-label="Clips">
        {#each q.clips as _, k (k)}
          <button class="clip" aria-pressed={playing === k} onclick={() => play(k)}>
            <span class="num">{k + 1}</span>
            <span>{playing === k ? 'Playing… (press to stop)' : `Play clip ${k + 1}`}</span>
          </button>
        {/each}
      </div>

      <fieldset class="answer" disabled={checked}>
        <legend>Your answer</legend>
        {#each q.clips as _, k (k)}
          <label class="opt" class:right={checked && k === q.answer} class:wrong={checked && choice === k && k !== q.answer}>
            <input type="radio" name="answer" value={k} bind:group={choice} />
            Clip {k + 1}
          </label>
        {/each}
      </fieldset>

      {#if !checked}
        <button class="go" onclick={check} disabled={choice === null}>Check answer</button>
      {:else}
        <div class="feedback glass" role="status">
          <p class="verdict">{choice === q.answer ? 'Correct.' : 'Not quite.'}</p>
          <p>{q.explanation}</p>
        </div>
        <button class="go" onclick={next}>{index + 1 < questions.length ? 'Next question' : 'See my result'}</button>
      {/if}
    </section>
  {:else if stage === 'results'}
    <section class="results scrim" aria-labelledby="r-heading">
      <p class="label">Your result</p>
      <h1 id="r-heading" tabindex="-1" bind:this={heading}>You heard the planet: <span class="score num">{correctCount}/{questions.length}</span></h1>
      <p class="lede">
        {correctCount >= questions.length - 1 ? 'A keen ear. The data came through loud and clear.' : correctCount >= questions.length / 2 ? 'More right than chance: the sound carries the data.' : 'Tricky! Try again, or explore each track to learn its sounds first.'}
      </p>
      {#if stats && stats.answers > 0}
        <p class="stat"><span class="big num">{Math.round(stats.correctRate * 100)}%</span>
          of {stats.source === 'live' ? 'all listeners’' : 'your'} answers were right by ear ({stats.answers} answers{stats.source === 'live' ? '' : ', this browser only'}).
        </p>
      {/if}
      <div class="row">
        <button class="go" onclick={share}>{copied ? 'Link copied' : 'Share my result'}</button>
        <button onclick={start}>Try again</button>
        <a class="link" href={base}>Explore the jukebox</a>
      </div>
      <ol class="review">
        {#each results as r, k (k)}
          <li><span class="mark" aria-hidden="true">{r.correct ? '✓' : '✗'}</span><span class="visually-hidden">{r.correct ? 'Correct' : 'Wrong'}: </span>{r.q.prompt} <span class="ex">{r.q.explanation}</span></li>
        {/each}
      </ol>
    </section>
  {/if}
</main>

<SiteFooter />

<style>
  main { max-width: 64rem; margin: 0 auto; padding: clamp(2rem, 8vh, 6rem) clamp(1rem, 5vw, 3rem) var(--s-xl); }
  h1 { font-size: var(--t-h1); }
  h1:focus { outline: none; box-shadow: none; }
  .intro h1 { font-size: var(--t-hero); line-height: 0.95; letter-spacing: -0.03em; }
  .lede { font-size: var(--t-lead); color: var(--c-text-muted); max-width: 29.5em; }
  .shared { font-family: var(--f-display); font-size: 1.6rem; color: var(--accent, var(--c-ocean)); }
  .fine { color: var(--c-text-muted); margin-top: var(--s-m); }
  .go { min-height: 56px; padding: 0 2rem; font-size: 1.1rem; background: var(--c-text); color: var(--c-space); border-color: var(--c-text); }
  .go:hover:not(:disabled) { background: var(--c-text); filter: brightness(0.92); }
  .question { display: grid; gap: var(--s-m); }
  .clips { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: var(--s-s); }
  .clip {
    min-height: 7rem; border-radius: var(--r-m); display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem;
    background: var(--c-glass); border: 1px solid var(--c-control); font-size: 1.15rem;
  }
  .clip .num { font-family: var(--f-display); font-size: 3rem; line-height: 1; color: var(--accent); }
  .clip[aria-pressed='true'] { background: var(--c-glass); color: var(--c-text); border-color: var(--accent); box-shadow: 0 0 40px -10px var(--accent); }
  .answer { border: none; padding: 0; margin: 0; display: flex; gap: var(--s-s); flex-wrap: wrap; }
  .answer legend { font-weight: 500; margin-bottom: 0.5rem; }
  .opt { display: inline-flex; align-items: center; gap: 0.6rem; min-height: 52px; padding: 0 1.4rem; border: 1px solid var(--c-control); border-radius: var(--r-pill); font-size: 1.1rem; cursor: pointer; }
  .opt:has(input:checked) { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, transparent); }
  .opt.right { border-color: var(--c-forest); }
  .opt.wrong { border-color: var(--c-danger); }
  .feedback .verdict { font-family: var(--f-display); font-size: 2rem; margin: 0; }
  .feedback p:last-child { margin: 0; }
  .results h1 { font-size: var(--t-h1); }
  .score { color: var(--c-ocean); }
  .stat { font-size: 1.15rem; }
  .big { font-family: var(--f-display); font-size: 3rem; margin-right: 0.4rem; color: var(--c-ocean); }
  .row { display: flex; gap: var(--s-s); flex-wrap: wrap; align-items: center; margin: var(--s-m) 0; }
  .link { min-height: 44px; display: inline-flex; align-items: center; }
  .review { display: grid; gap: 0.6rem; padding-left: 1.4rem; max-width: 40.5em; }
  .mark { margin-right: 0.4rem; }
  .ex { display: block; color: var(--c-text-muted); }
</style>
