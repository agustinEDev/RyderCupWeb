import Enrollment from '../../domain/entities/Enrollment';
import EnrollmentId from '../../domain/value_objects/EnrollmentId';
import EnrollmentStatus from '../../domain/value_objects/EnrollmentStatus';

/**
 * EnrollmentMapper - Anti-Corruption Layer
 *
 * Protege el Domain Layer de cambios en la estructura de la API externa.
 *
 * Responsabilidades:
 * - Convertir API DTOs (snake_case) → Domain Entities (camelCase)
 * - Convertir Domain Entities → API DTOs (snake_case)
 * - Convertir Domain Entities → Simple DTOs para UI (camelCase, plano)
 * - Manejar campos adicionales de la API que el dominio no necesita
 * - Validar y transformar tipos de datos
 *
 * Formato API (backend Python):
 * {
 *   "id": "uuid",
 *   "competition_id": "uuid",
 *   "user_id": "uuid",
 *   "status": "REQUESTED",
 *   "team_id": "1" | null,
 *   "custom_handicap": 15.5 | null,
 *   "created_at": "2025-11-24T10:30:00Z",
 *   "updated_at": "2025-11-24T10:30:00Z",
 *   "user_name": "Juan García",      // Join con User
 *   "user_email": "juan@example.com" // Join con User
 * }
 */
class EnrollmentMapper {
  /**
   * Convierte un DTO de la API a una entidad del dominio
   *
   * Transforma:
   * - snake_case → camelCase
   * - Strings → Value Objects (EnrollmentId, EnrollmentStatus)
   * - ISO strings → Date objects
   *
   * @param {Object} apiData - Datos de la API (snake_case)
   * @returns {Enrollment} Entidad del dominio
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('EnrollmentMapper.toDomain: apiData is required');
    }

    // Validar campos requeridos
    if (!apiData.id || !apiData.competition_id || !apiData.user_id || !apiData.status) {
      throw new Error(
        'EnrollmentMapper.toDomain: Missing required fields (id, competition_id, user_id, status)'
      );
    }

    return Enrollment.fromPersistence({
      enrollmentId: EnrollmentId.fromString(apiData.id),
      competitionId: apiData.competition_id,
      userId: apiData.user_id,
      status: EnrollmentStatus.fromString(apiData.status),
      teamId: apiData.team_id || null,
      customHandicap: apiData.custom_handicap !== null ? apiData.custom_handicap : null,
      teeCategory: apiData.tee_category || null,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
    });
  }

  /**
   * Convierte múltiples DTOs de la API a entidades del dominio
   *
   * @param {Array<Object>} apiDataArray - Array de datos de la API
   * @returns {Array<Enrollment>} Array de entidades del dominio
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw new Error('EnrollmentMapper.toDomainMany: apiDataArray must be an array');
    }

    return apiDataArray.map((apiData) => EnrollmentMapper.toDomain(apiData));
  }

  /**
   * Convierte una entidad del dominio a un DTO para la API
   *
   * Transforma:
   * - camelCase → snake_case
   * - Value Objects → Strings
   * - Date objects → ISO strings
   *
   * Usado al crear/actualizar enrollments.
   *
   * @param {Enrollment} enrollment - Entidad del dominio
   * @returns {Object} DTO para la API (snake_case)
   */
  static toDTO(enrollment) {
    if (!(enrollment instanceof Enrollment)) {
      throw new Error('EnrollmentMapper.toDTO: enrollment must be an Enrollment instance');
    }

    return {
      id: enrollment.enrollmentId.toString(),
      competition_id: enrollment.competitionId,
      user_id: enrollment.userId,
      status: enrollment.status.toString(),
      team_id: enrollment.teamId,
      custom_handicap: enrollment.customHandicap,
      tee_category: enrollment.teeCategory || null,
      created_at: enrollment.createdAt.toISOString(),
      updated_at: enrollment.updatedAt.toISOString(),
    };
  }

  /**
   * Convierte una entidad del dominio a un DTO simple para la UI
   *
   * Transforma:
   * - Value Objects → Strings/primitivos
   * - Date objects → ISO strings
   * - Estructura plana y fácil de consumir en React
   *
   * Usado en Use Cases para devolver datos a la UI.
   *
   * @param {Enrollment} enrollment - Entidad del dominio
   * @param {Object} apiData - Datos originales de la API (opcional, para incluir campos extra)
   * @returns {Object} DTO simple para UI (camelCase, plano)
   */
  static toSimpleDTO(enrollment, apiData = null) {
    if (!(enrollment instanceof Enrollment)) {
      throw new Error('EnrollmentMapper.toSimpleDTO: enrollment must be an Enrollment instance');
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

      // Campos calculados (helpers para UI)
      isPending: enrollment.isPending(),
      isApproved: enrollment.isApproved(),
      isRejected: enrollment.isRejected(),
      isCancelled: enrollment.isCancelled(),
      isWithdrawn: enrollment.isWithdrawn(),
      hasTeamAssigned: enrollment.hasTeamAssigned(),
      hasCustomHandicap: enrollment.hasCustomHandicap(),
    };

    // Si hay datos de la API, incluir campos adicionales (joins)
    if (apiData) {
      // Caso 1: user_name/user_email directos (backward compatibility)
      if (apiData.user_name) {
        simpleDTO.userName = apiData.user_name;
      }
      if (apiData.user_email) {
        simpleDTO.userEmail = apiData.user_email;
      }
      if (apiData.user_handicap !== undefined) {
        simpleDTO.userHandicap = apiData.user_handicap;
      }

      // Caso 2: objeto user anidado (nuevo formato del backend)
      if (apiData.user) {
        simpleDTO.userName = `${apiData.user.first_name} ${apiData.user.last_name}`;
        simpleDTO.userEmail = apiData.user.email;
        simpleDTO.userHandicap = apiData.user.handicap;
        simpleDTO.userCountryCode = apiData.user.country_code;
        simpleDTO.userGender = apiData.user.gender || null;
      }
    }

    return simpleDTO;
  }

  /**
   * Convierte múltiples entidades del dominio a DTOs simples para la UI
   *
   * @param {Array<Enrollment>} enrollments - Array de entidades del dominio
   * @param {Array<Object>} apiDataArray - Array de datos originales de la API (opcional)
   * @returns {Array<Object>} Array de DTOs simples para UI
   */
  static toSimpleDTOMany(enrollments, apiDataArray = null) {
    if (!Array.isArray(enrollments)) {
      throw new Error('EnrollmentMapper.toSimpleDTOMany: enrollments must be an array');
    }

    return enrollments.map((enrollment, index) => {
      const apiData = apiDataArray ? apiDataArray[index] : null;
      return EnrollmentMapper.toSimpleDTO(enrollment, apiData);
    });
  }
}

export default EnrollmentMapper;
