/**
 * Tests de useRedirectIfAuthenticated (FE #305)
 *
 * Lo que se vigila aquí no es tanto "redirige" como las dos formas de meter la
 * pata: redirigir por lo que dice `localStorage` (bucle con `ProtectedRoute`) y
 * dar por muerta una sesión que solo tenía el access caducado (la PWA abierta
 * horas después, que es el caso de la issue).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRedirectIfAuthenticated } from './useRedirectIfAuthenticated';

const navigate = vi.fn();
let locationState = null;

vi.mock('react-router', () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ state: locationState }),
}));

const setUser = vi.fn();
const clearAuth = vi.fn();
let storedUser = null;

vi.mock('./useAuthContext', () => ({
  useAuthContext: () => ({ user: storedUser, setUser, clearAuth }),
}));

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  refreshAccessToken: vi.fn(),
}));

const { refreshAccessToken } = await import('../utils/tokenRefreshInterceptor');

const FRESH_USER = { id: 'u1', firstName: 'Agustín' };

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });
const unauthorized = () => ({ ok: false, status: 401, json: async () => ({}) });

describe('useRedirectIfAuthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedUser = null;
    locationState = null;
    globalThis.fetch = vi.fn();
  });

  describe('sin sesión guardada', () => {
    it('pinta el formulario sin tocar la red', () => {
      const { result } = renderHook(() => useRedirectIfAuthenticated());

      expect(result.current).toBe(false);
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('con sesión guardada', () => {
    beforeEach(() => {
      storedUser = { id: 'u1' };
    });

    it('oculta el formulario mientras comprueba', () => {
      globalThis.fetch.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      expect(result.current).toBe(true);
    });

    it('lleva al dashboard cuando el backend confirma la sesión', async () => {
      globalThis.fetch.mockResolvedValue(okResponse(FRESH_USER));

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
      expect(setUser).toHaveBeenCalledWith(FRESH_USER);
      // Sigue oculto: la página se va y bajarlo enseñaría el formulario
      expect(result.current).toBe(true);
    });

    it('renueva el access caducado en vez de dar la sesión por perdida', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(okResponse(FRESH_USER));
      refreshAccessToken.mockResolvedValue(true);

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('vuelve a donde iba el usuario cuando ProtectedRoute lo desvió', async () => {
      locationState = { from: { pathname: '/competitions/42' } };
      globalThis.fetch.mockResolvedValue(okResponse(FRESH_USER));

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/competitions/42', { replace: true })
      );
    });

    it('ignora un destino externo disfrazado de ruta (CWE-601)', async () => {
      locationState = { from: { pathname: '//evil.example' } };
      globalThis.fetch.mockResolvedValue(okResponse(FRESH_USER));

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    });

    it('tira el usuario guardado y enseña el formulario si la sesión no se recupera', async () => {
      globalThis.fetch.mockResolvedValue(unauthorized());
      refreshAccessToken.mockRejectedValue(new Error('Refresh token expired'));

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(result.current).toBe(false));
      expect(clearAuth).toHaveBeenCalledTimes(1);
      // Lo que evita el bucle /login -> /dashboard -> /login
      expect(navigate).not.toHaveBeenCalled();
    });

    it('no redirige si la red falla', async () => {
      globalThis.fetch.mockRejectedValue(new Error('Network down'));

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(result.current).toBe(false));
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
