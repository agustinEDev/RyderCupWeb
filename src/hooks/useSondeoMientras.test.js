import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSondeoMientras } from './useSondeoMientras';

describe('useSondeoMientras (FE #824)', () => {
  afterEach(() => vi.useRealTimers());

  it('con la pestaña del navegador oculta no pide, como los demás sondeos (revisor, PR 8)', () => {
    vi.useFakeTimers();
    const pedir = vi.fn();
    const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    renderHook(() => useSondeoMientras(true, pedir, 1000));

    vi.advanceTimersByTime(2500);
    expect(pedir).not.toHaveBeenCalled();

    visible.mockReturnValue('visible');
    vi.advanceTimersByTime(1000);
    expect(pedir).toHaveBeenCalledTimes(1);
    visible.mockRestore();
  });

  it('al volver a la pestaña, pide en el momento (/code-review)', () => {
    const pedir = vi.fn();
    const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { unmount } = renderHook(() => useSondeoMientras(true, pedir, 60000));

    document.dispatchEvent(new globalThis.Event('visibilitychange'));
    expect(pedir).toHaveBeenCalledTimes(1);

    visible.mockReturnValue('hidden');
    document.dispatchEvent(new globalThis.Event('visibilitychange'));
    expect(pedir).toHaveBeenCalledTimes(1);

    unmount();
    visible.mockReturnValue('visible');
    document.dispatchEvent(new globalThis.Event('visibilitychange'));
    expect(pedir).toHaveBeenCalledTimes(1);
    visible.mockRestore();
  });

  it('inactivo, volver a la pestaña no pide', () => {
    const pedir = vi.fn();
    renderHook(() => useSondeoMientras(false, pedir, 60000));

    document.dispatchEvent(new globalThis.Event('visibilitychange'));

    expect(pedir).not.toHaveBeenCalled();
  });

  it('pide cada vez mientras está activo, y para al dejar de estarlo y al desmontar', () => {
    vi.useFakeTimers();
    const pedir = vi.fn();
    const { rerender, unmount } = renderHook(({ activo }) => useSondeoMientras(activo, pedir, 1000), {
      initialProps: { activo: true },
    });

    vi.advanceTimersByTime(2500);
    expect(pedir).toHaveBeenCalledTimes(2);
    rerender({ activo: false });
    vi.advanceTimersByTime(5000);
    expect(pedir).toHaveBeenCalledTimes(2);
    rerender({ activo: true });
    unmount();
    vi.advanceTimersByTime(5000);
    expect(pedir).toHaveBeenCalledTimes(2);
  });
});
