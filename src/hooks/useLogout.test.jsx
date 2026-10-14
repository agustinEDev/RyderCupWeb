/**
 * LA TABLA — salir de la aplicación (FE #531).
 *
 *   caso                                   | qué pasa
 *   ---------------------------------------|-----------------------------------
 *   salida con recarga (cabecera y perfil)  | el dispositivo queda limpio
 *   el backend no contesta                  | queda limpio igual
 *   salida por navegación (dispositivos)    | queda limpio y va a /login
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { useLogout } from './useLogout';
import { logoutUseCase } from '../composition';
import { broadcastLogout } from '../utils/broadcastAuth';

vi.mock('../composition', () => ({
  logoutUseCase: { execute: vi.fn() },
}));

vi.mock('../utils/broadcastAuth', () => ({
  broadcastLogout: vi.fn(),
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
    delete window.location;
    window.location = { href: '' };
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
    logoutUseCase.execute.mockResolvedValue(undefined);
  });

  it('O1/O2: «desde otra pestaña» limpia y va al formulario, sin volver a avisar ni llamar al backend', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout({ desdeOtraPestana: true }));

    expect(broadcastLogout).not.toHaveBeenCalled();
    expect(logoutUseCase.execute).not.toHaveBeenCalled();
    expect(loQueQueda()).toEqual([]);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('O3: quien sale a mano avisa a las demás y llama al backend, una vez cada cosa', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    await act(() => result.current.logout());

    expect(broadcastLogout).toHaveBeenCalledTimes(1);
    expect(logoutUseCase.execute).toHaveBeenCalledTimes(1);
  });
});

describe('useLogout · las demás pestañas se enteran cuando el servidor ya cerró (FE #865)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    siembraLaCuenta();
    delete window.location;
    window.location = { href: '' };
  });

  it('O5: avisa a las demás DESPUÉS de que el servidor responda (antes, su consulta de sesión aún valía)', async () => {
    let responde;
    logoutUseCase.execute.mockReturnValue(new Promise((r) => { responde = r; }));
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    let salida;
    act(() => { salida = result.current.logout(); });
    await act(async () => {});
    expect(broadcastLogout).not.toHaveBeenCalled();

    await act(async () => { responde(); await salida; });
    expect(broadcastLogout).toHaveBeenCalledTimes(1);
  });

  it('O5b: si el servidor no contesta, avisa al vencer el tope (no se quedan sin enterarse)', async () => {
    vi.useFakeTimers();
    logoutUseCase.execute.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLogout(), { wrapper: envoltorio });

    let salida;
    act(() => { salida = result.current.logout({ recargarEn: '/' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4_999); });
    expect(broadcastLogout).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); await salida; });
    vi.useRealTimers();

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

