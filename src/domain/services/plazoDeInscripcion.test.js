import { describe, it, expect } from 'vitest';
import { plazoQueSeEnseña } from './plazoDeInscripcion';

/**
 * F1 · «Inscripción abierta hasta el {día} a las 12:00» (15 nov 2026;
 * RyderCupAm #865). El plazo lo manda el servidor con la zona del campo
 * (`enrollment_deadline`, con su desfase) y si vale para esta competición
 * (`enrollment_deadline_applies`: no, si se abrió a mano pasado el plazo).
 *
 *   caso                                           | qué devuelve
 *   -----------------------------------------------|------------------------------------------
 *   D1 abierta, vale y en el futuro                 | el día y la hora del campo, del texto mismo
 *   D2 el día del campo no es el de quien la mira   | el del campo (no se convierte)
 *   D3 ya pasó (o es justo ahora)                   | nada
 *   D4 no vale (abierta a mano pasado el plazo)     | nada
 *   D4b sin decir si vale (backend de antes)        | nada
 *   D5 no está abierta (borrador, cerrada…)         | nada
 *   D6 sin plazo, o ilegible                        | nada
 */
describe('plazoQueSeEnseña', () => {
  const AHORA = new Date('2026-11-10T09:00:00Z');
  const abierta = (cambios = {}) => ({
    status: 'ACTIVE',
    enrollmentDeadline: '2026-11-13T12:00:00+01:00',
    enrollmentDeadlineApplies: true,
    ...cambios,
  });

  it('D1: Given abierta con el plazo en el futuro, When se pide, Then el día y la hora del campo', () => {
    expect(plazoQueSeEnseña(abierta(), AHORA)).toEqual({
      dia: '2026-11-13',
      hora: '12:00',
    });
  });

  it('D2: Given un campo lejos, When se pide, Then su día, sin convertirlo', () => {
    expect(
      plazoQueSeEnseña(
        abierta({ enrollmentDeadline: '2026-11-13T12:00:00+13:00' }),
        AHORA,
      ),
    ).toEqual({ dia: '2026-11-13', hora: '12:00' });
  });

  it.each([
    ['ya pasó', new Date('2026-11-13T12:00:01+01:00')],
    ['es justo ahora', new Date('2026-11-13T12:00:00+01:00')],
  ])('D3: Given %s, When se pide, Then nada', (_, ahora) => {
    expect(plazoQueSeEnseña(abierta(), ahora)).toBeNull();
  });

  it('D4: Given no vale para ella, When se pide, Then nada', () => {
    expect(
      plazoQueSeEnseña(abierta({ enrollmentDeadlineApplies: false }), AHORA),
    ).toBeNull();
  });

  it('D4b: Given no dice si vale, When se pide, Then nada', () => {
    expect(
      plazoQueSeEnseña(
        abierta({ enrollmentDeadlineApplies: undefined }),
        AHORA,
      ),
    ).toBeNull();
  });

  it.each(['DRAFT', 'CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])(
    'D5: Given %s, When se pide, Then nada',
    (status) => {
      expect(plazoQueSeEnseña(abierta({ status }), AHORA)).toBeNull();
    },
  );

  it.each([null, undefined, '', 'mañana', '2026-11-13'])(
    'D6: Given el plazo %s, When se pide, Then nada',
    (enrollmentDeadline) => {
      expect(
        plazoQueSeEnseña(abierta({ enrollmentDeadline }), AHORA),
      ).toBeNull();
    },
  );
});
