import { describe, it, expect } from 'vitest';
import EnrollmentAssembler from './EnrollmentAssembler';
import Enrollment from '../../domain/entities/Enrollment';
import EnrollmentId from '../../domain/value_objects/EnrollmentId';
import EnrollmentStatus from '../../domain/value_objects/EnrollmentStatus';

const unaInscripcion = (overrides = {}) =>
  Enrollment.fromPersistence({
    enrollmentId: EnrollmentId.create(),
    competitionId: 'comp-1',
    userId: 'user-1',
    status: EnrollmentStatus.approved(),
    ...overrides,
  });

describe('EnrollmentAssembler', () => {
  describe('el nombre que se pinta', () => {
    // FE #571: esta lista componía nombre + apellidos y se saltaba el alias,
    // así que era el único sitio de la aplicación donde no se veía nunca
    it('usa el displayName que ya resolvió el servidor', () => {
      const dto = EnrollmentAssembler.toSimpleDTO(unaInscripcion(), {
        user: {
          firstName: 'Agustín',
          lastName: 'Estévez',
          displayName: 'Chuchi',
          email: 'a@example.com',
        },
      });

      expect(dto.userName).toBe('Chuchi');
    });

    it('cae a nombre y apellidos si la respuesta no trae displayName', () => {
      const dto = EnrollmentAssembler.toSimpleDTO(unaInscripcion(), {
        user: { firstName: 'Agustín', lastName: 'Estévez' },
      });

      expect(dto.userName).toBe('Agustín Estévez');
    });

    it('deja userName a null si no hay con qué componerlo', () => {
      const dto = EnrollmentAssembler.toSimpleDTO(unaInscripcion(), {
        user: { email: 'a@example.com' },
      });

      expect(dto.userName).toBeNull();
    });

    it('sigue aceptando el userName plano de las respuestas antiguas', () => {
      const dto = EnrollmentAssembler.toSimpleDTO(unaInscripcion(), {
        userName: 'Meis',
      });

      expect(dto.userName).toBe('Meis');
    });
  });

  describe('useRealName', () => {
    it('viaja al DTO para que la pantalla sepa cómo pintar el interruptor', () => {
      const dto = EnrollmentAssembler.toSimpleDTO(
        unaInscripcion({ useRealName: false }),
      );

      expect(dto.useRealName).toBe(false);
    });

    it('es true cuando nadie ha elegido: la competición muestra el nombre legal', () => {
      expect(
        EnrollmentAssembler.toSimpleDTO(unaInscripcion()).useRealName,
      ).toBe(true);
    });
  });
});

describe('EnrollmentAssembler · el otro nombre, debajo (SB-08)', () => {
  it('con el alias delante, el nombre real debajo', () => {
    const dto = EnrollmentAssembler.toSimpleDTO(unaInscripcion(), {
      user: {
        firstName: 'Agustín',
        lastName: 'Estévez',
        alias: 'Trinx',
        displayName: 'Trinx',
      },
    });

    expect(dto.userSubName).toBe('Agustín Estévez');
  });

  it('con el nombre real delante (pública), el alias debajo', () => {
    const dto = EnrollmentAssembler.toSimpleDTO(unaInscripcion(), {
      user: {
        firstName: 'Agustín',
        lastName: 'Estévez',
        alias: 'Trinx',
        displayName: 'Agustín Estévez',
      },
    });

    expect(dto.userSubName).toBe('Trinx');
  });
});
