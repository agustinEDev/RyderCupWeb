import { describe, it, expect, beforeEach } from 'vitest';
import { apuntaQueSePinto, guardaEnMemoria, guardaLosFiltros, loGuardadoEnMemoria, losFiltrosGuardados, MAXIMO_DE_FILTROS, MAXIMO_DE_PINTADAS, yaSePinto } from './memoriaDeLasListas';
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
 *
 * Las entradas en que ya se vieron tarjetas, para no animarlas al volver
 * (3 nov 2026, el parpadeo en el iPhone):
 *
 *   MP1 | apuntada y preguntada en la misma entrada    | sí
 *   MP2 | otra entrada, otra lista u otra cuenta       | no
 *   MP3 | al cerrar sesión                             | se olvidan
 *   MP4 | muchas entradas                              | se quedan las últimas
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

  it('MP1: una entrada apuntada se recuerda', () => {
    apuntaQueSePinto('competiciones', 'u-1', 'k-1');
    expect(yaSePinto('competiciones', 'u-1', 'k-1')).toBe(true);
  });

  it('MP2: ni otra entrada, ni otra lista, ni otra cuenta', () => {
    apuntaQueSePinto('competiciones', 'u-1', 'k-1');
    expect(yaSePinto('competiciones', 'u-1', 'k-2')).toBe(false);
    expect(yaSePinto('amigos', 'u-1', 'k-1')).toBe(false);
    expect(yaSePinto('competiciones', 'u-2', 'k-1')).toBe(false);
  });

  it('MP3: al cerrar sesión se olvidan', () => {
    apuntaQueSePinto('competiciones', 'u-1', 'k-1');
    olvidaLoDeEstaCuenta();
    expect(yaSePinto('competiciones', 'u-1', 'k-1')).toBe(false);
  });

  it('MP4: con muchas entradas se quedan las últimas (y la que se vuelve a ver, sube)', () => {
    // 52 apuntadas: salen las dos más viejas, salvo la que se volvió a ver
    for (let i = 0; i <= MAXIMO_DE_PINTADAS + 1; i += 1) {
      apuntaQueSePinto('competiciones', 'u-1', `k-${i}`);
      if (i === 5) apuntaQueSePinto('competiciones', 'u-1', 'k-1');
    }
    expect(yaSePinto('competiciones', 'u-1', 'k-0')).toBe(false);
    expect(yaSePinto('competiciones', 'u-1', 'k-1')).toBe(true);
    expect(yaSePinto('competiciones', 'u-1', 'k-2')).toBe(false);
    expect(yaSePinto('competiciones', 'u-1', 'k-3')).toBe(true);
    expect(yaSePinto('competiciones', 'u-1', `k-${MAXIMO_DE_PINTADAS + 1}`)).toBe(true);
  });
});
