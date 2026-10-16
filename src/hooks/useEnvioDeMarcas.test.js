import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const envio = vi.hoisted(() => ({ execute: vi.fn(async () => ({ pendientes: 0 })) }));
vi.mock('../composition', () => ({ sendPendingHoleMarksUseCase: envio }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }) }));
const toastFalso = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastFalso }));

const { useEnvioDeMarcas, ESPERAS_MS, MARCAS_CAMBIADAS, MARCA_PENDIENTE } = await import('./useEnvioDeMarcas');

describe('useEnvioDeMarcas (C17/C18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('al arrancar con sesión y red, envía las del jugador', () => {
    renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));

    expect(envio.execute).toHaveBeenCalledWith('u1', { sigue: expect.any(Function) });
  });

  it('sin sesión o sin usuario, nada', () => {
    renderHook(() => useEnvioDeMarcas({ activo: false, userId: 'u1' }));
    renderHook(() => useEnvioDeMarcas({ activo: true, userId: null }));

    expect(envio.execute).not.toHaveBeenCalled();
  });

  it('sin red no lo intenta; al volver la red, sí', () => {
    vi.stubGlobal('navigator', { onLine: false });
    renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
    expect(envio.execute).not.toHaveBeenCalled();

    vi.stubGlobal('navigator', { onLine: true });
    globalThis.dispatchEvent(new globalThis.Event('online'));

    expect(envio.execute).toHaveBeenCalledTimes(1);
  });

  it('al volver a la aplicación (visible), envía; al irse, no', () => {
    renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
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
    const { unmount } = renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
    unmount();
    envio.execute.mockClear();

    globalThis.dispatchEvent(new globalThis.Event('online'));

    expect(envio.execute).not.toHaveBeenCalled();
  });

  it('un fallo del envío no revienta nada', async () => {
    envio.execute.mockRejectedValueOnce(new Error('x'));

    expect(() => renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }))).not.toThrow();
    await Promise.resolve();
  });

  it('D19: al cambiar de sesión, el envío en marcha deja de seguir', () => {
    const { rerender } = renderHook(({ userId }) => useEnvioDeMarcas({ activo: true, userId }), { initialProps: { userId: 'u1' } });
    const { sigue } = envio.execute.mock.calls[0][1];
    expect(sigue()).toBe(true);

    rerender({ userId: 'u2' });

    expect(sigue()).toBe(false);
    expect(envio.execute).toHaveBeenLastCalledWith('u2', { sigue: expect.any(Function) });
  });

  describe('C17: con la aplicación abierta, se reintenta (portal de un club, tope de peticiones)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('si queda algo pendiente, vuelve a intentarlo a los 30 s, 2 min y 5 min, y para', async () => {
      envio.execute.mockResolvedValue({ pendientes: 1 });
      renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      expect(envio.execute).toHaveBeenCalledTimes(1);

      for (const [i, espera] of ESPERAS_MS.entries()) {
        await vi.advanceTimersByTimeAsync(espera);
        expect(envio.execute).toHaveBeenCalledTimes(i + 2);
      }
      await vi.advanceTimersByTimeAsync(600_000);
      expect(envio.execute).toHaveBeenCalledTimes(ESPERAS_MS.length + 1);
    });

    it('una marca guardada que se quedó pendiente (envío lento) arma el reintento a los 30 s', async () => {
      envio.execute.mockResolvedValue({ pendientes: 0 });
      renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      envio.execute.mockClear();

      globalThis.dispatchEvent(new globalThis.CustomEvent(MARCA_PENDIENTE));
      globalThis.dispatchEvent(new globalThis.CustomEvent(MARCA_PENDIENTE));
      await vi.advanceTimersByTimeAsync(ESPERAS_MS[0] - 1);
      expect(envio.execute).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(envio.execute).toHaveBeenCalledTimes(1);
    });

    it('sin nada pendiente no reintenta', async () => {
      envio.execute.mockResolvedValue({ pendientes: 0 });
      renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));

      await vi.advanceTimersByTimeAsync(600_000);

      expect(envio.execute).toHaveBeenCalledTimes(1);
    });

    it('la vuelta de la red empieza la escalera de nuevo', async () => {
      envio.execute.mockResolvedValue({ pendientes: 1 });
      renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      for (const espera of ESPERAS_MS) await vi.advanceTimersByTimeAsync(espera);
      envio.execute.mockClear();

      globalThis.dispatchEvent(new globalThis.Event('online'));
      await vi.advanceTimersByTimeAsync(ESPERAS_MS[0]);

      expect(envio.execute).toHaveBeenCalledTimes(2);
    });

    it('al desmontar no queda ningún reintento armado', async () => {
      envio.execute.mockResolvedValue({ pendientes: 1 });
      const { unmount } = renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
      await vi.advanceTimersByTimeAsync(0);
      unmount();
      envio.execute.mockClear();

      await vi.advanceTimersByTimeAsync(600_000);

      expect(envio.execute).not.toHaveBeenCalled();
    });
  });

  it('si envió o descartó algo, avisa al mapa abierto; si descartó, se lo dice al jugador', async () => {
    envio.execute.mockResolvedValue({ enviadas: 1, rechazadas: 2, pendientes: 0 });
    const oyente = vi.fn();
    globalThis.addEventListener(MARCAS_CAMBIADAS, oyente);

    renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
    await vi.waitFor(() => expect(oyente).toHaveBeenCalledTimes(1));

    expect(toastFalso.error).toHaveBeenCalledWith('mapa.marcaRechazada {"count":2}');
    globalThis.removeEventListener(MARCAS_CAMBIADAS, oyente);
  });

  it('sin nada que contar, ni aviso ni evento', async () => {
    envio.execute.mockResolvedValue({ enviadas: 0, rechazadas: 0, pendientes: 0 });
    const oyente = vi.fn();
    globalThis.addEventListener(MARCAS_CAMBIADAS, oyente);

    renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(oyente).not.toHaveBeenCalled();
    expect(toastFalso.error).not.toHaveBeenCalled();
    globalThis.removeEventListener(MARCAS_CAMBIADAS, oyente);
  });
});
