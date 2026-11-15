import type { Frame } from './types';

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Pulls downscaled pixels from a playing <video> at about `hz` samples per second.
 * Uses requestVideoFrameCallback where available (exact media time, no wasted reads of
 * duplicate frames) and falls back to a timer (Firefox). The video must be same-origin,
 * or the canvas is tainted and getImageData throws.
 */
export class FrameSampler {
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private timer: ReturnType<typeof setInterval> | null = null;
  private rvfcId: number | null = null;
  private lastSampleAt = -Infinity;
  private running = false;

  constructor(
    private video: VideoWithRvfc,
    private width: number,
    private height: number,
    private hz: number,
    private onFrame: (frame: Frame) => void,
  ) {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height });
    // Deliberately NOT willReadFrequently: that forces a CPU canvas, so the full-size video frame is
    // downloaded and scaled in software (measured ~6.5 ms). A GPU canvas scales on the GPU and reads back
    // only the tiny result (~3 ms median in Chrome).
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    this.ctx = ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.video.requestVideoFrameCallback) {
      const loop = (_now: number, meta: { mediaTime: number }) => {
        if (!this.running) return;
        if (meta.mediaTime - this.lastSampleAt >= 1 / this.hz - 1e-3 || meta.mediaTime < this.lastSampleAt) {
          this.sample(meta.mediaTime);
        }
        this.rvfcId = this.video.requestVideoFrameCallback!(loop);
      };
      this.rvfcId = this.video.requestVideoFrameCallback(loop);
    } else {
      this.timer = setInterval(() => !this.video.paused && this.sample(this.video.currentTime), 1000 / this.hz);
    }
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    if (this.rvfcId !== null) this.video.cancelVideoFrameCallback?.(this.rvfcId);
    this.timer = this.rvfcId = null;
  }

  /** Also used once after a seek while paused, so the legend/captions reflect the new frame. */
  sample(t = this.video.currentTime): void {
    if (this.video.readyState < 2) return;
    this.lastSampleAt = t;
    this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
    const img = this.ctx.getImageData(0, 0, this.width, this.height);
    this.onFrame({ data: img.data, width: this.width, height: this.height, channels: 4, t });
  }
}
