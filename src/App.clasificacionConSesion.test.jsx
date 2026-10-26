import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * La clasificación compartida con sesión (QA, FE #865-4). Es pública —se
 * comparte el enlace—, pero quien tiene sesión la abre desde su competición y
 * se quedaba sin la barra inferior.
 *
 *   caso | sesión | barra inferior
 *   -----|--------|---------------
 *   C1   | sí     | sí
 *   C2   | no     | no, como hoy
 *   C3   | sí     | en otra pública (los Términos), tampoco
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
const { getUserData } = await import('./hooks/useAuth');

describe('App · la clasificación compartida con sesión', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    getUserData.mockClear();
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it('C1: con sesión, la barra inferior', async () => {
    sesion.usuario = { id: 'u-1' };
    window.history.pushState({}, '', '/competitions/c1/leaderboard');
    render(<App />);

    await screen.findByText('clasificacion');
    expect(await screen.findByText('barra inferior')).toBeInTheDocument();
  });

  it('C2: sin sesión, sin barra', async () => {
    sesion.usuario = null;
    window.history.pushState({}, '', '/competitions/c1/leaderboard');
    render(<App />);

    await screen.findByText('clasificacion');
    await vi.waitFor(() => expect(getUserData).toHaveBeenCalled());
    expect(screen.queryByText('barra inferior')).toBeNull();
  });

  it('C3: en otra página pública, ni con sesión se pregunta ni hay barra', async () => {
    sesion.usuario = { id: 'u-1' };
    window.history.pushState({}, '', '/terms');
    render(<App />);

    await screen.findByRole('button', { name: 'volver' });
    expect(getUserData).not.toHaveBeenCalled();
    expect(screen.queryByText('barra inferior')).toBeNull();
  });
});
