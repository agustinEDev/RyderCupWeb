import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

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
 * console.log(enrollment.status); // "REQUESTED"
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
   * @returns {Promise<Object>} DTO simple del enrollment creado
   * @throws {Error} Si el usuario ya está inscrito o falla la operación
   */
  async execute(competitionId, userId = null) {
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

    // Solicitar inscripción (el backend crea el enrollment con estado REQUESTED)
    // El userId se obtiene automáticamente del JWT token en el backend
    const enrollment = await this.#enrollmentRepository.requestEnrollment(competitionId);

    // Convertir a DTO simple para la UI
    return EnrollmentMapper.toSimpleDTO(enrollment);
  }
}

export default RequestEnrollmentUseCase;
