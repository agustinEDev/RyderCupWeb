/**
 * Tests de useVolverArriba (FE #643)
 *
 * LA TABLA:
 *
 *   #   caso                                     | que tiene que pasar
 *   ----|---------------------------------------------|--------------------------
 *   1   enlace a otra pantalla (PUSH)                | arriba
 *   2   redireccion (REPLACE)                        | arriba
 *   3   misma pantalla, solo cambia el query         | NO se toca
 *   4   se pulsa la pestaña en la que ya estas       | arriba
 *   5   primera carga                               | NO se toca
 *   6   atras, con sitio de sobra                    | vuelve a donde estabas
 *   7   atras a una pantalla que estaba arriba       | arriba (no «donde sea»)
 *   8   atras a una entrada que no guardamos         | arriba
 *   9   atras y la pantalla crece despues            | vuelve cuando puede
 *   10  atras y la pantalla ya no da de si           | lo mas abajo que se pueda
 *   11  se navega mientras se estaba reponiendo      | se cancela, no salta luego
 *   12  la posicion se apunta al SALIR               | sin depender de un efecto
 *
 * El 7 y el 11 salieron de la revision: el primero dejaba la pantalla donde
 * estuviera la anterior, que es el defecto que esto viene a arreglar, y el
 * segundo podia tirarte a los 1500 px de otra pantalla.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const location = { pathname: '/competitions', search: '', key: 'k1' };
let tipoDeNavegacion = 'PUSH';

vi.mock('react-router', () => ({
  useLocation: () => ({ ...location }),
  useNavigationType: () => tipoDeNavegacion,
}));

const { useVolverArriba } = await import('./useVolverArriba');

/** Fotogramas pendientes, para dispararlos a mano. */
let fotogramas = [];
let ahora = 0;

const situa = ({ alto = 3000, y = 0 } = {}) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: alto, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 740, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
};

const pasaUnFotograma = () => {
  const pendientes = fotogramas;
  fotogramas = [];
  pendientes.forEach((cb) => cb());
};

/** Navega: cambia la location y vuelve a renderizar. */
const navega = (rerender, { pathname, search = '', key, tipo = 'PUSH' }) => {
  tipoDeNavegacion = tipo;
  location.pathname = pathname;
  location.search = search;
  location.key = key;
  rerender();
};

