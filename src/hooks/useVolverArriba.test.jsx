/**
 * Tests de useVolverArriba (FE #643)
 *
 * Al cambiar de pantalla el scroll se quedaba donde estaba, asi que una pantalla
 * se abria por la mitad: pulsar «Perfil» desde la lista de torneos aterrizaba en
 * «Cerrar Sesion» en vez de en tu nombre.
 *
 * Lo que NO se puede romper es volver atras. Y no basta con «no tocarlo»: medido
 * en el navegador, con las pantallas ya subiendo al principio, la restauracion
 * del propio Chrome aterrizaba en 67 px en vez de en 1323, porque al volver la
 * pantalla todavia no ha cargado su contenido y no tiene altura para ese scroll.
 * Por eso la posicion se guarda y se repone aqui, reintentando mientras la
 * pagina crece.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const location = { pathname: '/competitions', search: '', key: 'k1' };
let tipoDeNavegacion = 'PUSH';

vi.mock('react-router', () => ({
  useLocation: () => location,
  useNavigationType: () => tipoDeNavegacion,
}));

const { useVolverArriba } = await import('./useVolverArriba');

/** Coloca el documento a una altura y una posicion concretas. */
const situa = ({ alto = 2000, y = 0 } = {}) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: alto, configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', { value: 740, configurable: true });
  // En jsdom `scrollY` es un getter: asignarlo a pelo no hace nada y el hook
  // acababa guardando siempre 0, con lo que el test no probaba nada
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
};

describe('useVolverArriba', () => {
  beforeEach(() => {
    location.pathname = '/competitions';
    location.search = '';
    location.key = 'k1';
    tipoDeNavegacion = 'PUSH';
    situa({ alto: 2400, y: 0 });
    window.scrollTo = vi.fn((_x, y) => situa({ alto: document.documentElement.scrollHeight, y }));
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  });

  describe('ir a otra pantalla', () => {
    it('sube arriba al navegar', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      location.pathname = '/profile';
      location.key = 'k2';
      rerender();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('sube arriba en una redireccion', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      tipoDeNavegacion = 'REPLACE';
      location.pathname = '/login';
      location.key = 'k2';
      rerender();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('NO toca el scroll si solo cambia el query de la misma pantalla', () => {
      // Filtrar una lista no es cambiar de pantalla: saltar arriba perderia
      // de vista justo lo que se estaba mirando
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      location.search = '?estado=ACTIVE';
      rerender();

      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('no toca el scroll en la primera carga', () => {
      renderHook(() => useVolverArriba());

      expect(window.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('volver atras', () => {
    it('repone la posicion que tenia esa pantalla', () => {
      const { rerender } = renderHook(() => useVolverArriba());

      // Se baja en la lista de torneos y se guarda al salir
      situa({ alto: 2400, y: 1323 });
      act(() => { window.dispatchEvent(new globalThis.Event("scroll")); });

      location.pathname = '/profile';
      location.key = 'k2';
      rerender();
      window.scrollTo.mockClear();

      // Y se vuelve: la pantalla ya tiene altura suficiente
      tipoDeNavegacion = 'POP';
      location.pathname = '/competitions';
      location.key = 'k1';
      situa({ alto: 2400, y: 0 });
      rerender();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 1323);
    });

    it('espera a que la pantalla crezca para reponer la posicion', () => {
      // Al volver, el contenido aun no ha cargado: sin esto el scroll se
      // recorta a lo que mida la pantalla a medio pintar (67 px medidos)
      const { rerender } = renderHook(() => useVolverArriba());

      situa({ alto: 2400, y: 1500 });
      act(() => { window.dispatchEvent(new globalThis.Event("scroll")); });

      location.pathname = '/profile';
      location.key = 'k2';
      rerender();

      tipoDeNavegacion = 'POP';
      location.pathname = '/competitions';
      location.key = 'k1';
      situa({ alto: 300, y: 0 });   // todavia sin contenido
      window.scrollTo.mockClear();
      rerender();

      // Ni lo intenta mientras la pantalla no de de si: el navegador recortaria
      // el scroll a lo que mida en ese momento y ahi se quedaria
      expect(window.scrollTo).not.toHaveBeenCalled();

      // No se conforma con lo que hay: sigue intentandolo
      situa({ alto: 2400, y: 0 });
      act(() => { window.dispatchEvent(new globalThis.Event("scroll")); });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 1500);
    });

    it('no revienta al volver a una entrada que no guardamos', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      tipoDeNavegacion = 'POP';
      location.pathname = '/feed';
      location.key = 'de-otra-sesion';
      rerender();

      expect(window.scrollTo).not.toHaveBeenCalled();
    });
  });
});
