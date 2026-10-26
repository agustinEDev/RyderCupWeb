import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * El hueco al final de la página, para que lo fijo abajo no tape lo último
 * (QA, FE #865-8 y #865-13).
 *
 *   caso | qué                                            | hueco
 *   -----|------------------------------------------------|---------------------------------
 *   E1   | con la barra inferior                          | 5rem: el botón «Partida» sobresale
 *        |                                                | por encima (llega a 71 px), no 4rem
 */
const sesion = vi.hoisted(() => ({ usuario: { id: 'u-1' } }));

vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('./hooks/useAuth', () => ({
  getUserData: vi.fn(async () => sesion.usuario),
  useAuth: () => ({ user: sesion.usuario, loading: false }),
}));
vi.mock('./hooks/useAuthContext', () => ({ useAuthContext: () => ({ clearAuth: vi.fn() }) }));
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
vi.mock('./components/layout/BottomNav', () => ({ default: () => <nav>barra inferior</nav> }));
vi.mock('./components/auth/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./pages/Dashboard', () => ({ default: () => <p>panel</p> }));
vi.mock('./pages/public/LeaderboardPage', () => ({ default: () => <p>clasificacion</p> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('@sentry/react', async (original) => ({
  ...(await original()),
  withProfiler: (c) => c,
  withSentryReactRouterV7Routing: (c) => c,
}));

const App = (await import('./App')).default;

describe('App · el hueco del final', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it('E1: con la barra inferior, cuenta con el botón «Partida», que sobresale', async () => {
    sesion.usuario = { id: 'u-1' };
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await screen.findByText('barra inferior');
    const hueco = screen.getByTestId('hueco-barra-inferior');
    expect(hueco.className).toMatch(/h-\[calc\(5rem\+env\(safe-area-inset-bottom\)/);
    expect(hueco.className.split(' ')).toContain('md:hidden');
  });
});
