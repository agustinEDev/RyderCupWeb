import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * Con los Términos sin aceptar, el backend responde 403 a todo salvo
 * current-user, accept-terms y logout. App.jsx no puede arrancar nada que llame
 * a la API —el vaciado de la cola, el envío de muestras, el monitor de
 * dispositivos— ni pintar la barra inferior; el refresco del token sí sigue,
 * porque refresh-token no está afectado.
 *
 *   caso                          | cola / muestras / dispositivos | refresco | barra
 *   ------------------------------|--------------------------------|----------|------
 *   Términos pendientes           | apagados                       | encendido| no
 *   aceptados                     | encendidos                     | encendido| sí
 *
 * La barra publica su hueco en `--alto-barra-inferior` (en <html>) para que las
 * páginas de pantalla completa lo descuenten: solo cuando se pinta, 0px si no.
 */
const llamadas = vi.hoisted(() => ({ cola: [], muestras: [], dispositivos: [], refresco: [] }));
const pendientes = vi.hoisted(() => ({ valor: false }));

vi.mock('./hooks/useLogout', () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock('./hooks/useAuth', () => ({
  getUserData: vi.fn().mockResolvedValue({ id: 'u-1', email: 'ana@example.com' }),
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}));
vi.mock('./hooks/useTerminosPendientes', () => ({ useTerminosPendientes: () => pendientes.valor }));
vi.mock('./hooks/useVaciadoDeLaCola', () => ({ useVaciadoDeLaCola: (o) => { llamadas.cola.push(o.activo); } }));
vi.mock('./hooks/useEnvioDeMuestras', () => ({ useEnvioDeMuestras: (o) => { llamadas.muestras.push(o.activo); } }));
vi.mock('./hooks/useDeviceRevocationMonitor', () => ({
  useDeviceRevocationMonitor: (o) => { llamadas.dispositivos.push(o.enabled); },
}));
vi.mock('./hooks/useProactiveTokenRefresh', () => ({ default: (o) => { llamadas.refresco.push(o.enabled); } }));
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

const ultimo = (lista) => lista.at(-1);
const hueco = () => document.documentElement.style.getPropertyValue('--alto-barra-inferior');

describe('App · nada que llame a la API con los Términos pendientes', () => {
  beforeEach(() => {
    for (const lista of Object.values(llamadas)) lista.length = 0;
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.history.pushState({}, '', '/dashboard');
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.pushState({}, '', '/');
  });

  it('pendientes: cola, muestras y dispositivos apagados; el refresco sigue; sin barra', async () => {
    pendientes.valor = true;
    render(<App />);
    await screen.findByText('panel');

    expect(llamadas.cola).not.toContain(true);
    expect(llamadas.muestras).not.toContain(true);
    expect(llamadas.dispositivos).not.toContain(true);
    expect(ultimo(llamadas.refresco)).toBe(true);
    expect(screen.queryByText('barra inferior')).toBeNull();
    // Con la sesión ya confirmada (el refresco se enciende con ella): el hueco
    // no sale de la sesión sino de la barra
    await vi.waitFor(() => expect(ultimo(llamadas.refresco)).toBe(true));
    expect(hueco()).toBe('0px');
  });

  it('aceptados: todo encendido, como siempre', async () => {
    pendientes.valor = false;
    render(<App />);
    await screen.findByText('panel');

    await vi.waitFor(() => expect(ultimo(llamadas.cola)).toBe(true));
    expect(ultimo(llamadas.muestras)).toBe(true);
    expect(ultimo(llamadas.dispositivos)).toBe(true);
    expect(ultimo(llamadas.refresco)).toBe(true);
    expect(screen.getByText('barra inferior')).toBeInTheDocument();
    expect(hueco()).toBe('calc(4rem + env(safe-area-inset-bottom))');
  });

  it('al desmontarse App, el hueco no se queda publicado', async () => {
    pendientes.valor = false;
    render(<App />);
    await screen.findByText('barra inferior');
    cleanup();

    expect(hueco()).toBe('');
  });
});
