import Enrollment from '../../domain/entities/Enrollment';

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
   * @param {Object} apiData - Original API data (optional, for extra fields)
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(enrollment, apiData = null) {
    if (!(enrollment instanceof Enrollment)) {
      throw new Error('EnrollmentAssembler.toSimpleDTO: enrollment must be an Enrollment instance');
    }

    const simpleDTO = {
      id: enrollment.enrollmentId.toString(),
      competitionId: enrollment.competitionId,
      userId: enrollment.userId,
      status: enrollment.status.toString(),
      teamId: enrollment.teamId,
      customHandicap: enrollment.customHandicap,
      teeCategory: enrollment.teeCategory || null,
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

    // If API data available, include extra fields (joins)
    // Nested apiData.user takes precedence over flat fields
    if (apiData) {
      if (apiData.user) {
        const firstName = apiData.user.first_name || '';
        const lastName = apiData.user.last_name || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
        simpleDTO.userName = fullName;
        simpleDTO.userEmail = apiData.user.email || null;
        simpleDTO.userHandicap = apiData.user.handicap;
        simpleDTO.userCountryCode = apiData.user.country_code;
        simpleDTO.userGender = apiData.user.gender || null;
      } else {
        if (apiData.user_name) {
          simpleDTO.userName = apiData.user_name;
        }
        if (apiData.user_email) {
          simpleDTO.userEmail = apiData.user_email;
        }
        if (apiData.user_handicap !== undefined) {
          simpleDTO.userHandicap = apiData.user_handicap;
        }
      }
    }

    return simpleDTO;
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<Enrollment>} enrollments - Array of domain entities
   * @param {Array<Object>} apiDataArray - Array of original API data (optional)
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(enrollments, apiDataArray = null) {
    if (!Array.isArray(enrollments)) {
      throw new Error('EnrollmentAssembler.toSimpleDTOMany: enrollments must be an array');
    }

    return enrollments.map((enrollment, index) => {
      const apiData = apiDataArray ? apiDataArray[index] : null;
      return EnrollmentAssembler.toSimpleDTO(enrollment, apiData);
    });
  }
}

export default EnrollmentAssembler;
