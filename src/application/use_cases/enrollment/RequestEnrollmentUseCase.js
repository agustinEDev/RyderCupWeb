import EnrollmentAssembler from '../../assemblers/EnrollmentAssembler';

/**
 * Use Case: Request Enrollment
 *
 * Permite a un usuario solicitar inscribirse a una competición.
 *
 * Flujo:
 * 1. Validar que el usuario no esté ya inscrito
 * 2. Solicitar inscripción al backend (crea enrollment con estado REQUESTED)
 * 3. Retornar enrollment creado como DTO simple para UI
 *
 * Reglas de negocio:
 * - Un usuario no puede tener múltiples enrollments en la misma competición
 * - La competición debe estar en estado ACTIVE para aceptar solicitudes
 * - El backend valida que haya cupos disponibles
 *
 * @example
 * const useCase = new RequestEnrollmentUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'user-456');
 * console.log(enrollment.status); // "APPROVED" (directa desde el 28 oct 2026)
 */
class RequestEnrollmentUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('RequestEnrollmentUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} userId - UUID del usuario (opcional, se obtiene del token JWT)
   * @param {Object} [data={}] - Datos opcionales del enrollment
   * @param {string} [data.roundId] - La franja, en un stroke play con franjas
   * @param {boolean} [data.waitingList] - Si es a la espera de esa franja, que está llena
   * @param {string} [data.color] - Color de barras elegido. Ver TeeColor: WHITE, YELLOW, BLUE, RED, BLACK, GREEN, ORANGE, PINK, GOLD, OTHER
   * @returns {Promise<Object>} DTO simple del enrollment creado
   * @throws {Error} Si el usuario ya está inscrito o falla la operación
   */
  async execute(competitionId, userId = null, data = {}) {
    // Validar entrada
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    // Verificar si el usuario ya está inscrito (solo si tenemos userId)
    if (userId) {
      const existingEnrollment = await this.#enrollmentRepository.findByCompetitionAndUser(
        competitionId,
        userId
      );

      if (existingEnrollment) {
        throw new Error('Ya estás inscrito en esta competición');
      }
    }

    // En una pública se entra directamente (release social 3, 28 oct 2026): con
    // plaza en la franja elegida o en su espera. El userId sale del token
    const { enrollment, roundId, waiting } = await this.#enrollmentRepository.requestEnrollment(
      competitionId,
      data
    );

    return { ...EnrollmentAssembler.toSimpleDTO(enrollment), roundId, waiting };
  }
}

export default RequestEnrollmentUseCase;
