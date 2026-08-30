/**
 * Tests de useRedirectIfAuthenticated (FE #305)
 *
 * Lo que se vigila aquí no es tanto "redirige" como las formas de meter la pata:
 * redirigir por lo que dice `localStorage` (bucle con `ProtectedRoute`), dar por
 * muerta una sesión que solo tenía el access caducado (la PWA abierta horas
 * después, que es el caso de la issue), y confundir un tropiezo de red con un
 * "no" del backend, que dejaría al usuario sin la redirección durante días.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
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

vi.mock('../utils/deviceRevocationLogout', () => ({
  isDeviceRevoked: vi.fn(() => false),
  handleDeviceRevocationLogout: vi.fn(),
  clearDeviceRevocationFlag: vi.fn(),
}));

const { refreshAccessToken } = await import('../utils/tokenRefreshInterceptor');
const { isDeviceRevoked, handleDeviceRevocationLogout } = await import(
  '../utils/deviceRevocationLogout'
);

/** Forma que devuelve el backend: snake_case, la que espera la entidad User */
const BACKEND_USER = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  email: 'agustin@example.com',
  first_name: 'Agustín',
  last_name: 'Estévez',
  email_verified: true,
};

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
  clone() {
    return this;
  },
});

const errorResponse = (status) => ({
  ok: false,
  status,
  json: async () => ({ detail: 'nope' }),
  clone() {
    return this;
  },
});

/** El 401 con el que el backend dice que el refresh token ya no vale */
const rejectedRefresh = () => {
  const error = new Error('Refresh token expired');
  error.response = { status: 401 };
  return error;
};

