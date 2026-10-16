import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * Las muestras del campo para el mapa abierto (BE #532, marcado por par).
 *
 * | Caso | Qué                                                   | Qué se espera                                            |
 * |------|-------------------------------------------------------|----------------------------------------------------------|
 * | S15  | al abrir                                              | el resumen del móvil al momento, luego el del servidor   |
 * | S15  | el servidor falla                                     | se queda el del móvil                                    |
 * | S15  | cambiar de campo                                      | no se ve el del anterior mientras llega el nuevo         |
 * | S15  | enviar una muestra                                    | `pendientes` la tiene en cuanto está en la cola          |
 * | S15  | llega (2xx)                                           | sale de `pendientes` y el resumen se pide otra vez       |
 * | S15  | se queda en la cola                                   | sigue en `pendientes` y avisa para armar los reintentos  |
 * | S15  | el envío revienta                                     | la promesa no se rechaza, sin avisos                      |
 * | S15  | la cola de fondo envía o descarta                     | el mapa abierto se pone al día (pendientes y resumen)    |
 * | S15  | un envío lento de otro campo                          | no pisa lo del campo de ahora                            |
 * | S15  | la forma devuelta                                     | exactamente { muestras, pendientes, enviar }             |
 */

const casos = vi.hoisted(() => ({
  muestras: { guardadas: vi.fn(() => ({})), execute: vi.fn(async () => ({})), pendientes: vi.fn(() => ({})) },
  enviar: { execute: vi.fn(async () => ({ estado: 'enviada' })) },
}));
vi.mock('../composition', () => ({ getHoleSamplesUseCase: casos.muestras, sendHoleSampleUseCase: casos.enviar, sendPendingHoleSamplesUseCase: {} }));

const { useMuestrasDelCampo } = await import('./useMuestrasDelCampo');

const P = { tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } };
const H3 = { primera: P, recoge: true };
const H5 = { primera: null, recoge: true };

