import { describe, it, expect } from 'vitest';
import { destinosDelJugador, errorDeMarcadores, partidasQueSeAdelantan } from './PartidasDeLaFranja';

/**
 * Las reglas de las partidas que el organizador ve antes de pedir nada (FE
 * #824, PR 6). Las del backend (RyderCupAm#534): mover a una con sitio, a una
 * llena intercambiando, o a una nueva al final si quedan salidas; el origen
 * nunca se queda con 1 salvo intercambiando (M2); nadie se marca a sí mismo y
 * cada uno marca a uno y es marcado por uno (D12).
 */
const jugador = (userId) => ({ userId, name: userId.toUpperCase() });
const partida = (id, number, ids, teeTime = '08:00') => ({ id, number, teeTime, players: ids.map(jugador) });
const vista = (groups, unassigned = []) => ({ groups, unassignedPlayers: unassigned.map(jugador) });
const HOJA = { tamano: 4, salidas: 4 };

describe('PartidasDeLaFranja · adónde se mueve a un jugador (FE #824, PR 6)', () => {
  const v = vista([
    partida('g1', 1, ['a', 'b', 'c']),
    partida('g2', 2, ['d', 'e', 'f', 'g']),
    partida('g3', 3, ['h', 'i', 'j']),
  ]);

  it('10: a las otras con sitio, intercambiando en las llenas y a una nueva si quedan salidas', () => {
    const d = destinosDelJugador(v, 'a', HOJA);

    expect(d.conSitio.map((g) => g.id)).toEqual(['g3']);
    expect(d.intercambios.map(({ partida: g, con }) => [g.id, con.userId])).toEqual([
      ['g2', 'd'],
      ['g2', 'e'],
      ['g2', 'f'],
      ['g2', 'g'],
    ]);
    expect(d.nueva).toBe(true);
  });

  it('sin salidas libres, no hay partida nueva', () => {
    expect(destinosDelJugador(v, 'a', { tamano: 4, salidas: 3 }).nueva).toBe(false);
  });

  it('M2: si el origen se quedaría con 1, solo intercambiar', () => {
    const conDos = vista([partida('g1', 1, ['a', 'b']), partida('g2', 2, ['d', 'e', 'f', 'g']), partida('g3', 3, ['h'])]);

    const d = destinosDelJugador(conDos, 'a', HOJA);

    expect(d.conSitio).toEqual([]);
    expect(d.nueva).toBe(false);
    expect(d.intercambios.map(({ con }) => con.userId)).toEqual(['d', 'e', 'f', 'g']);
  });

  it('el último de una partida de 1 puede irse a otra con sitio (la suya desaparece), no a una nueva', () => {
    const conUno = vista([partida('g1', 1, ['a']), partida('g2', 2, ['d', 'e', 'f'])]);

    const d = destinosDelJugador(conUno, 'a', HOJA);

    expect(d.conSitio.map((g) => g.id)).toEqual(['g2']);
    expect(d.nueva).toBe(false);
  });

  it('12: uno sin partida, a las que tienen sitio o a una nueva; sin intercambios', () => {
    const d = destinosDelJugador(vista(v.groups, ['z']), 'z', HOJA);

    expect(d.conSitio.map((g) => g.id)).toEqual(['g1', 'g3']);
    expect(d.intercambios).toEqual([]);
    expect(d.nueva).toBe(true);
  });

  it('el tamaño manda: con partidas de 3, la de 3 está llena', () => {
    const d = destinosDelJugador(v, 'a', { tamano: 3, salidas: 4 });

    expect(d.conSitio).toEqual([]);
    expect(d.intercambios.map(({ partida: g }) => g.id)).toContain('g3');
  });
});

describe('PartidasDeLaFranja · marcadores (FE #824, PR 6)', () => {
  const ids = ['a', 'b', 'c'];

  it('una cadena o un intercambio entre dos valen', () => {
    expect(errorDeMarcadores(ids, { a: 'b', b: 'c', c: 'a' })).toBeNull();
    expect(errorDeMarcadores(['a', 'b'], { a: 'b', b: 'a' })).toBeNull();
  });

  it('14: alguien sin elegir a quién marca', () => {
    expect(errorDeMarcadores(ids, { a: 'b', b: 'c', c: '' })).toBe('MISSING');
    expect(errorDeMarcadores(ids, { a: 'b', b: 'c' })).toBe('MISSING');
  });

  it('14: nadie se marca a sí mismo', () => {
    expect(errorDeMarcadores(ids, { a: 'a', b: 'c', c: 'b' })).toBe('SELF');
  });

  it('14: cada uno lo marca uno solo (si no, alguien queda sin marcador)', () => {
    expect(errorDeMarcadores(ids, { a: 'b', b: 'a', c: 'a' })).toBe('UNMARKED');
  });

  it('a alguien de fuera de la partida no se le marca', () => {
    expect(errorDeMarcadores(ids, { a: 'b', b: 'c', c: 'z' })).toBe('UNMARKED');
  });
});

describe('PartidasDeLaFranja · qué horas se adelantan al mover (FE #824, PR 6)', () => {
  it('11: si una se vacía y suben las de detrás, de cuál a cuál y cuántos minutos', () => {
    const antes = [partida('g1', 1, ['a'], '08:00'), partida('g2', 2, ['b'], '08:10'), partida('g3', 3, ['c'], '08:20'), partida('g4', 4, ['d'], '08:30')];
    const despues = [partida('g1', 1, ['a', 'x'], '08:00'), partida('g3', 2, ['c'], '08:10'), partida('g4', 3, ['d'], '08:20')];

    expect(partidasQueSeAdelantan(antes, despues)).toEqual({ desde: 2, hasta: 3, minutos: 10 });
  });

  it('sin cambios de hora, nada', () => {
    const antes = [partida('g1', 1, ['a'], '08:00'), partida('g2', 2, ['b'], '08:10')];

    expect(partidasQueSeAdelantan(antes, antes)).toBeNull();
  });

  it('una partida nueva o que se retrasa no cuenta', () => {
    const antes = [partida('g1', 1, ['a'], '08:00')];
    const despues = [partida('g1', 1, ['a'], '08:10'), partida('g9', 2, ['z'], '08:20')];

    expect(partidasQueSeAdelantan(antes, despues)).toBeNull();
  });

  it('al cruzar la hora en punto (9:05 → 8:55) cuenta en minutos', () => {
    const antes = [partida('g2', 2, ['b'], '09:05')];
    const despues = [partida('g2', 1, ['b'], '08:55')];

    expect(partidasQueSeAdelantan(antes, despues)).toEqual({ desde: 1, hasta: 1, minutos: 10 });
  });
});
