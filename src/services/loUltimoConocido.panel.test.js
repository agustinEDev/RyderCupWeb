import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recuerdaElPanel,
  elUltimoPanel,
  olvidaLoDeEstaCuenta,
  abreLoGuardadoParaLaCuenta,
  olvidaTodo,
} from './loUltimoConocido';
import PlayerStats from '../domain/entities/PlayerStats';
import RecentMatch from '../domain/entities/RecentMatch';

/**
 * LA TABLA G — lo último que se vio del panel (Agustín, 14 nov 2026).
 *
 * Para pintar el panel al entrar sin esperar a sus cuatro peticiones. Se guarda
 * en el móvil, por cuenta, con el hándicap y las cifras que se veían (Agustín lo
 * pidió así el mismo día).
 *
 *   caso                                  | qué pasa
 *   --------------------------------------|----------------------------------------
 *   G1 se guarda y se lee                 | vuelve, de esa cuenta
 *   G2 lo pide otra cuenta                | nada
 *   G3 las partes llegan por separado     | se juntan si son de la misma cuenta
 *   G4 lo que no hace falta               | no se guarda (solo id, nombre, estado)
 *   G9 las cifras y el hándicap           | se guardan sus valores, sin diferenciales
 *   G10 las partidas son entidades        | se guardan sus valores y se pueden rehacer
 *   G11 lo guardado es de otra versión    | no se usa
 *   G12 elementos sin id                  | se descartan
 *   G13 cifras que no son números         | se descartan
 *   G14 una cifra que no vino             | no vuelve como null (la entidad pone la suya)
 *   G15 una partida con una fecha imposible | no revienta ni guarda nada a medias
 *   G16 una parte en null                 | se borra esa parte
 *   G5 se cierra la sesión                | se borra y no se reescribe
 *   G6 el móvil no tiene sitio            | no se guarda y no revienta
 *   G7 lo guardado está roto              | nada
 */
