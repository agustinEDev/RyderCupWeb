import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { matchRoutes } from 'react-router';
import { RUTAS_DE_LA_APLICACION } from './utils/rutasDeLaAplicacion';
import { textosDelError } from './components/errors/textosDelError';

/**
 * La aplicación sobre el router de datos de React Router (FE #647, fase 1, 2 nov
 * 2026): `createBrowserRouter` + `RouterProvider` sin cambiar nada de lo que se
 * ve. Volver a donde estabas llega en la fase 3, con los `loader`.
 *
 *   #  | caso                                              | esperado
 *   ---|---------------------------------------------------|----------------------------------------
 *   R1 | cada ruta de `rutasDeLaAplicacion`                 | la sirve su pantalla, no la comodín
 *   R3 | Sentry                                            | la app registra SU router para el seguimiento
 *      |                                                   | (routerParaSentry; Sentry llega ~2 s después)
 *   R3b| con StrictMode (desarrollo: crea dos routers)       | se registra el que se usa
 *   R4 | ir a otra pantalla, y volver atrás                 | arriba, como hasta ahora
 *   R5 | cambiar solo el query                              | no sube
 *   R5b| cambiar solo el # (el mapa del hoyo)               | no sube
 *   R6 | una pantalla que falla al pintarse                 | la pantalla de error de siempre, no la del router
 *   R6c| ese error llega a Sentry                           | con la pila de la pantalla que falló:
 *      |                                                   | React 19 guarda la pila de cada error la
 *      |                                                   | primera vez y la reusa al relanzarlo
 *   R6b| falla la carcasa de la app (lo que va fuera de las | la de Sentry.ErrorBoundary, como hasta ahora
 *      | pantallas)                                        |
 *   R7 | navegar                                           | lo que cuelga de la app no se vuelve a montar
 *   R8 | montar la app dos veces                            | cada una lee la dirección de ese momento
 *
 * R2 (la comodín) y R9 (los demás tests que montan la app) siguen en sus ficheros.
 */
const sentry = vi.hoisted(() => ({ registrar: vi.fn() }));
const montajes = vi.hoisted(() => ({ cola: 0 }));
const fallo = vi.hoisted(() => ({ carcasa: false }));
const enviado = vi.hoisted(() => ({ extras: {} }));

vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('./hooks/useAuth', () => ({
  getUserData: vi.fn(async () => ({ id: 'u-1' })),
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}));
vi.mock('./hooks/useTerminosPendientes', () => ({
  useTerminosPendientes: () => {
    if (fallo.carcasa) throw new Error('carcasa');
    return false;
  },
}));
vi.mock('./hooks/useVaciadoDeLaCola', async () => {
  const { useEffect } = await import('react');
  return {
    useVaciadoDeLaCola: () => {
      useEffect(() => {
        montajes.cola += 1;
      }, []);
    },
  };
});
vi.mock('./hooks/useEnvioDeMuestras', () => ({ useEnvioDeMuestras: () => {} }));
vi.mock('./hooks/useDeviceRevocationMonitor', () => ({ useDeviceRevocationMonitor: () => {} }));
vi.mock('./hooks/useProactiveTokenRefresh', () => ({ default: () => {} }));
vi.mock('./hooks/useCortinaDeArranque', () => ({ useCortinaDeArranque: () => {} }));
vi.mock('./utils/sentryHelpers', () => ({ setUserContext: () => {} }));
vi.mock('./components/ui/InstallBanner', () => ({ default: () => null }));
vi.mock('./components/ui/AvisoSinConexion', () => ({ default: () => null }));
vi.mock('./components/layout/BottomNav', () => ({ default: () => <nav>barra inferior</nav> }));
vi.mock('./components/auth/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./pages/Dashboard', async () => {
  const { Link } = await import('react-router');
  return {
    default: () => (
      <main>
        <h1>panel</h1>
        <Link to="/friends">a amigos</Link>
        {/* Como los filtros del admin y el mapa del hoyo, sin ninguna marca:
            no mover el scroll es lo de por defecto (fase 3) */}
        <Link to="/dashboard?filtro=hoy">filtrar</Link>
        <Link to="/dashboard#mapa">abrir el mapa</Link>
      </main>
    ),
  };
});
vi.mock('./pages/player/FriendsPage', () => ({ default: () => <h1>amigos</h1> }));
vi.mock('./pages/public/Terms', () => ({ default: () => <h1>términos</h1> }));
vi.mock('./pages/Profile', () => ({
  default: function PerfilQueFalla() {
    throw new Error('boom');
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('@sentry/react', async (original) => ({
  ...(await original()),
  withProfiler: (c) => c,
  // Lo que LazyLoadErrorBoundary manda a Sentry
  withScope: (enviar) => enviar({ setTag() {}, setExtra: (clave, valor) => { enviado.extras[clave] = valor; } }),
  captureException: () => {},
}));
vi.mock('./utils/routerParaSentry', () => ({ registrarRouterParaSentry: sentry.registrar }));

const { default: App, rutasDeLaApp } = await import('./App');

const abrir = (ruta) => {
  window.history.pushState({}, '', ruta);
  return render(<App />);
};

describe('App · router de datos (FE #647, fase 1)', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    globalThis.scrollTo = vi.fn();
    sentry.registrar.mockClear();
    montajes.cola = 0;
    fallo.carcasa = false;
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it.each(RUTAS_DE_LA_APLICACION)('R1: %s la sirve su pantalla, no la comodín', (ruta) => {
    // Cada parámetro con un valor, y el opcional sin él
    const direccion = ruta.replace(/\/:[^/]+\?$/, '').replace(/:[^/]+/g, 'x') || '/';
    const ultima = matchRoutes(rutasDeLaApp, direccion)?.at(-1)?.route;

    expect(ultima?.path).toBe(ruta);
  });

  it('R1: una dirección desconocida la sirve la comodín', () => {
    expect(matchRoutes(rutasDeLaApp, '/esto-no-existe')?.at(-1)?.route.path).toBe('*');
  });

  it('R3: la app registra su router, con sus rutas, para el seguimiento de Sentry', async () => {
    abrir('/dashboard');

    expect(await screen.findByRole('heading', { name: 'panel' })).toBeInTheDocument();
    expect(sentry.registrar).toHaveBeenCalledTimes(1);
    const [router, rutas] = sentry.registrar.mock.calls[0];
    expect(rutas).toBe(rutasDeLaApp);
    // El que sirve la aplicación: navega con ella
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('R3b: con StrictMode, se registra el router que de verdad sirve la app', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    await screen.findByRole('heading', { name: 'panel' });

    fireEvent.click(screen.getByRole('link', { name: 'a amigos' }));
    await screen.findByRole('heading', { name: 'amigos' });

    // El último registrado es el que ha navegado: el que usa RouterProvider
    const [router] = sentry.registrar.mock.calls.at(-1);
    expect(router.state.location.pathname).toBe('/friends');
  });

  it('R4: ir a otra pantalla empieza arriba, y volver atrás también', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    globalThis.scrollTo.mockClear();

    fireEvent.click(screen.getByRole('link', { name: 'a amigos' }));
    expect(await screen.findByRole('heading', { name: 'amigos' })).toBeInTheDocument();
    expect(globalThis.scrollTo).toHaveBeenCalledWith(0, 0);
    globalThis.scrollTo.mockClear();

    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(await screen.findByRole('heading', { name: 'panel' })).toBeInTheDocument();
    expect(globalThis.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('R5: cambiar solo el query no sube', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    globalThis.scrollTo.mockClear();

    fireEvent.click(screen.getByRole('link', { name: 'filtrar' }));
    await act(async () => {});

    expect(window.location.search).toBe('?filtro=hoy');
    expect(globalThis.scrollTo).not.toHaveBeenCalled();
  });

  it('R5b: cambiar solo el # (abrir el mapa del hoyo) no sube', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    globalThis.scrollTo.mockClear();

    fireEvent.click(screen.getByRole('link', { name: 'abrir el mapa' }));
    await act(async () => {});

    expect(window.location.hash).toBe('#mapa');
    expect(globalThis.scrollTo).not.toHaveBeenCalled();
  });

  it('R6: una pantalla que falla sale con la pantalla de error de siempre', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    abrir('/profile');

    // En el idioma que elija la pantalla de error, que no depende de las traducciones
    expect(await screen.findByRole('heading', { name: textosDelError().sinCargar.titulo })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();
    consola.mockRestore();
  });

  it('R6c: el error de pantalla llega a Sentry con la pila de la pantalla que falló', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    enviado.extras = {};
    abrir('/profile');
    await screen.findByRole('heading', { name: textosDelError().sinCargar.titulo });

    expect(enviado.extras.componentStack).toContain('PerfilQueFalla');
    consola.mockRestore();
  });

  it('R6b: si falla la carcasa de la app, la pantalla de error de Sentry', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    fallo.carcasa = true;
    abrir('/dashboard');

    expect(await screen.findByRole('heading', { name: textosDelError().fallo.titulo })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();
    consola.mockRestore();
  });

  it('R7: navegar no vuelve a montar lo que cuelga de la aplicación', async () => {
    abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    expect(montajes.cola).toBe(1);

    fireEvent.click(screen.getByRole('link', { name: 'a amigos' }));
    await screen.findByRole('heading', { name: 'amigos' });

    expect(montajes.cola).toBe(1);
    expect(screen.getByText('barra inferior')).toBeInTheDocument();
  });

  it('R8: dos montajes, cada uno con la dirección de su momento', async () => {
    const { unmount } = abrir('/dashboard');
    await screen.findByRole('heading', { name: 'panel' });
    unmount();

    abrir('/terms');

    expect(await screen.findByRole('heading', { name: 'términos' })).toBeInTheDocument();
  });
});
