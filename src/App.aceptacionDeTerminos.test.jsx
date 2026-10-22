import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * Integración (revisión, punto 7): la sesión compartida REAL, `useAuth`,
 * `ProtectedRoute` y la pantalla de aceptación, entrando por las rutas de
 * App.jsx. Lo único falso es la red (que no debe tocarse) y el caso de uso de
 * aceptar.
 *
 *   caso                                           | qué se ve
 *   -----------------------------------------------|--------------------------------------
 *   sesión con terms_accepted false, a /dashboard  | la pantalla de aceptar, sin cabecera ni avatar ni peticiones
 *   se entra directamente a /accept-terms          | la pantalla (la ruta existe)
 *   desde ella, «Gestionar mis dispositivos»       | la gestión de dispositivos, sin rebotar
 *   se aceptan                                     | la sesión queda aceptada y se llega al panel
 */
const aceptar = vi.fn();

vi.mock('./composition', async (original) => ({
  ...(await original()),
  acceptTermsUseCase: { execute: (...a) => aceptar(...a) },
}));
vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('./hooks/useVaciadoDeLaCola', () => ({ useVaciadoDeLaCola: () => {} }));
vi.mock('./hooks/useEnvioDeMuestras', () => ({ useEnvioDeMuestras: () => {} }));
// El número de Actividad se pide al montarse la barra inferior (FE-1): es red,
// como las dos de arriba, y aquí la red no se toca
vi.mock('./hooks/useNovedadesDeActividad', () => ({
  useNovedadesDeActividad: () => 0,
  useVigilanciaDeNovedades: () => {},
  ponLasNovedadesACero: () => {},
  olvidaLasNovedades: () => {},
}));
vi.mock('./hooks/useDeviceRevocationMonitor', () => ({ useDeviceRevocationMonitor: () => {} }));
vi.mock('./hooks/useProactiveTokenRefresh', () => ({ default: () => {} }));
vi.mock('./hooks/useCortinaDeArranque', () => ({ useCortinaDeArranque: () => {} }));
vi.mock('./hooks/useVolverArriba', () => ({ useVolverArriba: () => {} }));
vi.mock('./utils/sentryHelpers', () => ({ setUserContext: () => {}, captureError: () => {} }));
vi.mock('./components/ui/InstallBanner', () => ({ default: () => null }));
vi.mock('./components/ui/AvisoSinConexion', () => ({ default: () => null }));
vi.mock('./pages/Dashboard', () => ({ default: () => <p>panel</p> }));
vi.mock('./pages/DeviceManagement', () => ({ default: () => <p>mis dispositivos</p> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es', changeLanguage: vi.fn() } }),
}));
vi.mock('@sentry/react', async (original) => ({
  ...(await original()),
  withProfiler: (c) => c,
  withSentryReactRouterV7Routing: (c) => c,
}));

const App = (await import('./App')).default;
const { anotaLaSesion, olvidaLaSesion, loQueHaySobreLaSesion } = await import('./services/sesionCompartida');

const USUARIO = { id: 'u-1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Prueba', is_admin: false };

// Las pantallas se cargan perezosas: con la suite entera en marcha, el primer
// import tarda más que el segundo de espera por defecto de `findBy`
const ESPERA = { timeout: 5000 };
const titulo = () => screen.findByRole('heading', { level: 1, name: 'acceptTermsPage.title' }, ESPERA);

describe('App · aceptación de los Términos, de punta a punta', () => {
  let red;

  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    red = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no debería llamarse'));
    act(() => {
      olvidaLaSesion();
      anotaLaSesion({ ...USUARIO, terms_accepted: false, terms_version_required: '2026-10-20' });
    });
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
    act(() => olvidaLaSesion());
    vi.restoreAllMocks();
  });

  it('con los Términos pendientes, el panel lleva a aceptarlos: sin cabecera, sin avatar y sin pedir nada', async () => {
    window.history.pushState({}, '', '/dashboard');
    const { container } = render(<App />);

    expect(await titulo()).toBeInTheDocument();
    expect(screen.queryByText('panel')).toBeNull();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(red).not.toHaveBeenCalled();
  });

  it('la ruta /accept-terms existe y se entra directamente', async () => {
    window.history.pushState({}, '', '/accept-terms');
    render(<App />);

    expect(await titulo()).toBeInTheDocument();
  });

  it('desde la pantalla se llega a gestionar los dispositivos sin rebotar', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await titulo();

    fireEvent.click(screen.getByRole('link', { name: 'acceptTermsPage.devices' }));

    expect(await screen.findByText('mis dispositivos', {}, ESPERA)).toBeInTheDocument();
  });

  it('al aceptar, la sesión queda aceptada y se llega al panel', async () => {
    aceptar.mockResolvedValue({ ...USUARIO, is_admin: true, terms_accepted: true });
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await titulo();

    fireEvent.click(screen.getByRole('checkbox', { name: /register\.acceptTerms/ }));
    fireEvent.click(screen.getByRole('button', { name: 'acceptTermsPage.acceptButton' }));

    expect(await screen.findByText('panel', {}, ESPERA)).toBeInTheDocument();
    expect(loQueHaySobreLaSesion().user).toMatchObject({ terms_accepted: true, is_admin: true });
    expect(red).not.toHaveBeenCalled();
  });
});
