import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

/**
 * Use Case: Direct Enroll
 *
 * Inscripción directa por el creador de la competición (sin solicitud previa).
 * Crea un enrollment con estado APPROVED inmediatamente.
 *
 * Flujo:
 * 1. Validar entrada (competitionId, userId)
 * 2. Verificar que el usuario no esté ya inscrito
 * 3. Crear enrollment directamente en estado APPROVED
 * 4. Opcionalmente asignar handicap personalizado y equipo
 * 5. Retornar enrollment creado como DTO simple
 *
 * Reglas de negocio:
 * - Solo el creador de la competición puede inscribir directamente
 * - El usuario no puede estar ya inscrito
 * - Se puede establecer handicap personalizado y equipo al momento de inscribir
 *
 * @example
 * const useCase = new DirectEnrollUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', {
 *   userId: 'user-456',
 *   customHandicap: 18.5,
 *   teamId: '1'
 * });
 * console.log(enrollment.status); // "APPROVED"
 * console.log(enrollment.customHandicap); // 18.5
 * console.log(enrollment.teamId); // "1"
 */
class DirectEnrollUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('DirectEnrollUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {Object} data - Datos del enrollment
   * @param {string} data.userId - UUID del usuario a inscribir
   * @param {number|null} data.customHandicap - Handicap personalizado (opcional)
   * @param {string|null} data.teamId - ID del equipo (opcional)
   * @param {string|null} data.teeCategory - Categoría de tee preferida (opcional: CHAMPIONSHIP, AMATEUR, SENIOR, FORWARD, JUNIOR)
   * @returns {Promise<Object>} DTO simple del enrollment creado
   * @throws {Error} Si el usuario ya está inscrito o falla la operación
   */
  async execute(competitionId, data) {
    // Validar entrada
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    if (!data || !data.userId || typeof data.userId !== 'string') {
      throw new Error('data.userId es requerido y debe ser un string');
    }

    // Validar customHandicap si está presente
    if (data.customHandicap !== null && data.customHandicap !== undefined) {
      if (typeof data.customHandicap !== 'number' || isNaN(data.customHandicap)) {
        throw new Error('customHandicap debe ser un número válido');
      }

      const MIN_HANDICAP = -10.0;
      const MAX_HANDICAP = 54.0;

      if (data.customHandicap < MIN_HANDICAP || data.customHandicap > MAX_HANDICAP) {
        throw new Error(
          `El handicap debe estar entre ${MIN_HANDICAP} y ${MAX_HANDICAP}. Recibido: ${data.customHandicap}`
        );
      }
    }

    // Verificar si el usuario ya está inscrito
    const existingEnrollment = await this.#enrollmentRepository.findByCompetitionAndUser(
      competitionId,
      data.userId
    );

    if (existingEnrollment) {
      throw new Error('El usuario ya está inscrito en esta competición');
    }

    // Inscribir directamente (el backend valida permisos)
    const enrollment = await this.#enrollmentRepository.directEnroll(competitionId, data);

    // Convertir a DTO simple para la UI
    return EnrollmentMapper.toSimpleDTO(enrollment);
  }
}

export default DirectEnrollUseCase;
