import { startAmbient } from '../audio/ambient';
import { getEarth, getStage, whenStage } from '../scene/stageStore';

/**
 * The ~30 s cinematic demo for the Space Apps video (open `/?demo`, click once, record).
 * It drives the real UI (the same buttons a visitor would press), so what you record is
 * what people get. One click starts it because browsers need a gesture before audio.
 */
export interface DemoHooks {
  enter: () => Promise<void>;
  selectTrack: (id: string) => Promise<void>;
  showProof: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clickButton(text: string, root: ParentNode = document): boolean {
  const b = [...root.querySelectorAll('button')].find((x) => x.textContent?.trim().startsWith(text));
  b?.click();
  return !!b;
}

function glide(el: Element | null, block: ScrollLogicalPosition = 'start') {
  el?.scrollIntoView({ behavior: 'smooth', block });
}

export async function runDemo(h: DemoHooks): Promise<void> {
  // 0–4 s: drone swells, warp through the stars, Earth appears with its moons.
  await startAmbient();
  await whenStage(1500);
  const stage = getStage();
  await Promise.all([stage ? stage.warp(3.4) : wait(800), h.enter()]);
  await wait(2200);

  // ~6–13 s: Ocean Heat. Scroll to the player, press play: the globe becomes live sea temperature.
  await h.selectTrack('ocean-heat');
  glide(document.querySelector('.screen'));
  await wait(1200);
  clickButton('Play with sound');
  await wait(6500);
  clickButton('Pause');

  // ~14–27 s: City Glow, Hear the change: 2012, 2023, then only the difference.
  await h.selectTrack('city-glow');
  await wait(600);
  glide(document.querySelector('.compare-wrap'));
  await wait(1200);
  const panel = document.querySelector('.change') ?? document;
  clickButton('Play 2012', panel);
  await wait(3200);
  clickButton('Play 2023', panel);
  await wait(3400);
  clickButton('Play the difference', panel);
  await wait(6000);

  // ~27–31 s: the proof card.
  getEarth()?.setMode('orbit');
  h.showProof();
}
