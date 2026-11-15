import type { Stage } from './stage';

/**
 * Shared handle to the WebGL stage. Three.js is loaded lazily after first paint, so callers
 * must cope with `null` (no WebGL, low-end device, high contrast, or still loading).
 */
let current: Stage | null = null;
const waiters: ((s: Stage | null) => void)[] = [];
let settled = false;

export const getStage = (): Stage | null => current;

/** Resolves with the stage once it exists, or null if it never will. */
export function whenStage(timeoutMs = 2500): Promise<Stage | null> {
  if (settled) return Promise.resolve(current);
  return new Promise((resolve) => {
    waiters.push(resolve);
    setTimeout(() => resolve(current), timeoutMs);
  });
}

export function setStage(s: Stage | null): void {
  current = s;
  settled = true;
  waiters.splice(0).forEach((w) => w(s));
}
