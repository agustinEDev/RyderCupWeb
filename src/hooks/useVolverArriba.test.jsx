/**
 * Tests de useVolverArriba (FE #643; FE #647 fase 3, tabla aprobada el 2 nov 2026)
 *
 *   #   caso                                          | que tiene que pasar
 *   ----|----------------------------------------------|--------------------
 *   1   se navega a otra pantalla                     | arriba
 *   2   misma pantalla, solo cambia el query          | NO se toca
 *   T20 se vuelve atras a una pantalla sin loader     | arriba tambien
 *   T18 se vuelve atras a una que restaura su scroll  | NO se toca: la deja `<ScrollRestoration />`
 *   T19 se entra (PUSH) en una que restaura su scroll | arriba
 *   6   una redireccion (REPLACE) a una de esas       | arriba
 *   7   recargar en una de esas (primera carga, POP)  | arriba, como hoy (Agustin, 2 nov)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const location = { pathname: '/competitions', search: '' };
const router = { tipo: 'PUSH', handle: undefined };

vi.mock('react-router', () => ({
  useLocation: () => ({ ...location }),
  useNavigationType: () => router.tipo,
  useMatches: () => [{ handle: undefined }, { handle: router.handle }],
}));

const { useVolverArriba } = await import('./useVolverArriba');

const navegaA = (rerender, pathname, tipo, handle) => {
  window.scrollTo.mockClear();
  location.pathname = pathname;
  router.tipo = tipo;
  router.handle = handle;
  rerender();
};

describe('useVolverArriba', () => {
  beforeEach(() => {
    location.pathname = '/profile';
    location.search = '';
    router.tipo = 'PUSH';
    router.handle = undefined;
    window.scrollTo = vi.fn();
  });

  it('1: sube arriba al navegar a otra pantalla', () => {
    const { rerender } = renderHook(() => useVolverArriba());

    navegaA(rerender, '/dashboard', 'PUSH');

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

  it('T20: al volver atras a una pantalla sin loader, arriba', () => {
    // Sin sus datos al restaurar, el navegador recortaba el scroll a una
    // posicion absurda: hasta tener loader, arriba
    const { rerender } = renderHook(() => useVolverArriba());

    navegaA(rerender, '/dashboard', 'POP');

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('T18: al volver atras a una que restaura su scroll, no se toca', () => {
    const { rerender } = renderHook(() => useVolverArriba());

    navegaA(rerender, '/competitions', 'POP', { restauraElScroll: true });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('T19: al entrar en una que restaura su scroll, arriba', () => {
    const { rerender } = renderHook(() => useVolverArriba());

    navegaA(rerender, '/competitions', 'PUSH', { restauraElScroll: true });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('6: una redireccion a una de esas, arriba', () => {
    const { rerender } = renderHook(() => useVolverArriba());

    navegaA(rerender, '/competitions', 'REPLACE', { restauraElScroll: true });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('7: al recargar en una que restaura su scroll, arriba, como hoy', () => {
    // La primera carga llega como POP: sin distinguirla, recargar Torneos
    // recuperaba la posicion guardada, y hoy empieza arriba
    location.pathname = '/competitions';
    router.tipo = 'POP';
    router.handle = { restauraElScroll: true };

    renderHook(() => useVolverArriba());

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
