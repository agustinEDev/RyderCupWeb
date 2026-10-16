import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const execute = vi.fn();
const copia = vi.fn();
vi.mock('../composition', () => ({
  getHoleMapUseCase: { execute: (...a) => execute(...a), guardado: (...a) => copia(...a) },
}));

const { useMapaDelCampo } = await import('./useMapaDelCampo');

const MAPA = { golfCourseId: 'gc-1', version: 'v1', attribution: null, holes: { 1: { green: null, playLine: [] } } };

describe('useMapaDelCampo', () => {
  beforeEach(() => {
    execute.mockReset();
    copia.mockReset();
    copia.mockReturnValue(null);
  });

  it('pide el mapa del campo y lo da', async () => {
    execute.mockResolvedValue(MAPA);

    const { result } = renderHook(() => useMapaDelCampo('gc-1'));

    await waitFor(() => expect(result.current).toEqual(MAPA));
    expect(execute).toHaveBeenCalledWith('gc-1');
  });

  it('D1: con cobertura mala (la red no contesta), la copia del móvil al momento', () => {
    execute.mockReturnValue(new Promise(() => {}));
    copia.mockReturnValue(MAPA);

    const { result } = renderHook(() => useMapaDelCampo('gc-1'));

    expect(result.current).toEqual(MAPA);
    expect(copia).toHaveBeenCalledWith('gc-1');
  });

  it('D1: cuando contesta la red, manda lo nuevo sobre la copia', async () => {
    const nuevo = { ...MAPA, version: 'v2' };
    execute.mockResolvedValue(nuevo);
    copia.mockReturnValue(MAPA);

    const { result } = renderHook(() => useMapaDelCampo('gc-1'));

    await waitFor(() => expect(result.current).toEqual(nuevo));
  });

  it('D2: si la red dice que ya no hay mapa, no hay mapa', async () => {
    execute.mockResolvedValue(null);
    copia.mockReturnValue(MAPA);

    const { result } = renderHook(() => useMapaDelCampo('gc-1'));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it('si la petición falla, se queda la copia', async () => {
    execute.mockRejectedValue(new Error('boom'));
    copia.mockReturnValue(MAPA);

    const { result } = renderHook(() => useMapaDelCampo('gc-1'));

    await waitFor(() => expect(execute).toHaveBeenCalled());
    expect(result.current).toEqual(MAPA);
  });

  it('al cambiar de campo, mientras llega su mapa, no se usa el del anterior', async () => {
    execute.mockResolvedValueOnce(MAPA).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ id }) => useMapaDelCampo(id), { initialProps: { id: 'gc-1' } });
    await waitFor(() => expect(result.current).toEqual(MAPA));

    rerender({ id: 'gc-2' });

    expect(execute).toHaveBeenLastCalledWith('gc-2');
    expect(result.current).toBeNull();
  });

  it('sin campo (vista aún cargando), ni se pide', () => {
    const { result } = renderHook(() => useMapaDelCampo(null));

    expect(execute).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });
});
