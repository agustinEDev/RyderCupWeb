import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEsMovil } from './useEsMovil';

/**
 * Si la pantalla es de móvil (menos de 640 px, el `sm` de Tailwind). Decide
 * qué tarjeta se pinta (FE #739): en el móvil, una por participante que se
 * pasa deslizando; en tablet y ordenador, la horizontal de siempre.
 */
const conPantalla = (esMovil) => {
  const oyentes = new Set();
  const consulta = {
    matches: esMovil,
    addEventListener: (_, f) => oyentes.add(f),
    removeEventListener: (_, f) => oyentes.delete(f),
  };
  window.matchMedia = vi.fn(() => consulta);
  return {
    girar: (nuevo) => {
      consulta.matches = nuevo;
      oyentes.forEach((f) => f());
    },
  };
};

describe('useEsMovil', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it('M1: una pantalla de móvil lo es', () => {
    conPantalla(true);
    expect(renderHook(() => useEsMovil()).result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 639px)');
  });

  it('M2: una de tablet u ordenador, no', () => {
    conPantalla(false);
    expect(renderHook(() => useEsMovil()).result.current).toBe(false);
  });

  it('M3: si cambia el ancho, cambia la respuesta', () => {
    const pantalla = conPantalla(false);
    const { result } = renderHook(() => useEsMovil());

    act(() => pantalla.girar(true));

    expect(result.current).toBe(true);
  });

  it('M5: en un Safari anterior al 14, sin addEventListener, sigue al ancho con addListener (CodeRabbit)', () => {
    const oyentes = new Set();
    const consulta = {
      matches: false,
      addListener: (f) => oyentes.add(f),
      removeListener: (f) => oyentes.delete(f),
    };
    window.matchMedia = vi.fn(() => consulta);
    const { result, unmount } = renderHook(() => useEsMovil());

    act(() => {
      consulta.matches = true;
      oyentes.forEach((f) => f());
    });

    expect(result.current).toBe(true);
    unmount();
    expect(oyentes.size).toBe(0);
  });

  it('M4: sin matchMedia, se queda en la vista de siempre', () => {
    window.matchMedia = undefined;
    expect(renderHook(() => useEsMovil()).result.current).toBe(false);
  });
});
