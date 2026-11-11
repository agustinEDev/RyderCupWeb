import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  guardaLaAnotacionEnCurso,
  leeLaAnotacionEnCurso,
  estadoDeEstaAnotacion,
  olvidaLaAnotacionEnCurso,
} from './anotacionEnCurso';

/**
 * La anotación en curso, para volver a ella si iOS cierra la app (11 nov 2026).
 *
 *   A1 se guarda la cuenta, la ruta (con su ?competition=) y la hora
 *   A2 también la pestaña, el hoyo y si el mapa está abierto
 *   B1 la misma cuenta antes de 6 h: la ruta, la pestaña, el hoyo, el mapa y los minutos
 *   B2 pasadas 6 h: nada, y se borra
 *   B3 otra cuenta (o ninguna): nada, y se borra
 *   B9 solo las tres rutas de anotación con un id válido; lo demás no se guarda, y si
 *      se encuentra guardado (corrupto o manipulado), no vale y se borra
 *   Carga normal: el estado de ESTA anotación (pestaña, hoyo, mapa) si es la guardada
 *   C1 olvidarla la borra
 */
const ID = '0b5a6c1e-2d3f-4a5b-8c7d-9e0f1a2b3c4d';
const OTRO = '1c6b7d2f-3e4a-4b6c-9d8e-0f1a2b3c4d5e';
const CUENTA = '7f3e2d1c-0b9a-4876-a543-210fedcba987';
const CLAVE = 'anotacion_en_curso';
const T0 = Date.UTC(2026, 10, 11, 9, 0, 0);
// Escritas aquí, no importadas: el test fija las 6 horas, no las copia del código
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

const memoria = () => {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
  };
};

const guarda = (extra = {}, ahora = T0) =>
  guardaLaAnotacionEnCurso(
    {
      cuenta: CUENTA,
      pathname: `/quick-matches/${ID}/scoring`,
      search: '',
      pestana: 'input',
      hoyo: 12,
      mapa: false,
      ...extra,
    },
    ahora,
  );

