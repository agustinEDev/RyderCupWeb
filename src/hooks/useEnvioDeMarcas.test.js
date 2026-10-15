import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const envio = vi.hoisted(() => ({ execute: vi.fn(async () => ({})) }));
vi.mock('../composition', () => ({ sendPendingHoleMarksUseCase: envio }));

const { useEnvioDeMarcas } = await import('./useEnvioDeMarcas');

describe('useEnvioDeMarcas (C17/C18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('al arrancar con sesión y red, envía las del jugador', () => {
    renderHook(() => useEnvioDeMarcas({ activo: true, userId: 'u1' }));

    expect(envio.execute).toHaveBeenCalledWith('u1');
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
});
