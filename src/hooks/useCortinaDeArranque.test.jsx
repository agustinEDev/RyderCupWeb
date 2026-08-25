import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCortinaDeArranque } from './useCortinaDeArranque';
import { reiniciaLaCortina, laPantallaEstaLista, elArranqueHaTerminado, PLAZO_MAXIMO_MS } from '../utils/cortinaDeArranque';

/**
 * Quien decide si la cortina del arranque se queda o se levanta (FE #485).
 *
 * Lo hace la RUTA. Que ninguna se quede esperando un aviso que nadie manda es
 * la mitad del arreglo: la otra mitad —el aviso— vive en cada pantalla.
 */
describe('la cortina, segun la ruta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // La cortina solo se sostiene en la aplicacion instalada
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    reiniciaLaCortina();
    document.body.innerHTML = '<div id="arranque"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sigueLaCortina = () => Boolean(document.getElementById('arranque'));

  it.each([['/'], ['/start'], ['/dashboard']])(
    'en %s la cortina se queda esperando el aviso',
    (ruta) => {
      renderHook(() => useCortinaDeArranque(ruta));

      expect(sigueLaCortina()).toBe(true);
    }
  );

  it.each([['/login'], ['/competitions/7/leaderboard']])(
    'en %s se retira al llegar, como siempre',
    (ruta) => {
      renderHook(() => useCortinaDeArranque(ruta));

      expect(sigueLaCortina()).toBe(false);
    }
  );

  it('la portada tambien sostiene: es por donde arrancan los iconos viejos', () => {
    // iOS guarda la URL al crear el acceso directo y no la cambia al cambiar el
    // manifiesto, asi que los iconos anteriores a FE #465 siguen entrando por
    // `/`. Sin sostenerla ahi, para esa gente esto no hace nada
    const { rerender } = renderHook(({ ruta }) => useCortinaDeArranque(ruta), {
      initialProps: { ruta: '/' },
    });

    rerender({ ruta: '/dashboard' });

    expect(sigueLaCortina()).toBe(true);
  });

  it('el salto de /start al panel no la levanta por el camino', () => {
    // Es el arranque de la aplicacion instalada con sesion: una pantalla releva
    // a la otra por debajo, y la cortina no se entera
    const { rerender } = renderHook(({ ruta }) => useCortinaDeArranque(ruta), {
      initialProps: { ruta: '/start' },
    });

    rerender({ ruta: '/dashboard' });

    expect(sigueLaCortina()).toBe(true);
  });

  it('caer en una pantalla que no avisa la levanta en el acto', () => {
    // Sin sesion, el panel manda al formulario. Si la cortina siguiera esperando
    // el aviso del panel, ahi se comeria los 3s enteros de verde
    const { rerender } = renderHook(({ ruta }) => useCortinaDeArranque(ruta), {
      initialProps: { ruta: '/dashboard' },
    });

    rerender({ ruta: '/login' });

    expect(sigueLaCortina()).toBe(false);
  });

  it('el plazo corre para todo el arranque, no por pantalla', () => {
    const { rerender } = renderHook(({ ruta }) => useCortinaDeArranque(ruta), {
      initialProps: { ruta: '/start' },
    });
    vi.advanceTimersByTime(PLAZO_MAXIMO_MS - 100);

    rerender({ ruta: '/dashboard' });
    vi.advanceTimersByTime(100);

    expect(sigueLaCortina()).toBe(false);
  });

  it('cuando la capa se va, ya hay contenido pintado', () => {
    // Retirarla justo despues de pedir el render la quitaba antes de que
    // hubiera nada debajo, y se veia el fondo blanco de la pagina
    const visto = [];
    renderHook(() => {
      useCortinaDeArranque('/login');
      visto.push(Boolean(document.getElementById('arranque')));
    });

    // El cuerpo del hook corre en el render, con la capa todavia puesta; la
    // retirada llega despues, ya con el contenido en el DOM
    expect(visto[0]).toBe(true);
    expect(sigueLaCortina()).toBe(false);
  });

  it('caer en una pantalla que no avisa NO consuma el arranque', () => {
    // `/login`, `/register` y la vuelta de Google siguen pintando la espera a
    // pantalla completa mientras resuelven, y eso todavia es el arranque: la
    // aplicacion acaba de abrirse. Darlo por terminado aqui cortaba el verde a
    // media espera (FE #492)
    renderHook(() => useCortinaDeArranque('/login'));

    expect(sigueLaCortina()).toBe(false);
    expect(elArranqueHaTerminado()).toBe(false);
  });

  it('navegar con la cortina ya fuera SI lo consuma', () => {
    // Eso solo pasa moviendose por la aplicacion
    const { rerender } = renderHook(({ ruta }) => useCortinaDeArranque(ruta), {
      initialProps: { ruta: '/login' },
    });
    expect(elArranqueHaTerminado()).toBe(false);

    rerender({ ruta: '/register' });

    expect(elArranqueHaTerminado()).toBe(true);
  });

  it('los tramos del propio arranque no lo consuman', () => {
    // `/start` al panel pasa con la cortina PUESTA: es una sola entrada
    const { rerender } = renderHook(({ ruta }) => useCortinaDeArranque(ruta), {
      initialProps: { ruta: '/start' },
    });

    rerender({ ruta: '/dashboard' });

    expect(sigueLaCortina()).toBe(true);
    expect(elArranqueHaTerminado()).toBe(false);
  });

  it('en una ruta que espera, el arranque sigue vivo', () => {
    renderHook(() => useCortinaDeArranque('/dashboard'));

    expect(elArranqueHaTerminado()).toBe(false);
  });

  it('el aviso de la pantalla la levanta estando en una ruta que espera', () => {
    renderHook(() => useCortinaDeArranque('/dashboard'));

    laPantallaEstaLista();

    expect(sigueLaCortina()).toBe(false);
  });
});
