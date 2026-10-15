import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const execute = vi.fn();
const copia = vi.fn();
vi.mock('../composition', () => ({
  getHoleMapUseCase: { execute: (...a) => execute(...a), guardado: (...a) => copia(...a) },
}));

const { useDistanciasDelHoyo } = await import('./useDistanciasDelHoyo');

const GREEN = {
  front: { lat: 36.2898, lon: -5.332 },
  center: { lat: 36.29, lon: -5.332 },
  back: { lat: 36.2902, lon: -5.332 },
};
const MAPA = { golfCourseId: 'gc-1', version: 'v1', holes: { 1: { green: GREEN, playLine: [] }, 2: { green: null, playLine: [] } } };

describe('useDistanciasDelHoyo', () => {
  let gps;

  beforeEach(() => {
    execute.mockReset();
    copia.mockReset();
    copia.mockReturnValue(null);
    gps = { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() };
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
    const guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('M1: pide el mapa del campo y da el green del hoyo', async () => {
    execute.mockResolvedValue(MAPA);

    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));

    await waitFor(() => expect(result.current.green).toEqual(GREEN));
    expect(execute).toHaveBeenCalledWith('gc-1');
  });

  it('L4: al cambiar de hoyo, el green del hoyo nuevo (sin volver a pedir el mapa)', async () => {
    execute.mockResolvedValue(MAPA);
    const { result, rerender } = renderHook((props) => useDistanciasDelHoyo(props), {
      initialProps: { golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 },
    });
    await waitFor(() => expect(result.current.green).toEqual(GREEN));

    rerender({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 2 });

    expect(result.current.green).toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('al cambiar de campo, mientras llega su mapa, no se usa el del anterior', async () => {
    execute.mockResolvedValueOnce(MAPA).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook((props) => useDistanciasDelHoyo(props), {
      initialProps: { golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 },
    });
    await waitFor(() => expect(result.current.green).toEqual(GREEN));

    rerender({ golfCourseId: 'gc-2', partida: 'p-1', hoyo: 1 });

    expect(execute).toHaveBeenLastCalledWith('gc-2');
    expect(result.current.green).toBeNull();
  });

  it('M2: sin mapa, sin green', async () => {
    execute.mockResolvedValue(null);

    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));

    await waitFor(() => expect(execute).toHaveBeenCalled());
    expect(result.current.green).toBeNull();
  });

  it('sin campo (vista aún cargando), ni se pide el mapa', () => {
    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: null, partida: 'p-1', hoyo: 1 }));

    expect(execute).not.toHaveBeenCalled();
    expect(result.current.green).toBeNull();
  });

  it('G1: el GPS solo se pide al activar, y solo si el campo tiene mapa', async () => {
    execute.mockResolvedValue(MAPA);
    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));
    await waitFor(() => expect(result.current.green).toEqual(GREEN));
    expect(gps.watchPosition).not.toHaveBeenCalled();

    act(() => result.current.activar());

    expect(gps.watchPosition).toHaveBeenCalledTimes(1);
    expect(result.current.activadas).toBe(true);
  });

  it('G1: con las distancias activadas pero sin mapa, no se pide el GPS', async () => {
    globalThis.localStorage.setItem('distanciasActivadas:p-1', '1');
    execute.mockResolvedValue(null);

    renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));
    await waitFor(() => expect(execute).toHaveBeenCalled());

    expect(gps.watchPosition).not.toHaveBeenCalled();
  });
});

describe('useDistanciasDelHoyo — sin cobertura, fuera de la anotación y ocultar', () => {
  let gps;

  beforeEach(() => {
    execute.mockReset();
    copia.mockReset();
    copia.mockReturnValue(null);
    gps = { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() };
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
    const almacen = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('M3: con cobertura mala (la red no contesta), la copia del móvil al momento', () => {
    execute.mockReturnValue(new Promise(() => {}));
    copia.mockReturnValue(MAPA);

    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));

    expect(result.current.green).toEqual(GREEN);
    expect(copia).toHaveBeenCalledWith('gc-1');
  });

  it('M4: cuando contesta la red, manda lo nuevo sobre la copia', async () => {
    const nuevo = { ...MAPA, version: 'v2', holes: { 1: { green: null, playLine: [] } } };
    execute.mockResolvedValue(nuevo);
    copia.mockReturnValue(MAPA);

    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));

    await waitFor(() => expect(result.current.green).toBeNull());
  });

  it('la atribución del mapa (licencia de OSM)', async () => {
    execute.mockResolvedValue({ ...MAPA, attribution: '© OpenStreetMap contributors (ODbL)' });

    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));

    await waitFor(() => expect(result.current.atribucion).toBe('© OpenStreetMap contributors (ODbL)'));
  });

  it('G2: con la anotación sin verse (otra pestaña, aún cerrada), el GPS apagado', async () => {
    globalThis.localStorage.setItem('distanciasActivadas:p-1', '1');
    execute.mockResolvedValue(MAPA);
    const { result, rerender } = renderHook((props) => useDistanciasDelHoyo(props), {
      initialProps: { golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1, visible: true },
    });
    await waitFor(() => expect(result.current.green).toEqual(GREEN));
    expect(gps.watchPosition).toHaveBeenCalledTimes(1);

    rerender({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1, visible: false });

    expect(gps.clearWatch).toHaveBeenCalledWith(1);
  });

  it('ocultar apaga el GPS', async () => {
    globalThis.localStorage.setItem('distanciasActivadas:p-1', '1');
    execute.mockResolvedValue(MAPA);
    const { result } = renderHook(() => useDistanciasDelHoyo({ golfCourseId: 'gc-1', partida: 'p-1', hoyo: 1 }));
    await waitFor(() => expect(gps.watchPosition).toHaveBeenCalled());

    act(() => result.current.ocultar());

    expect(result.current.activadas).toBe(false);
    expect(gps.clearWatch).toHaveBeenCalledWith(1);
  });
});
