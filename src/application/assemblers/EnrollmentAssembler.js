import Enrollment from '../../domain/entities/Enrollment';
import { nombrePequeno, nombreVisible } from '../../utils/nombreVisible';

/**
 * EnrollmentAssembler - Application Layer
 *
 * Converts Enrollment domain entities to simple DTOs for the UI.
 * This responsibility belongs in the application layer (not infrastructure)
 * because it serves the use cases, not the persistence mechanism.
 */
class EnrollmentAssembler {
  /**
   * Converts a domain entity to a simple DTO for the UI.
   *
   * @param {Enrollment} enrollment - Domain entity
   * @param {Object|null} [extras] - Campos de la respuesta que no son del
   *   dominio, en camelCase (`fixedHandicap`, `category`, `user`, `userName`,
   *   `userEmail`, `userHandicap`), tal como los deja el repositorio
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(enrollment, extras = null) {
    if (!(enrollment instanceof Enrollment)) {
      throw new Error(
        'EnrollmentAssembler.toSimpleDTO: enrollment must be an Enrollment instance',
      );
    }

    const simpleDTO = {
      id: enrollment.enrollmentId.toString(),
      competitionId: enrollment.competitionId,
      userId: enrollment.userId,
      status: enrollment.status.toString(),
      teamId: enrollment.teamId,
      customHandicap: enrollment.customHandicap,
      color: enrollment.color ? enrollment.color.toString() : null,
      useRealName: enrollment.useRealName,
      createdAt: enrollment.createdAt.toISOString(),
      updatedAt: enrollment.updatedAt.toISOString(),

      // Computed fields (helpers for UI)
      isPending: enrollment.isPending(),
      isApproved: enrollment.isApproved(),
      isRejected: enrollment.isRejected(),
      isCancelled: enrollment.isCancelled(),
      isWithdrawn: enrollment.isWithdrawn(),
      hasTeamAssigned: enrollment.hasTeamAssigned(),
      hasCustomHandicap: enrollment.hasCustomHandicap(),
    };

    // El hándicap fijado y la categoría de un stroke play, desde el cierre
    // (FE #824, RyderCupAM#506). El fijado llega como texto, como todo Decimal
    simpleDTO.fixedHandicap =
      extras?.fixedHandicap != null ? Number(extras.fixedHandicap) : null;
    simpleDTO.category = extras?.category ?? null;

    // If extra fields available, include them (joins)
    // Nested extras.user takes precedence over flat fields
    if (extras) {
      if (extras.user) {
        // `displayName` y no nombre + apellidos: es el nombre que el servidor
        // ya resolvió —alias, o nombre legal si esta inscripción lo pidió
        // (FE #571)—. Componiéndolo aquí, esta lista era el único sitio de la
        // aplicación donde el alias no se veía nunca
        simpleDTO.userName = nombreVisible(extras.user) || null;
        // El otro nombre, pequeño debajo: el real si delante va el alias, el alias
        // si delante va el real (competición pública). SB-08, 17 nov 2026
        simpleDTO.userSubName = nombrePequeno(extras.user) || null;
        simpleDTO.userEmail = extras.user.email || null;
        simpleDTO.userHandicap = extras.user.handicap;
        simpleDTO.userCountryCode = extras.user.countryCode;
        simpleDTO.userGender = extras.user.gender || null;
      } else {
        simpleDTO.userSubName = null;
        if (extras.userName) {
          simpleDTO.userName = extras.userName;
        }
        if (extras.userEmail) {
          simpleDTO.userEmail = extras.userEmail;
        }
        if (extras.userHandicap !== undefined) {
          simpleDTO.userHandicap = extras.userHandicap;
        }
      }
    }

    return simpleDTO;
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<Enrollment>} enrollments - Array of domain entities
   * @param {Array<Object|null>} [extrasArray] - Campos extra de cada una, en
   *   camelCase (ver toSimpleDTO)
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(enrollments, extrasArray = null) {
    if (!Array.isArray(enrollments)) {
      throw new Error(
        'EnrollmentAssembler.toSimpleDTOMany: enrollments must be an array',
      );
    }

    return enrollments.map((enrollment, index) => {
      const extras = extrasArray ? extrasArray[index] : null;
      return EnrollmentAssembler.toSimpleDTO(enrollment, extras);
    });
  }
}

export default EnrollmentAssembler;
