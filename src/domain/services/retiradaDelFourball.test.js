import { describe, it, expect } from 'vitest';
import { opcionesDeRetirada, cuentaLaBola, aQuienesMarco } from './retiradaDelFourball';

/**
 * Qué puede hacer cada uno con la retirada de un fourball de torneo (25 oct
 * 2026, tabla F1–F10). La regla la decide el backend (RyderCupAM#665); esto
 * solo dice qué botones enseñar, para no ofrecer lo que va a rechazar.
 *
 *   #    caso                                                | esperado
 *   -----|----------------------------------------------------|--------------------------------
 *   F2   fourball en juego, nadie retirado                    | retirarme y retirar a mi pareja
 *   F2b  programado                                          | igual
 *   F2c  individual o foursomes                              | nada
 *   F2d  con una tarjeta entregada                           | nada
 *   F2e  terminado o concedido                               | nada
 *   F3   estoy retirado                                      | volver; ni retirarme ni a ella
 *   F3b  mi pareja está retirada                             | deshacer la suya; no retirarme
 *   F3c  no juego (organizador mirando)                      | nada aquí (lo suyo va en F10)
 *   F5   mi pareja retirada y ella marcaba a un rival        | marco a dos
 *   F6   la bola del retirado sin validar                    | no cuenta
 */
const A1 = 'a1';
const A2 = 'a2';
const B1 = 'b1';
const B2 = 'b2';

const vista = (extra = {}) => ({
  matchFormat: 'FOURBALL',
  matchStatus: 'IN_PROGRESS',
  scorecardSubmittedBy: [],
  withdrawnPlayerIds: [],
  players: [
    { userId: A1, userName: 'Ana', team: 'A' },
    { userId: A2, userName: 'Bea', team: 'A' },
    { userId: B1, userName: 'Carlos', team: 'B' },
    { userId: B2, userName: 'Dani', team: 'B' },
  ],
  markerAssignments: [
    { scorerUserId: A1, marksUserId: B1 },
    { scorerUserId: A2, marksUserId: B2 },
    { scorerUserId: B1, marksUserId: A2 },
    { scorerUserId: B2, marksUserId: A1 },
  ],
  ...extra,
});

describe('opcionesDeRetirada', () => {
  it.each(['IN_PROGRESS', 'SCHEDULED'])('F2: en un fourball %s, retirarme y retirar a mi pareja', (estado) => {
    const o = opcionesDeRetirada(vista({ matchStatus: estado }), A1);
    expect(o).toMatchObject({ retirarme: true, retirarPareja: true, volver: false, deshacerPareja: false });
    expect(o.pareja).toEqual({ userId: A2, userName: 'Bea' });
  });

  it.each(['SINGLES', 'FOURSOMES'])('F2c: en %s, nada', (formato) => {
    expect(opcionesDeRetirada(vista({ matchFormat: formato }), A1)).toMatchObject({
      retirarme: false,
      retirarPareja: false,
      volver: false,
      deshacerPareja: false,
    });
  });

  it('F2d: con una tarjeta entregada, nada', () => {
    const o = opcionesDeRetirada(vista({ scorecardSubmittedBy: [B1] }), A1);
    expect(o.retirarme || o.retirarPareja || o.volver || o.deshacerPareja).toBe(false);
  });

  it.each(['COMPLETED', 'CONCEDED', 'WALKOVER'])('F2e: %s, nada', (estado) => {
    const o = opcionesDeRetirada(vista({ matchStatus: estado }), A1);
    expect(o.retirarme || o.retirarPareja).toBe(false);
  });

  it('F3: retirado, solo volver', () => {
    const o = opcionesDeRetirada(vista({ withdrawnPlayerIds: [A1] }), A1);
    expect(o).toMatchObject({ yoRetirado: true, volver: true, retirarme: false, retirarPareja: false });
  });

  it('F3b: mi pareja retirada, deshacer la suya y no puedo retirarme (sería el último del bando)', () => {
    const o = opcionesDeRetirada(vista({ withdrawnPlayerIds: [A2] }), A1);
    expect(o).toMatchObject({ deshacerPareja: true, retirarme: false, retirarPareja: false, yoRetirado: false });
  });

  it('F3c: quien no juega no ve nada aquí', () => {
    const o = opcionesDeRetirada(vista(), 'organizador');
    expect(o.retirarme || o.retirarPareja || o.volver || o.deshacerPareja).toBe(false);
    expect(o.pareja).toBeNull();
  });

  it('sin vista, nada', () => {
    expect(opcionesDeRetirada(null, A1).retirarme).toBe(false);
  });
});

describe('aQuienesMarco', () => {
  it('F5: con mi pareja retirada, el backend me da a los dos rivales; sin repetir', () => {
    const asignaciones = [
      { scorerUserId: A2, marksUserId: B2 },
      { scorerUserId: A2, marksUserId: B1 },
      // Repetida (datos viejos o una asignación que llegó dos veces)
      { scorerUserId: A2, marksUserId: B2 },
      { scorerUserId: B1, marksUserId: A2 },
    ];
    expect(aQuienesMarco(asignaciones, A2)).toEqual([B2, B1]);
    expect(aQuienesMarco(asignaciones, B1)).toEqual([A2]);
    expect(aQuienesMarco(undefined, A2)).toEqual([]);
  });
});

describe('cuentaLaBola', () => {
  it('F6: la bola del retirado sin validar no cuenta; validada, o de quien juega, sí', () => {
    expect(cuentaLaBola({ userId: A1, validationStatus: 'pending' }, [A1])).toBe(false);
    expect(cuentaLaBola({ userId: A1, validationStatus: 'match' }, [A1])).toBe(true);
    expect(cuentaLaBola({ userId: A2, validationStatus: 'pending' }, [A1])).toBe(true);
    expect(cuentaLaBola({ userId: A1, validationStatus: 'pending' }, undefined)).toBe(true);
  });
});
