import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * `clearAuth` (salir, aviso de otra pestaña, sesión muerta) borra lo de la cuenta
 * con el MISMO registro que los cierres forzados, sin lista propia. Este test no
 * importa el cableado: AuthContext lo carga él mismo, así que un clearAuth nunca
 * se encuentra el registro vacío.
 *
 * El número de Actividad NO se olvida aquí (solo en los cierres forzados), como
 * antes: el botón de salir ya lo olvida en useLogout, y adelantarlo en los demás
 * caminos cambiaría cuándo se borra el número del icono de la aplicación.
 */

const llamadas = vi.hoisted(() => []);
vi.mock('../services/loUltimoConocido', () => ({ olvidaLoDeEstaCuenta: () => llamadas.push('loUltimoConocido') }));
vi.mock('../services/refrescoDeHandicapApuntes', () => ({
  olvidaElRefrescoDeHandicap: () => llamadas.push('refrescoDeHandicap'),
}));
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: () => llamadas.push('novedades') }));

const { AuthProvider } = await import('./AuthContext');
const { useAuthContext } = await import('../hooks/useAuthContext');

describe('clearAuth usa el registro de limpiezas', () => {
  beforeEach(() => {
    llamadas.length = 0;
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() });
  });

  it('olvida las partidas sin cobertura y el hándicap pendiente, no el número de Actividad', () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    act(() => result.current.clearAuth());

    expect(llamadas).toEqual(['loUltimoConocido', 'refrescoDeHandicap']);
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
  });
});