describe('loUltimoConocido, el panel', () => {
  let guardado;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    olvidaTodo();
  });

  const competicion = (n, extra = {}) => ({
    id: `c-${n}`,
    name: `Liga ${n}`,
    status: 'ACTIVE',
    ...extra,
  });
  const partida = (n) => ({
    id: `p-${n}`,
    golfCourseName: 'El Saler',
    stablefordPoints: 30,
  });

  it('G1: lo guardado vuelve, para esa cuenta', () => {
    const guardo = recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
    });

    expect(guardo).toBe(true);
    expect(elUltimoPanel('u-1')).toEqual({
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
      estadisticas: null,
    });
  });

  it('G1b: sin nada guardado, nada', () => {
    expect(elUltimoPanel('u-1')).toBeNull();
  });

  it('G2: lo de una cuenta no lo ve otra', () => {
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });

    expect(elUltimoPanel('u-2')).toBeNull();
    expect(elUltimoPanel(null)).toBeNull();
  });

  it('G3: las partes se juntan si son de la misma cuenta', () => {
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });
    recuerdaElPanel('u-1', { ultimasPartidas: [partida(1)] });

    expect(elUltimoPanel('u-1')).toEqual({
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
      estadisticas: null,
    });
  });

  it('G3b: lo nuevo de una parte sustituye a lo viejo de esa parte', () => {
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });
    recuerdaElPanel('u-1', { competiciones: [competicion(2)] });

    expect(elUltimoPanel('u-1').competiciones).toEqual([competicion(2)]);
  });

  it('G3c: una parte de otra cuenta no se junta con la anterior', () => {
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
    });
    recuerdaElPanel('u-2', { ultimasPartidas: [partida(2)] });

    expect(elUltimoPanel('u-1')).toBeNull();
    expect(elUltimoPanel('u-2')).toEqual({
      competiciones: null,
      ultimasPartidas: [partida(2)],
      estadisticas: null,
    });
  });

  it('G4: de cada competición solo se guarda id, nombre y estado', () => {
    recuerdaElPanel('u-1', {
      competiciones: [
        competicion(1, {
          golf_courses: [{ id: 'g-1' }],
          handicap: 12.3,
          creator: { email: 'a@b.c' },
        }),
      ],
    });

    expect(elUltimoPanel('u-1').competiciones).toEqual([competicion(1)]);
    expect(guardado.get('rydercup-ultimo-panel')).not.toMatch(
      /handicap|email|golf_courses/,
    );
  });

  it('G9: las cifras se guardan con sus valores, también el hándicap', () => {
    const cifras = PlayerStats.fromPersistence({
      handicap: 18,
      handicapTrend: -0.2,
      roundsPlayed: 21,
      tournamentsTotal: 8,
      tournamentsActive: 6,
      playingAvg: 18.6,
      roundsWithDifferential: 21,
      differentials: [{ value: 20 }, { value: 19 }],
    });

    recuerdaElPanel('u-1', { estadisticas: cifras });

    const leidas = elUltimoPanel('u-1').estadisticas;
    expect(leidas).toMatchObject({
      handicap: 18,
      handicapTrend: -0.2,
      tournamentsTotal: 8,
      tournamentsActive: 6,
      playingAvg: 18.6,
      roundsWithDifferential: 21,
    });
    // La lista de diferenciales no la enseña el panel
    expect(guardado.get('rydercup-ultimo-panel')).not.toMatch(/differentials/);
  });

  it('G9b: las cifras se juntan con lo demás de la misma cuenta', () => {
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });
    recuerdaElPanel('u-1', { estadisticas: { playingAvg: 18.6 } });

    expect(elUltimoPanel('u-1').competiciones).toEqual([competicion(1)]);
    expect(elUltimoPanel('u-1').estadisticas.playingAvg).toBe(18.6);
  });

  it('G9c: unas cifras que no son un objeto no se guardan', () => {
    recuerdaElPanel('u-1', { estadisticas: [1, 2] });

    expect(elUltimoPanel('u-1').estadisticas).toBeNull();
  });

  it('G5: al cerrar la sesión se borra y no se vuelve a escribir', () => {
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });

    olvidaLoDeEstaCuenta();
    recuerdaElPanel('u-1', { competiciones: [competicion(2)] });

    expect(elUltimoPanel('u-1')).toBeNull();
    expect(guardado.has('rydercup-ultimo-panel')).toBe(false);
  });

  it('G5b: al entrar otra cuenta se puede volver a guardar', () => {
    olvidaLoDeEstaCuenta();
    abreLoGuardadoParaLaCuenta();

    recuerdaElPanel('u-2', { competiciones: [competicion(1)] });

    expect(elUltimoPanel('u-2').competiciones).toEqual([competicion(1)]);
  });

  it('G6: sin sitio en el móvil no se guarda y no revienta', () => {
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    let guardo;
    expect(() => {
      guardo = recuerdaElPanel('u-1', { competiciones: [competicion(1)] });
    }).not.toThrow();
    expect(guardo).toBe(false);
    expect(elUltimoPanel('u-1')).toBeNull();
  });

  it.each([
    ['texto que no es JSON', '{roto'],
    ['sin cuenta', JSON.stringify({ competiciones: [] })],
    ['una lista', JSON.stringify([1, 2])],
    [
      'competiciones que no son lista',
      JSON.stringify({ usuarioId: 'u-1', competiciones: 'x' }),
    ],
  ])('G7: lo guardado roto (%s) no se usa', (_, crudo) => {
    guardado.set('rydercup-ultimo-panel', crudo);

    const leido = elUltimoPanel('u-1');
    expect(leido === null || leido.competiciones === null).toBe(true);
  });

  it('G10: una partida reciente de verdad se guarda y se puede rehacer', () => {
    const real = RecentMatch.fromPersistence({
      id: 'p-9',
      date: '2026-11-10T09:00:00.000Z',
      golfCourseName: 'El Saler',
      tournamentName: 'Liga',
      stablefordPoints: 34,
      partners: [{ name: 'Ana' }],
    });

    recuerdaElPanel('u-1', { ultimasPartidas: [real] });

    const [leida] = elUltimoPanel('u-1').ultimasPartidas;
    expect(leida).toMatchObject({
      id: 'p-9',
      golfCourseName: 'El Saler',
      tournamentName: 'Liga',
      stablefordPoints: 34,
      partners: [{ name: 'Ana' }],
    });
    const rehecha = RecentMatch.fromPersistence(leida);
    expect(rehecha.isFromTournament()).toBe(real.isFromTournament());
    expect(rehecha.date.toISOString()).toBe('2026-11-10T09:00:00.000Z');
  });

  it('G11: lo guardado con otra versión no se usa', () => {
    guardado.set(
      'rydercup-ultimo-panel',
      JSON.stringify({ v: 0, usuarioId: 'u-1', competiciones: [] }),
    );

    expect(elUltimoPanel('u-1')).toBeNull();
  });

  it('G12: los elementos sin id se descartan', () => {
    guardado.set(
      'rydercup-ultimo-panel',
      JSON.stringify({
        v: 1,
        usuarioId: 'u-1',
        competiciones: [competicion(1), {}, null, { id: 3 }],
        ultimasPartidas: [{}, partida(1), 'x'],
      }),
    );

    const leido = elUltimoPanel('u-1');
    expect(leido.competiciones).toEqual([competicion(1)]);
    expect(leido.ultimasPartidas).toEqual([partida(1)]);
  });

  it('G13: las cifras que no son números se descartan', () => {
    guardado.set(
      'rydercup-ultimo-panel',
      JSON.stringify({
        v: 1,
        usuarioId: 'u-1',
        estadisticas: { handicap: 'x', playingAvg: 18.6, roundsPlayed: null },
      }),
    );

    expect(elUltimoPanel('u-1').estadisticas).toEqual({
      playingAvg: 18.6,
      roundsPlayed: null,
    });
  });

  it('G14: una cifra que no vino no vuelve como null', () => {
    recuerdaElPanel('u-1', { estadisticas: { playingAvg: 18.6 } });

    const rehecha = PlayerStats.fromPersistence(
      elUltimoPanel('u-1').estadisticas,
    );
    expect(rehecha.roundsPlayed).toBe(0);
  });

  it('G15: una fecha imposible no hace reventar al que guarda', () => {
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });
    const rara = RecentMatch.fromPersistence({
      id: 'p-1',
      date: 'no-es-fecha',
    });

    let guardo;
    expect(() => {
      guardo = recuerdaElPanel('u-1', { ultimasPartidas: [rara] });
    }).not.toThrow();
    expect(guardo).toBe(false);
    // Lo de antes sigue como estaba
    expect(elUltimoPanel('u-1').competiciones).toEqual([competicion(1)]);
  });

  it('G16: una parte en null se borra, y las demás siguen', () => {
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
      estadisticas: { playingAvg: 18.6 },
    });

    recuerdaElPanel('u-1', { estadisticas: null, ultimasPartidas: null });

    expect(elUltimoPanel('u-1')).toEqual({
      competiciones: [competicion(1)],
      ultimasPartidas: null,
      estadisticas: null,
    });
  });

  it('G8: sin cuenta no se guarda nada', () => {
    recuerdaElPanel(null, { competiciones: [competicion(1)] });

    expect(guardado.has('rydercup-ultimo-panel')).toBe(false);
  });
});
