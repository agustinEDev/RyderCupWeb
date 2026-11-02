import { describe, it, expect, beforeEach } from 'vitest';
import { guardaEnMemoria, loGuardadoEnMemoria } from './memoriaDeLasListas';
import { olvidaLoDeEstaCuenta, olvidaTodo } from './loUltimoConocido';

/**
 * Lo último que cargó cada lista en esta visita, para enseñarlo sin red
 * (FE #647, fase 3; tabla aprobada el 2 nov 2026).
 *
 *   #   | caso                                         | esperado
 *   ----|----------------------------------------------|-------------------------------
 *   M1  | se guarda y se lee con la misma cuenta        | lo guardado
 *   M2  | nada guardado                                 | null
 *   T15 | otra cuenta, sin recargar                     | null: no ve lo de la anterior
 *   M3  | otra lista                                    | null: cada una la suya
 *   T14 | al cerrar sesión (los tres cierres pasan por  | se vacía
 *       | `olvidaLoDeEstaCuenta`)                       |
 */
describe('memoria de las listas', () => {
  beforeEach(() => olvidaTodo());

  it('M1: se lee lo guardado con la misma cuenta', () => {
    guardaEnMemoria('competiciones', 'u-1', [{ id: 'c-1' }]);

    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toEqual([{ id: 'c-1' }]);
  });

  it('M2: sin nada guardado, null', () => {
    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toBeNull();
  });

  it('T15: otra cuenta no ve lo de la anterior', () => {
    guardaEnMemoria('competiciones', 'u-1', [{ id: 'c-1' }]);

    expect(loGuardadoEnMemoria('competiciones', 'u-2')).toBeNull();
  });

  it('M3: cada lista, la suya', () => {
    guardaEnMemoria('competiciones', 'u-1', [{ id: 'c-1' }]);

    expect(loGuardadoEnMemoria('amigos', 'u-1')).toBeNull();
  });

  it('T14: al cerrar sesión se vacía', () => {
    guardaEnMemoria('competiciones', 'u-1', [{ id: 'c-1' }]);

    olvidaLoDeEstaCuenta();

    expect(loGuardadoEnMemoria('competiciones', 'u-1')).toBeNull();
  });
});
