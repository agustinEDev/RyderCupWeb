import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loQueSeEnseñoAntes,
  recuerdaLasAccionesPendientes,
  olvidaLasAccionesPendientes,
} from './accionesPendientes';
import {
  olvidaLoDeEstaCuenta,
  olvidaTodo,
  recuerdaElPanel,
  elUltimoPanel,
} from './loUltimoConocido';

/**
 * LA TABLA A — «Requiere tu Atención» también al abrir la app de cero
 * (Agustín, 14 nov 2026).
 *
 * Lo que enseñó la tarjeta se guarda además en el móvil, dentro del panel de
 * esa cuenta, para pintarlo al abrir sin esperar a sus siete peticiones.
 *
 *   caso                                     | qué pasa
 *   -----------------------------------------|----------------------------------
 *   A1 se abre la app de cero                | vuelve lo que se enseñó, del móvil
 *   A2 lo pide otra cuenta                   | nada (ni la memoria ni el móvil)
 *   A3 se cierra la sesión                   | nada
 *   A4 lo guardado trae campos de otro tipo  | se descartan
 *   A5 llegan entidades con getters          | se guardan sus valores
 *   A6 no hace falta guardar más que lo que se pinta
 */
describe('accionesPendientes, en el móvil', () => {
  let guardado;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    olvidaTodo();
    olvidaLasAccionesPendientes();
  });

  const datos = () => ({
    pendingInvitations: 2,
    pendingEnrollments: [{ competitionId: 'c-1', name: 'Liga', count: 3 }],
    pendingFriendRequests: 1,
    activeQuickMatches: [
      {
        id: 'q-1',
        name: 'Viernes',
        matchFormat: null,
        scoringFormat: 'STABLEFORD',
      },
    ],
    sobresPendientes: [
      {
        roundId: 'r-1',
        competitionId: 'c-1',
        competitionName: 'Liga',
        roundDate: '2026-11-15',
        sessionType: 'MORNING',
      },
    ],
    sesionesSinPartidos: [],
    plazasAsignadas: [],
  });

  it('A1: al abrir de cero vuelve lo que se enseñó, desde el móvil', () => {
    recuerdaLasAccionesPendientes(datos(), 'u-1');
    // Lo que se pierde al recargar la página: la memoria del módulo
    olvidaLasAccionesPendientes();

    expect(loQueSeEnseñoAntes('u-1')).toEqual(datos());
  });

  it('A2: lo de una cuenta no lo ve otra, ni en memoria ni en el móvil', () => {
    recuerdaLasAccionesPendientes(datos(), 'u-1');

    expect(loQueSeEnseñoAntes('u-2')).toBeNull();
    olvidaLasAccionesPendientes();
    expect(loQueSeEnseñoAntes('u-2')).toBeNull();
  });

  it('A3: al cerrar la sesión no queda nada', () => {
    recuerdaLasAccionesPendientes(datos(), 'u-1');

    olvidaLasAccionesPendientes();
    olvidaLoDeEstaCuenta();

    expect(loQueSeEnseñoAntes('u-1')).toBeNull();
  });

  it('A3b: el resto del panel guardado no se pierde al guardar la tarjeta', () => {
    recuerdaElPanel('u-1', { competiciones: [{ id: 'c-1', name: 'Liga' }] });

    recuerdaLasAccionesPendientes(datos(), 'u-1');

    expect(elUltimoPanel('u-1').competiciones).toHaveLength(1);
  });

  it.each([
    ['invitaciones que no son número', { pendingInvitations: '2' }],
    ['solicitudes que no son número', { pendingFriendRequests: {} }],
    ['una partida sin id', { activeQuickMatches: [{ name: 'x' }] }],
    [
      'una partida con nombre de otro tipo',
      { activeQuickMatches: [{ id: 'q', name: {} }] },
    ],
    [
      'un sobre con competición de otro tipo',
      {
        sobresPendientes: [
          { roundId: 'r', competitionId: 'c', competitionName: 5 },
        ],
      },
    ],
    [
      'una inscripción con cuenta de otro tipo',
      { pendingEnrollments: [{ competitionId: 'c', name: 'L', count: '3' }] },
    ],
    ['una plaza sin ronda', { plazasAsignadas: [{ competitionId: 'c' }] }],
    ['una lista que no es lista', { sesionesSinPartidos: 'x' }],
  ])('A4: lo guardado con %s se descarta', (_, malo) => {
    guardado.set(
      'rydercup-ultimo-panel',
      JSON.stringify({
        v: 1,
        usuarioId: 'u-1',
        pendientes: { ...datos(), ...malo },
      }),
    );

    const leido = loQueSeEnseñoAntes('u-1');
    const [clave] = Object.keys(malo);
    const limpio = {
      ...datos(),
      [clave]: Array.isArray(datos()[clave]) ? [] : 0,
    };
    expect(leido).toEqual(limpio);
  });

  it('A5: una partida que llega como entidad se guarda con sus valores', () => {
    class Partida {
      #id = 'q-9';
      get id() {
        return this.#id;
      }
      get name() {
        return 'Domingo';
      }
      get matchFormat() {
        return 'SINGLES';
      }
      get scoringFormat() {
        return null;
      }
    }

    recuerdaLasAccionesPendientes(
      { ...datos(), activeQuickMatches: [new Partida()] },
      'u-1',
    );
    olvidaLasAccionesPendientes();

    expect(loQueSeEnseñoAntes('u-1').activeQuickMatches).toEqual([
      {
        id: 'q-9',
        name: 'Domingo',
        matchFormat: 'SINGLES',
        scoringFormat: null,
      },
    ]);
  });

  it('A6: de cada elemento solo se guarda lo que se pinta', () => {
    recuerdaLasAccionesPendientes(
      {
        ...datos(),
        sobresPendientes: [{ ...datos().sobresPendientes[0], secreto: 'x' }],
      },
      'u-1',
    );

    expect(guardado.get('rydercup-ultimo-panel')).not.toMatch(/secreto/);
  });
});
