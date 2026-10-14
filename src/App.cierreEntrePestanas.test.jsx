import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

/**
 * Cerrar sesión en una pestaña cierra las demás, SIN eco (14 oct 2026, FE #865).
 *
 * La pestaña que recibía el aviso llamaba al mismo `logout()`, que volvía a
 * avisar y a llamar al backend: con dos pestañas abiertas se mandaban unos
 * 1.100 `POST /auth/logout` por pestaña en menos de un segundo, contra el cubo
 * de límites compartido (ADR-038).
 *
 *   #   caso                                               | qué pasa
 *   ----|--------------------------------------------------|---------------------
 *   O1  llega el cierre de sesión de otra pestaña          | esta sale sin volver a avisar
 *   O2  y sin llamar al backend                            | (comparten cookies: ya lo hizo la otra)
 */
let mockAlAvisar = null;
vi.mock('./utils/broadcastAuth', () => ({
  EVENTS: { LOGOUT: 'LOGOUT', LOGIN: 'LOGIN' },
  onAuthEvent: (alAvisar) => {
    mockAlAvisar = alAvisar;
    return () => {};
  },
}));
const mockLogout = vi.fn();
vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: mockLogout }) }));
vi.mock('./hooks/useAuth', () => ({
  getUserData: vi.fn().mockResolvedValue({ id: 'u-1', email: 'ana@example.com' }),
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}));
vi.mock('./hooks/useVaciadoDeLaCola', () => ({ useVaciadoDeLaCola: () => {} }));
vi.mock('./hooks/useProactiveTokenRefresh', () => ({ default: () => {} }));
vi.mock('./hooks/useDeviceRevocationMonitor', () => ({ useDeviceRevocationMonitor: () => {} }));
vi.mock('./hooks/useCortinaDeArranque', () => ({ useCortinaDeArranque: () => {} }));
vi.mock('./hooks/useVolverArriba', () => ({ useVolverArriba: () => {} }));
vi.mock('./utils/sentryHelpers', () => ({ setUserContext: () => {} }));
vi.mock('./components/ui/InstallBanner', () => ({ default: () => null }));
vi.mock('./components/ui/AvisoSinConexion', () => ({ default: () => null }));
vi.mock('./components/layout/BottomNav', () => ({ default: () => null }));
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

describe('App · cerrar sesión en otra pestaña, sin eco (FE #865)', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockAlAvisar = null;
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.history.pushState({}, '', '/dashboard');
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it('O1/O2: al llegar el cierre de otra pestaña, sale como «desde otra pestaña»: ni avisa ni llama al backend', async () => {
    render(<App />);
    await screen.findByText('panel');

    await act(async () => mockAlAvisar({ type: 'LOGOUT', timestamp: 1 }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith({ desdeOtraPestana: true });
  });

  it('un aviso que no es de cierre no cierra nada', async () => {
    render(<App />);
    await screen.findByText('panel');

    await act(async () => mockAlAvisar({ type: 'LOGIN', timestamp: 1 }));

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
