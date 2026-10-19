import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * Las muestras del campo para el mapa abierto (BE #532, marcado por par),
 * vistas desde la barra del jugador.
 *
 * | Caso | Qué                                                   | Qué se espera                                            |
 * |------|-------------------------------------------------------|----------------------------------------------------------|
 * | S15  | al abrir                                              | el resumen del móvil al momento, luego el del servidor, de MI barra |
 * | S15  | el servidor falla                                     | se queda el del móvil                                    |
 * | S15  | cambiar de campo o de barra                           | no se ve lo del anterior mientras llega lo nuevo         |
 * | S15  | enviar una muestra                                    | con su id y MI barra; `pendientes` la tiene en cuanto está en la cola |
 * | S15  | sin barra o sin jugador                               | `enviar` no hace nada                                    |
 * | S15  | llega (2xx)                                           | sale de `pendientes` A LA VEZ que entra el resumen nuevo |
 * | S19  | llega (2xx) y el resumen falla                        | `pendientes` la sigue dando (la recién enviada)          |
 * | S15  | se queda en la cola                                   | sigue en `pendientes` y avisa para armar los reintentos  |
 * | S15  | el envío revienta                                     | la promesa no se rechaza, sin avisos                      |
 * | S15  | la cola de fondo envía o descarta                     | pendientes y resumen se ponen al día JUNTOS (#3b)        |
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
const MUESTRA = { id: 'm-1', ...P };
// Por hoyo, de cualquier barra (BE #575, 17 oct)
const H3 = { primera: P, green: null, recoge: true };
const H5 = { primera: null, green: { lat: 5, lon: 6 }, recoge: true };
const AMARILLA = { color: 'YELLOW', gender: 'MALE' };
const ROJA = { color: 'RED', gender: null };

const montar = (props = {}) => renderHook((p) => useMuestrasDelCampo(p), { initialProps: { golfCourseId: 'gc-1', userId: 'u1', barra: AMARILLA, ...props } });

describe('useMuestrasDelCampo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    casos.muestras.guardadas.mockReturnValue({});
    casos.muestras.execute.mockResolvedValue({});
    casos.muestras.pendientes.mockReturnValue({});
    casos.enviar.execute.mockResolvedValue({ estado: 'enviada' });
  });

  it('S15: devuelve exactamente { muestras, pendientes, enviar }', () => {
    const { result } = montar();

    expect(Object.keys(result.current).sort()).toEqual(['enviar', 'muestras', 'pendientes']);
    expect(typeof result.current.enviar).toBe('function');
  });

  it('S15: el resumen del móvil al momento y luego el del servidor (el mismo para cualquier barra)', async () => {
    casos.muestras.guardadas.mockReturnValue({ 3: H3 });
    let responder;
    casos.muestras.execute.mockReturnValue(new Promise((r) => (responder = r)));

    const { result } = montar();

    expect(result.current.muestras).toEqual({ 3: H3 });
    await act(async () => responder({ 3: H3, 5: H5 }));
    expect(result.current.muestras).toEqual({ 3: H3, 5: H5 });
    expect(casos.muestras.execute).toHaveBeenCalledWith('gc-1');
    expect(casos.muestras.guardadas).toHaveBeenCalledWith('gc-1');
  });

  it('S15: lo pendiente del jugador con su barra, al momento', () => {
    casos.muestras.pendientes.mockReturnValue({ 3: P });

    const { result } = montar();

    expect(result.current.pendientes).toEqual({ 3: P });
    expect(casos.muestras.pendientes).toHaveBeenCalledWith('u1', 'gc-1', AMARILLA);
  });

  it('S15: una barra nueva en cada render (mismo color y género) no vuelve a pedir', async () => {
    const { rerender } = montar();
    await act(async () => {});

    rerender({ golfCourseId: 'gc-1', userId: 'u1', barra: { ...AMARILLA } });
    await act(async () => {});

    expect(casos.muestras.execute).toHaveBeenCalledTimes(1);
  });

  it('S15: cambiar de barra vuelve a mirar lo pendiente de la nueva (el resumen es el mismo)', async () => {
    casos.muestras.execute.mockResolvedValue({ 3: H3 });
    casos.muestras.pendientes.mockImplementation((_u, _gc, b) => (b?.color === 'RED' ? { 4: P } : {}));
    const { result, rerender } = montar();
    await waitFor(() => expect(result.current.muestras).toEqual({ 3: H3 }));

    rerender({ golfCourseId: 'gc-1', userId: 'u1', barra: ROJA });

    await waitFor(() => expect(result.current.pendientes).toEqual({ 4: P }));
    expect(casos.muestras.pendientes).toHaveBeenLastCalledWith('u1', 'gc-1', ROJA);
  });

  it('S15: si el servidor falla, se queda el del móvil', async () => {
    casos.muestras.guardadas.mockReturnValue({ 3: H3 });
    casos.muestras.execute.mockRejectedValue(new Error('x'));

    const { result } = montar();
    await act(async () => {});

    expect(result.current.muestras).toEqual({ 3: H3 });
  });

  it('S15: el resumen es público: sin jugador ni barra también se pide (pero no hay pendientes)', async () => {
    casos.muestras.execute.mockResolvedValue({ 3: H3 });

    const { result } = montar({ userId: null, barra: null });

    await waitFor(() => expect(result.current.muestras).toEqual({ 3: H3 }));
    expect(casos.muestras.execute).toHaveBeenCalledWith('gc-1');
    expect(result.current.pendientes).toEqual({});
  });

  it('S15: sin campo, nada y sin pedir', () => {
    const { result } = montar({ golfCourseId: null });

    expect(casos.muestras.execute).not.toHaveBeenCalled();
    expect(result.current.muestras).toEqual({});
    expect(result.current.pendientes).toEqual({});
  });

  it('S15: cambiar de campo no deja ver el del anterior mientras llega el nuevo', async () => {
    casos.muestras.guardadas.mockImplementation((gc) => (gc === 'gc-1' ? { 3: H3 } : {}));
    casos.muestras.execute.mockImplementation(async (gc) => (gc === 'gc-1' ? { 3: H3, 5: H5 } : new Promise(() => {})));
    const { result, rerender } = montar();
    await waitFor(() => expect(result.current.muestras).toEqual({ 3: H3, 5: H5 }));

    rerender({ golfCourseId: 'gc-2', userId: 'u1', barra: AMARILLA });

    expect(result.current.muestras).toEqual({});
  });

  it('S15: enviar lleva el id del mapa y MI barra, y la muestra está en `pendientes` en cuanto entra en la cola', async () => {
    casos.enviar.execute.mockImplementation(({ alQuedarEnCola }) => {
      casos.muestras.pendientes.mockReturnValue({ 3: P });
      alQuedarEnCola();
      return new Promise(() => {});
    });
    const { result } = montar();
    await act(async () => {});

    act(() => {
      result.current.enviar(3, MUESTRA);
    });

    expect(casos.enviar.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', golfCourseId: 'gc-1', holeNumber: 3, barra: AMARILLA, id: 'm-1', tee: P.tee, bends: P.bends, greenCenter: P.greenCenter }),
    );
    expect(result.current.pendientes).toEqual({ 3: P });
  });

  it.each([
    ['sin barra', { barra: null }],
    ['sin jugador', { userId: null }],
  ])('S15: %s, enviar no hace nada', async (_caso, props) => {
    const { result } = montar(props);

    await act(async () => {
      await expect(result.current.enviar(3, MUESTRA)).resolves.toBeUndefined();
    });

    expect(casos.enviar.execute).not.toHaveBeenCalled();
  });

  it('S15 (#3b): al llegar, sale de `pendientes` en el MISMO render en que entra en el resumen', async () => {
    const vistos = [];
    const { result } = renderHook(() => {
      const r = useMuestrasDelCampo({ golfCourseId: 'gc-1', userId: 'u1', barra: AMARILLA });
      vistos.push({ muestra: r.muestras[3]?.primera ?? null, pendiente: r.pendientes[3] ?? null });
      return r;
    });
    await act(async () => {});
    let responder;
    casos.muestras.execute.mockReturnValue(new Promise((r) => (responder = r)));
    casos.enviar.execute.mockImplementation(async ({ alQuedarEnCola }) => {
      casos.muestras.pendientes.mockReturnValue({ 3: P });
      alQuedarEnCola();
      casos.muestras.pendientes.mockReturnValue({});
      return { estado: 'enviada' };
    });

    let enviado;
    await act(async () => {
      enviado = result.current.enviar(3, MUESTRA);
    });
    // Mientras llega el resumen nuevo, la pendiente se sigue viendo
    expect(result.current.pendientes).toEqual({ 3: P });
    await act(async () => {
      responder({ 3: H3 });
      await enviado;
    });

    expect(result.current.pendientes).toEqual({});
    expect(result.current.muestras).toEqual({ 3: H3 });
    const desdeQueSeVio = vistos.slice(vistos.findIndex((v) => v.pendiente));
    expect(desdeQueSeVio.every((v) => v.muestra || v.pendiente)).toBe(true);
  });

  it('CR7: el primer resumen que carga refresca también lo pendiente (olvidó las recién enviadas que ya trae)', async () => {
    casos.muestras.pendientes.mockReturnValue({ 3: P });
    const { result } = montar();
    expect(result.current.pendientes).toEqual({ 3: P });
    casos.muestras.pendientes.mockReturnValue({});

    await act(async () => {});

    expect(result.current.pendientes).toEqual({});
  });

  it('S19: llega y el resumen nuevo falla: se sigue viendo lo que dé `pendientes` (la recién enviada)', async () => {
    const { result } = montar();
    await act(async () => {});
    casos.muestras.execute.mockRejectedValue(new Error('sin red'));
    casos.enviar.execute.mockImplementation(async () => {
      casos.muestras.pendientes.mockReturnValue({ 3: P });
      return { estado: 'enviada' };
    });

    await act(async () => result.current.enviar(3, MUESTRA));

    expect(result.current.pendientes).toEqual({ 3: P });
    expect(casos.muestras.pendientes).toHaveBeenLastCalledWith('u1', 'gc-1', AMARILLA);
  });

  it('S15: si se queda en la cola, sigue en `pendientes`, no se pide el resumen y se avisa para reintentar', async () => {
    const oyente = vi.fn();
    globalThis.addEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
    const { result } = montar();
    await act(async () => {});
    casos.muestras.execute.mockClear();
    casos.muestras.pendientes.mockReturnValue({ 3: P });
    casos.enviar.execute.mockResolvedValue({ estado: 'pendiente', paraLaTanda: true });

    let r;
    await act(async () => {
      r = await result.current.enviar(3, MUESTRA);
    });

    expect(r).toBeUndefined();
    expect(result.current.pendientes).toEqual({ 3: P });
    expect(casos.muestras.execute).not.toHaveBeenCalled();
    expect(oyente).toHaveBeenCalledTimes(1);
    globalThis.removeEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
  });

  it('S15: una descartada sale de `pendientes`, sin avisar para reintentar ni pedir el resumen', async () => {
    const oyente = vi.fn();
    globalThis.addEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
    casos.muestras.pendientes.mockReturnValue({ 3: P });
    const { result } = montar();
    await act(async () => {});
    casos.muestras.execute.mockClear();
    casos.muestras.pendientes.mockReturnValue({});
    casos.enviar.execute.mockResolvedValue({ estado: 'descartada', errorCode: 'HOLE_NOT_IN_COURSE' });

    await act(async () => result.current.enviar(3, MUESTRA));

    expect(oyente).not.toHaveBeenCalled();
    expect(casos.muestras.execute).not.toHaveBeenCalled();
    expect(result.current.pendientes).toEqual({});
    globalThis.removeEventListener('rydercup:muestra-de-hoyo-pendiente', oyente);
  });

  it('S15: si el envío revienta, la promesa no se rechaza', async () => {
    casos.enviar.execute.mockRejectedValue(new Error('roto'));
    const { result } = montar();

    await act(async () => {
      await expect(result.current.enviar(3, MUESTRA)).resolves.toBeUndefined();
    });
  });

  it('S15: sin datos tampoco revienta', async () => {
    const { result } = montar();

    await act(async () => {
      await expect(result.current.enviar(3)).resolves.toBeUndefined();
    });
  });

  it('S15 (#3b): lo que la cola de fondo envía llega al mapa abierto, pendientes y resumen JUNTOS', async () => {
    casos.muestras.pendientes.mockReturnValue({ 3: P });
    const { result } = montar();
    await act(async () => {});
    expect(result.current.pendientes).toEqual({ 3: P });
    casos.muestras.pendientes.mockReturnValue({});
    let responder;
    casos.muestras.execute.mockReturnValue(new Promise((r) => (responder = r)));

    act(() => {
      globalThis.dispatchEvent(new globalThis.CustomEvent('rydercup:muestras-de-hoyos'));
    });
    // El resumen aún no ha llegado: la pendiente se sigue viendo
    expect(result.current.pendientes).toEqual({ 3: P });
    await act(async () => responder({ 3: H3 }));

    expect(result.current.pendientes).toEqual({});
    expect(result.current.muestras).toEqual({ 3: H3 });
  });

  it('S15: desmontado, el evento ya no hace nada', async () => {
    const { unmount } = montar();
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
    const { result, rerender } = montar();
    let enviado;
    act(() => {
      enviado = result.current.enviar(3, MUESTRA);
    });

    rerender({ golfCourseId: 'gc-2', userId: 'u1', barra: AMARILLA });
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
