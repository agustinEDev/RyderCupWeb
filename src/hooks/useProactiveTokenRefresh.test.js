/**
 * Tests del refresco proactivo (FE #392)
 *
 * El hook asumia un access token de 5 minutos cuando el backend lo emite con 15
 * (`ACCESS_TOKEN_EXPIRE_MINUTES=15`, cookie con `max_age=900`). Nada expiraba
 * antes de tiempo, pero se pedia un refresco cada 4 minutos en vez de cada 14.
 * Lo que se vigila aqui es justo eso: cuando dispara el refresco.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const refreshAccessToken = vi.fn();

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  refreshAccessToken: (...args) => refreshAccessToken(...args),
}));

const { default: useProactiveTokenRefresh, ACCESS_TOKEN_TTL_MS, REFRESH_BEFORE_MS } =
  await import('./useProactiveTokenRefresh');

const MINUTE = 60 * 1000;

describe('useProactiveTokenRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshAccessToken.mockReset();
    refreshAccessToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sigue al TTL que emite el backend (15 minutos)', () => {
    expect(ACCESS_TOKEN_TTL_MS).toBe(15 * MINUTE);
    expect(REFRESH_BEFORE_MS).toBe(1 * MINUTE);
  });

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

  it('no programa nada mientras no haya sesion', () => {
    renderHook(() => useProactiveTokenRefresh({ enabled: false }));

    vi.advanceTimersByTime(ACCESS_TOKEN_TTL_MS);

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
