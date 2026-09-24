import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

/**
 * Sin cierre de sesión por inactividad en el navegador (BE #376, ADR-039).
 *
 * Había un temporizador de 30 min que llamaba al logout. En el campo echaba a
 * jugadores sin cobertura para volver a entrar, y el logout los echaba de TODOS
 * sus dispositivos. Tampoco era un control real: con la pestaña cerrada no
 * invalidaba nada. La inactividad (OWASP A07) la decide ahora el servidor: 24 h
 * sin usar ese dispositivo.
 *
 *   #   caso                                               | qué pasa
 *   ----|--------------------------------------------------|---------------------
 *   S1  sesión abierta y 31 min sin tocar nada             | no se cierra
 *   S2  ni a las 8 h (una jornada de torneo)               | no se cierra
 */
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

describe('App · sin cierre de sesión por inactividad (BE #376)', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    // La app mira si está instalada; jsdom no trae matchMedia
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.history.pushState({}, '', '/dashboard');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it.each([
    ['S1', 31 * 60 * 1000],
    ['S2', 8 * 60 * 60 * 1000],
  ])('%s: con la sesión abierta y sin tocar nada, no se cierra', async (_, ms) => {
    render(<App />);
    expect(await screen.findByText('panel')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(ms));

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
