import { loadJson } from '../analysis/load';

/** public/media/manifest.json, written by scripts/fetch_media.py with credits pulled live from the SVS API. */
export interface MediaEntry {
  svsId: number;
  linkedFrom?: number;
  pageUrl: string;
  title: string;
  releaseDate: string;
  creditLine: string;
  dataDates: string;
  credits: { role: string; people: string[] }[];
  datasets: { name: string; platform?: string; sensor?: string; credit?: string }[];
  video: { duration: number };
}

export interface Manifest {
  tracks: Record<string, MediaEntry>;
  notice: string;
}

let cache: Promise<Manifest> | null = null;
export const loadManifest = (): Promise<Manifest> => (cache ??= loadJson<Manifest>('media/manifest.json'));

export const formatTime = (s: number): string => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
