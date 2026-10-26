/**
 * LA TABLA — salir de la aplicación (FE #531).
 *
 *   caso                                   | qué pasa
 *   ---------------------------------------|-----------------------------------
 *   salida con recarga (cabecera y perfil)  | el dispositivo queda limpio
 *   el backend no contesta                  | queda limpio igual
 *   salida por navegación (dispositivos)    | queda limpio y va a /login
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { useLogout } from './useLogout';
import { logoutUseCase } from '../composition';
import { broadcastLogout } from '../utils/broadcastAuth';
import { reiniciaLaSesionCompartida, anotaLaSesion } from '../services/sesionCompartida';
import { useAuth } from './useAuth';

vi.mock('../composition', () => ({
  logoutUseCase: { execute: vi.fn() },
}));

// La consulta de la sesión, de verdad, sin red: aquí se cuenta cuántas veces pregunta
const mockPreguntas = [];
vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (url) => {
    mockPreguntas.push(url);
    return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
  },
}));

vi.mock('../utils/broadcastAuth', () => ({
  broadcastLogout: vi.fn(),
}));

// El número de Actividad y el del icono son de la cuenta: salir los olvida (FE-1)
const mockOlvidaLasNovedades = vi.fn();
vi.mock('./useNovedadesDeActividad', () => ({
  olvidaLasNovedades: () => mockOlvidaLasNovedades(),
}));

// Este entorno no trae `localStorage`; los demas tests del proyecto lo ponen igual
const almacen = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', almacen);

// Cada test toca `window.location` y algunos los temporizadores: se devuelven
// aunque falle una aserción, para no arrastrarlos al siguiente (/code-review)
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // Este fichero no trae `localStorage`: se vuelve a poner tras soltar los demás
  vi.stubGlobal('localStorage', almacen);
});

const navigate = vi.fn();
vi.mock('react-router', async () => {
  const real = await vi.importActual('react-router');
  return { ...real, useNavigate: () => navigate };
});

const envoltorio = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

/** Todo lo que una cuenta deja escrito en el dispositivo. */
const siembraLaCuenta = () => {
  localStorage.setItem('user', JSON.stringify({ id: 'u-1', email: 'quien@sea.com' }));
  localStorage.setItem('access_token', 'lo-que-sea');
  localStorage.setItem('rydercup-sesion-conocida', JSON.stringify({ first_name: 'Ana', handicap: 18 }));
  localStorage.setItem('rydercup-ultima-lista', JSON.stringify([{ id: 'qm-1', name: 'Su partida' }]));
  localStorage.setItem('rydercup-ultimo-conocido', JSON.stringify([{ id: 'qm-1', partida: {}, campo: {} }]));
};

const loQueQueda = () =>
  ['user', 'access_token', 'rydercup-sesion-conocida', 'rydercup-ultima-lista', 'rydercup-ultimo-conocido']
    .filter((k) => localStorage.getItem(k) !== null);

describe('useLogout · salir deja el dispositivo limpio (FE #531)', () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockClear();
    logoutUseCase.execute.mockReset();
    vi.stubGlobal('location', { href: '' });
  });

  it('la salida con recarga se lleva lo de la cuenta', async () => {
    // Es por donde salen la cabecera y el perfil, y antes hacían su petición y
    // redirigían sin limpiar: en un móvil compartido quedaban el nombre, el
    // correo, el hándicap y las partidas guardadas para quien entrara después
    siembraLaCuenta();
    logoutUseCase.execute.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });
    await act(async () => { await result.current.logout({ recargarEn: '/' }); });

    expect(loQueQueda()).toEqual([]);
    expect(window.location.href).toBe('/');
  });

  it.each([
    { caso: 'with reload', opciones: { recargarEn: '/' } },
    { caso: 'without reload', opciones: {} },
    { caso: 'when the backend fails', opciones: { recargarEn: '/' }, fallo: new TypeError('Failed to fetch') },
    { caso: 'from another tab', opciones: { desdeOtraPestana: true, skipBackendCall: true } },
  ])('forgets the Activity number and the app icon badge ($caso)', async ({ opciones, fallo }) => {
    mockOlvidaLasNovedades.mockClear();
    if (fallo) logoutUseCase.execute.mockRejectedValue(fallo);
    else logoutUseCase.execute.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });
    await act(async () => { await result.current.logout(opciones); });

    expect(mockOlvidaLasNovedades).toHaveBeenCalledTimes(1);
  });

  it('y también cuando el backend no contesta', async () => {
    // Quedarse sin cobertura al salir no deja los datos puestos
    siembraLaCuenta();
    logoutUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });
    await act(async () => { await result.current.logout({ recargarEn: '/' }); });

    expect(loQueQueda()).toEqual([]);
  });

  it('un backend que se cuelga no deja la salida a medias', async () => {
    // Una petición COLGADA —la cobertura de dos barras del campo— no se rechaza
    // nunca: sin tope, la limpieza no llegaba a ejecutarse
    vi.useFakeTimers();
    siembraLaCuenta();
    logoutUseCase.execute.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });
    let salida;
    act(() => { salida = result.current.logout({ recargarEn: '/' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); await salida; });
    vi.useRealTimers();

    expect(loQueQueda()).toEqual([]);
  });

  it('la salida por navegación también, y va al formulario', async () => {
    siembraLaCuenta();
    logoutUseCase.execute.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });
    await act(async () => { await result.current.logout(); });

    expect(loQueQueda()).toEqual([]);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});

