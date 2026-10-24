import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

/**
 * Una pantalla diferida cuyo trozo falla siempre (sin cobertura y con la caché
 * a medias): la página se recargaba sin fin, unas 6 veces en 8 s (revisor en el
 * Kind, 24 oct 2026). `App` borraba la marca de «ya recargué» al montar, antes
 * de que el trozo volviera a fallar. Borrarla solo al cambiar de página tampoco
 * bastaba: React Router navega en transición y el efecto llegaba tarde (otra
 * recarga de más, o el aviso sin recargar tras un despliegue). Ahora la marca
 * es la hora de la recarga y cuenta 30 s, como la de `recargaPorTrozoViejo`.
 *
 *   #   caso                                               | esperado
 *   ----|--------------------------------------------------|------------------------------------
 *   R1  abro una pantalla que falla siempre                | una recarga y luego el aviso
 *   R2  navego a una pantalla que falla siempre            | una recarga y luego el aviso
 *   R3  tras la recarga por build viejo (#958) vuelve a fallar | ninguna recarga más: el aviso
 *   R4  la recarga fue hace más de 30 s y falla otra       | recarga una vez
 *   R5  recarga reciente y redirección a /login, que falla | el aviso, sin otra recarga
 *
 * R6-R9 (marca vieja o ilegible, reloj hacia atrás, botón, sin almacenamiento)
 * en `LazyLoadErrorBoundary.test.jsx`.
 */
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
vi.mock('./hooks/useVolverArriba', () => ({ useVolverArriba: () => {} }));
vi.mock('./utils/sentryHelpers', () => ({ setUserContext: () => {} }));
vi.mock('./components/ui/InstallBanner', () => ({ default: () => null }));
vi.mock('./components/ui/AvisoSinConexion', () => ({ default: () => null }));
vi.mock('./components/layout/BottomNav', () => ({ default: () => null }));
const sesion = vi.hoisted(() => ({ hay: true }));
vi.mock('./components/auth/ProtectedRoute', async () => {
  const { Navigate } = await import('react-router');
  const Protegida = ({ children }) => (sesion.hay ? children : <Navigate to="/login" replace />);
  return { default: Protegida };
});
vi.mock('./pages/Dashboard', () => ({ default: () => <p>panel</p> }));
vi.mock('./pages/Profile', () => ({ default: () => <p>perfil</p> }));
// El trozo que no llega. Como `lazy`: la pantalla se suspende y el error llega
// después de montar, que es cuando `App` borraba la marca. Un `throw` en la
// fábrica no sirve: Vitest lo envuelve con otro mensaje
const trozo = vi.hoisted(() => ({ promesa: null }));
const nuevoTrozoQueFalla = () => {
  trozo.promesa = new Promise((_, rechazar) =>
    setTimeout(() => rechazar(new TypeError('Failed to fetch dynamically imported module: /assets/DeviceManagement-x.js')), 10)
  );
  trozo.promesa.catch(() => {});
};
vi.mock('./pages/DeviceManagement', async () => {
  const { use } = await import('react');
  const PantallaQueNoLlega = () => {
    use(trozo.promesa);
    return null;
  };
  return { default: PantallaQueNoLlega };
});
vi.mock('./pages/Login', async () => {
  const { use } = await import('react');
  const LoginQueNoLlega = () => {
    use(trozo.promesa);
    return null;
  };
  return { default: LoginQueNoLlega };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('@sentry/react', async (original) => ({
  ...(await original()),
  withProfiler: (c) => c,
  withSentryReactRouterV7Routing: (c) => c,
  withScope: () => {},
}));

const App = (await import('./App')).default;

const MARCA = 'lazy_load_error_reloaded';
const AVISO = 'Unable to Load Application';
const originalLocation = window.location;
let recargas;

const ir = (ruta) =>
  act(() => {
    window.history.pushState({}, '', ruta);
    window.dispatchEvent(new globalThis.PopStateEvent('popstate'));
  });

// Montada con un `act` que se espera: con el trozo ya cargado una vez, la
// pantalla se suspende al montar y, sin esperar, React deja el reintento colgado
const montar = () =>
  act(async () => {
    render(<App />);
  });

// Lo que hace el navegador al recargar: la página se va y la app vuelve a montar
const recargar = () => {
  cleanup();
  nuevoTrozoQueFalla();
  return montar();
};

describe('App · una pantalla diferida que falla siempre', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sesion.hay = true;
    nuevoTrozoQueFalla();
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    recargas = vi.fn();
    // `reload` de jsdom no se puede espiar; el resto, leído en vivo para el router
    const enVivo = Object.fromEntries(
      ['href', 'origin', 'protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash'].map((clave) => [
        clave,
        { get: () => originalLocation[clave], enumerable: true },
      ])
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: Object.defineProperties({ reload: recargas, assign: vi.fn(), replace: vi.fn() }, enVivo),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('R1: al abrir una pantalla que falla siempre, una recarga y luego el aviso', async () => {
    window.history.pushState({}, '', '/profile/devices');
    await montar();
    await vi.waitFor(() => expect(recargas).toHaveBeenCalledTimes(1), { timeout: 4000 });

    await recargar();

    expect(await screen.findByText(AVISO, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(recargas).toHaveBeenCalledTimes(1);
  });

  it('R2: al navegar a una pantalla que falla siempre, una recarga y luego el aviso', async () => {
    window.history.pushState({}, '', '/dashboard');
    await montar();
    await screen.findByText('panel');

    await ir('/profile/devices');
    await vi.waitFor(() => expect(recargas).toHaveBeenCalledTimes(1), { timeout: 4000 });
    await recargar();

    expect(await screen.findByText(AVISO, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(recargas).toHaveBeenCalledTimes(1);
  });

  it('R3: tras la recarga por build viejo, si vuelve a fallar, el aviso sin otra recarga', async () => {
    // Lo que apunta `recargaPorTrozoViejo` antes de recargar: la hora
    sessionStorage.setItem(MARCA, String(Date.now()));
    window.history.pushState({}, '', '/profile/devices');
    await montar();

    expect(await screen.findByText(AVISO, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(recargas).not.toHaveBeenCalled();
  });

  it('R4: con la recarga de hace más de 30 s, otra pantalla que falla recarga una vez', async () => {
    // Recargó al arrancar y el jugador se quedó en el panel; luego se desplegó
    sessionStorage.setItem(MARCA, String(Date.now() - 31_000));
    window.history.pushState({}, '', '/dashboard');
    await montar();
    await screen.findByText('panel');

    await ir('/profile/devices');

    await vi.waitFor(() => expect(recargas).toHaveBeenCalledTimes(1), { timeout: 4000 });
  });

  it('R5: con la recarga reciente, la redirección a un /login que falla saca el aviso', async () => {
    sessionStorage.setItem(MARCA, String(Date.now()));
    sesion.hay = false;
    window.history.pushState({}, '', '/dashboard');
    await montar();

    expect(await screen.findByText(AVISO, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(recargas).not.toHaveBeenCalled();
  });
});
