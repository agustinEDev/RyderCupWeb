import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * Reportar un hoyo desde el mapa (entrega 7, 18 oct 2026).
 *
 * | Caso | Qué                                   | Qué se espera                                          |
 * |------|---------------------------------------|--------------------------------------------------------|
 * | H1   | con jugador y campo                   | el reporte sale con ellos y el número de hoyo          |
 * | H2   | sin jugador o sin campo               | no hay con qué reportar (null)                         |
 * | H3   | se queda en la cola                   | avisa a la cola de fondo para que lo reintente         |
 * | H4   | llega, o el caso de uso falla         | sin aviso a la cola; el fallo no rompe el mapa         |
 */
const envio = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../composition', () => ({ sendHoleReportUseCase: envio }));

const { useReportarHoyo } = await import('./useReportarHoyo');
const { MUESTRA_PENDIENTE } = await import('./useEnvioDeMuestras');

describe('useReportarHoyo', () => {
  let aviso;
  beforeEach(() => {
    envio.execute.mockReset().mockResolvedValue({ estado: 'enviado' });
    aviso = vi.fn();
    globalThis.addEventListener(MUESTRA_PENDIENTE, aviso);
  });
  afterEach(() => globalThis.removeEventListener(MUESTRA_PENDIENTE, aviso));

  it('H1: sale con el jugador, el campo y el número de hoyo', async () => {
    const { result } = renderHook(() => useReportarHoyo({ golfCourseId: 'gc-1', userId: 'yo' }));

    await result.current(3, { id: 'r-1', reason: 'WRONG_HOLE', tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } });

    expect(envio.execute).toHaveBeenCalledWith({
      userId: 'yo',
      golfCourseId: 'gc-1',
      holeNumber: 3,
      id: 'r-1',
      reason: 'WRONG_HOLE',
      tee: { lat: 1, lon: 2 },
      bends: [],
      greenCenter: { lat: 3, lon: 4 },
    });
    expect(aviso).not.toHaveBeenCalled();
  });

  it.each([
    ['sin jugador', { golfCourseId: 'gc-1', userId: null }],
    ['sin campo', { golfCourseId: null, userId: 'yo' }],
  ])('H2: %s, null', (_caso, args) => {
    const { result } = renderHook(() => useReportarHoyo(args));

    expect(result.current).toBeNull();
  });

  it('H3: si se queda en la cola, avisa para que se reintente', async () => {
    envio.execute.mockResolvedValue({ estado: 'pendiente', paraLaTanda: true });
    const { result } = renderHook(() => useReportarHoyo({ golfCourseId: 'gc-1', userId: 'yo' }));

    await result.current(3, { id: 'r-1', reason: 'WRONG_HOLE' });

    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('H4: si el caso de uso falla, no rompe nada ni avisa', async () => {
    envio.execute.mockRejectedValue(new Error('roto'));
    const { result } = renderHook(() => useReportarHoyo({ golfCourseId: 'gc-1', userId: 'yo' }));

    await expect(result.current(3, { id: 'r-1', reason: 'WRONG_HOLE' })).resolves.toBeUndefined();
    expect(aviso).not.toHaveBeenCalled();
  });
});
