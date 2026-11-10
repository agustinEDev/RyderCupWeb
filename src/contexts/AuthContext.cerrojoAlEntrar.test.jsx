import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
// SIN mocks: el registro de limpiezas de verdad, con `loUltimoConocido` de verdad
import '../composition/limpiezaAlCerrarLaSesion';
import { olvidaLoGuardadoDeLaCuenta } from '../composition/http';
import { recuerda, precarga, olvidaTodo } from '../services/loUltimoConocido';
import { AuthProvider } from './AuthContext';
import { useAuthContext } from '../hooks/useAuthContext';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';
import User from '../domain/entities/User';

/**
 * Revisión de la fase 3 (ALTA): la limpieza de los caminos «sin sesión» que NO salen de
 * la página (la pantalla de entrar, el 401 al arrancar) dejaba puesto el cerrojo de
 * `loUltimoConocido` hasta recargar. Tras entrar con contraseña (navegación sin
 * recarga), `recuerda` y `precarga` devolvían false y la anotación sin cobertura se
 * quedaba sin partidas guardadas (FE #615 / #529).
 *
 * Arreglo: el cerrojo dura hasta que entra una cuenta en esta carga (`setUser`).
 *
 *   K1 limpieza de la pantalla de entrar → setUser → se puede guardar otra vez
 *   K2 lo mismo pasando por el hook de verdad (login sin usuario guardado)
 *   K3 sin entrar nadie, el cerrojo sigue (lo de los cierres duros no cambia)
 */
const USUARIO = new User({ id: 'u-1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Prueba' });
const lo = (id) => ({ partida: { id }, campo: null });

describe('El cerrojo de lo guardado se levanta al entrar una cuenta (revisión fase 3)', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    olvidaTodo();
  });

  it('K1: limpieza → setUser → recuerda y precarga vuelven a guardar', () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper: AuthProvider });
    expect(recuerda('m-1', lo('m-1'))).toBe(true);

    olvidaLoGuardadoDeLaCuenta();
    act(() => result.current.setUser(USUARIO));

    expect(recuerda('m-2', lo('m-2'))).toBe(true);
    expect(precarga('m-3', lo('m-3'))).toBe(true);
  });

  it('K2: por la pantalla de entrar de verdad, sin usuario guardado', () => {
    const envoltorio = ({ children }) => (
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );
    const { result } = renderHook(
      () => ({ comprobando: useRedirectIfAuthenticated(), auth: useAuthContext() }),
      { wrapper: envoltorio }
    );

    act(() => result.current.auth.setUser(USUARIO));

    expect(recuerda('m-2', lo('m-2'))).toBe(true);
  });

  it('K3: sin entrar nadie, el cerrojo sigue puesto', () => {
    olvidaLoGuardadoDeLaCuenta();

    expect(recuerda('m-2', lo('m-2'))).toBe(false);
  });
});
