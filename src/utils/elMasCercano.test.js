import { describe, it, expect } from 'vitest';
import { elMasCercano, porCuandoSeJuega } from './elMasCercano';

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

/**
 * «Mis próximos partidos» junta los dos (FE #845): la misma regla, como orden.
 *
 *   #   caso                                       | primero
 *   ----|------------------------------------------|---------------------------
 *   1   días distintos                             | el del día antes
 *   2   mismo día, franjas distintas               | mañana, tarde, noche
 *   3   misma franja, con hora                     | la hora más temprana
 *   4   misma franja, uno sin hora                 | el que no la tiene (Ryder)
 *   5   todo igual                                 | se queda el orden que traían
 */
describe('porCuandoSeJuega (FE #845)', () => {
  const orden = (...lista) => [...lista].sort(porCuandoSeJuega).map((x) => x.id);

  it('1 · por día', () => {
    expect(orden(p('2030-10-13', 'MORNING', { id: 'a' }), p('2030-10-12', 'EVENING', { id: 'b' }))).toEqual(['b', 'a']);
  });

  it('2 · en el mismo día, por franja', () => {
    expect(
      orden(p('2030-10-12', 'EVENING', { id: 'n' }), p('2030-10-12', 'MORNING', { id: 'm' }), p('2030-10-12', 'AFTERNOON', { id: 't' }))
    ).toEqual(['m', 't', 'n']);
  });

  it('3 · en la misma franja, por hora de salida', () => {
    expect(
      orden(p('2030-10-12', 'MORNING', { id: 'tarde', teeTime: '09:20' }), p('2030-10-12', 'MORNING', { id: 'pronto', teeTime: '08:10' }))
    ).toEqual(['pronto', 'tarde']);
  });

  it('4 · sin hora va antes: la sesión de la Ryder no la tiene', () => {
    expect(
      orden(p('2030-10-12', 'MORNING', { id: 'stroke', teeTime: '08:10' }), p('2030-10-12', 'MORNING', { id: 'ryder' }))
    ).toEqual(['ryder', 'stroke']);
  });

  it('5 · a igualdad, como venían', () => {
    expect(orden(p('2030-10-12', 'MORNING', { id: 'a' }), p('2030-10-12', 'MORNING', { id: 'b' }))).toEqual(['a', 'b']);
  });
});
