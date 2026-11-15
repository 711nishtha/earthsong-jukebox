import type { Fidelity } from './types';

/** Short labels, shared by the in-app legend and the generated docs. */
export const FIDELITY_LABEL: Record<Fidelity, string> = {
  'data-tested': 'Data (tested)',
  'data-approx': 'Data (approx.)',
  'data-categorical': 'Data (categorical)',
  'data-relative': 'Data (relative)',
  visual: 'Visual',
  artistic: 'Artistic',
};

/** One-line plain explanations for the legend's key. */
export const FIDELITY_HELP: Record<Fidelity, string> = {
  'data-tested': 'Follows the data value behind each colour; we checked the colour reading on this video.',
  'data-approx': 'Follows the data, but shading or blending makes the reading approximate.',
  'data-categorical': 'Follows which kind of thing is shown (for example dust or smoke), not how much there is.',
  'data-relative': 'Follows real data, but the picture has no number scale, so it is “more or less”, not exact.',
  visual: 'Follows the picture itself (position, motion), not a measurement.',
  artistic: 'A musical choice to help you listen; it does not carry data.',
};
