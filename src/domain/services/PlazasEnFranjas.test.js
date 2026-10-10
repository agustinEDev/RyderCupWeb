import { describe, it, expect } from 'vitest';
import { situacionEnLasFranjas, COGER, CAMBIAR, SOLTAR, ESPERAR, DEJAR_DE_ESPERAR } from './PlazasEnFranjas';

/**
 * Qué puede hacer un jugador en cada franja (FE #824, PR 4). Las reglas del
 * backend (RyderCupAm#511, #512): una franja por jornada, como mucho M
 * jornadas, la espera solo en un día en que no juega y con jornadas libres.
 * Decidido con Agustín el 10 oct 2026: con las jornadas llenas, «Cambiar por
 * esta» dejando una de las suyas.
 */
const YO = 'yo';

const franja = (id, dia, extra = {}) => ({
  id,
  roundDate: dia,
  sessionType: 'MORNING',
  teeSheet: { capacity: 4, placesTaken: 0, playerIds: [], waitingIds: [], ...extra },
});
const llena = (id, dia, extra = {}) =>
  franja(id, dia, { capacity: 2, placesTaken: 2, playerIds: ['a', 'b'], ...extra });
const mia = (id, dia) => franja(id, dia, { placesTaken: 1, playerIds: [YO] });

const accion = (situacion, id) => situacion.porFranja[id];

describe('PlazasEnFranjas (FE #824)', () => {
  it('cuenta las jornadas en que juega y su máximo', () => {
    const s = situacionEnLasFranjas([mia('m', '2030-10-12'), franja('t', '2030-10-13')], YO, 2);

    expect(s.jornadas).toEqual({ juega: 1, maximo: 2 });
  });

  it('2: con sitio, un día en que no juega y jornadas libres: coger plaza', () => {
    const s = situacionEnLasFranjas([franja('f', '2030-10-12')], YO, 1);

    expect(accion(s, 'f')).toEqual({ tipo: COGER });
  });

  it('3: con sitio y ya juega ese día: cambiarse directamente desde la suya', () => {
    const s = situacionEnLasFranjas(
      [mia('m', '2030-10-12'), { ...franja('t', '2030-10-12'), sessionType: 'AFTERNOON' }],
      YO,
      1
    );

    expect(accion(s, 't')).toEqual({ tipo: CAMBIAR, dejar: ['m'] });
  });

  it('3b: ya juega ese día aunque le queden jornadas: cambiarse, no coger otra ese día', () => {
    const s = situacionEnLasFranjas(
      [mia('m', '2030-10-12'), { ...franja('t', '2030-10-12'), sessionType: 'AFTERNOON' }],
      YO,
      2
    );

    expect(accion(s, 't')).toEqual({ tipo: CAMBIAR, dejar: ['m'] });
  });

  it('4: con sitio, otro día y las jornadas llenas: cambiar por esta, eligiendo cuál deja', () => {
    const s = situacionEnLasFranjas(
      [mia('a', '2030-10-12'), mia('b', '2030-10-13'), franja('c', '2030-10-14')],
      YO,
      2
    );

    expect(accion(s, 'c')).toEqual({ tipo: CAMBIAR, dejar: ['a', 'b'] });
  });

  it('5: la suya: soltar', () => {
    const s = situacionEnLasFranjas([mia('m', '2030-10-12')], YO, 1);

    expect(accion(s, 'm')).toEqual({ tipo: SOLTAR });
  });

  it('6: llena, un día en que no juega y con jornadas libres: esperar', () => {
    const s = situacionEnLasFranjas([llena('f', '2030-10-12')], YO, 1);

    expect(accion(s, 'f')).toEqual({ tipo: ESPERAR });
  });

  it('6b: llena y ya juega ese día: nada (la espera es para conseguir jornada)', () => {
    const s = situacionEnLasFranjas(
      [mia('m', '2030-10-12'), { ...llena('f', '2030-10-12'), sessionType: 'AFTERNOON' }],
      YO,
      2
    );

    expect(accion(s, 'f')).toBeNull();
  });

  it('6c: llena y con las jornadas llenas: nada', () => {
    const s = situacionEnLasFranjas([mia('m', '2030-10-12'), llena('f', '2030-10-13')], YO, 1);

    expect(accion(s, 'f')).toBeNull();
  });

  it('7: espera en ella: salir de la espera, con su posición', () => {
    const s = situacionEnLasFranjas([llena('f', '2030-10-12', { waitingIds: ['x', 'y', YO] })], YO, 1);

    expect(accion(s, 'f')).toEqual({ tipo: DEJAR_DE_ESPERAR, posicion: 3 });
  });

  it('una franja sin hoja (de antes) no ofrece nada', () => {
    const s = situacionEnLasFranjas([{ id: 'r', roundDate: '2030-10-12', teeSheet: null }], YO, 1);

    expect(accion(s, 'r')).toBeNull();
  });

  it('sin máximo conocido, una jornada', () => {
    const s = situacionEnLasFranjas([mia('m', '2030-10-12'), franja('t', '2030-10-13')], YO, undefined);

    expect(s.jornadas.maximo).toBe(1);
    expect(accion(s, 't')).toEqual({ tipo: CAMBIAR, dejar: ['m'] });
  });
});
