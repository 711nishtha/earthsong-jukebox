/**
 * Regenerates the mapping tables in docs/mappings.md from the track configs, so documented and
 * actual mappings can never drift. Rewrites only the block between the GENERATED markers.
 *
 *   npx vite-node scripts/gen_docs.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Fidelity } from '../src/audio/types';
import { TRACKS } from '../src/tracks';

const FILE = resolve(import.meta.dirname, '../docs/mappings.md');
const START = '<!-- GENERATED:mappings (npx vite-node scripts/gen_docs.ts) -->';
const END = '<!-- /GENERATED:mappings -->';

export const FIDELITY_LABEL: Record<Fidelity, string> = {
  'data-tested': 'Data (tested)',
  'data-approx': 'Data (approx.)',
  'data-categorical': 'Data (categorical)',
  'data-relative': 'Data (relative)',
  visual: 'Visual',
  artistic: 'Artistic',
};

const cell = (s: string) => s.replace(/\|/g, '\\|');

const parts: string[] = [START, ''];
for (const t of TRACKS) {
  parts.push(`### ${t.title} (SVS ${t.svsId})`, '', `*${t.sound.mood}*`, '');
  parts.push('| Visual feature | How measured | Audio parameter | Range | Data or artistic? | Why |', '|---|---|---|---|---|---|');
  for (const b of t.sound.bindings) {
    const fid = FIDELITY_LABEL[b.fidelity] + (b.amplified ? ', amplified' : '');
    parts.push(`| ${[b.visual, b.measured, b.audio, b.range, fid, b.why].map(cell).join(' | ')} |`);
  }
  const unbound = t.sound.layers.filter((l) => l.fidelity === 'artistic' && !t.sound.bindings.some((b) => b.target.startsWith(`${l.id}.`)));
  for (const l of unbound) parts.push(`| — (background) | — | ${cell(l.label)} layer | constant | Artistic | ${cell(l.description)} |`);
  parts.push('');
}
parts.push(END);

const doc = readFileSync(FILE, 'utf8');
const block = parts.join('\n');
const next = doc.includes(START)
  ? doc.slice(0, doc.indexOf(START)) + block + doc.slice(doc.indexOf(END) + END.length)
  : doc.replace(/^(# .*\n)/, `$1\n## Mapping tables (generated from src/tracks)\n\n${block}\n`);
writeFileSync(FILE, next);
console.log(`updated ${FILE}`);
