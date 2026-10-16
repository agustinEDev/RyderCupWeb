import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getCampo = vi.hoisted(() => vi.fn());
// El caso de uso de verdad, con el repositorio de mentira: el hook se prueba con su copia
vi.mock('../composition', async () => {
  const { default: GetCourseLocationUseCase } = await import('../application/use_cases/golf_course/GetCourseLocationUseCase');
  const { default: LocalStorageCourseLocationCache } = await import('../infrastructure/repositories/LocalStorageCourseLocationCache');
  return {
    getCourseLocationUseCase: new GetCourseLocationUseCase({
      golfCourseRepository: { getById: (...a) => getCampo(...a) },
      courseLocationCache: new LocalStorageCourseLocationCache(),
    }),
  };
});

const { useCentroSinMapa } = await import('./useCentroSinMapa');

describe('useCentroSinMapa (S3: dónde se abre un hoyo sin mapa, aún sin GPS)', () => {
  let guardado;
  beforeEach(() => {
    vi.clearAllMocks();
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

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

  it('la ubicación que se supo queda en el móvil: sin red, al momento (16 oct)', async () => {
    getCampo.mockResolvedValueOnce({ location: { latitude: 36.29, longitude: -5.33 } });
    const { result, unmount } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));
    await waitFor(() => expect(result.current).toEqual({ lat: 36.29, lon: -5.33 }));
    unmount();
    getCampo.mockRejectedValue(new TypeError('sin red'));

    const otra = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true }));

    expect(otra.result.current).toEqual({ lat: 36.29, lon: -5.33 });
  });

  it('la copia es de cada campo, y la de otro campo no se usa', () => {
    guardado.set('ubicacionDelCampo:v1:gc-1', JSON.stringify({ lat: 36.29, lon: -5.33 }));
    getCampo.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-2', activo: true }));

    expect(result.current).toBeNull();
  });

  it('una copia ilegible o inválida no se usa', () => {
    guardado.set('ubicacionDelCampo:v1:gc-1', '{roto');
    guardado.set('ubicacionDelCampo:v1:gc-2', JSON.stringify({ lat: 95, lon: 0 }));
    getCampo.mockReturnValue(new Promise(() => {}));

    expect(renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-1', activo: true })).result.current).toBeNull();
    expect(renderHook(() => useCentroSinMapa({ golfCourseId: 'gc-2', activo: true })).result.current).toBeNull();
  });
});
