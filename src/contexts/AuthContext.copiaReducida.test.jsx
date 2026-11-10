import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * El usuario que AuthContext guarda en `localStorage.user` va reducido (fase 3, FE-06):
 * sin correo, correo pendiente, género, hándicap ni país. Una copia completa de antes se
 * reescribe al arrancar. Sus lectores (este contexto, `vueltaTrasEntrar` y el
 * interceptor) solo miran `id` o si hay algo.
 */
vi.mock('../services/loUltimoConocido', () => ({ olvidaLoDeEstaCuenta: vi.fn(), abreLoGuardadoParaLaCuenta: vi.fn() }));
vi.mock('../services/refrescoDeHandicapApuntes', () => ({ olvidaElRefrescoDeHandicap: vi.fn() }));
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: vi.fn() }));

const { AuthProvider } = await import('./AuthContext');
const { useAuthContext } = await import('../hooks/useAuthContext');
const { default: User } = await import('../domain/entities/User');

const DTO = {
  id: 'u-1',
  email: 'ana@example.com',
  pending_email: 'nueva@example.com',
  first_name: 'Ana',
  last_name: 'Prueba',
  gender: 'FEMALE',
  handicap: 12.4,
  country_code: 'ES',
  email_verified: true,
};
const SECRETOS = ['ana@example.com', 'nueva@example.com', 'FEMALE', '12.4', '"ES"'];

describe('AuthContext · copia reducida en localStorage.user (fase 3)', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('al entrar guarda solo lo permitido', () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    act(() => result.current.setUser(new User(DTO)));

    const guardado = globalThis.localStorage.getItem('user');
    for (const secreto of SECRETOS) expect(guardado).not.toContain(secreto);
    expect(JSON.parse(guardado)).toMatchObject({ id: 'u-1', firstName: 'Ana', emailVerified: true });
    // En memoria, completo
    expect(result.current.user.email.getValue()).toBe('ana@example.com');
  });

  it('una copia completa de antes se reescribe reducida al arrancar', () => {
    globalThis.localStorage.setItem('user', JSON.stringify(new User(DTO)));

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    const guardado = globalThis.localStorage.getItem('user');
    for (const secreto of SECRETOS) expect(guardado).not.toContain(secreto);
    expect(result.current.user).toMatchObject({ id: 'u-1' });
  });
});

describe('AuthContext · reescribir la copia vieja falla (revisión de la fase 3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('con el almacenamiento lleno, se queda con la copia reducida en memoria', () => {
    const consola = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    const vieja = JSON.stringify(new User(DTO));
    vi.stubGlobal('localStorage', {
      getItem: (clave) => (clave === 'user' ? vieja : null),
      setItem: () => {
        throw new globalThis.DOMException('quota', 'QuotaExceededError');
      },
      removeItem: vi.fn(),
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });

    expect(result.current.user).toMatchObject({ id: 'u-1', firstName: 'Ana' });
    expect(JSON.stringify(result.current.user)).not.toContain('ana@example.com');
    consola.mockRestore();
  });
});
