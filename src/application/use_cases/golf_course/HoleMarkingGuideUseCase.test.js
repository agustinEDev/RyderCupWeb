import { describe, it, expect, vi } from 'vitest';
import HoleMarkingGuideUseCase from './HoleMarkingGuideUseCase';

const almacenFalso = (vistas = []) => {
  const conjunto = new Set(vistas);
  return {
    yaVista: vi.fn((id) => conjunto.has(id)),
    marcarVista: vi.fn((id) => conjunto.add(id)),
  };
};

describe('HoleMarkingGuideUseCase (T1)', () => {
  it('lee y apunta la guía vista del usuario', () => {
    const almacen = almacenFalso();
    const caso = new HoleMarkingGuideUseCase({
      holeMarkingGuideStore: almacen,
    });

    expect(caso.yaVista('u-1')).toBe(false);
    caso.marcarVista('u-1');

    expect(almacen.marcarVista).toHaveBeenCalledWith('u-1');
    expect(caso.yaVista('u-1')).toBe(true);
  });

  it('sin usuario, no vista y no se apunta (no hay de quién)', () => {
    const almacen = almacenFalso([null, undefined]);
    const caso = new HoleMarkingGuideUseCase({
      holeMarkingGuideStore: almacen,
    });

    expect(caso.yaVista(null)).toBe(false);
    caso.marcarVista(null);

    expect(almacen.yaVista).not.toHaveBeenCalled();
    expect(almacen.marcarVista).not.toHaveBeenCalled();
  });
});
