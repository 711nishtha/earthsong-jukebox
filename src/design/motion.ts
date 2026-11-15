import { gsap } from 'gsap';
import { isCalm } from '../ui/prefs.svelte';
import { duration, ease } from './tokens';

/**
 * Wraps each word of `el` in a mask so it can rise into view. The text stays one readable
 * string for screen readers (the spans add no semantics), and nothing moves in Calm mode.
 */
export function splitWords(el: HTMLElement): HTMLElement[] {
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.textContent = '';
  return words.map((w, i) => {
    const mask = document.createElement('span');
    mask.className = 'word-mask';
    const inner = document.createElement('span');
    inner.className = 'word';
    inner.textContent = w;
    mask.append(inner);
    el.append(mask, i < words.length - 1 ? ' ' : '');
    return inner;
  });
}

/** Line/word reveal: each word slides up out of its mask, staggered. Returns the timeline. */
export function revealWords(el: HTMLElement, delay = 0): gsap.core.Timeline {
  const words = splitWords(el);
  const tl = gsap.timeline({ delay });
  if (isCalm()) return tl.fromTo(words, { opacity: 0 }, { opacity: 1, duration: duration.crossfade });
  return tl.fromTo(words, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: duration.reveal, ease: ease.outExpo, stagger: 0.07 });
}

/** Fade + rise for any set of elements (labels, buttons). */
export function riseIn(targets: gsap.TweenTarget, delay = 0, stagger = 0.08): gsap.core.Tween {
  if (isCalm()) return gsap.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: duration.crossfade, delay });
  return gsap.fromTo(targets, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: duration.slow, ease: ease.outExpo, delay, stagger });
}

/**
 * Svelte action: the element drifts slightly toward the pointer and a soft glow follows it.
 * Purely cosmetic; off in Calm mode and for touch input.
 */
export function magnetic(node: HTMLElement, strength = 0.25) {
  const move = (e: PointerEvent) => {
    if (isCalm() || e.pointerType !== 'mouse') return;
    const r = node.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    gsap.to(node, { x: x * strength, y: y * strength, duration: duration.base, ease: ease.outExpo });
    node.style.setProperty('--glow-x', `${e.clientX - r.left}px`);
    node.style.setProperty('--glow-y', `${e.clientY - r.top}px`);
  };
  const leave = () => gsap.to(node, { x: 0, y: 0, duration: duration.slow, ease: ease.outExpo });
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', leave);
  return {
    destroy() {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    },
  };
}
