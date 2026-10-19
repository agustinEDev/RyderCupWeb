import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { useBarrasNegras } from './useBarrasNegras';

/**
 * Las barras del sistema, neutras mientras el mapa del hoyo está abierto (19 oct):
 * el iPhone instalado pinta la franja de la hora con el fondo de la página, y
 * Android su barra con el theme-color.
 */
const tema = () => document.head.querySelector('meta[name="theme-color"]');

describe('useBarrasNegras', () => {
  beforeEach(() => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#123456';
    document.head.appendChild(meta);
  });
  afterEach(() => {
    tema()?.remove();
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
  });

  it('M1/M2: mientras está, la página y el theme-color en negro; al irse, lo de antes', () => {
    document.documentElement.style.backgroundColor = 'rgb(62, 134, 66)';
    document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    const { unmount } = renderHook(() => useBarrasNegras());

    expect(document.documentElement.style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(document.body.style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(tema().content).toBe('#000000');

    unmount();

    expect(document.documentElement.style.backgroundColor).toBe('rgb(62, 134, 66)');
    expect(document.body.style.backgroundColor).toBe('rgb(250, 250, 250)');
    expect(tema().content).toBe('#123456');
  });

  it('en StrictMode (efecto dos veces) también vuelve a lo de antes', () => {
    const { unmount } = renderHook(() => useBarrasNegras(), { wrapper: StrictMode });
    expect(tema().content).toBe('#000000');

    unmount();

    expect(tema().content).toBe('#123456');
    expect(document.body.style.backgroundColor).toBe('');
  });

  it('/code-review: un theme-color sin contenido se queda sin él (no «null»)', () => {
    tema().removeAttribute('content');

    const { unmount } = renderHook(() => useBarrasNegras());
    unmount();

    expect(tema().hasAttribute('content')).toBe(false);
  });

  it('sin theme-color en la página, no se rompe ni lo crea', () => {
    tema().remove();

    const { unmount } = renderHook(() => useBarrasNegras());
    unmount();

    expect(tema()).toBeNull();
    expect(document.documentElement.style.backgroundColor).toBe('');
    expect(document.body.style.backgroundColor).toBe('');
  });
});
