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
 *   D13 las partidas sembradas                  | llegan como entidades (con sus métodos)
 *   D14 otra cuenta sin panel guardado          | no se queda lo de la anterior
 *   D15 el servidor contesta con un error       | esa parte se borra también de lo guardado
 *   D16 ninguna partida guardada se puede rehacer | se espera (no «crea una partida»)
 *   D17 una respuesta buena que no se puede guardar | se pinta igual
 *
 *   FE #1152 — «no hay» también se recuerda (Agustín, 15 nov 2026)
 *   D18 la última vez no había próximos         | «¿Partido improvisado?» ya, sin espera
 *   D19 y ahora llega uno                       | el banner cambia a él
 *   D20 una respuesta entera sin ninguno        | se guarda que no hay
 *   D21 una respuesta con alguno                | se guarda que sí hay
 *   D22 sin red en los próximos                 | no se toca lo guardado
 *   D23 media lista vacía                       | no se guarda que no hay
 *   D24 «no hay» de otra cuenta                 | no se usa: espera
 *   D25 cambio de cuenta con la respuesta en vuelo | no se guarda para nadie
 *   D26 la última vez no había partidas recientes | «sin partidas» ya, sin espera
 *   D27 había y ahora vienen vacías             | se guarda la lista vacía
 *   D28 las competiciones caídas                | no se guarda que no hay
 *   D23b partidos vacíos y partidas sin red     | no se guarda que no hay
 *   D29 panel sin partidas recientes guardadas  | las partidas esperan, como hoy
 *   D30 «no hay próximos» de ayer               | espera («comprobando»), como antes
 *   D31 «no hay próximos» sin fecha             | espera, como antes
 *   D32 pintada la marca, con red               | se piden los próximos igual, en cada entrada
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
// Si la lista de próximos vino entera (todas las competiciones contestaron)
const completitud = { proximos: true, partidas: true };
// Cuántas veces se piden los próximos
const pedidos = { proximos: 0 };

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: {
    execute: () => peticiones.competiciones.promesa,
  },
  getPlayerStatsUseCase: { execute: () => peticiones.estadisticas.promesa },
  getRecentMatchesUseCase: { execute: () => peticiones.recientes.promesa },
  getUpcomingMatchesUseCase: {
    executeWithCompleteness: () => {
      pedidos.proximos += 1;
      return peticiones.proximos.promesa.then((matches) => ({
        matches,
        complete: completitud.proximos,
      }));
    },
  },
  getUpcomingTeeGroupsUseCase: {
    executeWithCompleteness: () =>
      peticiones.partidas.promesa.then((matches) => ({
        matches,
        complete: completitud.partidas,
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
      data-entidad={typeof matches?.[0]?.isFromTournament}
    />
  ),
}));
vi.doMock('../components/ui/FullScreenLoader', () => ({
  default: () => <div data-testid="espera" />,
}));

const { reiniciaLaCortina } = await import('../utils/cortinaDeArranque');
const { fechaLocal } = await import('../utils/fechaLocal');
const { olvidaQueElPanelSePinto } =
  await import('../utils/primeraCargaDelPanel');
