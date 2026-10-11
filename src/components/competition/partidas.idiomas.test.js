import { describe, it, expect } from 'vitest';
import partidas from './PartidasEnLaFranja.jsx?raw';
import mias from './MisPartidas.jsx?raw';
import es from '../../i18n/locales/es/schedule.json';
import en from '../../i18n/locales/en/schedule.json';

/**
 * Cada texto `partidas.*` de las partidas existe en español y en inglés (FE
 * #824, PR 6), también los que se arman con el código del servidor o del
 * dominio. Los tests de los componentes sustituyen `t` por la clave: una que
 * falta pasaría desapercibida. Un plural vale con `_one` y `_other`.
 */
const codigo = `${partidas}\n${mias}`;
const sueltas = [...new Set([...codigo.matchAll(/'partidas\.([a-zA-Z]+)'/g)].map((m) => m[1]))];
// Los códigos que se traducen, leídos de sus listas en el componente
const lista = (nombre) => {
  const cuerpo = codigo.match(new RegExp(`const ${nombre} = \\[([^\\]]*)\\]`))[1];
  return [...cuerpo.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
};
const errores = [...lista('CON_NOMBRES'), ...lista('CON_TEXTO')];
const deMarcadores = ['MISSING', 'SELF', 'UNMARKED'];

const existe = (grupo, clave) =>
  typeof grupo?.[clave] === 'string' ||
  (typeof grupo?.[`${clave}_one`] === 'string' && typeof grupo?.[`${clave}_other`] === 'string');

describe('los textos de las partidas (FE #824, PR 6)', () => {
  it('lee de verdad el código: más de veinte claves y todos los errores del contrato', () => {
    expect(sueltas.length).toBeGreaterThan(20);
    expect(errores).toHaveLength(17);
  });

  it.each([
    ['español', es],
    ['inglés', en],
  ])('en %s están todas', (_idioma, textos) => {
    const faltan = [
      ...sueltas.filter((c) => !existe(textos.partidas, c)).map((c) => `partidas.${c}`),
      ...errores.filter((c) => !existe(textos.partidas?.errors, c)).map((c) => `partidas.errors.${c}`),
      // Sin los nombres de quién falta, su versión sin hueco
      ...lista('CON_NOMBRES')
        .filter((c) => !existe(textos.partidas?.errors, `${c}_unnamed`))
        .map((c) => `partidas.errors.${c}_unnamed`),
      ...deMarcadores.filter((c) => !existe(textos.partidas?.markersErrors, c)).map((c) => `partidas.markersErrors.${c}`),
    ];
    expect(faltan).toEqual([]);
  });
});
