/**
 * Tests del refresco proactivo (FE #392)
 *
 * Dos cosas se vigilan aqui:
 *
 * 1. El TTL. El hook asumia un access token de 5 minutos cuando la cookie vive
 *    15 (`COOKIE_MAX_AGE = 900` en el backend), asi que pedia un refresco cada
 *    4 minutos en vez de cada 14.
 * 2. De donde sale la edad del token. La cookie es httpOnly, no se puede
 *    consultar, y el hook daba por recien emitido el token al montarse. Con un
 *    TTL de 5 minutos ese error casi no se notaba; con 15 dejaria ciega una
 *    recarga hecha a mitad de la vida del token.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const refreshAccessToken = vi.fn();
const getLastRefreshAt = vi.fn();

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  refreshAccessToken: (...args) => refreshAccessToken(...args),
  getLastRefreshAt: () => getLastRefreshAt(),
}));

const { default: useProactiveTokenRefresh, ACCESS_TOKEN_TTL_MS, REFRESH_BEFORE_MS } =
  await import('./useProactiveTokenRefresh');

const MINUTE = 60 * 1000;

describe('useProactiveTokenRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshAccessToken.mockReset();
    refreshAccessToken.mockResolvedValue(undefined);
    // Por defecto: ya ha habido un refresco en esta carga, ahora mismo
    getLastRefreshAt.mockReset();
    getLastRefreshAt.mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sigue a la vida real de la cookie del backend (15 minutos)', () => {
    expect(ACCESS_TOKEN_TTL_MS).toBe(15 * MINUTE);
    expect(REFRESH_BEFORE_MS).toBe(1 * MINUTE);
  });

  describe('con un refresco conocido', () => {
    it('no refresca a los 4 minutos, como hacia con el TTL de 5', () => {
      renderHook(() => useProactiveTokenRefresh({ enabled: true }));

      vi.advanceTimersByTime(4 * MINUTE);

      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it('refresca un minuto antes de que expire el token', () => {
      renderHook(() => useProactiveTokenRefresh({ enabled: true }));

      vi.advanceTimersByTime(ACCESS_TOKEN_TTL_MS - REFRESH_BEFORE_MS);

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('sin refresco previo (edad del token desconocida)', () => {
    beforeEach(() => {
      getLastRefreshAt.mockReturnValue(null);
    });

    it('no lanza la peticion en el arranque', () => {
      renderHook(() => useProactiveTokenRefresh({ enabled: true }));

      vi.advanceTimersByTime(0);

      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it('refresca al poco de cargar en vez de esperar un TTL entero', () => {
      renderHook(() => useProactiveTokenRefresh({ enabled: true }));

      vi.advanceTimersByTime(REFRESH_BEFORE_MS);

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    it('la actividad del usuario no aplaza esa primera comprobacion', () => {
      renderHook(() => useProactiveTokenRefresh({ enabled: true }));

      // Movimiento del raton cada 10 s: reprograma el temporizador una y otra
      // vez. Como el plazo es absoluto y no relativo, sigue venciendo igual
      for (let elapsed = 0; elapsed < REFRESH_BEFORE_MS; elapsed += 10_000) {
        document.dispatchEvent(new MouseEvent('mousemove'));
        vi.advanceTimersByTime(10_000);
      }

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  it('no programa nada mientras no haya sesion', () => {
    getLastRefreshAt.mockReturnValue(null);

    renderHook(() => useProactiveTokenRefresh({ enabled: false }));

    vi.advanceTimersByTime(ACCESS_TOKEN_TTL_MS);

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
