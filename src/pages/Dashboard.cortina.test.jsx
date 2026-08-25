import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => peticiones.competiciones.promesa },
  getPlayerStatsUseCase: { execute: () => peticiones.estadisticas.promesa },
  getRecentMatchesUseCase: { execute: () => peticiones.recientes.promesa },
  getUpcomingMatchesUseCase: { execute: () => peticiones.proximos.promesa },
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
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
  '../components/ui/FullScreenLoader',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

const { esperaElAviso, reiniciaLaCortina } = await import('../utils/cortinaDeArranque');
const Dashboard = (await import('./Dashboard')).default;

const sigueLaCortina = () => Boolean(document.getElementById('arranque'));

// Deja que las promesas ya resueltas terminen de propagarse por los efectos
const asienta = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

describe('el panel avisa a la cortina cuando NO le queda nada cargando', () => {
  beforeEach(() => {
    // Sin relojes falsos: pelean con `await act`. El plazo maximo de la cortina
    // son 3s reales y estos tests terminan en milisegundos; `reiniciaLaCortina`
    // cancela el temporizador antes de cada uno
    sesion.user = usuario;
    reiniciaLaCortina();
    reiniciaLasPeticiones();
    // jsdom no trae `localStorage` con el origen que usa vitest aqui, y el
    // panel lo lee al montar. Mismo apaño que el resto de la suite
    const guardado = {};
    globalThis.localStorage = {
      getItem: (clave) => guardado[clave] ?? null,
      setItem: (clave, valor) => { guardado[clave] = String(valor); },
      removeItem: (clave) => { delete guardado[clave]; },
      clear: () => { for (const clave of Object.keys(guardado)) delete guardado[clave]; },
    };
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

  it('sin usuario tampoco se queda esperando', () => {
    // La sesion se cae a media carga: los cuatro cargadores se van sin pedir
    // nada. Si alguno se dejara su flag arriba, el aviso no se mandaria nunca y
    // la cortina se comeria el plazo entero de verde antes de que
    // `ProtectedRoute` llegue a mandar al formulario
    sesion.user = null;

    render(<Dashboard />);

    expect(sigueLaCortina()).toBe(false);
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