describe('useMuestrasDelCampo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    casos.muestras.guardadas.mockReturnValue({});
    casos.muestras.execute.mockResolvedValue({});
    casos.muestras.pendientes.mockReturnValue({});
    casos.enviar.execute.mockResolvedValue({ estado: 'enviada' });
  });

  it('S15: devuelve exactamente { muestras, pendientes, enviar }', () => {
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));

    expect(Object.keys(result.current).sort()).toEqual(['enviar', 'muestras', 'pendientes']);
    expect(typeof result.current.enviar).toBe('function');
  });

  it('S15: el resumen del móvil al momento y luego el del servidor', async () => {
    casos.muestras.guardadas.mockReturnValue({ 3: H3 });
    let responder;
    casos.muestras.execute.mockReturnValue(new Promise((r) => (responder = r)));

    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));

    expect(result.current.muestras).toEqual({ 3: H3 });
    await act(async () => responder({ 3: H3, 5: H5 }));
    expect(result.current.muestras).toEqual({ 3: H3, 5: H5 });
    expect(casos.muestras.execute).toHaveBeenCalledWith('gc-1');
    expect(casos.muestras.guardadas).toHaveBeenCalledWith('gc-1');
  });

  it('S15: lo pendiente del jugador, al momento', () => {
    casos.muestras.pendientes.mockReturnValue({ 3: P });

    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));

    expect(result.current.pendientes).toEqual({ 3: P });
    expect(casos.muestras.pendientes).toHaveBeenCalledWith('u1', 'gc-1');
  });

  it('S15: si el servidor falla, se queda el del móvil', async () => {
    casos.muestras.guardadas.mockReturnValue({ 3: H3 });
    casos.muestras.execute.mockRejectedValue(new Error('x'));

    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});

    expect(result.current.muestras).toEqual({ 3: H3 });
  });

  it('S15: el resumen es público: sin jugador también se pide (pero no hay pendientes)', async () => {
    casos.muestras.execute.mockResolvedValue({ 3: H3 });

    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: null }));

    await waitFor(() => expect(result.current.muestras).toEqual({ 3: H3 }));
    expect(result.current.pendientes).toEqual({});
  });

  it('S15: sin campo, nada y sin pedir', () => {
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: null, userId: 'u1' }));

    expect(casos.muestras.execute).not.toHaveBeenCalled();
    expect(result.current.muestras).toEqual({});
    expect(result.current.pendientes).toEqual({});
  });

  it('S15: cambiar de campo no deja ver el del anterior mientras llega el nuevo', async () => {
    casos.muestras.guardadas.mockImplementation((gc) => (gc === 'gc-1' ? { 3: H3 } : {}));
    casos.muestras.execute.mockImplementation(async (gc) => (gc === 'gc-1' ? { 3: H3, 5: H5 } : new Promise(() => {})));
    const { result, rerender } = renderHook(({ gc }) => useMuestrasDelCampo({ golfCourseId: gc, userId: 'u1' }), {
      initialProps: { gc: 'gc-1' },
    });
    await waitFor(() => expect(result.current.muestras).toEqual({ 3: H3, 5: H5 }));

    rerender({ gc: 'gc-2' });

    expect(result.current.muestras).toEqual({});
  });

  it('S15: una recién enviada está en `pendientes` en cuanto entra en la cola, aunque el envío tarde', async () => {
    casos.enviar.execute.mockImplementation(({ alQuedarEnCola }) => {
      casos.muestras.pendientes.mockReturnValue({ 3: P });
      alQuedarEnCola();
      return new Promise(() => {});
    });
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});

    act(() => {
      result.current.enviar(3, P);
    });

    expect(casos.enviar.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', golfCourseId: 'gc-1', holeNumber: 3, tee: P.tee, bends: P.bends, greenCenter: P.greenCenter }),
    );
    expect(result.current.pendientes).toEqual({ 3: P });
  });

  it('S15: al llegar, sale de `pendientes` y el resumen se pide otra vez', async () => {
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});
    casos.muestras.execute.mockClear();
    casos.muestras.execute.mockResolvedValue({ 3: H3 });
    casos.enviar.execute.mockImplementation(async ({ alQuedarEnCola }) => {
      casos.muestras.pendientes.mockReturnValue({ 3: P });
      alQuedarEnCola();
      casos.muestras.pendientes.mockReturnValue({});
      return { estado: 'enviada' };
    });

    await act(async () => result.current.enviar(3, P));

    expect(result.current.pendientes).toEqual({});
    expect(casos.muestras.execute).toHaveBeenCalledTimes(1);
    expect(result.current.muestras).toEqual({ 3: H3 });
  });

  it('S15: si se queda en la cola, sigue en `pendientes`, no se pide el resumen y se avisa para reintentar', async () => {
    const oyente = vi.fn();
    globalThis.addEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});
    casos.muestras.execute.mockClear();
    casos.muestras.pendientes.mockReturnValue({ 3: P });
    casos.enviar.execute.mockResolvedValue({ estado: 'pendiente', paraLaTanda: true });

    let r;
    await act(async () => {
      r = await result.current.enviar(3, P);
    });

    expect(r).toBeUndefined();
    expect(result.current.pendientes).toEqual({ 3: P });
    expect(casos.muestras.execute).not.toHaveBeenCalled();
    expect(oyente).toHaveBeenCalledTimes(1);
    globalThis.removeEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
  });

  it('S15: una descartada no avisa para reintentar ni pide el resumen', async () => {
    const oyente = vi.fn();
    globalThis.addEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});
    casos.muestras.execute.mockClear();
    casos.enviar.execute.mockResolvedValue({ estado: 'descartada', errorCode: 'HOLE_NOT_IN_COURSE' });

    await act(async () => result.current.enviar(3, P));

    expect(oyente).not.toHaveBeenCalled();
    expect(casos.muestras.execute).not.toHaveBeenCalled();
    expect(result.current.pendientes).toEqual({});
    globalThis.removeEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
  });

  it('S15: si el envío revienta, la promesa no se rechaza', async () => {
    casos.enviar.execute.mockRejectedValue(new Error('roto'));
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));

    await act(async () => {
      await expect(result.current.enviar(3, P)).resolves.toBeUndefined();
    });
  });

  it('S15: sin argumentos tampoco revienta', async () => {
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));

    await act(async () => {
      await expect(result.current.enviar(3)).resolves.toBeUndefined();
    });
  });

  it('S15: lo que la cola de fondo envía o descarta llega al mapa abierto', async () => {
    casos.muestras.pendientes.mockReturnValue({ 3: P });
    const { result } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});
    expect(result.current.pendientes).toEqual({ 3: P });
    casos.muestras.pendientes.mockReturnValue({});
    casos.muestras.execute.mockResolvedValue({ 3: H3 });

    await act(async () => {
      globalThis.dispatchEvent(new globalThis.CustomEvent('rydercup:muestras-de-hoyos'));
    });

    expect(result.current.pendientes).toEqual({});
    expect(result.current.muestras).toEqual({ 3: H3 });
  });

  it('S15: desmontado, el evento ya no hace nada', async () => {
    const { unmount } = renderHook(() => useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1' }));
    await act(async () => {});
    unmount();
    casos.muestras.execute.mockClear();

    globalThis.dispatchEvent(new globalThis.CustomEvent('rydercup:muestras-de-hoyos'));

    expect(casos.muestras.execute).not.toHaveBeenCalled();
  });

  it('S15: un envío lento de otro campo no pisa lo del campo de ahora', async () => {
    casos.muestras.pendientes.mockImplementation((_u, gc) => (gc === 'gc-2' ? { 5: P } : {}));
    casos.muestras.execute.mockImplementation(async (gc) => (gc === 'gc-2' ? { 5: H5 } : { 3: H3 }));
    let terminar;
    casos.enviar.execute.mockImplementation(() => new Promise((r) => (terminar = r)));
    const { result, rerender } = renderHook(({ gc }) => useMuestrasDelCampo({ golfCourseId: gc, userId: 'u1' }), {
      initialProps: { gc: 'gc-1' },
    });
    let enviado;
    act(() => {
      enviado = result.current.enviar(3, P);
    });

    rerender({ gc: 'gc-2' });
    await waitFor(() => expect(result.current.muestras).toEqual({ 5: H5 }));
    // En gc-2 la cola de fondo cambia algo: lo de ahora ya no es la copia del principio
    casos.muestras.pendientes.mockImplementation((_u, gc) => (gc === 'gc-2' ? { 5: P, 6: P } : {}));
    await act(async () => {
      globalThis.dispatchEvent(new globalThis.CustomEvent('rydercup:muestras-de-hoyos'));
    });
    expect(result.current.pendientes).toEqual({ 5: P, 6: P });
    await act(async () => {
      terminar({ estado: 'enviada' });
      await enviado;
    });

    expect(result.current.muestras).toEqual({ 5: H5 });
    expect(result.current.pendientes).toEqual({ 5: P, 6: P });
  });
});
