import * as Tone from 'tone';
import type { Features } from '../analysis/types';
import { createGraph } from './graph';
import { evaluate, Sequencer, TRIGGERED } from './mapping';
import type { Binding, Mode, SoundSpec } from './types';

const PREVIEW_SEC = 2.2;

/**
 * Plays what one end of a mapping sounds like ("hear low" / "hear high"), in isolation:
 * a temporary graph with only the bound layer, driven by a synthetic feature value at the
 * end of the binding's input range. Uses the same mapping, sequencer and voices as playback.
 */
export async function previewBinding(spec: SoundSpec, binding: Binding, end: 'low' | 'high', mode: Mode): Promise<void> {
  await Tone.start();
  const layerId = binding.target.split('.')[0];
  const layer = spec.layers.find((l) => l.id === layerId)!;
  // Triggered layers need notes to be heard even when the binding isn't their rate.
  const solo: SoundSpec = {
    ...spec,
    layers: [{ ...layer, rate: TRIGGERED.has(layer.kind) && !binding.target.endsWith('.rate') ? 3 : layer.rate }],
    bindings: [binding],
    changeTriggers: [],
  };
  const f: Features = { [binding.feature]: binding.in[end === 'low' ? 0 : 1] };
  if (binding.when) f[binding.when.feature] = binding.when.oneOf?.[0] ?? binding.when.min ?? 0;
  // A preview of a rate binding at its quiet end can be silent by design; nudge it into the active range.
  if (binding.when?.feature === binding.feature && end === 'low') f[binding.feature] = Math.max(f[binding.feature], binding.when.min ?? 0);

  const graph = await createGraph(solo, mode);
  const controls = evaluate(solo, f);
  const now = Tone.now() + 0.05;
  graph.apply(controls, now);
  graph.play(new Sequencer(solo, mode).step(controls, f, PREVIEW_SEC - 0.4), now);
  graph.silence(now + PREVIEW_SEC - 0.4);
  await new Promise((r) => setTimeout(r, (PREVIEW_SEC + 1.5) * 1000));
  graph.dispose();
}