describe('useLogout · el cierre que llega de otra pestaña no hace eco (FE #865)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    siembraLaCuenta();
    vi.stubGlobal('location', { href: '' });
    logoutUseCase.execute.mockResolvedValue(undefined);
  });

  it('O8: «desde otra pestaña» sale recargando a /login, pedida la navegación ANTES de limpiar, sin avisar ni llamar al backend', async () => {
    // Limpiando primero, la consulta de la sesión volvía a preguntar: un 200
    // reescribía los datos y un 401 acababa en «sesión caducada» (/code-review)
    const quitar = localStorage.removeItem;
    let destinoAlLimpiar = null;
    localStorage.removeItem = (k) => {
      if (destinoAlLimpiar === null) destinoAlLimpiar = window.location.href;
      quitar(k);
    };
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout({ desdeOtraPestana: true }));
    localStorage.removeItem = quitar;

    expect(window.location.href).toBe('/login');
    expect(destinoAlLimpiar).toBe('/login');
    expect(navigate).not.toHaveBeenCalled();
    expect(broadcastLogout).not.toHaveBeenCalled();
    expect(logoutUseCase.execute).not.toHaveBeenCalled();
    expect(loQueQueda()).toEqual([]);
  });

  // QA (FE #865-11): la pestaña que se entera iba siempre a /login, aunque
  // estuviera en una página que se ve sin sesión. Ahí se queda, recargando
  it.each([
    ['/terms', '', '/terms'],
    ['/competitions/c1/leaderboard', '?categoria=2', '/competitions/c1/leaderboard?categoria=2'],
    ['/', '', '/'],
  ])('O9: en una pública (%s%s) se queda en ella', async (pathname, search, destino) => {
    vi.stubGlobal('location', { href: '', pathname, search });
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout({ desdeOtraPestana: true }));

    expect(window.location.href).toBe(destino);
    expect(loQueQueda()).toEqual([]);
  });

  // /code-review: recargar el enlace del correo volvería a gastar su token
  it.each(['/verify-email', '/reset-password/abc'])('O9d: en un enlace de un solo uso (%s), a /login', async (pathname) => {
    vi.stubGlobal('location', { href: '', pathname, search: '?token=x' });
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout({ desdeOtraPestana: true }));

    expect(window.location.href).toBe('/login');
  });

  it('O9b: en una privada, a /login como antes', async () => {
    vi.stubGlobal('location', { href: '', pathname: '/profile', search: '' });
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout({ desdeOtraPestana: true }));

    expect(window.location.href).toBe('/login');
  });

  it('O9c: quien sale a mano desde una pública sigue yendo a /login', async () => {
    vi.stubGlobal('location', { href: '', pathname: '/terms', search: '' });
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout());

    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
    expect(window.location.href).toBe('');
  });

  it('O3: quien sale a mano avisa a las demás y llama al backend, una vez cada cosa', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout());

    expect(broadcastLogout).toHaveBeenCalledTimes(1);
    expect(logoutUseCase.execute).toHaveBeenCalledTimes(1);
  });
});

describe('useLogout · las demás pestañas se enteran al momento (FE #865)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    siembraLaCuenta();
    vi.stubGlobal('location', { href: '' });
  });

  it('O5′: quien sale avisa a las demás ANTES de esperar al servidor: inmediato, y aunque la pestaña se cierre durante la espera', async () => {
    logoutUseCase.execute.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    act(() => { result.current.logout(); });
    await act(async () => {});

    expect(broadcastLogout).toHaveBeenCalledTimes(1);
  });

  it('O6: si la llamada al servidor falla, también avisa a las demás', async () => {
    logoutUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(async () => { await result.current.logout({ recargarEn: '/' }); });

    expect(broadcastLogout).toHaveBeenCalledTimes(1);
  });

  it('O6b: sin llamada al servidor (dispositivo ya revocado), avisa igual', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(async () => { await result.current.logout({ skipBackendCall: true }); });

    expect(logoutUseCase.execute).not.toHaveBeenCalled();
    expect(broadcastLogout).toHaveBeenCalledTimes(1);
  });
});

describe('useLogout · al salir recargando no se vuelve a preguntar por la sesión (FE #865)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    siembraLaCuenta();
    reiniciaLaSesionCompartida();
    mockPreguntas.length = 0;
    logoutUseCase.execute.mockResolvedValue(undefined);
    vi.stubGlobal('location', { href: '' });
  });
  afterEach(() => reiniciaLaSesionCompartida());

  // Como en la aplicación: un guardia con `useAuth` montado, que es quien vuelve
  // a preguntar en cuanto la sesión se olvida (/code-review)
  const ConGuardia = ({ salida }) => {
    useAuth();
    const { logout } = useLogout();
    salida.current = logout;
    return null;
  };
  const conGuardia = () => {
    anotaLaSesion({ id: 'u-1' });
    const salida = { current: null };
    render(<ConGuardia salida={salida} />, { wrapper: envoltorio });
    return salida;
  };

  it('Q1′: con un guardia montado, la salida con recarga no vuelve a preguntar por la sesión', async () => {
    const salida = conGuardia();

    await act(() => salida.current({ recargarEn: '/' }));
    await act(async () => {});

    expect(mockPreguntas).toEqual([]);
    expect(loQueQueda()).toEqual([]);
  });

  it('Q3′: tampoco la pestaña que se entera de otra (sale recargando)', async () => {
    const salida = conGuardia();

    await act(() => salida.current({ desdeOtraPestana: true }));
    await act(async () => {});

    expect(mockPreguntas).toEqual([]);
  });

  it('Q2: la salida sin recarga sí vuelve a preguntar (si no, los guardias se quedarían cargando)', async () => {
    const salida = conGuardia();

    await act(() => salida.current());
    await act(async () => {});

    expect(mockPreguntas).toHaveLength(1);
  });
});

