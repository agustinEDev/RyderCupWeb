import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * `clearAuth` (salir, aviso de otra pestaña, sesión muerta) borra lo de la cuenta
 * con el MISMO registro que los cierres forzados, sin lista propia. Este test no
 * importa el cableado: AuthContext lo carga él mismo, así que un clearAuth nunca
 * se encuentra el registro vacío.
 *
 * El número de Actividad (y el del icono de la aplicación) también se olvida aquí:
 * con la sesión muerta o revocada se borra ya, no en la siguiente comprobación
 * de la sesión (decidido el 9 nov 2026).
 */

const llamadas = vi.hoisted(() => []);
const fallo = vi.hoisted(() => ({ activo: false }));
vi.mock('../services/loUltimoConocido', () => ({
  olvidaLoDeEstaCuenta: () => {
    if (fallo.activo) throw new Error('almacenamiento lleno');
    llamadas.push('loUltimoConocido');
  },
}));
vi.mock('../services/refrescoDeHandicapApuntes', () => ({
  olvidaElRefrescoDeHandicap: () => llamadas.push('refrescoDeHandicap'),
}));
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: () => llamadas.push('novedades') }));

const { AuthProvider } = await import('./AuthContext');
const { useAuthContext } = await import('../hooks/useAuthContext');

describe('clearAuth usa el registro de limpiezas', () => {
  beforeEach(() => {
    llamadas.length = 0;
    fallo.activo = false;
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });
  });

  it('olvida las partidas sin cobertura, el hándicap pendiente y el número de Actividad', () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    act(() => result.current.clearAuth());

    expect(llamadas).toEqual(['loUltimoConocido', 'refrescoDeHandicap', 'novedades']);
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
  });

  it('si una limpieza falla, borra igual el usuario guardado, hace las demás y no corta el cierre', () => {
    fallo.activo = true;
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    expect(() => act(() => result.current.clearAuth())).not.toThrow();

    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(llamadas).toEqual(['refrescoDeHandicap', 'novedades']);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });
});
