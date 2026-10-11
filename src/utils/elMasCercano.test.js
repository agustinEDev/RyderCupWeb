import { describe, it, expect } from 'vitest';
import { elMasCercano } from './elMasCercano';

/** El banner del panel: el más cercano entre el partido de la Ryder y la partida de stroke play (FE #824, PR 7). */
const p = (roundDate, sessionType, extra = {}) => ({ roundDate, sessionType, ...extra });

describe('elMasCercano (FE #824, PR 7)', () => {
  it('por día, y en el mismo día por franja', () => {
    expect(elMasCercano(p('2030-10-13', 'MORNING', { id: 'a' }), p('2030-10-12', 'EVENING', { id: 'b' })).id).toBe('b');
    expect(elMasCercano(p('2030-10-12', 'AFTERNOON', { id: 'a' }), p('2030-10-12', 'MORNING', { id: 'b' })).id).toBe('b');
  });

  it('a igualdad, el primero (el partido de la Ryder)', () => {
    expect(elMasCercano(p('2030-10-12', 'MORNING', { id: 'a' }), p('2030-10-12', 'MORNING', { id: 'b' })).id).toBe('a');
  });

  it('sin franja conocida cuenta como la primera, como en la lista de la Ryder', () => {
    expect(elMasCercano(p('2030-10-12', 'MORNING', { id: 'a' }), p('2030-10-12', undefined, { id: 'b' })).id).toBe('a');
    expect(elMasCercano(p('2030-10-12', 'AFTERNOON', { id: 'a' }), p('2030-10-12', undefined, { id: 'b' })).id).toBe('b');
  });

  it('si falta uno, el otro; si faltan los dos, nada', () => {
    expect(elMasCercano(null, p('2030-10-12', 'MORNING', { id: 'b' })).id).toBe('b');
    expect(elMasCercano(p('2030-10-12', 'MORNING', { id: 'a' }), undefined).id).toBe('a');
    expect(elMasCercano(null, null)).toBeNull();
  });
});
