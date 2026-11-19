import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDespertarALaHora } from './useDespertarALaHora';

const AHORA = new Date('2026-11-19T10:00:00Z').getTime();
const DENTRO_DE = (ms) => new Date(AHORA + ms);

describe('useDespertarALaHora', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('no rearma el temporizador al volver a pintar con la misma hora en un Date nuevo', () => {
    const arma = vi.spyOn(globalThis, 'setTimeout');
    const desarma = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender } = renderHook(({ hora }) => useDespertarALaHora(hora), {
      initialProps: { hora: DENTRO_DE(60_000) },
    });
    const armadosAlEntrar = arma.mock.calls.length;
    const desarmadosAlEntrar = desarma.mock.calls.length;

    rerender({ hora: DENTRO_DE(60_000) });
    rerender({ hora: DENTRO_DE(60_000) });
    rerender({ hora: DENTRO_DE(60_000) });

    expect(armadosAlEntrar).toBe(1);
    expect(arma.mock.calls.length).toBe(armadosAlEntrar);
    expect(desarma.mock.calls.length).toBe(desarmadosAlEntrar);
  });

  it('sí lo rearma cuando cambia la hora', () => {
    const arma = vi.spyOn(globalThis, 'setTimeout');
    const desarma = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender } = renderHook(({ hora }) => useDespertarALaHora(hora), {
      initialProps: { hora: DENTRO_DE(60_000) },
    });

    rerender({ hora: DENTRO_DE(120_000) });

    expect(arma.mock.calls.length).toBe(2);
    expect(arma.mock.calls[1][1]).toBe(121_000);
    expect(desarma.mock.calls.length).toBe(1);
  });

  it('vuelve a pintar un segundo después de la hora', () => {
    let pintadas = 0;
    renderHook(() => {
      pintadas += 1;
      useDespertarALaHora(DENTRO_DE(60_000));
    });
    const alEntrar = pintadas;

    act(() => vi.advanceTimersByTime(60_999));
    expect(pintadas).toBe(alEntrar);
    act(() => vi.advanceTimersByTime(1));
    expect(pintadas).toBe(alEntrar + 1);
  });

  it('sin hora no arma nada', () => {
    const arma = vi.spyOn(globalThis, 'setTimeout');
    renderHook(() => useDespertarALaHora(null));
    expect(arma).not.toHaveBeenCalled();
  });
  it('a más de 24 días vista también despierta a la hora, encadenando temporizadores (CodeRabbit #1204)', () => {
    const DIA = 24 * 60 * 60 * 1000;
    let pintadas = 0;
    renderHook(() => {
      pintadas += 1;
      useDespertarALaHora(DENTRO_DE(30 * DIA));
    });
    const alEntrar = pintadas;

    // Ningún temporizador pasa del máximo de setTimeout (si no, dispararía ya)
    act(() => vi.advanceTimersByTime(30 * DIA - 1));
    expect(pintadas).toBe(alEntrar);
    act(() => vi.advanceTimersByTime(1001));
    expect(pintadas).toBe(alEntrar + 1);
  });
});
