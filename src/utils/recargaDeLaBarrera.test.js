import { describe, it, expect } from 'vitest';
import { apuntarLaRecarga, buildDeLaPagina, puedeRecargar } from './recargaDeLaBarrera';

/**
 * La nota de «ya recargué» (25 oct 2026): los pares versión y página donde se
 * recargó. Se puede recargar si el par aún no está. Solo se añade, nunca se
 * pisa: cada recarga suma un par nuevo, así que no puede haber bucle, tampoco
 * entre la barrera y `recargaPorTrozoViejo`, que apuntan versiones distintas.
 *
 *   #   caso                                           | ¿recarga?
 *   ----|----------------------------------------------|----------------------------
 *   B1  sin nota                                       | sí
 *   B2  misma versión, misma página                    | no: el aviso
 *   B3  otra versión (un despliegue)                   | sí
 *   B4  misma versión, otra página                     | sí
 *   B5  apuntar suma el par, sin repetirlo ni pisar los de otra versión
 *   B6  nota vieja `'true'`, ilegible o con otra forma | no cuenta: sí
 *   B7  sin almacenamiento                             | no se sabe (null); apuntar falla
 *   B8  la versión de la página: su `app-build`, o '' sin ella
 *   B9  los dos escritores, con la recarga sin cambiar de versión | se acaba
 *   B10 la nota no crece sin fin                       | guarda los 20 últimos pares
 *   B11 el almacén acepta la nota pero no la guarda    | apuntar falla: no se recarga
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
const nota = (...recargas) => JSON.stringify({ recargas });

describe('la nota de la recarga', () => {
  it('B1: sin nota, puede recargar', () => {
    expect(puedeRecargar({ build: 'A', ruta: '/x', almacen: almacenCon() })).toBe(true);
  });

  it('B2: con la misma versión en la misma página, no', () => {
    expect(puedeRecargar({ build: 'A', ruta: '/x', almacen: almacenCon(nota(['A', '/x'])) })).toBe(false);
  });

  it('B3: con otra versión, sí', () => {
    expect(puedeRecargar({ build: 'B', ruta: '/x', almacen: almacenCon(nota(['A', '/x'])) })).toBe(true);
  });

  it('B4: con la misma versión en otra página, sí', () => {
    expect(puedeRecargar({ build: 'A', ruta: '/y', almacen: almacenCon(nota(['A', '/x'])) })).toBe(true);
  });

  it('B5: apuntar suma el par, sin repetirlo ni pisar los de otra versión', () => {
    const almacen = almacenCon(nota(['A', '/x']));

    expect(apuntarLaRecarga({ build: 'A', ruta: '/y', almacen })).toBe(true);
    apuntarLaRecarga({ build: 'A', ruta: '/y', almacen });
    apuntarLaRecarga({ build: 'B', ruta: '/x', almacen });

    expect(JSON.parse(almacen.datos.get(CLAVE)).recargas).toEqual([
      ['A', '/x'],
      ['A', '/y'],
      ['B', '/x'],
    ]);
    expect(puedeRecargar({ build: 'A', ruta: '/x', almacen })).toBe(false);
  });

  it.each([['true'], ['abc'], ['{"recargas":1}'], ['{"build":"A","rutas":["/x"]}'], ['null'], ['{"recargas":[["A"]]}'], ['{"recargas":[1]}']])(
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

  it('B9: la barrera (versión X) y recargaPorTrozoViejo (versión Y) en la misma página se acaban', () => {
    // La recarga no cambia de versión: la página sigue en X y la caché dice Y
    const almacen = almacenCon();
    const recargas = [];
    for (let carga = 0; carga < 6; carga += 1) {
      const trozoViejo = { build: 'Y', ruta: '/x', almacen };
      const barrera = { build: 'X', ruta: '/x', almacen };
      if (puedeRecargar(trozoViejo)) {
        apuntarLaRecarga(trozoViejo);
        recargas.push('trozoViejo');
      } else if (puedeRecargar(barrera)) {
        apuntarLaRecarga(barrera);
        recargas.push('barrera');
      } else {
        break;
      }
    }

    expect(recargas).toEqual(['trozoViejo', 'barrera']);
  });

  it('B10: guarda los 20 últimos pares', () => {
    const almacen = almacenCon();
    for (let i = 0; i < 25; i += 1) apuntarLaRecarga({ build: 'A', ruta: `/p${i}`, almacen });

    const { recargas } = JSON.parse(almacen.datos.get(CLAVE));
    expect(recargas).toHaveLength(20);
    expect(recargas[0]).toEqual(['A', '/p5']);
    expect(recargas.at(-1)).toEqual(['A', '/p24']);
  });

  it('B11: si el almacén acepta la nota pero no la guarda, apuntar falla: sin ella podría no acabar', () => {
    const olvidadizo = { getItem: () => null, setItem: () => {} };

    expect(apuntarLaRecarga({ build: 'A', ruta: '/x', almacen: olvidadizo })).toBe(false);
  });
});