describe('useRedirectIfAuthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDeviceRevoked.mockReturnValue(false);
    storedUser = null;
    locationState = null;
    // `restoreAllMocks` no deshace una asignación directa a `globalThis`, así
    // que el fetch simulado sobreviviría a la suite
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('sin sesión guardada', () => {
    it('pinta el formulario sin tocar la red', () => {
      const { result } = renderHook(() => useRedirectIfAuthenticated());

      expect(result.current).toBe(false);
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('desactivado', () => {
    beforeEach(() => {
      storedUser = { id: 'u1' };
    });

    it('no toca la red ni redirige aunque haya sesión guardada', () => {
      // La portada lo usa así en el navegador: ahí no debe rebotar al panel, y
      // tampoco gastar una petición autenticada en cada visita anónima a la
      // página pública más visitada.
      const { result } = renderHook(() => useRedirectIfAuthenticated({ enabled: false }));

      expect(result.current).toBe(false);
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('con sesión guardada', () => {
    beforeEach(() => {
      storedUser = { id: 'u1' };
    });

    it('deja la sesión confirmada anotada, para que el destino no vuelva a preguntar', async () => {
      // Sin esto, `ProtectedRoute` pintaba su espera gris a pantalla completa en
      // cada arranque con sesion y abria una SEGUNDA consulta, justo despues de
      // que esta acabara de confirmarla (FE #489)
      const { reiniciaLaSesionCompartida, loQueHaySobreLaSesion } = await import('../services/sesionCompartida');
      reiniciaLaSesionCompartida();
      const delBackend = { id: 'u1', email: 'a@b.c', first_name: 'Agustin', last_name: 'Estevez' };
      globalThis.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => delBackend });

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalled());
      // El DTO tal cual, no la entidad de dominio: quien lee de `useAuth` espera
      // `first_name`, no `firstName`
      expect(loQueHaySobreLaSesion().user).toEqual(delBackend);
      expect(loQueHaySobreLaSesion().resuelta).toBe(true);
    });

    it('oculta el formulario mientras comprueba', () => {
      globalThis.fetch.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      expect(result.current).toBe(true);
    });

    describe('entrarSinRed, para el arranque de la aplicación instalada', () => {
      it('entra con la sesión guardada si no se pudo PREGUNTAR', async () => {
        // En el campo no hay cobertura y esta es la pantalla de entrada: dejar
        // un formulario que no se puede enviar deja al usuario sin poder anotar,
        // que es el caso de uso del producto
        globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

        renderHook(() => useRedirectIfAuthenticated({ entrarSinRed: true }));

        await waitFor(() =>
          expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true })
        );
      });

      afterEach(async () => {
        // Estos casos tocan estado de módulo compartido: dejarlo tocado hacía
        // que el siguiente pasara por contaminación y no por lo que afirma
        const { olvidaElEstadoDeConexion } = await import('../services/estadoDeConexion');
        olvidaElEstadoDeConexion();
      });

      it('y que sí la hay en cuanto contesta, aunque tarde', async () => {
        // La otra mitad: sin esto el arranque solo sabía dar malas noticias, y
        // en el formulario de acceso el estado se quedaba en «sin conexión»
        // sin nada que lo corrigiera
        const { hayConexion, apuntaFalloDeRed, olvidaElEstadoDeConexion } =
          await import('../services/estadoDeConexion');
        olvidaElEstadoDeConexion();
        apuntaFalloDeRed();

        globalThis.fetch.mockResolvedValue(okResponse({ id: 'u1' }));

        renderHook(() => useRedirectIfAuthenticated({ entrarSinRed: true }));

        await waitFor(() => expect(hayConexion()).toBe(true));
      });

      it('deja dicho que no hay conexión cuando la comprobación se cuelga', async () => {
        // Esta petición va con `fetch` a pelo, no por el interceptor, así que
        // es el único sitio que ve esta caída. Sin esto se entraba «sin red»
        // mientras la aplicación seguía creyendo que había conexión (FE #515)
        const { hayConexion, olvidaElEstadoDeConexion } = await import('../services/estadoDeConexion');
        olvidaElEstadoDeConexion();
        vi.useFakeTimers();
        try {
          globalThis.fetch.mockReturnValue(new Promise(() => {}));

          renderHook(() => useRedirectIfAuthenticated({ entrarSinRed: true }));
          await act(async () => { await vi.advanceTimersByTimeAsync(6000); });

          expect(hayConexion()).toBe(false);
        } finally {
          vi.useRealTimers();
        }
      });

      it('pero NO si el backend rechaza la sesión', async () => {
        // Aquí sí hubo respuesta y dice que no: entrar seria colar a alguien
        // cuya sesión ya no vale
        globalThis.fetch.mockResolvedValue(errorResponse(401));

        const { result } = renderHook(() => useRedirectIfAuthenticated({ entrarSinRed: true }));

        await waitFor(() => expect(result.current).toBe(false));
        expect(navigate).not.toHaveBeenCalled();
      });

      it('entra también cuando la petición se queda COLGADA', async () => {
        // Este es el caso de verdad sin cobertura: la peticion no falla rapido,
        // se cuelga hasta agotar el plazo. Cubrir solo el rechazo dejaba el
        // arreglo sirviendo para el caso raro y no para el habitual.
        vi.useFakeTimers();
        globalThis.fetch.mockReturnValue(new Promise(() => {}));

        renderHook(() => useRedirectIfAuthenticated({ entrarSinRed: true }));

        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });

        expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });

      it('sin la opción, un corte de red sigue enseñando el formulario', async () => {
        globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

        const { result } = renderHook(() => useRedirectIfAuthenticated());

        await waitFor(() => expect(result.current).toBe(false));
        expect(navigate).not.toHaveBeenCalled();
      });
    });

    it('lleva al dashboard cuando el backend confirma la sesión', async () => {
      globalThis.fetch.mockResolvedValue(okResponse(BACKEND_USER));

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
      // Sigue oculto: la página se va y bajarlo enseñaría el formulario
      expect(result.current).toBe(true);
    });

    it('guarda la entidad de dominio, no el DTO del backend', async () => {
      globalThis.fetch.mockResolvedValue(okResponse(BACKEND_USER));

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(setUser).toHaveBeenCalledTimes(1));
      const stored = setUser.mock.calls[0][0];
      expect(stored.firstName).toBe('Agustín');
      expect(stored.emailVerified).toBe(true);
    });

    it('renueva el access caducado en vez de dar la sesión por perdida', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(errorResponse(401))
        .mockResolvedValueOnce(okResponse(BACKEND_USER));
      refreshAccessToken.mockResolvedValue(true);

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('vuelve a donde iba el usuario cuando ProtectedRoute lo desvió', async () => {
      locationState = { from: { pathname: '/competitions/42' } };
      globalThis.fetch.mockResolvedValue(okResponse(BACKEND_USER));

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/competitions/42', { replace: true })
      );
    });

    it('ignora un destino externo disfrazado de ruta (CWE-601)', async () => {
      locationState = { from: { pathname: '//evil.example' } };
      globalThis.fetch.mockResolvedValue(okResponse(BACKEND_USER));

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    });

    it('no se queda en la propia pantalla de acceso', async () => {
      // Navegar a donde ya estamos dejaría `isChecking` arriba para siempre: el
      // cartel de carga se queda y el formulario no vuelve
      locationState = { from: { pathname: '/login' } };
      globalThis.fetch.mockResolvedValue(okResponse(BACKEND_USER));

      renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    });

    describe('cuando la comprobación no sale bien', () => {
      it('tira el usuario guardado si el backend rechaza el refresh', async () => {
        globalThis.fetch.mockResolvedValue(errorResponse(401));
        refreshAccessToken.mockRejectedValue(rejectedRefresh());

        const { result } = renderHook(() => useRedirectIfAuthenticated());

        await waitFor(() => expect(result.current).toBe(false));
        expect(clearAuth).toHaveBeenCalledTimes(1);
        // Lo que evita el bucle /login -> /dashboard -> /login
        expect(navigate).not.toHaveBeenCalled();
      });

      it('tira el usuario guardado si sigue habiendo 401 tras renovar', async () => {
        // El refresco funciona pero la sesión ya no vale: es el único camino que
        // llega al 401 definitivo, y hasta ahora ningún test pasaba por él
        globalThis.fetch.mockResolvedValue(errorResponse(401));
        refreshAccessToken.mockResolvedValue(true);

        const { result } = renderHook(() => useRedirectIfAuthenticated());

        await waitFor(() => expect(result.current).toBe(false));
        expect(refreshAccessToken).toHaveBeenCalledTimes(1);
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        expect(clearAuth).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();
      });

      it('conserva el usuario guardado si lo que falla es la red', async () => {
        globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

        const { result } = renderHook(() => useRedirectIfAuthenticated());

        await waitFor(() => expect(result.current).toBe(false));
        // Borrarlo dejaría al usuario sin redirección los 7 días que le quedan
        // al refresh token, por un corte de red de un segundo
        expect(clearAuth).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
      });

      it('conserva el usuario guardado si el backend está caído', async () => {
        globalThis.fetch.mockResolvedValue(errorResponse(502));

        const { result } = renderHook(() => useRedirectIfAuthenticated());

        await waitFor(() => expect(result.current).toBe(false));
        expect(clearAuth).not.toHaveBeenCalled();
      });

      it('enseña el formulario si el backend no contesta a tiempo', async () => {
        vi.useFakeTimers();
        globalThis.fetch.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useRedirectIfAuthenticated());
        expect(result.current).toBe(true);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });

        expect(result.current).toBe(false);
        expect(clearAuth).not.toHaveBeenCalled();
      });
    });

    it('avisa de la revocación del dispositivo en vez de dejar un formulario mudo', async () => {
      globalThis.fetch.mockResolvedValue(errorResponse(401));
      isDeviceRevoked.mockReturnValue(true);

      const { result } = renderHook(() => useRedirectIfAuthenticated());

      await waitFor(() => expect(handleDeviceRevocationLogout).toHaveBeenCalledTimes(1));
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(result.current).toBe(false);
    });
  });
});
