import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

/**
 * Crear y editar una competición son la misma pantalla en dos rutas (T3-18). Sin
 * una instancia propia por ruta, pasar de editar —con la ficha cargando— a crear
 * reutilizaba la de editar: la espera de la edición se quedaba puesta para siempre
 * y el formulario de «crear» heredaba lo de la edición.
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
}));

const instancias = vi.hoisted(() => ({ n: 0 }));
vi.mock('./pages/CreateCompetition', async () => {
  const { useState } = await import('react');
  return {
    default: function PantallaDeCompeticion() {
      const [esta] = useState(() => ++instancias.n);
      return <p data-testid="pantalla-de-competicion">{`instancia ${esta}`}</p>;
    },
  };
});

const App = (await import('./App')).default;

const ve = async (ruta) => {
  await act(async () => {
    window.history.pushState({}, '', ruta);
    window.dispatchEvent(new globalThis.PopStateEvent('popstate'));
  });
};

describe('App · crear y editar competición, cada una con su instancia', () => {
  beforeEach(() => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    instancias.n = 0;
    sesion.usuario = { id: 'u-1' };
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it('T3-18: de editar a crear se monta una pantalla nueva, sin la espera ni los datos de la edición', async () => {
    window.history.pushState({}, '', '/competitions/c-1/edit');
    render(<App />);
    expect(await screen.findByTestId('pantalla-de-competicion')).toHaveTextContent('instancia 1');

    await ve('/competitions/create');

    expect(await screen.findByTestId('pantalla-de-competicion')).toHaveTextContent('instancia 2');
  });

  it('T3-18b: de editar una a editar otra se monta una pantalla nueva', async () => {
    window.history.pushState({}, '', '/competitions/c-1/edit');
    render(<App />);
    expect(await screen.findByTestId('pantalla-de-competicion')).toHaveTextContent('instancia 1');

    await ve('/competitions/c-2/edit');

    expect(await screen.findByTestId('pantalla-de-competicion')).toHaveTextContent('instancia 2');
  });

  it('T3-18: y de crear a editar, también', async () => {
    window.history.pushState({}, '', '/competitions/create');
    render(<App />);
    expect(await screen.findByTestId('pantalla-de-competicion')).toHaveTextContent('instancia 1');

    await ve('/competitions/c-1/edit');

    expect(await screen.findByTestId('pantalla-de-competicion')).toHaveTextContent('instancia 2');
  });
});
