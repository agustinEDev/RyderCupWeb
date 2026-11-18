import Enrollment from '../../domain/entities/Enrollment';
import EnrollmentId from '../../domain/value_objects/EnrollmentId';
import EnrollmentStatus from '../../domain/value_objects/EnrollmentStatus';
import TeeColor from '../../domain/value_objects/TeeColor';

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
      throw Object.assign(
        new Error('EnrollmentMapper.toDomain: apiData is required'),
        { mensajeTecnico: true },
      );
    }

    // Validar campos requeridos
    if (
      !apiData.id ||
      !apiData.competition_id ||
      !apiData.user_id ||
      !apiData.status
    ) {
      throw Object.assign(
        new Error(
          'EnrollmentMapper.toDomain: Missing required fields (id, competition_id, user_id, status)',
        ),
        { mensajeTecnico: true },
      );
    }

    // Un id, estado o color que no se puede convertir es técnico, como lo que
    // falta arriba: la persona ve la alternativa traducida (mensajeDelError)
    try {
      return Enrollment.fromPersistence({
        enrollmentId: EnrollmentId.fromString(apiData.id),
        competitionId: apiData.competition_id,
        userId: apiData.user_id,
        status: EnrollmentStatus.fromString(apiData.status),
        teamId: apiData.team_id || null,
        customHandicap:
          apiData.custom_handicap !== null &&
          apiData.custom_handicap !== undefined
            ? Number(apiData.custom_handicap)
            : null,
        color:
          apiData.color == null ? null : TeeColor.fromString(apiData.color),
        // El campo llega siempre desde BE #254. Si falta es que responde un
        // backend anterior, y ese resuelve TODOS los nombres con el alias: leerlo
        // como `false` es describir lo que esa respuesta trae, no el valor por
        // defecto de hoy, que es el nombre legal
        useRealName: apiData.use_real_name === true,
        createdAt: apiData.created_at,
        updatedAt: apiData.updated_at,
      });
    } catch (error) {
      throw Object.assign(
        new Error(`Failed to map enrollment data: ${error.message}`, {
          cause: error,
        }),
        { mensajeTecnico: true },
      );
    }
  }

  /**
   * Convierte múltiples DTOs de la API a entidades del dominio
   *
   * @param {Array<Object>} apiDataArray - Array de datos de la API
   * @returns {Array<Enrollment>} Array de entidades del dominio
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw Object.assign(
        new Error(
          'EnrollmentMapper.toDomainMany: apiDataArray must be an array',
        ),
        { mensajeTecnico: true },
      );
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
      throw Object.assign(
        new Error(
          'EnrollmentMapper.toDTO: enrollment must be an Enrollment instance',
        ),
        { mensajeTecnico: true },
      );
    }

    return {
      id: enrollment.enrollmentId.toString(),
      competition_id: enrollment.competitionId,
      user_id: enrollment.userId,
      status: enrollment.status.toString(),
      team_id: enrollment.teamId,
      custom_handicap: enrollment.customHandicap,
      color: enrollment.color ? enrollment.color.toString() : null,
      use_real_name: enrollment.useRealName,
      created_at: enrollment.createdAt.toISOString(),
      updated_at: enrollment.updatedAt.toISOString(),
    };
  }
}

export default EnrollmentMapper;
