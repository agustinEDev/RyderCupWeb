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

describe('los demás textos nuevos de la PR 5 (revisor)', () => {
  const lee = (textos, ruta) => ruta.split('.').reduce((o, k) => o?.[k], textos);
  const existeRuta = (textos, ruta) =>
    typeof lee(textos, ruta) === 'string' ||
    (typeof lee(textos, `${ruta}_one`) === 'string' && typeof lee(textos, `${ruta}_other`) === 'string');
  const RUTAS = [
    'detail.fixedHandicap',
    'detail.fixedHandicapNoCategory',
    'detail.missingHandicapBadge',
    'detail.errors.playersWithoutHandicap',
    'detail.errors.playersWithoutHandicapUnnamed',
    'detail.settings.categories',
    'detail.settings.equalCategories',
    'detail.settings.equalCategoriesSplit',
    'detail.settings.categoryLimits',
    'detail.settings.noCategories',
    'detail.settings.matchdaysLabel',
    'detail.settings.matchdays',
    'detail.settings.overallLabel',
    'detail.settings.overall.ACCUMULATED',
    'detail.settings.overall.BEST_CARD',
    'enrollment.needsHandicap',
    'enrollment.addHandicap',
  ];

  it.each(RUTAS)('%s existe en español', (ruta) => expect(existeRuta(es, ruta)).toBe(true));
  it.each(RUTAS)('%s existe en inglés', (ruta) => expect(existeRuta(en, ruta)).toBe(true));
});

describe('los motivos de la ventana, por código (RyderCupAm#541)', () => {
  const CODIGOS = ['STATUS', 'NO_WINDOWS', 'RYDER', 'DAY_IN_PLAY', 'NO_DAYS_LEFT', 'TOO_CLOSE', 'NO_TIMEZONE', 'DISABLED', 'RUNNING', 'IN_THE_PAST', 'TOO_TIGHT'];

  it.each(CODIGOS)('handicaps.reasons.%s existe en español', (codigo) => expect(typeof es.handicaps?.reasons?.[codigo]).toBe('string'));
  it.each(CODIGOS)('handicaps.reasons.%s existe en inglés', (codigo) => expect(typeof en.handicaps?.reasons?.[codigo]).toBe('string'));
  it('y no sobra ninguno', () => {
    expect(Object.keys(es.handicaps.reasons).sort()).toEqual([...CODIGOS].sort());
    expect(Object.keys(en.handicaps.reasons).sort()).toEqual([...CODIGOS].sort());
  });
});
