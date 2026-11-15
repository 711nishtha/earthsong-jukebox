export type NarrationLevel = 'off' | 'brief' | 'detailed';

/** Minimum gap between screen-reader announcements, so narration never talks over the music non-stop. */
export const NARRATION_GAP_MS: Record<Exclude<NarrationLevel, 'off'>, number> = { brief: 9000, detailed: 16000 };

/**
 * Decides when a live caption should be announced through the aria-live region:
 * only when narration is on, the text actually changed, and enough time has passed.
 * `force` (e.g. on play or track change) skips the gap but still skips repeats.
 */
export class Narrator {
  private lastText = '';
  private lastAt = -Infinity;

  next(text: string, level: NarrationLevel, now: number, force = false): string | null {
    if (level === 'off' || !text || text === this.lastText) return null;
    if (!force && now - this.lastAt < NARRATION_GAP_MS[level]) return null;
    this.lastText = text;
    this.lastAt = now;
    return text;
  }

  reset(): void {
    this.lastText = '';
    this.lastAt = -Infinity;
  }
}
