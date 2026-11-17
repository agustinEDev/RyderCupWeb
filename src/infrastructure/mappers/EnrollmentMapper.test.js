import { describe, it, expect } from 'vitest';
import EnrollmentMapper from './EnrollmentMapper';
import { mensajeDelError } from '../../utils/mensajeDelError';

const ALTERNATIVA = 'No se pudo aprobar la inscripción';

const inscripcion = (extra = {}) => ({
  id: '3f6c1a52-8d4e-4b1a-9c7e-2a5b6d8e0f11',
  competition_id: 'comp-1',
  user_id: 'user-1',
  status: 'APPROVED',
  ...extra,
});

describe('EnrollmentMapper', () => {
  it('maps a valid enrollment as before', () => {
    const enrollment = EnrollmentMapper.toDomain(inscripcion());

    expect(enrollment.enrollmentId.toString()).toBe(
      '3f6c1a52-8d4e-4b1a-9c7e-2a5b6d8e0f11',
    );
    expect(enrollment.status.toString()).toBe('APPROVED');
  });

  it.each([
    ['an id that is not a UUID', { id: 'bad-id' }],
    ['an unknown status', { status: 'SOMETHING_ELSE' }],
    ['an unknown tee colour', { color: 'PURPLE' }],
  ])(
    'a conversion failure (%s) is technical: the person sees the fallback',
    (_caso, extra) => {
      let error;
      try {
        EnrollmentMapper.toDomain(inscripcion(extra));
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.mensajeTecnico).toBe(true);
      expect(mensajeDelError(error, ALTERNATIVA)).toBe(ALTERNATIVA);
    },
  );
});
