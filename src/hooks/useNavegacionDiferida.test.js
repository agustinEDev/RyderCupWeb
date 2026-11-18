import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavegacionDiferida } from './useNavegacionDiferida';

/**
 * Ir a otra ruta pasado un rato, sin navegar nunca dos veces ni desde una
 * pantalla que ya no está:
 *
 *   #    caso                                        | qué pasa
 *   -----|--------------------------------------------|--------------------------
 *   N1   se programa una                             | navega al cumplirse, no antes
 *   E2   se programa otra antes de que salte la 1.ª  | solo la última, una vez
 *   E1   se programa con la pantalla ya desmontada   | no navega
 *   N2   se desmonta con una programada              | no navega
 */
describe('useNavegacionDiferida', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('N1: navega al cumplirse el plazo, no antes', () => {
    const navigate = vi.fn();
    const { result } = renderHook(() => useNavegacionDiferida(navigate));

    result.current('/a', 1000);
    act(() => vi.advanceTimersByTime(999));
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(navigate).toHaveBeenCalledWith('/a');
  });

  it('E2: programar otra quita la anterior: nunca dos', () => {
    const navigate = vi.fn();
    const { result } = renderHook(() => useNavegacionDiferida(navigate));

    result.current('/a', 1000);
    result.current('/b', 1500);
    act(() => vi.advanceTimersByTime(5000));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/b');
  });

  it('E1: con la pantalla ya desmontada no navega', () => {
    const navigate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useNavegacionDiferida(navigate),
    );
    const navegaDentroDe = result.current;

    unmount();
    navegaDentroDe('/a', 1000);
    act(() => vi.advanceTimersByTime(5000));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('N2: desmontada con una programada, no navega', () => {
    const navigate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useNavegacionDiferida(navigate),
    );

    result.current('/a', 1000);
    unmount();
    act(() => vi.advanceTimersByTime(5000));

    expect(navigate).not.toHaveBeenCalled();
  });
});
