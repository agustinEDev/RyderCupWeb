import { describe, it, expect } from 'vitest';
import { permiteLaRaya } from './permiteLaRaya';

/**
 * La raya en partida rápida (Agustín, 23 oct 2026: «que la raya no salga ya en
 * Medal, no demos la oportunidad de que falle»). Se ofrece solo donde se
 * permite expresamente, como `allows_picked_up_holes` del backend.
 */
describe('permiteLaRaya', () => {
  it.each([
    ['Stableford', { scoringFormat: 'STABLEFORD', matchFormat: null }, true],
    ['match play', { scoringFormat: null, matchFormat: 'SINGLES' }, true],
    ['Medal', { scoringFormat: 'MEDAL', matchFormat: null }, false],
    ['partida sin cargar', null, false],
    ['partida sin formato', {}, false],
  ])('%s', (_caso, partida, permite) => {
    expect(permiteLaRaya(partida)).toBe(permite);
  });
});
