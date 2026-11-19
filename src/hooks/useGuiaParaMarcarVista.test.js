import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const caso = vi.hoisted(() => ({ vistas: new Set() }));
vi.mock('../composition', () => ({
  holeMarkingGuideUseCase: {
    yaVista: (id) => Boolean(id) && caso.vistas.has(id),
    marcarVista: vi.fn((id) => {
      if (id) caso.vistas.add(id);
    }),
  },
}));

const { useGuiaParaMarcarVista } = await import('./useGuiaParaMarcarVista');
const { holeMarkingGuideUseCase } = await import('../composition');

describe('useGuiaParaMarcarVista (T1)', () => {
  beforeEach(() => {
    caso.vistas = new Set();
    holeMarkingGuideUseCase.marcarVista.mockClear();
  });

  it('sin verla: no vista; al marcarla, vista y apuntada para ese usuario', () => {
    const { result } = renderHook(() => useGuiaParaMarcarVista('u-1'));
    expect(result.current.vista).toBe(false);

    act(() => result.current.marcarVista());

    expect(result.current.vista).toBe(true);
    expect(holeMarkingGuideUseCase.marcarVista).toHaveBeenCalledWith('u-1');
  });

  it('ya vista por ese usuario, sale vista; otro usuario, no', () => {
    caso.vistas.add('u-1');

    expect(
      renderHook(() => useGuiaParaMarcarVista('u-1')).result.current.vista,
    ).toBe(true);
    expect(
      renderHook(() => useGuiaParaMarcarVista('u-2')).result.current.vista,
    ).toBe(false);
  });

  it('si cambia el usuario, se vuelve a leer: el nuevo, que no la vio, la ve', () => {
    caso.vistas.add('u-1');
    const { result, rerender } = renderHook(
      ({ id }) => useGuiaParaMarcarVista(id),
      { initialProps: { id: 'u-1' } },
    );
    expect(result.current.vista).toBe(true);

    rerender({ id: 'u-2' });

    expect(result.current.vista).toBe(false);
  });

  it('marcada por uno, al cambiar a otro que la vio, vista; y a uno que no, no', () => {
    caso.vistas.add('u-3');
    const { result, rerender } = renderHook(
      ({ id }) => useGuiaParaMarcarVista(id),
      { initialProps: { id: 'u-2' } },
    );
    act(() => result.current.marcarVista());

    rerender({ id: 'u-3' });
    expect(result.current.vista).toBe(true);
    rerender({ id: 'u-4' });
    expect(result.current.vista).toBe(false);
  });

  it('sin usuario: vista mientras dure el mapa, aunque no se guarde', () => {
    const { result } = renderHook(() => useGuiaParaMarcarVista(null));

    act(() => result.current.marcarVista());

    expect(result.current.vista).toBe(true);
  });
});
