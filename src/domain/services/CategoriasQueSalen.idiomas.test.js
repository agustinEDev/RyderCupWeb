import { describe, it, expect } from 'vitest';
import { REPETIDOS, MENOS_DE_SEIS } from './CategoriasQueSalen';
import es from '../../i18n/locales/es/competitions.json';
import en from '../../i18n/locales/en/competitions.json';

/** Cada motivo del aviso de menos categorías tiene su texto en español y en inglés (FE #824, PR 8). */
describe('los textos del aviso de menos categorías', () => {
  it.each([
    ['español', es],
    ['inglés', en],
  ])('en %s, con cuántas se pidieron y cuántas salen, en singular y en plural', (_idioma, textos) => {
    for (const motivo of [REPETIDOS, MENOS_DE_SEIS]) {
      for (const forma of ['one', 'other']) {
        expect(textos.detail.fewerCategories[`${motivo}_${forma}`]).toMatch(/\{\{pedidas\}\}.*\{\{count\}\}/);
      }
    }
  });
});
