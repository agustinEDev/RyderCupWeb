import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * La cola de muestras en segundo plano (BE #532, marcado por par). Sin avisos:
 * el jugador no sabe que existe.
 *
 * | Caso | Qué                                                 | Qué se espera                                         |
 * |------|-----------------------------------------------------|-------------------------------------------------------|
 * | S16  | arrancar con sesión y red                           | vacía la cola de ese jugador                          |
 * | S16  | sin sesión, sin jugador o sin red                   | nada                                                  |
 * | S16  | vuelve la red / se vuelve a la app                  | vacía otra vez (y empieza la escalera de nuevo)       |
 * | S16  | queda algo pendiente con la app abierta             | reintenta a los 30 s, 2 min y 5 min, y para           |
 * | S16  | una muestra se queda en la cola (aviso del mapa)     | arma el reintento a los 30 s, uno solo                |
 * | S16  | envió o descartó algo                               | avisa al mapa abierto; NUNCA un toast                 |
 * | S16  | cambia la sesión / se desmonta                      | la tanda en marcha deja de seguir; nada armado        |
 * | R5   | los reportes de hoyo (entrega 7)                    | salen con las muestras, con la misma escalera         |
 */

const envio = vi.hoisted(() => ({ execute: vi.fn(async () => ({ pendientes: 0 })) }));
const reportes = vi.hoisted(() => ({ execute: vi.fn(async () => ({ pendientes: 0 })) }));
vi.mock('../composition', () => ({ sendPendingHoleSamplesUseCase: envio, sendPendingHoleReportsUseCase: reportes }));
const toastFalso = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastFalso }));

const { useEnvioDeMuestras, ESPERAS_MS, MUESTRAS_CAMBIADAS, MUESTRA_PENDIENTE } = await import('./useEnvioDeMuestras');

