import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { isCalm } from '../ui/prefs.svelte';
import { duration, ease } from './tokens';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll + scroll-triggered reveals for the long-read pages. In Calm mode or with
 * reduced motion: native scrolling and nothing animates (content is simply visible).
 * Returns a cleanup function.
 */
export function initScrollMotion(root: HTMLElement): () => void {
  if (isCalm()) return () => {};

  const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Sections rise into view once; they are fully visible before JS runs (no hidden content for crawlers or screen readers).
  const reveals = [...root.querySelectorAll<HTMLElement>('[data-reveal]')].map((el) =>
    gsap.from(el, {
      y: 48,
      opacity: 0,
      duration: duration.slow,
      ease: ease.outExpo,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    }),
  );

  return () => {
    reveals.forEach((t) => t.scrollTrigger?.kill());
    gsap.ticker.remove(raf);
    lenis.destroy();
  };
}

/**
 * Scrubs a timeline with the scroll position of `trigger` (used by the pipeline diagram).
 * Calm mode: the timeline jumps to its end so the finished diagram is shown.
 */
export function scrubTimeline(trigger: HTMLElement, tl: gsap.core.Timeline): () => void {
  if (isCalm()) {
    tl.progress(1).pause();
    return () => tl.kill();
  }
  const st = ScrollTrigger.create({ trigger, start: 'top 70%', end: 'bottom 40%', scrub: 0.8, animation: tl });
  return () => {
    st.kill();
    tl.kill();
  };
}
