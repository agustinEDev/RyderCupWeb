/**
 * Tests de useVolverArriba (FE #643)
 *
 *   #   caso                                  | que tiene que pasar
 *   ----|------------------------------------------|--------------------
 *   1   se navega a otra pantalla                | arriba
 *   2   misma pantalla, solo cambia el query     | NO se toca
 *   3   se vuelve atras                          | arriba tambien
 *
 * El 3 no es lo ideal —lo suyo seria volver a donde estabas— pero es lo que da
 * este patron, y es predecible. La restauracion de verdad la hace
 * `<ScrollRestoration />`, que pide el router moderno: va en su propia issue.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const location = { pathname: '/competitions', search: '' };

vi.mock('react-router', () => ({
  useLocation: () => ({ ...location }),
}));

const { useVolverArriba } = await import('./useVolverArriba');

describe('useVolverArriba', () => {
  beforeEach(() => {
    location.pathname = '/competitions';
    location.search = '';
    window.scrollTo = vi.fn();
  });

  it('1: sube arriba al navegar a otra pantalla', () => {
    const { rerender } = renderHook(() => useVolverArriba());
    window.scrollTo.mockClear();

    location.pathname = '/profile';
    rerender();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('2: NO toca el scroll si solo cambia el query', () => {
    // Filtrar una lista no es cambiar de pantalla: subir arriba perderia de
    // vista justo lo que se estaba mirando
    const { rerender } = renderHook(() => useVolverArriba());
    window.scrollTo.mockClear();

    location.search = '?estado=ACTIVE';
    rerender();

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('3: al volver atras tambien sube arriba', () => {
    // Este patron no distingue de donde viene la navegacion. Se deja fijado
    // aqui para que el dia que se migre al router moderno se vea que cambia
    const { rerender } = renderHook(() => useVolverArriba());
    window.scrollTo.mockClear();

    location.pathname = '/dashboard';
    rerender();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
