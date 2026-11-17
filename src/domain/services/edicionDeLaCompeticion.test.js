import { describe, it, expect } from 'vitest';
import {
  soloSePuedenEditarLasFechas,
  seEditaLaCompeticion,
} from './edicionDeLaCompeticion';

// Re-auditoría Q-FE-04: la regla vivía copiada en el formulario y en la ficha
describe('edicionDeLaCompeticion', () => {
  const ESTADOS = [
    'DRAFT',
    'ACTIVE',
    'CLOSED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ];

  it.each(ESTADOS)(
    'soloSePuedenEditarLasFechas is true only for CLOSED by the deadline (%s)',
    (status) => {
      expect(
        soloSePuedenEditarLasFechas({
          status,
          enrollmentClosedByDeadline: true,
        }),
      ).toBe(status === 'CLOSED');
      expect(
        soloSePuedenEditarLasFechas({
          status,
          enrollmentClosedByDeadline: false,
        }),
      ).toBe(false);
    },
  );

  it('a truthy flag that is not true does not count', () => {
    expect(
      soloSePuedenEditarLasFechas({
        status: 'CLOSED',
        enrollmentClosedByDeadline: 'yes',
      }),
    ).toBe(false);
    expect(soloSePuedenEditarLasFechas({ status: 'CLOSED' })).toBe(false);
  });

  it.each([
    ['DRAFT', false, true],
    ['ACTIVE', false, true],
    ['CLOSED', false, false],
    ['CLOSED', true, true],
    ['IN_PROGRESS', true, false],
    ['COMPLETED', false, false],
    ['CANCELLED', false, false],
  ])(
    'seEditaLaCompeticion(%s, closed by deadline: %s) is %s',
    (status, enrollmentClosedByDeadline, esperado) => {
      expect(seEditaLaCompeticion({ status, enrollmentClosedByDeadline })).toBe(
        esperado,
      );
    },
  );

  // Revisión local: con un estado que falta o no se conoce, la ficha se caía
  it.each([[undefined], [null], [{}], [{ status: 'ENROLLING' }]])(
    'seEditaLaCompeticion(%j) is false and does not throw',
    (competition) => {
      expect(seEditaLaCompeticion(competition)).toBe(false);
    },
  );
});
