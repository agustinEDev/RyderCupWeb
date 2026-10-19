import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePosicionGps } from './usePosicionGps';

/** Un GPS falso: guarda los callbacks para disparar posiciones y errores. */
const gpsFalso = () => {
  const gps = { watchPosition: vi.fn(), clearWatch: vi.fn(), exito: null, error: null };
  gps.watchPosition.mockImplementation((exito, error) => {
    gps.exito = exito;
    gps.error = error;
    return 7;
  });
  return gps;
};
const posicion = (lat, lon, accuracy) => ({ coords: { latitude: lat, longitude: lon, accuracy } });

describe('usePosicionGps', () => {
  let gps;

  beforeEach(() => {
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('G1: sin activar no se pide la ubicación', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: false }));

    expect(gps.watchPosition).not.toHaveBeenCalled();
    expect(result.current.estado).toBe('inactivo');
  });

  it('G2: activado, sigue la posición con alta precisión', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    expect(gps.watchPosition).toHaveBeenCalledTimes(1);
    expect(gps.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true });
    expect(result.current.estado).toBe('buscando');

    act(() => gps.exito(posicion(36.28, -5.33, 8)));

    expect(result.current.estado).toBe('listo');
    expect(result.current.posicion).toEqual({ lat: 36.28, lon: -5.33 });
  });

  // Agustín, 17 oct: para marcar la salida y medir desde ti, el error en metros
  it('G6: con la posición, su error en metros; sin posición, ninguno', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true }));
    expect(result.current.precision).toBeNull();

    act(() => gps.exito(posicion(36.28, -5.33, 12)));
    expect(result.current.precision).toBe(12);

    act(() => gps.exito(posicion(36.28, -5.33, 45)));
    expect(result.current.precision).toBeNull();
  });

  it('G2: al salir de la anotación deja de seguirla', () => {
    const { unmount } = renderHook(() => usePosicionGps({ activo: true }));

    unmount();

    expect(gps.clearWatch).toHaveBeenCalledWith(7);
  });

  it('G5: con una precisión peor de 30 m, «buscando señal» y sin posición', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    act(() => gps.exito(posicion(36.28, -5.33, 45)));

    expect(result.current.estado).toBe('buscando');
    expect(result.current.posicion).toBeNull();

    act(() => gps.exito(posicion(36.281, -5.33, 30)));

    expect(result.current.estado).toBe('listo');
  });

  it('G4: permiso denegado → «denegado», sin insistir', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    act(() => gps.error({ code: 1 }));

    expect(result.current.estado).toBe('denegado');
    expect(gps.clearWatch).toHaveBeenCalledWith(7);
  });

  it('otro error del GPS (sin señal) sigue buscando', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    act(() => gps.error({ code: 3 }));

    expect(result.current.estado).toBe('buscando');
  });

  it('al volver a activarse, no enseña la posición de antes', () => {
    const { result, rerender } = renderHook(({ activo }) => usePosicionGps({ activo }), {
      initialProps: { activo: true },
    });
    act(() => gps.exito(posicion(36.28, -5.33, 8)));
    expect(result.current.estado).toBe('listo');

    rerender({ activo: false });
    rerender({ activo: true });

    expect(result.current).toEqual({ estado: 'buscando', posicion: null, precision: null });
  });

  it('G4: una lectura con coordenadas rotas (NaN) se descarta', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    act(() => gps.exito(posicion(Number.NaN, -5.33, 5)));

    expect(result.current).toEqual({ estado: 'buscando', posicion: null, precision: null });
  });

  it('G5: un permiso denegado al instante (dentro de la propia llamada) no rompe la pantalla', () => {
    gps.watchPosition.mockImplementation((_exito, error) => {
      error({ code: 1 });
      return 9;
    });

    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    expect(result.current.estado).toBe('denegado');
    expect(gps.clearWatch).toHaveBeenCalledWith(9);
    expect(gps.clearWatch).not.toHaveBeenCalledWith(null);
  });

  it('un navegador sin geolocalización → «no disponible»', () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: undefined });

    const { result } = renderHook(() => usePosicionGps({ activo: true }));

    expect(result.current.estado).toBe('no-disponible');
  });
  // Revisión del admin (17 oct): para centrar su mapa vale una posición de
  // ordenador, que por Wi-Fi suele ir de 40 a 150 m
  it('con otra precisión máxima, acepta las que caben en ella', () => {
    const { result } = renderHook(() => usePosicionGps({ activo: true, precisionMaxima: Infinity }));

    act(() => gps.exito(posicion(36.28, -5.33, 120)));

    expect(result.current).toEqual({ estado: 'listo', posicion: { lat: 36.28, lon: -5.33 }, precision: 120 });
  });
});
