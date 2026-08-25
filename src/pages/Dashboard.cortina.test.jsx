import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

/**
 * El aviso del panel a la cortina del arranque (FE #485).
 *
 * Este panel pide CUATRO cosas —competiciones, estadisticas, partidos recientes
 * y proximos— y se daba por cargado con DOS. Las otras dos aterrizaban despues
 * y encendian su bloque cada una por su lado: esos eran los dos parpadeos que se
 * veian al abrir la aplicacion instalada en el iPhone.
 *
 * Lo que se prueba es exactamente eso: que con dos resueltas la cortina sigue
 * puesta. Volver al criterio de antes deja estos tests en rojo.
 */
const enEspera = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((cumple, falla) => { resolver = cumple; rechazar = falla; });
  // Sin esto, la promesa que se rechaza cuenta como rechazo no atendido hasta
  // que el efecto del panel llega a mirarla
  promesa.catch(() => {});
  return { promesa, resolver, rechazar };
};

const peticiones = {};

const reiniciaLasPeticiones = () => {
  for (const nombre of ['competiciones', 'estadisticas', 'recientes', 'proximos']) {
    peticiones[nombre] = enEspera();
  }
};

reiniciaLasPeticiones();

const veces = { competiciones: 0, estadisticas: 0, recientes: 0, proximos: 0 };

const pide = (nombre) => {
  veces[nombre] += 1;
  return peticiones[nombre].promesa;
};

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => pide('competiciones') },
  getPlayerStatsUseCase: { execute: () => pide('estadisticas') },
  getRecentMatchesUseCase: { execute: () => pide('recientes') },
  getUpcomingMatchesUseCase: { execute: () => pide('proximos') },
}));

// El usuario, la funcion y el objeto entero son CONSTANTES a proposito: los
// cuatro efectos del panel dependen de `user`, y un objeto nuevo en cada render
// los relanza sin parar
const usuario = { id: 'u-1', first_name: 'Agustin', email: 'a@b.c' };

const sesion = {
  user: usuario,
  loading: false,
  refetch: () => {},
};

vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));

// `ready` dice si el trozo de i18n de esta pantalla ya ha llegado: sus textos
// se cargan en diferido y cuentan como carga
const textos = { listos: true };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' }, ready: textos.listos }),
}));

vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));

// Descarta las props a proposito: aqui solo se mira si la capa del arranque
// sigue puesta, no lo que pinta el panel
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => ({ children }) => <div>{children}</div>,
  }),
}));

vi.mock('../hooks/useEntryMotion', () => ({ useEntryMotion: () => ({ animateEntry: false }) }));

