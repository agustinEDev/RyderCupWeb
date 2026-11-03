import { describe, it, expect, beforeEach } from 'vitest';
import { guardaEnMemoria, guardaLosFiltros, loGuardadoEnMemoria, losFiltrosGuardados, MAXIMO_DE_FILTROS } from './memoriaDeLasListas';
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
 *
 * Los filtros de cada lista, por entrada del historial (tercer revisor, 2 nov
 * 2026: escribirlos en el historial cortaba las recargas en camino):
 *
 *   MF1 | se guardan y se leen en la misma entrada     | los filtros
 *   MF2 | otra entrada (entrar de nuevo en la lista)   | null
 *   MF3 | otra cuenta en el mismo móvil                | null
 *   MF4 | al cerrar sesión                             | se vacían
 *   MF5 | quitarlos (sin filtros)                      | null
 *   MF6 | muchas entradas                              | se quedan las últimas
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

  const ACTIVAS = { busqueda: 'club', estado: 'ACTIVE' };

  it('MF1: los filtros se leen en la misma entrada', () => {
    guardaLosFiltros('competiciones', 'u-1', 'k-1', ACTIVAS);

    expect(losFiltrosGuardados('competiciones', 'u-1', 'k-1')).toEqual(ACTIVAS);
  });

  it('MF2: otra entrada empieza sin filtros', () => {
    guardaLosFiltros('competiciones', 'u-1', 'k-1', ACTIVAS);

    expect(losFiltrosGuardados('competiciones', 'u-1', 'k-2')).toBeNull();
  });

  it('MF3: otra cuenta no ve los filtros de la anterior', () => {
    guardaLosFiltros('competiciones', 'u-1', 'k-1', ACTIVAS);

    expect(losFiltrosGuardados('competiciones', 'u-2', 'k-1')).toBeNull();
  });

  it('MF4: al cerrar sesión se vacían', () => {
    guardaLosFiltros('competiciones', 'u-1', 'k-1', ACTIVAS);

    olvidaLoDeEstaCuenta();

    expect(losFiltrosGuardados('competiciones', 'u-1', 'k-1')).toBeNull();
  });

  it('MF5: quitarlos los borra', () => {
    guardaLosFiltros('competiciones', 'u-1', 'k-1', ACTIVAS);

    guardaLosFiltros('competiciones', 'u-1', 'k-1', null);

    expect(losFiltrosGuardados('competiciones', 'u-1', 'k-1')).toBeNull();
  });

  it('MF6: con muchas entradas se quedan las últimas', () => {
    for (let i = 0; i <= MAXIMO_DE_FILTROS; i += 1) guardaLosFiltros('competiciones', 'u-1', `k-${i}`, ACTIVAS);

    expect(losFiltrosGuardados('competiciones', 'u-1', 'k-0')).toBeNull();
    expect(losFiltrosGuardados('competiciones', 'u-1', 'k-1')).toEqual(ACTIVAS);
    expect(losFiltrosGuardados('competiciones', 'u-1', `k-${MAXIMO_DE_FILTROS}`)).toEqual(ACTIVAS);
  });
});