describe('la anotación en curso', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoria()));
  afterEach(() => vi.unstubAllGlobals());

  it('A1-A2: guarda cuenta, ruta, pestaña, hoyo, mapa y hora', () => {
    guarda({ pestana: 'scorecard', mapa: true });

    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    expect(guardado).toMatchObject({
      cuenta: CUENTA,
      ruta: `/quick-matches/${ID}/scoring`,
      pestana: 'scorecard',
      hoyo: 12,
      mapa: true,
      hora: T0,
    });
  });

  it('A1: la anotación de grupo guarda su ?competition=', () => {
    guarda({ pathname: `/player/groups/${ID}/scoring`, search: `?competition=${OTRO}` });

    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0)?.ruta).toBe(`/player/groups/${ID}/scoring?competition=${OTRO}`);
  });

  it('B1: la misma cuenta antes de 6 h la recupera con los minutos que pasó cerrada', () => {
    guarda({ pathname: `/player/matches/${ID}/scoring`, pestana: 'leaderboard', hoyo: 7, mapa: true });

    const vuelta = leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0 + 25 * 60 * 1000);

    expect(vuelta).toEqual({
      ruta: `/player/matches/${ID}/scoring`,
      tipo: 'partido',
      pestana: 'leaderboard',
      hoyo: 7,
      mapa: true,
      minutos: 25,
    });
  });

  it('B1: justo antes de las 6 h todavía vale', () => {
    guarda();

    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0 + SEIS_HORAS_MS - 1)).not.toBeNull();
  });

  it('B2: a las 6 h ya no vale y se borra', () => {
    guarda();

    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0 + SEIS_HORAS_MS)).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('B2: una hora del futuro (reloj cambiado) no vale y se borra', () => {
    guarda({}, T0 + 60 * 60 * 1000);

    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0)).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('B3: con otra cuenta no vale y se borra', () => {
    guarda();

    expect(leeLaAnotacionEnCurso({ cuenta: OTRO }, T0)).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('B3: sin saber la cuenta todavía (vuelta de Google) no vale, pero no se borra', () => {
    guarda();

    expect(leeLaAnotacionEnCurso({ cuenta: null }, T0)).toBeNull();
    expect(localStorage.getItem(CLAVE)).not.toBeNull();
  });

  it.each([
    ['el panel', '/dashboard', ''],
    ['la ficha de una competición', `/competitions/${ID}`, ''],
    ['la vista compartida de una partida rápida', `/quick-matches/${ID}/shared`, ''],
    ['un id que no es un uuid', '/quick-matches/../../admin/scoring', ''],
    ['una ruta con algo detrás', `/quick-matches/${ID}/scoring/extra`, ''],
    ['otra búsqueda en la partida rápida', `/quick-matches/${ID}/scoring`, '?competition=x'],
    ['una competición que no es un uuid', `/player/groups/${ID}/scoring`, '?competition=javascript:alert(1)'],
    ['otra clave en la de grupo', `/player/groups/${ID}/scoring`, `?next=${OTRO}`],
  ])('B9: %s no se guarda', (_caso, pathname, search) => {
    guarda({ pathname, search });

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it.each([
    ['una pestaña desconocida', { pestana: 'cualquiera' }],
    ['un hoyo imposible', { hoyo: 0 }],
    ['un mapa que no es sí o no', { mapa: 'si' }],
  ])('B9: con %s no se guarda', (_caso, cambio) => {
    guarda(cambio);

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('B9: sin cuenta no se guarda', () => {
    guarda({ cuenta: null });

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it.each([
    ['una ruta que no es de anotación', { ruta: '/admin' }],
    ['una dirección de fuera', { ruta: `https://ejemplo.com/quick-matches/${ID}/scoring` }],
    ['una ruta que empieza por //', { ruta: `//ejemplo.com/quick-matches/${ID}/scoring` }],
    ['una pestaña desconocida', { pestana: 'cualquiera' }],
    ['un hoyo imposible', { hoyo: 99 }],
    ['un hoyo que no es número', { hoyo: '7' }],
    ['un mapa que no es sí o no', { mapa: 'true' }],
    ['una hora que no es número', { hora: 'ayer' }],
  ])('B9: guardado a mano con %s no vale y se borra', (_caso, cambio) => {
    guarda();
    const guardado = { ...JSON.parse(localStorage.getItem(CLAVE)), ...cambio };
    localStorage.setItem(CLAVE, JSON.stringify(guardado));

    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0)).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('B9: algo que no es JSON no vale y se borra', () => {
    localStorage.setItem(CLAVE, '{no es json');

    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0)).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('carga normal: el estado de ESTA anotación, sin borrar nada', () => {
    guarda({ pestana: 'classification', hoyo: 9, mapa: true });

    expect(
      estadoDeEstaAnotacion({ cuenta: CUENTA, pathname: `/quick-matches/${ID}/scoring`, search: '' }, T0 + 1000),
    ).toEqual({ pestana: 'classification', hoyo: 9, mapa: true });
    expect(localStorage.getItem(CLAVE)).not.toBeNull();
  });

  it('carga normal: otra anotación no recibe el estado de la guardada', () => {
    guarda();

    expect(estadoDeEstaAnotacion({ cuenta: CUENTA, pathname: `/quick-matches/${OTRO}/scoring`, search: '' }, T0)).toBeNull();
  });

  it('carga normal: pasadas 6 h o con otra cuenta, nada', () => {
    guarda();
    const aqui = { pathname: `/quick-matches/${ID}/scoring`, search: '' };

    expect(estadoDeEstaAnotacion({ cuenta: OTRO, ...aqui }, T0)).toBeNull();
    expect(estadoDeEstaAnotacion({ cuenta: CUENTA, ...aqui }, T0 + SEIS_HORAS_MS)).toBeNull();
  });

  it('C1: olvidarla la borra', () => {
    guarda();

    olvidaLaAnotacionEnCurso();

    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('sin almacenamiento disponible no rompe nada', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    });

    expect(() => guarda()).not.toThrow();
    expect(leeLaAnotacionEnCurso({ cuenta: CUENTA }, T0)).toBeNull();
    expect(() => olvidaLaAnotacionEnCurso()).not.toThrow();
  });
});

/**
 * La lista cerrada copia las rutas del router: si una cambia en App.jsx y no aquí, la
 * anotación dejaría de guardarse sin que nada fallara. Este test lo vigila.
 */
describe('las rutas de la lista cerrada existen en el router', () => {
  it.each([
    '/player/matches/:matchId/scoring',
    '/player/groups/:groupId/scoring',
    '/quick-matches/:quickMatchId/scoring',
  ])('%s', async (ruta) => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const app = readFileSync(resolve(globalThis.process.cwd(), 'src/App.jsx'), 'utf8');

    expect(app).toContain(`path="${ruta}"`);
  });
});
