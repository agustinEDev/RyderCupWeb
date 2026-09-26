import { describe, it, expect } from 'vitest';
import { aCamposDeLaCompeticion } from './camposDeLaCompeticion';

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
        { golf_course: { id: 'g1', name: 'Altea', approval_status: 'APPROVED', country_code: 'ES' } },
      ])
    ).toEqual([{ id: 'g1', name: 'Altea', approvalStatus: 'APPROVED', countryCode: 'ES' }]);
  });

  it('K2: también envuelta en `golf_courses`, y con el id suelto', () => {
    expect(aCamposDeLaCompeticion({ golf_courses: [{ golf_course_id: 'g2', name: 'Meis' }] })).toEqual([
      { id: 'g2', name: 'Meis', approvalStatus: 'APPROVED', countryCode: null },
    ]);
  });

  it('K3: el id de la fila de enlace NUNCA pasa por el del campo', () => {
    expect(aCamposDeLaCompeticion([{ id: 'enlace-1', golf_course: { name: 'Sin id' } }])).toEqual([]);
  });

  it('K4: lo que no es una lista es ninguno', () => {
    expect(aCamposDeLaCompeticion(undefined)).toEqual([]);
    expect(aCamposDeLaCompeticion(null)).toEqual([]);
  });
});
