import { describe, it, expect } from 'vitest';
import plazas from './PlazasDeLaFranja.jsx?raw';
import franjas from './FranjasDeLaCompeticion.jsx?raw';
import es from '../../i18n/locales/es/schedule.json';
import en from '../../i18n/locales/en/schedule.json';

/**
 * Cada texto `franjas.*` que usan las franjas existe en español y en inglés
 * (FE #824). Los tests de los componentes sustituyen `t` por la clave, así que
 * una clave que falta pasa desapercibida: la PR 4 llegó a la revisión sin
 * ninguna de sus 28 claves nuevas (revisor). Un plural vale con `_one` y `_other`.
 */
const claves = [...new Set([...`${plazas}\n${franjas}`.matchAll(/'franjas\.([a-zA-Z]+)'/g)].map((m) => m[1]))];

const existe = (textos, clave) =>
  typeof textos.franjas?.[clave] === 'string' ||
  (typeof textos.franjas?.[`${clave}_one`] === 'string' && typeof textos.franjas?.[`${clave}_other`] === 'string');

describe('los textos de las franjas (FE #824)', () => {
  it('se usa más de una docena de claves (el test lee de verdad el código)', () => {
    expect(claves.length).toBeGreaterThan(12);
  });

  it.each(claves)('franjas.%s existe en español', (clave) => {
    expect(existe(es, clave)).toBe(true);
  });

  it.each(claves)('franjas.%s existe en inglés', (clave) => {
    expect(existe(en, clave)).toBe(true);
  });
});
