import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Una dirección que no lleva a ninguna pantalla (FE #544). Antes no había ruta
 * comodín y se pintaba una página en blanco.
 *
 *   caso | sesión | se ve                               | barra inferior
 *   -----|--------|-------------------------------------|---------------
 *   N1   | sí     | «no existe», con la ruta comodín     | sí (N4)
 *   N2   | no     | «no existe»                         | no
 *   --   | sí     | una ruta conocida no cae en el comodín
 */
const sesion = vi.hoisted(() => ({ usuario: { id: 'u-1' } }));

vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('./hooks/useAuth', () => ({
  getUserData: vi.fn(async () => sesion.usuario),
  useAuth: () => ({ user: sesion.usuario, loading: false }),
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
vi.mock('./components/layout/BottomNav', () => ({ default: () => <nav>barra inferior</nav> }));
vi.mock('./components/auth/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./pages/Dashboard', () => ({ default: () => <p>panel</p> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('@sentry/react', async (original) => ({
  ...(await original()),
  withProfiler: (c) => c,
  withSentryReactRouterV7Routing: (c) => c,
}));

const App = (await import('./App')).default;

describe('App · dirección que no existe', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it('N1 y N4: con sesión, la página de «no existe» y la barra inferior para salir', async () => {
    sesion.usuario = { id: 'u-1' };
    window.history.pushState({}, '', '/esto-no-existe');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'notFound.title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'notFound.goToDashboard' })).toHaveAttribute('href', '/dashboard');
    expect(await screen.findByText('barra inferior')).toBeInTheDocument();
  });

  it('N2: sin sesión, la misma página, sin barra', async () => {
    sesion.usuario = null;
    window.history.pushState({}, '', '/competitions/1/otra-cosa');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'notFound.title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'notFound.login' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('barra inferior')).toBeNull();
  });

  it('una ruta conocida no cae en el comodín', async () => {
    sesion.usuario = { id: 'u-1' };
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await screen.findByText('panel');
    expect(screen.queryByRole('heading', { name: 'notFound.title' })).toBeNull();
  });
});
