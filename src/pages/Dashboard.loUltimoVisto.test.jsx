import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';

/**
 * El panel sin «Cargando» al entrar (Agustín, 14 nov 2026).
 *
 * Si ya se vio en este móvil con esta cuenta, se pinta con lo de la última vez
 * en cuanto el servidor confirma la sesión, y se actualiza por detrás sin avisos.
 * Se guarda en el móvil también el hándicap y las cifras que se veían.
 *
 *   caso                                        | qué pasa
 *   --------------------------------------------|------------------------------------
 *   D1 hay guardado y la sesión está confirmada | se pinta ya, con lo guardado
 *   D2 llegan los datos nuevos                  | sustituyen a lo guardado
 *   D3 la sesión aún no está confirmada         | se espera; al confirmarse, se pinta
 *   D4 no hay nada guardado                     | se espera, como hoy
 *   D5 lo guardado es de otra cuenta            | no se usa
 *   D6 la actualización se queda sin red        | se queda lo que había
 *   D7 el servidor contesta con un error        | como hoy: no se tapa
 *   D7b un fallo del código (TypeError sin marca) | como hoy: no se toma por falta de red
 *   D8 llegan datos buenos                      | se guardan, con el hándicap y las cifras
 *   D9 cambia la cuenta con una respuesta en vuelo | no se guarda para la nueva
 *   D10 hay panel pero ningún próximo guardado  | el banner espera (no «crea una partida»)
 *   D11 los textos aún no han llegado           | se espera
 *   D12 sin red, con el usuario del móvil       | se pinta con lo guardado
 */
const enEspera = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((cumple, falla) => {
    resolver = cumple;
    rechazar = falla;
  });
  promesa.catch(() => {});
  return { promesa, resolver, rechazar };
};

const peticiones = {};
const NOMBRES = [
  'competiciones',
  'estadisticas',
  'recientes',
  'proximos',
  'partidas',
];
const reiniciaLasPeticiones = () => {
  for (const nombre of NOMBRES) peticiones[nombre] = enEspera();
};
reiniciaLasPeticiones();

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: {
    execute: () => peticiones.competiciones.promesa,
  },
  getPlayerStatsUseCase: { execute: () => peticiones.estadisticas.promesa },
  getRecentMatchesUseCase: { execute: () => peticiones.recientes.promesa },
  getUpcomingMatchesUseCase: {
    executeWithCompleteness: () =>
      peticiones.proximos.promesa.then((matches) => ({
        matches,
        complete: true,
      })),
  },
  getUpcomingTeeGroupsUseCase: {
    executeWithCompleteness: () =>
      peticiones.partidas.promesa.then((matches) => ({
        matches,
        complete: true,
      })),
  },
  getScoringViewUseCase: { execute: () => new Promise(() => {}) },
  getTeeGroupScoringViewUseCase: { execute: () => new Promise(() => {}) },
  updateUserProfileUseCase: { execute: () => Promise.resolve() },
}));

const uno = { id: 'u-1', first_name: 'Agustin', email: 'a@b.c' };
const dos = { id: 'u-2', first_name: 'Ana', email: 'c@d.e' };

const sesion = {
  user: uno,
  loading: false,
  refetch: () => {},
  sinConfirmar: false,
};
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));

const textos = { listos: true };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave) => clave,
    i18n: { language: 'es' },
    ready: textos.listos,
  }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/dashboard' }),
  Navigate: ({ to }) => <div data-testid="redirigido" data-a={to} />,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children }) => <div>{children}</div>,
    },
  ),
}));

vi.mock('../hooks/useEntryMotion', () => ({
  useEntryMotion: () => ({ animateEntry: false }),
}));

