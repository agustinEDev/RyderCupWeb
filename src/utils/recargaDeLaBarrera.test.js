import { describe, it, expect } from 'vitest';
import { apuntarLaRecarga, buildDeLaPagina, puedeRecargar } from './recargaDeLaBarrera';

/**
 * La nota de «ya recargué» (25 oct 2026): la versión con la que se recargó y
 * las páginas donde se hizo. Se puede recargar si la versión es otra, o si es
 * la misma en una página donde aún no se recargó. No se borra nunca: como cada
 * recarga cambia de versión o de página, no puede haber bucle.
 *
 *   #   caso                                       | ¿recarga?
 *   ----|------------------------------------------|----------------------------
 *   B1  sin nota                                   | sí
 *   B2  misma versión, misma página                | no: el aviso
 *   B3  otra versión (un despliegue)               | sí
 *   B4  misma versión, otra página                 | sí
 *   B5  apuntar: misma versión suma la página; otra versión empieza de nuevo
 *   B6  nota vieja `'true'`, ilegible o con otra forma | no cuenta: sí
 *   B7  sin almacenamiento                         | no se sabe (null); apuntar falla
 *   B8  la versión de la página: su `app-build`, o '' sin ella
 */
const CLAVE = 'lazy_load_error_reloaded';
const almacenCon = (valor) => {
  const datos = new Map(valor === undefined ? [] : [[CLAVE, valor]]);
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => datos.set(k, v),
    removeItem: (k) => datos.delete(k),
  };
};
const nota = (build, rutas) => JSON.stringify({ build, rutas });

describe('la nota de la recarga', () => {
  it('B1: sin nota, puede recargar', () => {
    expect(puedeRecargar({ build: 'A', ruta: '/x', almacen: almacenCon() })).toBe(true);
  });

  it('B2: con la misma versión en la misma página, no', () => {
    expect(puedeRecargar({ build: 'A', ruta: '/x', almacen: almacenCon(nota('A', ['/x'])) })).toBe(false);
  });

  it('B3: con otra versión, sí', () => {
    expect(puedeRecargar({ build: 'B', ruta: '/x', almacen: almacenCon(nota('A', ['/x'])) })).toBe(true);
  });

  it('B4: con la misma versión en otra página, sí', () => {
    expect(puedeRecargar({ build: 'A', ruta: '/y', almacen: almacenCon(nota('A', ['/x'])) })).toBe(true);
  });

  it('B5: apuntar con la misma versión suma la página; con otra, empieza de nuevo', () => {
    const almacen = almacenCon(nota('A', ['/x']));

    expect(apuntarLaRecarga({ build: 'A', ruta: '/y', almacen })).toBe(true);
    expect(JSON.parse(almacen.datos.get(CLAVE))).toEqual({ build: 'A', rutas: ['/x', '/y'] });

    apuntarLaRecarga({ build: 'A', ruta: '/y', almacen });
    expect(JSON.parse(almacen.datos.get(CLAVE)).rutas).toEqual(['/x', '/y']);

    apuntarLaRecarga({ build: 'B', ruta: '/z', almacen });
    expect(JSON.parse(almacen.datos.get(CLAVE))).toEqual({ build: 'B', rutas: ['/z'] });
  });

  it.each([['true'], ['abc'], ['{"build":1}'], ['{"build":"A","rutas":"/x"}'], ['null']])(
    'B6: la nota %s no cuenta',
    (valor) => {
      expect(puedeRecargar({ build: 'A', ruta: '/x', almacen: almacenCon(valor) })).toBe(true);
    }
  );

  it('B7: sin almacenamiento no se sabe, y no se puede apuntar', () => {
    const roto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };

    expect(puedeRecargar({ build: 'A', ruta: '/x', almacen: roto })).toBeNull();
    expect(apuntarLaRecarga({ build: 'A', ruta: '/x', almacen: roto })).toBe(false);
  });

  it('B8: la versión de la página es su app-build; sin ella, vacía', () => {
    const con = { querySelector: () => ({ getAttribute: () => '2.53.0 abc' }) };
    const sin = { querySelector: () => null };

    expect(buildDeLaPagina(con)).toBe('2.53.0 abc');
    expect(buildDeLaPagina(sin)).toBe('');
  });
});
