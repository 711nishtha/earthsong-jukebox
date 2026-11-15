import { cityGlow } from './city-glow';
import { forestHeights } from './forest-heights';
import { fourWinds } from './four-winds';
import { oceanHeat } from './ocean-heat';
import { stormDrums } from './storm-drums';
import type { TrackConfig } from './types';

/** Jukebox order: calm openers first, the flashing track later. */
export const TRACKS: TrackConfig[] = [oceanHeat, forestHeights, fourWinds, cityGlow, stormDrums];

export const trackById = (id: string): TrackConfig | undefined => TRACKS.find((t) => t.id === id);