for (const ruta of [
  '../components/layout/HeaderAuth',
  '../components/ui/Avatar',
  '../components/profile/HandicapRequestModal',
  '../components/EmailVerificationBanner',
  '../components/dashboard/GolpesSinEnviar',
  '../components/quick_match/CreateQuickMatchModal',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

// Las tarjetas dejan rastro de lo que reciben
const ids = (lista) => (lista ?? []).map((x) => x.id).join(',');
vi.doMock('../components/dashboard/PendingActionsCard', () => ({
  default: ({ competitions }) => (
    <div data-testid="pendientes" data-competiciones={ids(competitions)} />
  ),
}));
vi.doMock('../components/dashboard/PlayerStatsCards', () => ({
  default: ({ isLoading, fallbackTournaments, stats }) => (
    <div
      data-testid="cifras"
      data-cargando={String(isLoading)}
      data-torneos={String(fallbackTournaments)}
      data-media={String(stats?.playingAvg ?? '')}
    />
  ),
}));
vi.doMock('../components/dashboard/NextMatchBanner', () => ({
  default: ({ match, isLoading, desdeMemoria }) => (
    <div
      data-testid="proximo"
      data-partido={match?.id ?? ''}
      data-cargando={String(isLoading)}
      data-memoria={String(desdeMemoria)}
    />
  ),
}));
vi.doMock('../components/dashboard/RecentMatches', () => ({
  default: ({ matches, isLoading }) => (
    <div
      data-testid="recientes"
      data-partidas={ids(matches)}
      data-cargando={String(isLoading)}
    />
  ),
}));
vi.doMock('../components/ui/FullScreenLoader', () => ({
  default: () => <div data-testid="espera" />,
}));

const { reiniciaLaCortina } = await import('../utils/cortinaDeArranque');
const { olvidaQueElPanelSePinto } =
  await import('../utils/primeraCargaDelPanel');
const { recuerdaElPanel, elUltimoPanel, recuerdaLosPartidos, olvidaTodo } =
  await import('../services/loUltimoConocido');
const Dashboard = (await import('./Dashboard')).default;

const almacenLimpio = () => {
  const guardado = {};
  vi.stubGlobal('localStorage', {
    getItem: (clave) => guardado[clave] ?? null,
    setItem: (clave, valor) => {
      guardado[clave] = String(valor);
    },
    removeItem: (clave) => {
      delete guardado[clave];
    },
    clear: () => {
      for (const clave of Object.keys(guardado)) delete guardado[clave];
    },
  });
};

const asienta = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
};

const espera = () => screen.queryByTestId('espera');
const rastro = (id, dato) =>
  screen.getByTestId(id).getAttribute(`data-${dato}`);

const MANANA = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

const competicion = (n, status = 'ACTIVE') => ({
  id: `c-${n}`,
  name: `Liga ${n}`,
  status,
  golf_courses: [{ id: 'g-1' }],
});
const partida = (n) => ({ id: `r-${n}`, points: 30 });
const partido = (n) => ({ id: `m-${n}`, roundDate: MANANA });

const guardaElPanelDeUno = () => {
  recuerdaElPanel('u-1', {
    competiciones: [competicion(1), competicion(2)],
    ultimasPartidas: [partida(1)],
    estadisticas: { handicap: 18, playingAvg: 18.6, tournamentsTotal: 2 },
  });
  recuerdaLosPartidos([partido(1)]);
};

// Como lo marca `api.js`: sin la marca, un TypeError es un fallo del código
const sinRed = () =>
  Object.assign(new TypeError('Failed to fetch'), { sinConexion: true });
const conRespuesta = (status) =>
  Object.assign(new Error(`HTTP ${status}`), { status });

describe('el panel con lo último visto', () => {
  beforeEach(() => {
    window.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    almacenLimpio();
    olvidaTodo();
    olvidaQueElPanelSePinto();
    reiniciaLaCortina();
    reiniciaLasPeticiones();
    sesion.user = uno;
    sesion.loading = false;
    sesion.sinConfirmar = false;
    textos.listos = true;
    document.body.innerHTML = '';
  });

  it('D1: con lo guardado y la sesión confirmada, se pinta ya', async () => {
    guardaElPanelDeUno();

    render(<Dashboard />);
    await asienta();

    expect(espera()).toBeNull();
    expect(rastro('pendientes', 'competiciones')).toBe('c-1,c-2');
    expect(rastro('recientes', 'partidas')).toBe('r-1');
    expect(rastro('recientes', 'cargando')).toBe('false');
    expect(rastro('proximo', 'partido')).toBe('m-1');
    expect(rastro('proximo', 'cargando')).toBe('false');
    // Por detrás no se avisa: no es «de memoria», es que se está actualizando
    expect(rastro('proximo', 'memoria')).toBe('false');
    expect(rastro('cifras', 'torneos')).toBe('2');
    // Las cifras de la última vez, también: no esperan a su respuesta
    expect(rastro('cifras', 'cargando')).toBe('false');
    expect(rastro('cifras', 'media')).toBe('18.6');
  });

  it('D10: sin próximos guardados el banner espera, no ofrece crear una partida', async () => {
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
    });

    render(<Dashboard />);
    await asienta();

    expect(espera()).toBeNull();
    expect(rastro('proximo', 'cargando')).toBe('true');
  });

  it('D2: lo que llega sustituye a lo guardado', async () => {
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    await act(async () => {
      peticiones.competiciones.resolver([competicion(3)]);
      peticiones.recientes.resolver([partida(4)]);
      peticiones.estadisticas.resolver({ playingAvg: 17.9 });
    });
    await asienta();
    await act(async () => {
      peticiones.proximos.resolver([{ id: 'm-5', roundDate: MANANA }]);
      peticiones.partidas.resolver([]);
    });
    await asienta();

    expect(rastro('pendientes', 'competiciones')).toBe('c-3');
    expect(rastro('recientes', 'partidas')).toBe('r-4');
    expect(rastro('proximo', 'partido')).toBe('m-5');
    expect(rastro('cifras', 'media')).toBe('17.9');
    expect(rastro('cifras', 'cargando')).toBe('false');
    expect(espera()).toBeNull();
  });

  it('D3: con la sesión sin confirmar se espera, y al confirmarse se pinta', async () => {
    guardaElPanelDeUno();
    sesion.user = null;
    sesion.loading = true;
    const { rerender } = render(<Dashboard />);
    await asienta();

    expect(espera()).not.toBeNull();

    sesion.user = uno;
    sesion.loading = false;
    rerender(<Dashboard />);
    await asienta();

    expect(espera()).toBeNull();
    expect(rastro('recientes', 'partidas')).toBe('r-1');
  });

  it('D4: sin nada guardado se espera, como hoy', async () => {
    render(<Dashboard />);
    await asienta();

    expect(espera()).not.toBeNull();
  });

  it('D5: lo guardado de otra cuenta no se usa', async () => {
    recuerdaElPanel('u-2', {
      competiciones: [competicion(9)],
      ultimasPartidas: [partida(9)],
    });

    render(<Dashboard />);
    await asienta();

    expect(espera()).not.toBeNull();
  });

  it('D6: sin red al actualizar, se queda lo que había', async () => {
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    await act(async () => {
      peticiones.competiciones.rechazar(sinRed());
      peticiones.recientes.rechazar(sinRed());
      peticiones.estadisticas.rechazar(sinRed());
    });
    await asienta();

    expect(rastro('pendientes', 'competiciones')).toBe('c-1,c-2');
    expect(rastro('recientes', 'partidas')).toBe('r-1');
    expect(rastro('cifras', 'torneos')).toBe('2');
    expect(rastro('cifras', 'media')).toBe('18.6');
  });

  it('D7: un error con respuesta del servidor no se tapa con lo guardado', async () => {
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    await act(async () => {
      peticiones.competiciones.rechazar(conRespuesta(500));
      peticiones.recientes.rechazar(conRespuesta(500));
      peticiones.estadisticas.rechazar(conRespuesta(500));
    });
    await asienta();

    expect(rastro('pendientes', 'competiciones')).toBe('');
    expect(rastro('recientes', 'partidas')).toBe('');
    expect(rastro('cifras', 'media')).toBe('');
  });

  it('D7b: un fallo del código no se toma por falta de red', async () => {
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    await act(async () => {
      peticiones.competiciones.rechazar(new TypeError('x is undefined'));
      peticiones.recientes.rechazar(new TypeError('x is undefined'));
      peticiones.estadisticas.rechazar(new TypeError('x is undefined'));
    });
    await asienta();

    expect(rastro('pendientes', 'competiciones')).toBe('');
    expect(rastro('recientes', 'partidas')).toBe('');
    expect(rastro('cifras', 'media')).toBe('');
  });

  it('D8: lo que llega bien se guarda, con el hándicap y las cifras', async () => {
    render(<Dashboard />);
    await act(async () => {
      peticiones.competiciones.resolver([competicion(3)]);
      peticiones.recientes.resolver([partida(4)]);
      peticiones.estadisticas.resolver({ handicap: 17.5, playingAvg: 18.6 });
    });
    await asienta();

    const leido = elUltimoPanel('u-1');
    expect(leido.competiciones).toEqual([
      { id: 'c-3', name: 'Liga 3', status: 'ACTIVE' },
    ]);
    expect(leido.ultimasPartidas).toEqual([partida(4)]);
    expect(leido.estadisticas).toMatchObject({
      handicap: 17.5,
      playingAvg: 18.6,
    });
  });

  it('D11: sin los textos todavía, se espera aunque haya guardado', async () => {
    guardaElPanelDeUno();
    textos.listos = false;

    render(<Dashboard />);
    await asienta();

    expect(espera()).not.toBeNull();
  });

  it('D12: sin red, con el usuario del móvil, se pinta con lo guardado', async () => {
    guardaElPanelDeUno();
    sesion.sinConfirmar = true;

    render(<Dashboard />);
    await asienta();

    expect(espera()).toBeNull();
    expect(rastro('recientes', 'partidas')).toBe('r-1');
    expect(rastro('cifras', 'media')).toBe('18.6');
  });

  it('D9: una respuesta de la cuenta anterior no se guarda para la nueva', async () => {
    const { rerender } = render(<Dashboard />);
    await asienta();
    const deLaPrimera = peticiones;
    const enVuelo = {
      competiciones: deLaPrimera.competiciones,
      recientes: deLaPrimera.recientes,
    };
    reiniciaLasPeticiones();

    sesion.user = dos;
    rerender(<Dashboard />);
    await asienta();
    await act(async () => {
      enVuelo.competiciones.resolver([competicion(1)]);
      enVuelo.recientes.resolver([partida(1)]);
    });
    await asienta();

    expect(elUltimoPanel('u-2')).toBeNull();
    expect(elUltimoPanel('u-1')).toBeNull();
  });
});
