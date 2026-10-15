import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecargaAlVolverDeLaCache } from './useRecargaAlVolverDeLaCache';

/**
 * Una página que vuelve desde la caché del historial del navegador (bfcache,
 * casi siempre en Safari) se recarga (14 oct 2026, FE #865): volvía tal cual,
 * con su JavaScript congelado. Tras salir se quedaba en «Loading...» para
 * siempre, y si mientras tanto otra pestaña cerró la sesión enseñaba los datos
 * de la cuenta anterior.
 */
describe('useRecargaAlVolverDeLaCache', () => {
  let recarga;
  beforeEach(() => {
    recarga = vi.fn();
    vi.stubGlobal('location', { href: '/', reload: recarga });
  });
  afterEach(() => vi.unstubAllGlobals());

  const vuelve = (persisted) => {
    const evento = new globalThis.Event('pageshow');
    Object.defineProperty(evento, 'persisted', { value: persisted });
    globalThis.dispatchEvent(evento);
  };

  it('B4: si la página vuelve desde la caché del historial, se recarga', () => {
    renderHook(() => useRecargaAlVolverDeLaCache());

    vuelve(true);

    expect(recarga).toHaveBeenCalledTimes(1);
  });

  it('B2b: una carga normal de la página no recarga', () => {
    renderHook(() => useRecargaAlVolverDeLaCache());

    vuelve(false);

    expect(recarga).not.toHaveBeenCalled();
  });

  it('B5: al desmontarse deja de escuchar (sin escuchadores acumulados)', () => {
    const { unmount } = renderHook(() => useRecargaAlVolverDeLaCache());
    unmount();

    vuelve(true);

    expect(recarga).not.toHaveBeenCalled();
  });
});
