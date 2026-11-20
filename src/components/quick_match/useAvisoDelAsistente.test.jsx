import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAvisoDelAsistente } from './useAvisoDelAsistente';

/**
 * El aviso del asistente: por clave, se quita uno concreto y vuelve a la vista
 * cada vez que se pone (también si es el mismo).
 */
describe('useAvisoDelAsistente', () => {
  it('setError pone la clave y null lo quita', () => {
    const { result } = renderHook(() => useAvisoDelAsistente());
    expect(result.current.error).toBeNull();
    act(() => result.current.setError('create.x'));
    expect(result.current.error).toEqual({ clave: 'create.x' });
    act(() => result.current.setError(null));
    expect(result.current.error).toBeNull();
  });

  it('quitaElAviso solo quita el de esa clave', () => {
    const { result } = renderHook(() => useAvisoDelAsistente());
    act(() => result.current.setError('create.a'));
    act(() => result.current.quitaElAviso('create.b'));
    expect(result.current.error).toEqual({ clave: 'create.a' });
    act(() => result.current.quitaElAviso('create.a'));
    expect(result.current.error).toBeNull();
  });

  it('ponElAviso lo pone tal cual (texto del servidor o de common)', () => {
    const { result } = renderHook(() => useAvisoDelAsistente());
    act(() => result.current.ponElAviso({ texto: 'Del servidor' }));
    expect(result.current.error).toEqual({ texto: 'Del servidor' });
  });

  it('cada aviso, también repetido, lleva el recuadro a la vista', () => {
    const { result } = renderHook(() => useAvisoDelAsistente());
    const scrollIntoView = vi.fn();
    result.current.refDelAviso.current = { scrollIntoView };
    act(() => result.current.setError('create.a'));
    act(() => result.current.setError('create.a'));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    act(() => result.current.setError(null));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
