import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDistanciasActivadas } from './useDistanciasActivadas';

describe('useDistanciasActivadas (G3)', () => {
  let guardado;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('al principio no están activadas', () => {
    const { result } = renderHook(() => useDistanciasActivadas('partida-1'));

    expect(result.current.activadas).toBe(false);
  });

  it('se recuerdan para esa partida al volver a la anotación', () => {
    const { result, unmount } = renderHook(() => useDistanciasActivadas('partida-1'));
    act(() => result.current.activar());
    expect(result.current.activadas).toBe(true);
    unmount();

    const otraVez = renderHook(() => useDistanciasActivadas('partida-1'));

    expect(otraVez.result.current.activadas).toBe(true);
  });

  it('otra partida empieza sin activar', () => {
    const { result } = renderHook(() => useDistanciasActivadas('partida-1'));
    act(() => result.current.activar());

    const otra = renderHook(() => useDistanciasActivadas('partida-2'));

    expect(otra.result.current.activadas).toBe(false);
  });

  it('sin almacenamiento, se activa igual en esta pantalla', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => {},
    });
    const { result } = renderHook(() => useDistanciasActivadas('partida-1'));

    act(() => result.current.activar());

    expect(result.current.activadas).toBe(true);
  });
});
