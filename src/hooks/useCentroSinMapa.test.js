import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getCampo = vi.fn();
vi.mock('../composition', () => ({ getGolfCourseUseCase: { execute: (...a) => getCampo(...a) } }));

const { useCentroSinMapa, recordarPosicion } = await import('./useCentroSinMapa');

describe('useCentroSinMapa (S3: dónde se abre un hoyo sin mapa, aún sin GPS)', () => {
  let almacen;

  beforeEach(() => {
    getCampo.mockReset();
    almacen = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('en el campo, si se conoce su ubicación', async () => {
    getCampo.mockResolvedValue({ location: { latitude: 36.29, longitude: -5.33 } });

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    await waitFor(() => expect(result.current).toEqual({ lat: 36.29, lon: -5.33 }));
    expect(getCampo).toHaveBeenCalledWith('gc-1');
  });

  it('sin la del campo (sin red o sin coordenadas), en la última posición conocida', async () => {
    recordarPosicion({ lat: 40.4, lon: -3.7 });
    getCampo.mockRejectedValue(new TypeError('Sin conexión'));

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    expect(result.current).toEqual({ lat: 40.4, lon: -3.7 });
    await waitFor(() => expect(getCampo).toHaveBeenCalled());
    expect(result.current).toEqual({ lat: 40.4, lon: -3.7 });
  });

  it('un campo sin coordenadas no pisa la última posición', async () => {
    recordarPosicion({ lat: 40.4, lon: -3.7 });
    getCampo.mockResolvedValue({ location: { latitude: null, longitude: null } });

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    await waitFor(() => expect(getCampo).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toEqual({ lat: 40.4, lon: -3.7 });
  });

  it('sin nada, null', () => {
    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: null, activo: true }));

    expect(result.current).toBeNull();
    expect(getCampo).not.toHaveBeenCalled();
  });

  it('un hoyo con mapa no lo necesita: ni se pide el campo', () => {
    renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: false }));

    expect(getCampo).not.toHaveBeenCalled();
  });

  it('una última posición rota se ignora', () => {
    almacen.set('mapaDeHoyos:ultimaPosicion', '{"lat":"x"}');

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: null, activo: true }));

    expect(result.current).toBeNull();
  });
});
