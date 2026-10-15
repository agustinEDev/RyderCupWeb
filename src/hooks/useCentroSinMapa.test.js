import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getCampo = vi.fn();
vi.mock('../composition', () => ({ getGolfCourseUseCase: { execute: (...a) => getCampo(...a) } }));

const { useCentroSinMapa } = await import('./useCentroSinMapa');

describe('useCentroSinMapa (S3: dónde se abre un hoyo sin mapa, aún sin GPS)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('en el campo, si se conoce su ubicación', async () => {
    getCampo.mockResolvedValue({ location: { latitude: 36.29, longitude: -5.33 } });

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    await waitFor(() => expect(result.current).toEqual({ lat: 36.29, lon: -5.33 }));
    expect(getCampo).toHaveBeenCalledWith('gc-1');
  });

  it('un campo sin coordenadas: nada (se espera al GPS)', async () => {
    getCampo.mockResolvedValue({ location: { latitude: null, longitude: null } });

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    await waitFor(() => expect(getCampo).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBeNull();
  });

  it('sin red: nada, sin romper', async () => {
    getCampo.mockRejectedValue(new TypeError('Sin conexión'));

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    await waitFor(() => expect(getCampo).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('al cambiar de campo, no se usa la ubicación del anterior', async () => {
    getCampo.mockResolvedValueOnce({ location: { latitude: 36.29, longitude: -5.33 } }).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ id }) => useCentroSinMapa({ golfCourseId: id, activo: true }), {
      initialProps: { id: 'gc-1' },
    });
    await waitFor(() => expect(result.current).toEqual({ lat: 36.29, lon: -5.33 }));

    rerender({ id: 'gc-2' });

    expect(result.current).toBeNull();
  });

  it('sin campo, ni se pide', () => {
    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: null, activo: true }));

    expect(result.current).toBeNull();
    expect(getCampo).not.toHaveBeenCalled();
  });

  it('un hoyo con mapa no lo necesita: ni se pide el campo', () => {
    renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: false }));

    expect(getCampo).not.toHaveBeenCalled();
  });
});
