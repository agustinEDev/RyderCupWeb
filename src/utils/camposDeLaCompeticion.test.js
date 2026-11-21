import { describe, it, expect } from 'vitest';
import {
  aCamposDeLaCompeticion,
  barrasDeCadaCampo,
} from './camposDeLaCompeticion';

/**
 * Los campos de una competición, como los devuelve la API (FE #654).
 *
 * Había cuatro copias de esta lectura —la ficha, el alta, el calendario y la
 * agenda— y ya empezaban a diferir: una recurría al `id` de la fila de enlace,
 * que NO es el del campo.
 */
describe('aCamposDeLaCompeticion', () => {
  it('K1: de la lista con el campo dentro', () => {
    expect(
      aCamposDeLaCompeticion([
        {
          golf_course: {
            id: 'g1',
            name: 'Altea',
            approval_status: 'APPROVED',
            country_code: 'ES',
          },
        },
      ]),
    ).toEqual([
      {
        id: 'g1',
        name: 'Altea',
        approvalStatus: 'APPROVED',
        countryCode: 'ES',
        timezone: null,
      },
    ]);
  });

  it('K2: también envuelta en `golf_courses`, y con el id suelto', () => {
    expect(
      aCamposDeLaCompeticion({
        golf_courses: [{ golf_course_id: 'g2', name: 'Meis' }],
      }),
    ).toEqual([
      {
        id: 'g2',
        name: 'Meis',
        approvalStatus: 'APPROVED',
        countryCode: null,
        timezone: null,
      },
    ]);
  });

  it('K3: el id de la fila de enlace NUNCA pasa por el del campo', () => {
    expect(
      aCamposDeLaCompeticion([
        { id: 'enlace-1', golf_course: { name: 'Sin id' } },
      ]),
    ).toEqual([]);
  });

  it('K4: lo que no es una lista es ninguno', () => {
    expect(aCamposDeLaCompeticion(undefined)).toEqual([]);
    expect(aCamposDeLaCompeticion(null)).toEqual([]);
  });
});

describe('aCamposDeLaCompeticion · el huso del campo (FE #824, PR 5)', () => {
  it('trae la zona horaria del campo, o null', async () => {
    const { aCamposDeLaCompeticion } = await import('./camposDeLaCompeticion');

    const [conZona, sinZona] = aCamposDeLaCompeticion([
      {
        golf_course: {
          id: 'g-1',
          name: 'La Resina',
          timezone: 'Europe/Madrid',
        },
      },
      { golf_course: { id: 'g-2', name: 'Otro' } },
    ]);

    expect(conZona.timezone).toBe('Europe/Madrid');
    expect(sinZona.timezone).toBeNull();
  });
});

/**
 * Cada campo con sus barras (barras por campo): el organizador fija la de un
 * campo para cada género con las que ese campo tiene.
 */
describe('barrasDeCadaCampo', () => {
  it('B1: cada campo con el color y el género de sus barras', () => {
    expect(
      barrasDeCadaCampo([
        {
          golf_course: {
            id: 'g1',
            name: 'Aldeamayor',
            tees: [
              { color: 'YELLOW', gender: 'MALE', course_rating: 70 },
              { color: 'RED' },
            ],
          },
        },
        { golf_course: { id: 'g2', name: 'Altea' } },
      ]),
    ).toEqual([
      {
        id: 'g1',
        name: 'Aldeamayor',
        tees: [
          { color: 'YELLOW', gender: 'MALE' },
          { color: 'RED', gender: null },
        ],
      },
      { id: 'g2', name: 'Altea', tees: [] },
    ]);
  });

  it('B2: de la respuesta envuelta; sin id se descarta; sin nada, nada', () => {
    expect(
      barrasDeCadaCampo({
        golf_courses: [{ golf_course: { id: 'g1', name: 'A', tees: [] } }, {}],
      }),
    ).toEqual([{ id: 'g1', name: 'A', tees: [] }]);
    expect(barrasDeCadaCampo(null)).toEqual([]);
  });
});
