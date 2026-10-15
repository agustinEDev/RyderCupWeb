import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const casos = vi.hoisted(() => ({
  mias: { guardadas: vi.fn(() => ({})), execute: vi.fn(async () => ({})) },
  guardar: { execute: vi.fn(async () => ({ estado: 'guardada' })) },
}));
vi.mock('../composition', () => ({ getMyHoleMarksUseCase: casos.mias, saveHoleMarkUseCase: casos.guardar }));

const { useMarcasDelCampo } = await import('./useMarcasDelCampo');

const M3 = { holeNumber: 3, markedAt: 'a' };
const M5 = { holeNumber: 5, markedAt: 'b' };

describe('useMarcasDelCampo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('las del móvil al momento y luego las del servidor', async () => {
    casos.mias.guardadas.mockReturnValue({ 3: M3 });
    let responder;
    casos.mias.execute.mockReturnValue(new Promise((r) => (responder = r)));

    const { result } = renderHook(() => useMarcasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));

    expect(result.current.marcas).toEqual({ 3: M3 });
    await act(async () => responder({ 3: M3, 5: M5 }));
    expect(result.current.marcas).toEqual({ 3: M3, 5: M5 });
    expect(casos.mias.execute).toHaveBeenCalledWith('u1', 'gc-1');
  });

  it('C14: una recién guardada se ve ya (aunque no haya red)', async () => {
    casos.mias.guardadas.mockReturnValueOnce({}).mockReturnValue({ 3: M3 });
    casos.guardar.execute.mockResolvedValue({ estado: 'pendiente' });
    const { result } = renderHook(() => useMarcasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await waitFor(() => expect(casos.mias.execute).toHaveBeenCalled());

    let r;
    await act(async () => {
      r = await result.current.guardar({ holeNumber: 3, tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } });
    });

    expect(r).toEqual({ estado: 'pendiente' });
    expect(casos.guardar.execute).toHaveBeenCalledWith({
      userId: 'u1', golfCourseId: 'gc-1', holeNumber: 3, tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 },
    });
    expect(result.current.marcas).toEqual({ 3: M3 });
  });

  it('cambiar de campo no deja ver las del anterior mientras llegan las nuevas', async () => {
    casos.mias.guardadas.mockImplementation((_u, gc) => (gc === 'gc-1' ? { 3: M3 } : {}));
    casos.mias.execute.mockImplementation(async (_u, gc) => (gc === 'gc-1' ? { 3: M3 } : new Promise(() => {})));
    const { result, rerender } = renderHook(({ gc }) => useMarcasDelCampo({ golfCourseId: gc, userId: 'u1' }), {
      initialProps: { gc: 'gc-1' },
    });
    await waitFor(() => expect(result.current.marcas).toEqual({ 3: M3 }));

    rerender({ gc: 'gc-2' });

    expect(result.current.marcas).toEqual({});
  });

  it('sin usuario o sin campo no pide nada', () => {
    renderHook(() => useMarcasDelCampo({ golfCourseId: null, userId: 'u1' }));
    renderHook(() => useMarcasDelCampo({ golfCourseId: 'gc-1', userId: null }));

    expect(casos.mias.execute).not.toHaveBeenCalled();
  });

  it('si el servidor falla, se quedan las del móvil', async () => {
    casos.mias.guardadas.mockReturnValue({ 3: M3 });
    casos.mias.execute.mockRejectedValue(new Error('x'));

    const { result } = renderHook(() => useMarcasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});

    expect(result.current.marcas).toEqual({ 3: M3 });
  });
});
