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
globalThis.localStorage = almacen;

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