for (const ruta of [
  '../components/layout/HeaderAuth',
  '../components/ui/Avatar',
  '../components/profile/HandicapRequestModal',
  '../components/EmailVerificationBanner',
  '../components/dashboard/PendingActionsCard',
  '../components/dashboard/PlayerStatsCards',
  '../components/dashboard/NextMatchBanner',
  '../components/dashboard/RecentMatches',
  '../components/quick_match/CreateQuickMatchModal',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

// Este si deja rastro: lo que se mira abajo es si el panel esta esperando
vi.doMock('../components/ui/FullScreenLoader', () => ({
  default: () => <div data-testid="espera" />,
}));

const { esperaElAviso, reiniciaLaCortina } = await import('../utils/cortinaDeArranque');
const { ESPERA_MAXIMA_MS } = await import('./Dashboard');
const Dashboard = (await import('./Dashboard')).default;

const sigueLaCortina = () => Boolean(document.getElementById('arranque'));
// jsdom no trae `localStorage` con el origen que usa vitest aqui, y el panel lo
// lee al montar. Mismo apaño que el resto de la suite
const almacenLimpio = () => {
  const guardado = {};
  globalThis.localStorage = {
    getItem: (clave) => guardado[clave] ?? null,
    setItem: (clave, valor) => { guardado[clave] = String(valor); },
    removeItem: (clave) => { delete guardado[clave]; },
    clear: () => { for (const clave of Object.keys(guardado)) delete guardado[clave]; },
  };
};

const estaEsperando = () => Boolean(document.querySelector('[data-testid="espera"]'));

// Deja que las promesas ya resueltas terminen de propagarse por los efectos
const asienta = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

/**
 * Y lo mismo sin cortina delante: al entrar desde el formulario o al navegar
 * aqui dentro de la aplicacion, el panel no puede montarse a trozos. Antes le
 * bastaban dos de sus cuatro peticiones para pintarse, y las otras dos
 * encendian su bloque despues.
 */
describe('el panel no se pinta a medias', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    textos.listos = true;
    sesion.user = usuario;
    sesion.loading = false;
    almacenLimpio();
    reiniciaLaCortina();
    reiniciaLasPeticiones();
    document.body.innerHTML = '';
  });

  it('con las DOS que antes bastaban, sigue esperando', async () => {
    render(<Dashboard />);

    await act(async () => { peticiones.competiciones.resolver([]); });
    await asienta();

    expect(estaEsperando()).toBe(true);
  });

  it('cuando llegan las cuatro, deja de esperar', async () => {
    render(<Dashboard />);

    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.resolver(null);
      peticiones.recientes.resolver([]);
    });
    await asienta();
    await act(async () => { peticiones.proximos.resolver([]); });
    await asienta();

    expect(estaEsperando()).toBe(false);
  });

  it('una recarga posterior no devuelve la pantalla a la espera', async () => {
    // Al guardar el handicap se vuelve a pedir todo. Desmontar el panel entero
    // ahi es justo lo que evitaba el criterio de antes
    const { rerender } = render(<Dashboard />);
    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.resolver(null);
      peticiones.recientes.resolver([]);
    });
    await asienta();
    await act(async () => { peticiones.proximos.resolver([]); });
    await asienta();

    reiniciaLasPeticiones();
    sesion.user = { ...usuario };
    rerender(<Dashboard />);
    await asienta();

    expect(estaEsperando()).toBe(false);
  });
});

/**
 * El techo de la espera no puede convertirse en una pagina en blanco, ni las
 * dependencias nuevas en el doble de peticiones.
 */
describe('los bordes de la espera del panel', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
    almacenLimpio();
    textos.listos = true;
    sesion.user = usuario;
    sesion.loading = false;
    reiniciaLaCortina();
    reiniciaLasPeticiones();
    for (const nombre of Object.keys(veces)) veces[nombre] = 0;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agotado el techo con la sesion sin resolver, sigue la espera y no un blanco', () => {
    // Sin el gate de siempre, aqui bajaba `isLoading` y el `if (!user) return
    // null` de tres lineas mas abajo dejaba la pagina EN BLANCO. Una instancia
    // fria de Render tardando mas de tres segundos basta para llegar aqui
    vi.useFakeTimers();
    sesion.user = null;
    sesion.loading = true;

    render(<Dashboard />);
    act(() => { vi.advanceTimersByTime(ESPERA_MAXIMA_MS + 100); });

    expect(estaEsperando()).toBe(true);
  });

  it('mientras se recarga la sesion no se vuelve a pedir todo', async () => {
    // `refetchUser` —al guardar el handicap— sube `loading` con el usuario
    // VIEJO todavia puesto. Sin cortar ahi, esa pasada pedia las cuatro cosas
    // una vez y el usuario nuevo otra: ocho peticiones por cada guardado
    const { rerender } = render(<Dashboard />);
    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.resolver(null);
      peticiones.recientes.resolver([]);
    });
    await asienta();
    await act(async () => { peticiones.proximos.resolver([]); });
    await asienta();
    const pedidasAlPrincipio = veces.estadisticas;

    reiniciaLasPeticiones();
    sesion.loading = true;
    rerender(<Dashboard />);
    await asienta();

    expect(veces.estadisticas).toBe(pedidasAlPrincipio);
  });
});

