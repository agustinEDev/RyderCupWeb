import { describe, it, expect } from 'vitest';
import es from './locales/es/competitions.json';
import en from './locales/en/competitions.json';
import { TeeSource } from '../domain/value_objects/TeeSource';

/**
 * Cada motivo de la barra de un campo que se enseña tiene su texto, en las
 * dos personas (las mías y las de otro) y en los dos idiomas. NONE no se
 * enseña: el valor («Sin barra») ya lo dice.
 */
describe('los textos de los motivos de las barras', () => {
  const motivos = Object.values(TeeSource).filter((s) => s !== TeeSource.NONE);

  it.each([
    ['es', es],
    ['en', en],
  ])('%s: cada motivo tiene texto, mío y de otro', (_idioma, textos) => {
    for (const motivo of motivos) {
      expect(textos.tees.source[motivo]).toBeTruthy();
      expect(textos.tees.sourceOther[motivo]).toBeTruthy();
    }
  });
});
