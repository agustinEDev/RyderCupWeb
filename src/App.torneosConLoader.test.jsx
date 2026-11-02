import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { textosDelError } from './components/errors/textosDelError';

/**
 * Torneos con su `loader`, dentro de la aplicación entera (FE #647, fase 3;
 * tabla aprobada el 2 nov 2026). Lo de la pantalla en sí, en
 * `pages/Competitions.sinCobertura.test.jsx`.
 *
 *   #   | caso                                             | esperado
 *   ----|--------------------------------------------------|----------------------------------------
 *   T18 | entrar en otra pantalla y volver atrás a Torneos  | Torneos, donde estaba
 *   T19 | entrar en Torneos                                 | arriba
 *   T20 | volver atrás a una pantalla sin loader            | arriba (R4 en App.routerDeDatos)
 *   T21 | la espera de Torneos pasa de 150 ms               | la barra fina arriba; al llegar, se va
 *   T22 | abrir la app directamente en /competitions        | como hoy: la carcasa al momento y la pantalla
 *       |                                                  | carga dentro (revisor: si no, sin red en el
 *       |                                                  | arranque ni aviso ni cola hasta tener datos)
 *   T35 | recargar con posiciones guardadas                 | arriba, como hoy, en Torneos y en las demás
 *   T36 | pulsar el enlace de la pantalla en la que estás   | no se mueve, como hoy
 *   T26 | Torneos falla al pintarse                         | la pantalla de error de siempre
 *   A1  | solo Torneos restaura su scroll, por ahora        | las demás siguen «siempre arriba»
 */
const carga = vi.hoisted(() => ({ espera: null, falla: false }));

vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('./hooks/useAuth', () => ({
  getUserData: vi.fn(async () => ({ id: 'u-1' })),
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}));
vi.mock('./hooks/useTerminosPendientes', () => ({ useTerminosPendientes: () => false }));
vi.mock('./hooks/useVaciadoDeLaCola', () => ({ useVaciadoDeLaCola: () => {} }));
vi.mock('./hooks/useEnvioDeMuestras', () => ({ useEnvioDeMuestras: () => {} }));
vi.mock('./hooks/useDeviceRevocationMonitor', () => ({ useDeviceRevocationMonitor: () => {} }));
vi.mock('./hooks/useProactiveTokenRefresh', () => ({ default: () => {} }));
vi.mock('./hooks/useCortinaDeArranque', () => ({ useCortinaDeArranque: () => {} }));
vi.mock('./utils/sentryHelpers', () => ({ setUserContext: () => {} }));
vi.mock('./components/ui/InstallBanner', () => ({ default: () => null }));
vi.mock('./components/ui/AvisoSinConexion', () => ({ default: () => null }));
vi.mock('./components/ui/FullScreenLoader', () => ({ default: () => <p>pantalla de espera</p> }));
vi.mock('./components/layout/BottomNav', () => ({ default: () => <nav>barra inferior</nav> }));
vi.mock('./components/auth/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./utils/navegacionesEnSentry', () => ({ registrarRouterParaSentry: () => {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('@sentry/react', async (original) => ({
  ...(await original()),
  withProfiler: (c) => c,
  withScope: (enviar) => enviar({ setTag() {}, setExtra() {} }),
  captureException: () => {},
}));
vi.mock('./services/sesionCompartida', async (original) => ({
  ...(await original()),
  consultaLaSesion: async () => ({ id: 'u-1' }),
  loQueHaySobreLaSesion: () => ({ user: { id: 'u-1' } }),
}));
vi.mock('./pages/Dashboard', async () => {
  const { Link } = await import('react-router');
  return {
    default: () => (
      <main>
        <h1>panel</h1>
        <Link to="/competitions">a torneos</Link>
        <Link to="/dashboard">al panel otra vez</Link>
      </main>
    ),
  };
});
// El `loader` de verdad, con lo que pide simulado
vi.mock('./pages/Competitions.datos', async () => {
  const { cargaDeLaPantalla } = await import('./utils/cargaDeLaPantalla');
  return {
    loader: () => cargaDeLaPantalla({ clave: 'competiciones', pedir: () => carga.espera ?? Promise.resolve([]) }),
  };
});
vi.mock('./pages/Competitions', async () => {
  const { Link, useLoaderData } = await import('react-router');
  return {
    default: function TorneosDePrueba() {
      if (carga.falla) throw new Error('boom');
      const { estado } = useLoaderData();
      return <main><h1>torneos {estado}</h1><Link to="/dashboard">al panel</Link></main>;
    },
  };
});

const { default: App, rutasDeLaApp } = await import('./App');
const { marcaElArranque } = await import('./utils/cargaDeLaPantalla');

const abrir = (ruta) => {
  window.history.pushState({}, '', ruta);
  return render(<App />);
};
const bajaHasta = (y) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
const rutaDe = (rutas, path) => {
  for (const r of rutas) {
    if (r.path === path) return r;
    const dentro = r.children && rutaDe(r.children, path);
    if (dentro) return dentro;
  }
  return null;
};

describe('App · Torneos con loader (FE #647, fase 3)', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    globalThis.scrollTo = vi.fn();
    carga.espera = null;
    carga.falla = false;
    bajaHasta(0);
    // Cada test es una carga de página nueva: la carcasa aún no se ha montado
    marcaElArranque(false);
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
    sessionStorage.clear();
  });

  it('T19: entrar en Torneos, arriba', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    bajaHasta(500);
    globalThis.scrollTo.mockClear();

    fireEvent.click(screen.getByRole('link', { name: 'a torneos' }));

    expect(await screen.findByRole('heading', { name: 'torneos ok' })).toBeInTheDocument();
    expect(globalThis.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it('T18: volver atrás a Torneos la deja donde estaba', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    fireEvent.click(screen.getByRole('link', { name: 'a torneos' }));
    await screen.findByRole('heading', { name: 'torneos ok' });
    bajaHasta(1323);

    fireEvent.click(screen.getByRole('link', { name: 'al panel' }));
    await screen.findByRole('heading', { name: 'panel' });
    bajaHasta(0);
    globalThis.scrollTo.mockClear();

    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(await screen.findByRole('heading', { name: 'torneos ok' })).toBeInTheDocument();
    expect(globalThis.scrollTo).toHaveBeenLastCalledWith(0, 1323);
  });

  it('T21: si la espera pasa de 150 ms sale la barra fina, y se va al llegar', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    let responde;
    carga.espera = new Promise((r) => { responde = r; });

    fireEvent.click(screen.getByRole('link', { name: 'a torneos' }));
    await act(() => new Promise((r) => setTimeout(r, 200)));
    expect(screen.getByTestId('barra-de-carga')).toBeInTheDocument();
    // Mientras, se sigue viendo la pantalla de antes
    expect(screen.getByRole('heading', { name: 'panel' })).toBeInTheDocument();

    await act(async () => responde([]));

    expect(await screen.findByRole('heading', { name: 'torneos ok' })).toBeInTheDocument();
    expect(screen.queryByTestId('barra-de-carga')).not.toBeInTheDocument();
  });

  it('T22: abrir directamente en /competitions: la carcasa al momento, y la pantalla carga dentro', async () => {
    carga.espera = new Promise(() => {});
    abrir('/competitions');

    // Sin esperar a la lista: la pantalla sabe que tiene que pedirla
    expect(await screen.findByRole('heading', { name: 'torneos pendiente' })).toBeInTheDocument();
    expect(await screen.findByText('barra inferior')).toBeInTheDocument();
  });

  it.each(['/dashboard', '/competitions'])('T35: recargar %s con una posición guardada empieza arriba', async (ruta) => {
    window.history.replaceState({ usr: null, key: 'k1', idx: 0 }, '', ruta);
    sessionStorage.setItem('react-router-scroll-positions', JSON.stringify({ k1: 900 }));
    sessionStorage.setItem('rcf-posiciones-del-scroll', JSON.stringify({ k1: 900 }));
    render(<App />);
    await screen.findByRole('heading', { name: ruta === '/dashboard' ? 'panel' : 'torneos pendiente' });
    await act(() => new Promise((r) => setTimeout(r, 50)));

    expect(globalThis.scrollTo).not.toHaveBeenCalledWith(0, 900);
    expect(globalThis.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it('T36: pulsar el enlace de la pantalla en la que estás no la mueve', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    bajaHasta(700);
    globalThis.scrollTo.mockClear();

    fireEvent.click(screen.getByRole('link', { name: 'al panel otra vez' }));
    await act(() => new Promise((r) => setTimeout(r, 50)));

    expect(globalThis.scrollTo).not.toHaveBeenCalled();
  });

  it('T26: si Torneos falla al pintarse, la pantalla de error de siempre', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    carga.falla = true;
    abrir('/competitions');

    expect(await screen.findByRole('heading', { name: textosDelError().sinCargar.titulo })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();
    consola.mockRestore();
  });

  it('A1: solo Torneos restaura su scroll, por ahora', () => {
    expect(rutaDe(rutasDeLaApp, '/competitions').handle).toEqual({ restauraElScroll: true });
    expect(rutaDe(rutasDeLaApp, '/dashboard').handle).toBeUndefined();
    expect(rutaDe(rutasDeLaApp, '/friends').handle).toBeUndefined();
  });
});