describe('el panel avisa a la cortina cuando NO le queda nada cargando', () => {
  beforeEach(() => {
    // Sin relojes falsos: pelean con `await act`. El plazo maximo de la cortina
    // son 3s reales y estos tests terminan en milisegundos; `reiniciaLaCortina`
    // cancela el temporizador antes de cada uno
    // La cortina solo se sostiene en la aplicacion instalada
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    textos.listos = true;
    sesion.user = usuario;
    sesion.loading = false;
    reiniciaLaCortina();
    reiniciaLasPeticiones();
    almacenLimpio();
    document.body.innerHTML = '<div id="arranque"></div>';
    // La ruta `/dashboard` avisa: la cortina se queda esperando
    esperaElAviso();
  });

  it('con las cuatro peticiones en vuelo la cortina sigue puesta', async () => {
    render(<Dashboard />);
    await asienta();

    expect(sigueLaCortina()).toBe(true);
  });

  it('con las DOS que antes bastaban, la cortina sigue puesta', async () => {
    render(<Dashboard />);

    // Usuario y competiciones: justo el criterio viejo (`isLoading`), el que
    // dejaba pasar los dos parpadeos
    await act(async () => { peticiones.competiciones.resolver([]); });
    await asienta();

    expect(sigueLaCortina()).toBe(true);
  });

  it('con tres de cuatro, tampoco', async () => {
    render(<Dashboard />);

    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.resolver(null);
    });
    await asienta();

    expect(sigueLaCortina()).toBe(true);
  });

  it('cuando las cuatro han aterrizado, se levanta', async () => {
    render(<Dashboard />);

    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.resolver(null);
      peticiones.recientes.resolver([]);
    });
    await asienta();
    await act(async () => { peticiones.proximos.resolver([]); });
    await asienta();

    expect(sigueLaCortina()).toBe(false);
  });

  it('no se levanta en el render en que llega el usuario', async () => {
    // `useAuth` no es un contexto: arranca SIEMPRE sin usuario y con `loading`
    // en alto, y pide `/current-user` al montar. En esa primera pasada los
    // cuatro cargadores se van por su guardia sin pedir nada. Si alguno bajara
    // ahi su bandera, al llegar el usuario estarian las cinco a false —sin que
    // hubiera salido una sola peticion— y la cortina se levantaria justo en ese
    // render, con el panel entero todavia por cargar detras
    sesion.user = null;
    sesion.loading = true;
    const { rerender } = render(<Dashboard />);
    await asienta();

    sesion.user = usuario;
    sesion.loading = false;
    // Elemento nuevo: con el mismo objeto React se salta la reconciliacion
    rerender(<Dashboard />);
    await asienta();

    expect(sigueLaCortina()).toBe(true);
  });

  it('sin usuario tampoco se queda esperando', () => {
    // La sesion se cae a media carga: los cuatro cargadores se van sin pedir
    // nada. Si alguno se dejara su flag arriba, el aviso no se mandaria nunca y
    // la cortina se comeria el plazo entero de verde antes de que
    // `ProtectedRoute` llegue a mandar al formulario
    sesion.user = null;

    render(<Dashboard />);

    expect(sigueLaCortina()).toBe(false);
  });

  it('con las cuatro aterrizadas pero sin los textos, la cortina se queda', async () => {
    // Levantarla aqui enseña las claves en crudo y un cambio de texto un
    // instante despues: el mismo parpadeo con otra cara
    textos.listos = false;
    render(<Dashboard />);

    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.resolver(null);
      peticiones.recientes.resolver([]);
    });
    await asienta();
    await act(async () => { peticiones.proximos.resolver([]); });
    await asienta();

    expect(sigueLaCortina()).toBe(true);
  });

  it('una peticion que falla tambien cuenta como terminada', async () => {
    // Un fallo deja su bloque enseñando lo que tenga; lo que no puede es dejar
    // la cortina puesta hasta agotar el plazo
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Dashboard />);

    await act(async () => {
      peticiones.competiciones.resolver([]);
      peticiones.estadisticas.rechazar(new Error('el backend no contesta'));
      peticiones.recientes.resolver([]);
    });
    await asienta();
    await act(async () => { peticiones.proximos.resolver([]); });
    await asienta();

    expect(sigueLaCortina()).toBe(false);
  });
});
