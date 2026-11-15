import type { FeatureTrack } from '../audio/render';
import { rowFeatures } from '../audio/render';
import type { Features } from './types';

/**
 * Feature source for audio-only / low-power mode: reads the precomputed (already smoothed)
 * feature row for the video's current time instead of analysing pixels. A hidden video may
 * stop presenting frames, and slow phones may not keep up with live analysis; the sound is
 * the same either way because both come from the same engine.
 */
export class PrecomputedSource {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private video: HTMLVideoElement,
    private track: FeatureTrack,
    private onFeatures: (f: Features, t: number) => void,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.video.paused) return;
      const t = this.video.currentTime;
      const i = Math.min(this.track.rows.length - 1, Math.max(0, Math.round(t * this.track.hz)));
      this.onFeatures(rowFeatures(this.track, i), t);
    }, 1000 / this.track.hz);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
