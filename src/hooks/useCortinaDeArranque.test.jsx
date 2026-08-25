import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCortinaDeArranque } from './useCortinaDeArranque';
import { reiniciaLaCortina, laPantallaEstaLista, PLAZO_MAXIMO_MS } from '../utils/cortinaDeArranque';

/**
 * Quien decide si la cortina del arranque se queda o se levanta (FE #485).
 *
 * Lo hace la RUTA. Que ninguna se quede esperando un aviso que nadie manda es
 * la mitad del arreglo: la otra mitad —el aviso— vive en cada pantalla.
 */
describe('la cortina, segun la ruta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciaLaCortina();
    document.body.innerHTML = '<div id="arranque"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sigueLaCortina = () => Boolean(document.getElementById('arranque'));

  it.each([['/start'], ['/dashboard']])(
    'en %s la cortina se queda esperando el aviso',
    (ruta) => {
      renderHook(() => useCortinaDeArranque(ruta));

      expect(sigueLaCortina()).toBe(true);
    }
  );

  it.each([['/'], ['/login'], ['/competitions/7/leaderboard']])(
    'en %s se retira al llegar, como siempre',
    (ruta) => {
      renderHook(() => useCortinaDeArranque(ruta));

      expect(sigueLaCortina()).toBe(false);
    }
  );

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
      useCortinaDeArranque('/');
      visto.push(Boolean(document.getElementById('arranque')));
    });

    // El cuerpo del hook corre en el render, con la capa todavia puesta; la
    // retirada llega despues, ya con el contenido en el DOM
    expect(visto[0]).toBe(true);
    expect(sigueLaCortina()).toBe(false);
  });

  it('el aviso de la pantalla la levanta estando en una ruta que espera', () => {
    renderHook(() => useCortinaDeArranque('/dashboard'));

    laPantallaEstaLista();

    expect(sigueLaCortina()).toBe(false);
  });
});
