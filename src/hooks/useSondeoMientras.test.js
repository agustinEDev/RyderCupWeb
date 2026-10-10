import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSondeoMientras } from './useSondeoMientras';

describe('useSondeoMientras (FE #824)', () => {
  afterEach(() => vi.useRealTimers());

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