describe('useVolverArriba', () => {
  beforeEach(() => {
    location.pathname = '/competitions';
    location.search = '';
    location.key = 'k1';
    tipoDeNavegacion = 'PUSH';
    fotogramas = [];
    ahora = 0;
    situa({ alto: 3000, y: 0 });
    window.scrollTo = vi.fn((_x, y) => situa({ alto: document.documentElement.scrollHeight, y }));
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      fotogramas.push(cb);
      return fotogramas.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(globalThis.performance, 'now').mockImplementation(() => ahora);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('ir a otra pantalla', () => {
    it('1: sube arriba al navegar', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      navega(rerender, { pathname: '/profile', key: 'k2' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('2: sube arriba en una redireccion', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      navega(rerender, { pathname: '/login', key: 'k2', tipo: 'REPLACE' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('3: NO toca el scroll si solo cambia el query', () => {
      // Filtrar una lista no es cambiar de pantalla: subir arriba perderia de
      // vista justo lo que se estaba mirando
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      navega(rerender, { pathname: '/competitions', search: '?estado=ACTIVE', key: 'k2' });

      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('4: sube arriba al pulsar la pestaña en la que ya estas', () => {
      // La barra inferior son `<Link>`: pulsar la pestaña activa empuja una
      // entrada nueva con la MISMA ruta. Mirar solo el pathname lo ignoraba, y
      // el gesto de «tocar la pestaña para volver arriba» no hacia nada
      const { rerender } = renderHook(() => useVolverArriba());
      window.scrollTo.mockClear();

      navega(rerender, { pathname: '/competitions', key: 'k2' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('5: no toca el scroll en la primera carga', () => {
      renderHook(() => useVolverArriba());

      expect(window.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('volver atras', () => {
    /** Deja una pantalla guardada en `y` y navega a otra.
     *
     * El scroll se apunta con el evento, que es como llega de verdad: bajar por
     * la pantalla lo dispara. Sin él no hay nada guardado, igual que si nadie
     * hubiera tocado esa pantalla.
     */
    const dejaAtras = (rerender, y) => {
      situa({ alto: 3000, y });
      window.dispatchEvent(new globalThis.Event('scroll'));
      navega(rerender, { pathname: '/profile', key: 'k2' });
      window.scrollTo.mockClear();
    };

    it('6: vuelve a donde estabas', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      dejaAtras(rerender, 1323);

      situa({ alto: 3000, y: 0 });
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 1323);
    });

    it('7: si esa pantalla estaba arriba, vuelve ARRIBA', () => {
      // Guardada en 0 y sin hacer nada, la pantalla se quedaba con el scroll de
      // la anterior: el mismisimo defecto que esto arregla, colandose por atras
      const { rerender } = renderHook(() => useVolverArriba());
      dejaAtras(rerender, 0);

      situa({ alto: 3000, y: 1300 });
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('8: a una entrada que no guardamos, arriba', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      situa({ alto: 3000, y: 900 });

      navega(rerender, { pathname: '/feed', key: 'de-otra-sesion', tipo: 'POP' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('9: espera a que la pantalla crezca', () => {
      const { rerender } = renderHook(() => useVolverArriba());
      dejaAtras(rerender, 1500);

      situa({ alto: 300, y: 0 });   // todavia sin contenido
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      // Ni lo intenta: el navegador recortaria el scroll a lo que mida ahora
      expect(window.scrollTo).not.toHaveBeenCalled();

      situa({ alto: 3000, y: 0 });
      pasaUnFotograma();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 1500);
    });

    it('10: si la pantalla ya no da de si, baja lo que se pueda', () => {
      // Se vuelve a una lista con menos elementos que antes: sin esto el scroll
      // se quedaba donde lo hubiera dejado la pantalla anterior
      const { rerender } = renderHook(() => useVolverArriba());
      dejaAtras(rerender, 1500);

      situa({ alto: 1200, y: 0 });   // 1200 - 740 = 460 como mucho
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      ahora += 5000;                  // se acaba el tiempo de espera
      pasaUnFotograma();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 460);
    });

    it('11: navegar a otro sitio cancela la reposicion a medias', () => {
      // Si el bucle sigue vivo, en cuanto la pantalla NUEVA crece lo suficiente
      // te manda a los 1500 px de una pantalla en la que nunca estuviste
      const { rerender } = renderHook(() => useVolverArriba());
      dejaAtras(rerender, 1500);

      situa({ alto: 300, y: 0 });
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      navega(rerender, { pathname: '/feed', key: 'k3' });
      window.scrollTo.mockClear();

      situa({ alto: 4000, y: 0 });
      pasaUnFotograma();

      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('12: apunta la posicion MIENTRAS se mira, no al salir', () => {
      // Al navegar, la pantalla que se deja se desmonta, el documento se encoge
      // y el navegador recorta el scroll a 0 antes de que corra nada nuestro.
      // Apuntarlo en ese momento guardaba ese 0 y la vuelta atras no repotia
      // nada: visto en el navegador, 1323 se convertia en 0
      const { rerender } = renderHook(() => useVolverArriba());

      situa({ alto: 3000, y: 800 });
      window.dispatchEvent(new globalThis.Event('scroll'));

      situa({ alto: 300, y: 0 });   // el documento se encoge al desmontar
      navega(rerender, { pathname: '/profile', key: 'k2' });
      window.scrollTo.mockClear();

      situa({ alto: 3000, y: 0 });
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 800);
    });

    it('12b: el scroll que llega al montar la pantalla nueva es de ELLA', () => {
      // Si la clave se cambiara en un efecto pasivo, ese recorte a 0 se apuntaria
      // bajo la pantalla que se acaba de dejar y le borraria su posicion
      const { rerender } = renderHook(() => useVolverArriba());

      situa({ alto: 3000, y: 800 });
      window.dispatchEvent(new globalThis.Event('scroll'));

      navega(rerender, { pathname: '/profile', key: 'k2' });
      situa({ alto: 300, y: 0 });
      window.dispatchEvent(new globalThis.Event('scroll'));   // llega ya en /profile
      window.scrollTo.mockClear();

      situa({ alto: 3000, y: 0 });
      navega(rerender, { pathname: '/competitions', key: 'k1', tipo: 'POP' });

      expect(window.scrollTo).toHaveBeenCalledWith(0, 800);
    });
  });

  it('13: manda la app, no la restauracion del navegador', () => {
    // Las dos compiten en cada vuelta atras, y la del navegador aterrizaba en
    // 67 px sobre una pantalla a medio pintar.
    // jsdom no trae `scrollRestoration`, y el hook no la inventa donde no esta:
    // aqui se simula el navegador que si la tiene
    Object.defineProperty(globalThis.history, 'scrollRestoration', {
      value: 'auto', configurable: true, writable: true,
    });

    const { unmount } = renderHook(() => useVolverArriba());

    expect(globalThis.history.scrollRestoration).toBe('manual');

    unmount();
    expect(globalThis.history.scrollRestoration).toBe('auto');
  });
});