const {
  recuerdaElPanel,
  elUltimoPanel,
  recuerdaLosPartidos,
  olvidaTodo,
  seSabeQueNoHayProximos,
} = await import('../services/loUltimoConocido');
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
    completitud.proximos = true;
    completitud.partidas = true;
    pedidos.proximos = 0;
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
    expect(leido.ultimasPartidas).toEqual([{ id: 'r-4' }]);
    expect(leido.estadisticas).toMatchObject({
      handicap: 17.5,
      playingAvg: 18.6,
    });
  });

  it('D13: las partidas sembradas llegan como entidades, con sus métodos', async () => {
    guardaElPanelDeUno();

    render(<Dashboard />);
    await asienta();

    expect(rastro('recientes', 'partidas')).toBe('r-1');
    expect(rastro('recientes', 'entidad')).toBe('function');
  });

  it('D14: otra cuenta sin panel guardado no ve lo de la anterior', async () => {
    guardaElPanelDeUno();
    const { rerender } = render(<Dashboard />);
    await asienta();
    expect(rastro('recientes', 'partidas')).toBe('r-1');

    sesion.user = dos;
    rerender(<Dashboard />);
    await asienta();

    expect(rastro('pendientes', 'competiciones')).toBe('');
    expect(rastro('recientes', 'partidas')).toBe('');
    expect(rastro('cifras', 'media')).toBe('');
  });

  it('D15: un error con respuesta borra esa parte de lo guardado', async () => {
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    await act(async () => {
      peticiones.competiciones.rechazar(conRespuesta(500));
      peticiones.recientes.rechazar(conRespuesta(404));
      peticiones.estadisticas.rechazar(conRespuesta(500));
    });
    await asienta();

    expect(elUltimoPanel('u-1')).toEqual({
      competiciones: null,
      ultimasPartidas: null,
      estadisticas: null,
    });
  });

  it('D15b: sin red no se borra nada de lo guardado', async () => {
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    await act(async () => {
      peticiones.competiciones.rechazar(sinRed());
      peticiones.recientes.rechazar(sinRed());
      peticiones.estadisticas.rechazar(sinRed());
    });
    await asienta();

    const leido = elUltimoPanel('u-1');
    expect(leido.competiciones).toHaveLength(2);
    expect(leido.ultimasPartidas).toHaveLength(1);
    expect(leido.estadisticas.playingAvg).toBe(18.6);
  });

  it('D16: si ninguna partida guardada se puede rehacer, las partidas esperan', async () => {
    guardaElPanelDeUno();
    // Una que pasa la lectura pero no se deja rehacer (compañeros que no son lista)
    const crudo = JSON.parse(localStorage.getItem('rydercup-ultimo-panel'));
    crudo.ultimasPartidas = [{ id: 'r-1', partners: 5 }];
    localStorage.setItem('rydercup-ultimo-panel', JSON.stringify(crudo));

    render(<Dashboard />);
    await asienta();

    expect(espera()).toBeNull();
    expect(rastro('recientes', 'cargando')).toBe('true');
  });

  it('D17: una respuesta buena que no se puede guardar se pinta igual', async () => {
    render(<Dashboard />);
    const rara = (
      await import('../domain/entities/RecentMatch')
    ).default.fromPersistence({ id: 'r-7', date: 'no-es-fecha' });
    await act(async () => {
      peticiones.competiciones.resolver([competicion(3)]);
      peticiones.recientes.resolver([rara]);
      peticiones.estadisticas.resolver({ playingAvg: 18.6 });
      peticiones.proximos.resolver([]);
      peticiones.partidas.resolver([]);
    });
    await asienta();

    expect(rastro('recientes', 'partidas')).toBe('r-7');
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
  // Lo que guarda una respuesta de los próximos, entera y sin ninguno
  const guardaQueNoHayProximos = () => {
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
      sinProximos: true,
    });
    recuerdaLosPartidos([]);
  };
  // Las competiciones primero: los próximos se piden con ellas
  const contestanLasCompeticiones = async () => {
    await act(async () => {
      peticiones.competiciones.resolver([competicion(1)]);
    });
    await asienta();
  };

  it('D18: si la última vez no había próximos, se pinta ya sin espera', async () => {
    // Given la última respuesta dijo que no hay próximos
    guardaQueNoHayProximos();

    // When se entra al panel
    render(<Dashboard />);
    await asienta();

    // Then el banner no espera: ofrece la partida rápida
    expect(espera()).toBeNull();
    expect(rastro('proximo', 'cargando')).toBe('false');
    expect(rastro('proximo', 'partido')).toBe('');
  });

  it('D19: si ahora llega un próximo, el banner cambia a él', async () => {
    // Given se pintó «no hay próximos»
    guardaQueNoHayProximos();
    render(<Dashboard />);
    await asienta();

    // When la actualización trae uno
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.resolver([partido(7)]);
      peticiones.partidas.resolver([]);
    });
    await asienta();

    // Then se enseña, y ya no se recuerda que no hay
    expect(rastro('proximo', 'partido')).toBe('m-7');
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
  });

  it('D20: una respuesta entera sin próximos guarda que no hay', async () => {
    // Given nada guardado
    render(<Dashboard />);

    // When el servidor contesta entero y sin ninguno
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.resolver([]);
      peticiones.partidas.resolver([]);
    });
    await asienta();

    // Then se recuerda para la próxima vez
    expect(seSabeQueNoHayProximos('u-1')).toBe(true);
  });

  it('D21: una respuesta con alguno quita la marca', async () => {
    // Given se recordaba que no había
    guardaQueNoHayProximos();
    render(<Dashboard />);
    await asienta();

    // When llega una partida de stroke play
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.resolver([]);
      peticiones.partidas.resolver([
        { id: 'tg-1', roundDate: MANANA, esPartidaDeFranja: true },
      ]);
    });
    await asienta();

    // Then ya no se recuerda que no hay
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
  });

  it('D22: sin red en los próximos no se toca lo guardado', async () => {
    // Given se recordaba que no había
    guardaQueNoHayProximos();
    render(<Dashboard />);
    await asienta();

    // When los próximos se quedan sin red
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.rechazar(sinRed());
      peticiones.partidas.rechazar(sinRed());
    });
    await asienta();

    // Then la marca sigue
    expect(seSabeQueNoHayProximos('u-1')).toBe(true);
  });

  it('D22b: sin red no se pone la marca', async () => {
    // Given nada recordado de los próximos
    render(<Dashboard />);

    // When los próximos se quedan sin red
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.rechazar(sinRed());
      peticiones.partidas.rechazar(sinRed());
    });
    await asienta();

    // Then no se sabe que no haya
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
  });

  it('D23: media lista vacía no guarda que no hay', async () => {
    // Given una competición que no contestó
    completitud.proximos = false;
    render(<Dashboard />);

    // When llega la lista a medias y sin ninguno
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.resolver([]);
      peticiones.partidas.resolver([]);
    });
    await asienta();

    // Then no se afirma que no haya
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
  });

  it('D24: «no hay próximos» de otra cuenta no se usa', async () => {
    // Given la marca de otra cuenta, y un panel de esta sin ella
    recuerdaElPanel('u-2', { sinProximos: true });
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [partida(1)],
    });

    // When entra esta cuenta
    render(<Dashboard />);
    await asienta();

    // Then el banner espera, como hoy
    expect(rastro('proximo', 'cargando')).toBe('true');
  });

  it('D25: una respuesta de la cuenta anterior no guarda la marca', async () => {
    // Given la primera cuenta con los próximos en vuelo
    const { rerender } = render(<Dashboard />);
    await contestanLasCompeticiones();
    const enVuelo = {
      proximos: peticiones.proximos,
      partidas: peticiones.partidas,
    };
    reiniciaLasPeticiones();

    // When cambia la cuenta y contesta la de la anterior
    sesion.user = dos;
    rerender(<Dashboard />);
    await asienta();
    await act(async () => {
      enVuelo.proximos.resolver([]);
      enVuelo.partidas.resolver([]);
    });
    await asienta();

    // Then no se guarda para ninguna
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
    expect(seSabeQueNoHayProximos('u-2')).toBe(false);
  });

  it('D26: si la última vez no había partidas recientes, se pinta ya', async () => {
    // Given el servidor dijo «ninguna» la última vez
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [],
    });

    // When se entra al panel
    render(<Dashboard />);
    await asienta();

    // Then las partidas no esperan
    expect(espera()).toBeNull();
    expect(rastro('recientes', 'cargando')).toBe('false');
    expect(rastro('recientes', 'partidas')).toBe('');
  });

  it('D26b: si la última vez no había ninguna y ahora llega una, se enseña', async () => {
    // Given se pintó «ninguna»
    recuerdaElPanel('u-1', {
      competiciones: [competicion(1)],
      ultimasPartidas: [],
    });
    render(<Dashboard />);
    await asienta();

    // When llega una
    await act(async () => {
      peticiones.recientes.resolver([partida(3)]);
    });
    await asienta();

    // Then se enseña
    expect(rastro('recientes', 'partidas')).toBe('r-3');
  });

  it('D27: si ahora no hay ninguna, se guarda la lista vacía', async () => {
    // Given había partidas
    guardaElPanelDeUno();
    render(<Dashboard />);
    await asienta();

    // When el servidor dice «ninguna»
    await act(async () => {
      peticiones.recientes.resolver([]);
    });
    await asienta();

    // Then se guarda vacía (y se pintará así la próxima vez)
    expect(elUltimoPanel('u-1').ultimasPartidas).toEqual([]);
    expect(rastro('recientes', 'partidas')).toBe('');
  });

  it('D28: con las competiciones caídas no se guarda que no hay', async () => {
    // Given nada recordado
    render(<Dashboard />);

    // When las competiciones fallan con respuesta
    await act(async () => {
      peticiones.competiciones.rechazar(conRespuesta(500));
    });
    await asienta();
    await act(async () => {
      peticiones.proximos.resolver([]);
      peticiones.partidas.resolver([]);
    });
    await asienta();

    // Then no se afirma que no haya
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
  });
  it('D23b: con los partidos vacíos y las partidas sin red no se guarda que no hay', async () => {
    // Given nada recordado
    render(<Dashboard />);

    // When los partidos contestan vacíos y las partidas se quedan sin red
    await contestanLasCompeticiones();
    await act(async () => {
      peticiones.proximos.resolver([]);
      peticiones.partidas.rechazar(sinRed());
    });
    await asienta();

    // Then no se afirma que no haya: puede haber una partida
    expect(seSabeQueNoHayProximos('u-1')).toBe(false);
  });

  it('D29: con panel pero sin partidas recientes guardadas, esperan', async () => {
    // Given un panel sin la parte de las partidas (la borró un error)
    recuerdaElPanel('u-1', { competiciones: [competicion(1)] });

    // When se entra al panel
    render(<Dashboard />);
    await asienta();

    // Then las partidas esperan: no se sabe si hay
    expect(rastro('recientes', 'cargando')).toBe('true');
  });
  // La marca, escrita a mano con la fecha que se quiera
  const marcaDel = (extra) => {
    guardaQueNoHayProximos();
    const crudo = JSON.parse(localStorage.getItem('rydercup-ultimo-panel'));
    delete crudo.sinProximosEl;
    localStorage.setItem(
      'rydercup-ultimo-panel',
      JSON.stringify({ ...crudo, ...extra }),
    );
  };

  it('D30: «no hay próximos» de ayer no vale: el banner espera', async () => {
    // Given la marca se guardó ayer
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    marcaDel({ sinProximosEl: fechaLocal(ayer) });

    // When se entra al panel
    render(<Dashboard />);
    await asienta();

    // Then se comprueba, como antes
    expect(espera()).toBeNull();
    expect(rastro('proximo', 'cargando')).toBe('true');
  });

  it('D31: «no hay próximos» sin fecha (versión anterior) no vale', async () => {
    // Given la marca sin fecha
    marcaDel({});

    // When se entra al panel
    render(<Dashboard />);
    await asienta();

    // Then se comprueba
    expect(rastro('proximo', 'cargando')).toBe('true');
  });

  it('D32: con la marca pintada, cada entrada pide los próximos', async () => {
    // Given la marca de hoy
    guardaQueNoHayProximos();

    // When se entra al panel dos veces, con red
    const primera = render(<Dashboard />);
    await contestanLasCompeticiones();
    expect(rastro('proximo', 'cargando')).toBe('false');
    primera.unmount();
    reiniciaLasPeticiones();
    render(<Dashboard />);
    await contestanLasCompeticiones();

    // Then las dos veces se preguntan
    expect(pedidos.proximos).toBe(2);
  });
});
