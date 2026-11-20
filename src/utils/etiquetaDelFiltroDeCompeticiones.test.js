import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';
import { ETIQUETA_DEL_FILTRO } from './etiquetaDelFiltroDeCompeticiones';

/**
 * El filtro de estados de Competiciones ofrece todos los del dominio, en su
 * orden (E2-15, 20 nov 2026). Un estado nuevo sin etiqueta saldría como una
 * opción vacía o con la clave a la vista: cada uno tiene la suya y la clave
 * existe en los dos idiomas.
 */
const textos = (idioma) =>
  JSON.parse(
    readFileSync(
      resolve(
        globalThis.process.cwd(),
        `src/i18n/locales/${idioma}/competitions.json`,
      ),
      'utf8',
    ),
  );

const valor = (objeto, clave) =>
  clave.split('.').reduce((o, parte) => o?.[parte], objeto);

describe('Etiqueta del filtro de Competiciones', () => {
  it('hay una para cada estado del dominio, y ninguna de más', () => {
    expect(Object.keys(ETIQUETA_DEL_FILTRO).sort()).toEqual(
      Object.values(CompetitionStatusEnum).sort(),
    );
  });

  it.each(['es', 'en'])('cada etiqueta existe en %s', (idioma) => {
    const json = textos(idioma);
    for (const clave of Object.values(ETIQUETA_DEL_FILTRO)) {
      expect(typeof valor(json, clave), clave).toBe('string');
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ETIQUETA_DEL_FILTRO)).toBe(true);
  });
});
