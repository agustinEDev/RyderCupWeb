import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalStorageHoleMarkingGuideStore from './LocalStorageHoleMarkingGuideStore';

describe('LocalStorageHoleMarkingGuideStore (T1)', () => {
  let guardado;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('G1: vista por un usuario, no por otro en el mismo móvil', () => {
    const almacen = new LocalStorageHoleMarkingGuideStore();
    expect(almacen.yaVista('u-1')).toBe(false);

    almacen.marcarVista('u-1');

    expect(almacen.yaVista('u-1')).toBe(true);
    expect(almacen.yaVista('u-2')).toBe(false);
    expect([...guardado.keys()]).toEqual(['guiaParaMarcarVista:v1:u-1']);
  });

  it('otro valor en la clave no cuenta como vista', () => {
    guardado.set('guiaParaMarcarVista:v1:u-1', 'no');

    expect(new LocalStorageHoleMarkingGuideStore().yaVista('u-1')).toBe(false);
  });

  it('sin almacenamiento, no vista y sin reventar', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
    });
    const almacen = new LocalStorageHoleMarkingGuideStore();

    expect(() => almacen.marcarVista('u-1')).not.toThrow();
    expect(almacen.yaVista('u-1')).toBe(false);
  });
});
