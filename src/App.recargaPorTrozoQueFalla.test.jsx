import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

/**
 * Una pantalla diferida cuyo trozo falla siempre (sin cobertura y con la caché
 * a medias): la página se recargaba sin fin, unas 6 veces en 8 s (revisor en el
 * Kind, 24 oct 2026). Al montar tras la recarga, `App` borraba la marca de «ya
 * recargué» antes de que el trozo fallara, y la barrera de error volvía a
 * recargar. La marca se borra ahora solo al cambiar de página.
 *
 *   #   caso                                               | esperado
 *   ----|--------------------------------------------------|------------------------------------
 *   R1  la pantalla falla siempre                          | una recarga y luego el aviso
 *   R2  igual, tras la recarga por build viejo (#958)      | ninguna recarga más: el aviso
 *   R3  se monta en la misma ruta                          | la marca sigue
 *   R4  se navega a otra página                            | la marca se borra
 *   R4b se vuelve a la primera tras otra recarga           | también se borra
 *   R5  tras R4, otra pantalla falla                       | recarga una vez
 *   R6  modo estricto (efecto doble al montar)             | la marca sigue
 *   R7  cambia solo la búsqueda o el `#`                   | la marca sigue
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
vi.mock('./components/auth/ProtectedRoute', () => ({ default: ({ children }) => children }));
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

  it('R1: recarga una vez y, si vuelve a fallar, el aviso en vez de otra recarga', async () => {
    window.history.pushState({}, '', '/profile/devices');
    await montar();
    await vi.waitFor(() => expect(recargas).toHaveBeenCalledTimes(1), { timeout: 4000 });

    await recargar();

    expect(await screen.findByText(AVISO, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(recargas).toHaveBeenCalledTimes(1);
  });

  it('R2: tras la recarga por build viejo, la barrera no recarga otra vez', async () => {
    // Lo que apunta `recargaPorTrozoViejo` antes de recargar
    sessionStorage.setItem(MARCA, 'true');
    window.history.pushState({}, '', '/profile/devices');
    await montar();

    expect(await screen.findByText(AVISO, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(recargas).not.toHaveBeenCalled();
  });

  it('R3: al montar en la misma ruta, la marca sigue', async () => {
    sessionStorage.setItem(MARCA, 'true');
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await screen.findByText('panel');
    expect(sessionStorage.getItem(MARCA)).toBe('true');
  });

  it('R4 y R5: al ir a otra página se borra, y la siguiente que falle recarga una vez', async () => {
    sessionStorage.setItem(MARCA, 'true');
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await screen.findByText('panel');

    await ir('/profile');
    await screen.findByText('perfil');
    expect(sessionStorage.getItem(MARCA)).toBeNull();

    await ir('/profile/devices');
    await vi.waitFor(() => expect(recargas).toHaveBeenCalledTimes(1), { timeout: 4000 });
  });

  it('R4b: al volver a la página del arranque tras otra recarga, también se borra', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await screen.findByText('panel');
    await ir('/profile');
    await screen.findByText('perfil');
    sessionStorage.setItem(MARCA, 'true');

    await ir('/dashboard');
    await screen.findByText('panel');

    expect(sessionStorage.getItem(MARCA)).toBeNull();
  });

  it('R6: en modo estricto el efecto doble del montaje no la borra', async () => {
    sessionStorage.setItem(MARCA, 'true');
    window.history.pushState({}, '', '/dashboard');
    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    await screen.findByText('panel');
    expect(sessionStorage.getItem(MARCA)).toBe('true');
  });

  it('R7: cambiar solo la búsqueda o el # no es otra página', async () => {
    sessionStorage.setItem(MARCA, 'true');
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await screen.findByText('panel');

    await ir('/dashboard?pestana=2');
    await ir('/dashboard#mapa');

    expect(sessionStorage.getItem(MARCA)).toBe('true');
  });
});