describe('useEnvioDeMuestras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envio.execute.mockResolvedValue({ enviadas: 0, descartadas: 0, pendientes: 0 });
    reportes.execute.mockResolvedValue({ enviados: 0, descartados: 0, pendientes: 0 });
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('los nombres de los avisos y la escalera', () => {
    expect(MUESTRA_PENDIENTE).toBe('rydercup:muestra-de-hoyo-pendiente');
    expect(MUESTRAS_CAMBIADAS).toBe('rydercup:muestras-de-hoyos');
    expect(ESPERAS_MS).toEqual([30_000, 120_000, 300_000]);
  });

  it('al arrancar con sesión y red, envía las del jugador', () => {
    renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));

    expect(envio.execute).toHaveBeenCalledWith('u1', { sigue: expect.any(Function) });
  });

  it('R5: al arrancar envía también los reportes del jugador, cortándose igual', () => {
    const { unmount } = renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));

    expect(reportes.execute).toHaveBeenCalledWith('u1', { sigue: expect.any(Function) });
    const { sigue } = reportes.execute.mock.calls[0][1];
    expect(sigue()).toBe(true);
    unmount();
    expect(sigue()).toBe(false);
  });

  it('R5: un reporte que se queda en la cola arma el reintento a los 30 s', async () => {
    vi.useFakeTimers();
    try {
      reportes.execute.mockResolvedValueOnce({ enviados: 0, descartados: 0, pendientes: 1 });
      renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(ESPERAS_MS[0]);

      expect(reportes.execute).toHaveBeenCalledTimes(2);
      expect(toastFalso).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('R5: si los reportes fallan, las muestras se envían igual y avisan al mapa', async () => {
    reportes.execute.mockRejectedValueOnce(new Error('roto'));
    envio.execute.mockResolvedValueOnce({ enviadas: 1, descartadas: 0, pendientes: 0 });
    const aviso = vi.fn();
    globalThis.addEventListener(MUESTRAS_CAMBIADAS, aviso);

    renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1));

    globalThis.removeEventListener(MUESTRAS_CAMBIADAS, aviso);
  });

  it('sin sesión o sin usuario, nada', () => {
    renderHook(() => useEnvioDeMuestras({ activo: false, userId: 'u1' }));
    renderHook(() => useEnvioDeMuestras({ activo: true, userId: null }));
    renderHook(() => useEnvioDeMuestras({ activo: true }));

    expect(envio.execute).not.toHaveBeenCalled();
  });

  it('sin red no lo intenta; al volver la red, sí', () => {
    vi.stubGlobal('navigator', { onLine: false });
    renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
    expect(envio.execute).not.toHaveBeenCalled();

    vi.stubGlobal('navigator', { onLine: true });
    globalThis.dispatchEvent(new globalThis.Event('online'));

    expect(envio.execute).toHaveBeenCalledTimes(1);
  });

  it('al volver a la aplicación (visible), envía; al irse, no', () => {
    renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
    envio.execute.mockClear();
    const estado = vi.spyOn(globalThis.document, 'visibilityState', 'get');

    estado.mockReturnValue('hidden');
    globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    expect(envio.execute).not.toHaveBeenCalled();

    estado.mockReturnValue('visible');
    globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    expect(envio.execute).toHaveBeenCalledTimes(1);
    estado.mockRestore();
  });

  it('al desmontar deja de escuchar', () => {
    const { unmount } = renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
    unmount();
    envio.execute.mockClear();

    globalThis.dispatchEvent(new globalThis.Event('online'));
    globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));

    expect(envio.execute).not.toHaveBeenCalled();
  });

  it('un fallo del envío no revienta nada ni avisa', async () => {
    envio.execute.mockRejectedValueOnce(new Error('x'));

    expect(() => renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }))).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(toastFalso).not.toHaveBeenCalled();
    expect(toastFalso.error).not.toHaveBeenCalled();
  });

  it('D19: al cambiar de sesión, el envío en marcha deja de seguir', () => {
    const { rerender } = renderHook(({ userId }) => useEnvioDeMuestras({ activo: true, userId }), { initialProps: { userId: 'u1' } });
    const { sigue } = envio.execute.mock.calls[0][1];
    expect(sigue()).toBe(true);

    rerender({ userId: 'u2' });

    expect(sigue()).toBe(false);
    expect(envio.execute).toHaveBeenLastCalledWith('u2', { sigue: expect.any(Function) });
  });

  describe('con la aplicación abierta, se reintenta (portal de un club, tope de peticiones)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('si queda algo pendiente, vuelve a intentarlo a los 30 s, 2 min y 5 min, y para', async () => {
      envio.execute.mockResolvedValue({ enviadas: 0, descartadas: 0, pendientes: 1 });
      renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      expect(envio.execute).toHaveBeenCalledTimes(1);

      for (const [i, espera] of ESPERAS_MS.entries()) {
        await vi.advanceTimersByTimeAsync(espera - 1);
        expect(envio.execute).toHaveBeenCalledTimes(i + 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(envio.execute).toHaveBeenCalledTimes(i + 2);
      }
      await vi.advanceTimersByTimeAsync(600_000);
      expect(envio.execute).toHaveBeenCalledTimes(ESPERAS_MS.length + 1);
    });

    it('una muestra que se quedó en la cola (envío lento) arma el reintento a los 30 s, uno solo', async () => {
      renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      envio.execute.mockClear();

      globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));
      globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));
      await vi.advanceTimersByTimeAsync(ESPERAS_MS[0] - 1);
      expect(envio.execute).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(envio.execute).toHaveBeenCalledTimes(1);
    });

    it('si una muestra se queda en la cola mientras va una tanda, al acabar esta no se arma otro reintento', async () => {
      let terminar;
      envio.execute.mockImplementationOnce(() => new Promise((r) => (terminar = r))).mockResolvedValue({ pendientes: 1 });
      renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);

      globalThis.dispatchEvent(new globalThis.CustomEvent(MUESTRA_PENDIENTE));
      terminar({ pendientes: 1 });
      await vi.advanceTimersByTimeAsync(ESPERAS_MS[0]);
      expect(envio.execute).toHaveBeenCalledTimes(2);

      // Y la escalera sigue entera: el de 2 min no se salta
      await vi.advanceTimersByTimeAsync(ESPERAS_MS[1]);
      expect(envio.execute).toHaveBeenCalledTimes(3);
    });

    it('sin nada pendiente no reintenta', async () => {
      renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));

      await vi.advanceTimersByTimeAsync(600_000);

      expect(envio.execute).toHaveBeenCalledTimes(1);
    });

    it('la vuelta de la red empieza la escalera de nuevo', async () => {
      envio.execute.mockResolvedValue({ pendientes: 1 });
      renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      for (const espera of ESPERAS_MS) await vi.advanceTimersByTimeAsync(espera);
      envio.execute.mockClear();

      globalThis.dispatchEvent(new globalThis.Event('online'));
      await vi.advanceTimersByTimeAsync(ESPERAS_MS[0]);

      expect(envio.execute).toHaveBeenCalledTimes(2);
    });

    it('al desmontar no queda ningún reintento armado', async () => {
      envio.execute.mockResolvedValue({ pendientes: 1 });
      const { unmount } = renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      unmount();
      envio.execute.mockClear();

      await vi.advanceTimersByTimeAsync(600_000);

      expect(envio.execute).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['envió', { enviadas: 1, descartadas: 0, pendientes: 0 }],
    ['descartó', { enviadas: 0, descartadas: 2, pendientes: 0 }],
  ])('si %s algo, avisa al mapa abierto y NO dice nada al jugador', async (_caso, cuenta) => {
    envio.execute.mockResolvedValue(cuenta);
    const oyente = vi.fn();
    globalThis.addEventListener(MUESTRAS_CAMBIADAS, oyente);

    renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
    await vi.waitFor(() => expect(oyente).toHaveBeenCalledTimes(1));

    expect(toastFalso).not.toHaveBeenCalled();
    expect(toastFalso.error).not.toHaveBeenCalled();
    expect(toastFalso.success).not.toHaveBeenCalled();
    globalThis.removeEventListener(MUESTRAS_CAMBIADAS, oyente);
  });

  it('sin nada que contar, ni evento ni aviso', async () => {
    const oyente = vi.fn();
    globalThis.addEventListener(MUESTRAS_CAMBIADAS, oyente);

    renderHook(() => useEnvioDeMuestras({ activo: true, userId: 'u1' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(oyente).not.toHaveBeenCalled();
    globalThis.removeEventListener(MUESTRAS_CAMBIADAS, oyente);
  });
});
