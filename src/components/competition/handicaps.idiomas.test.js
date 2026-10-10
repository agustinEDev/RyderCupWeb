import { describe, it, expect } from 'vitest';
import tarjeta from './HandicapsDeLaCompeticion.jsx?raw';
import es from '../../i18n/locales/es/competitions.json';
import en from '../../i18n/locales/en/competitions.json';

/**
 * Cada texto `handicaps.*` de la tarjeta existe en español y en inglés (FE #824,
 * PR 5). Los tests del componente sustituyen `t` por la clave: sin esto, una
 * clave que falta no la ve nadie (pasó en la PR 4).
 */
const claves = [...new Set([...tarjeta.matchAll(/'handicaps\.([a-zA-Z]+)'/g)].map((m) => m[1]))];
const existe = (textos, clave) =>
  typeof textos.handicaps?.[clave] === 'string' ||
  (typeof textos.handicaps?.[`${clave}_one`] === 'string' && typeof textos.handicaps?.[`${clave}_other`] === 'string');

describe('los textos de la tarjeta «Hándicaps» (FE #824)', () => {
  it('el test lee de verdad el código', () => {
    expect(claves.length).toBeGreaterThan(10);
  });

  it.each(claves)('handicaps.%s existe en español', (clave) => expect(existe(es, clave)).toBe(true));
  it.each(claves)('handicaps.%s existe en inglés', (clave) => expect(existe(en, clave)).toBe(true));
});
