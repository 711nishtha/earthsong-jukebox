import type { LutData } from './types';

/** Same-origin JSON from public/, resolved against Vite's base so it works under a GitHub Pages sub-path. */
export async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(import.meta.env.BASE_URL + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadLuts(names: string[]): Promise<Record<string, LutData>> {
  const entries = await Promise.all(names.map(async (n) => [n, await loadJson<LutData>(`luts/${n}.json`)] as const));
  return Object.fromEntries(entries);
}
