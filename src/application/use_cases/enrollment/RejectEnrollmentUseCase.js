import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

/**
 * Use Case: Reject Enrollment
 *
 * Rechaza una solicitud de inscripción (REQUESTED → REJECTED).
 * Solo el creador de la competición puede ejecutar esta acción.
 *
 * Flujo:
 * 1. Validar entrada (competitionId, enrollmentId)
 * 2. Rechazar enrollment en el repositorio (llama a API)
 * 3. Retornar enrollment rechazado como DTO simple
 *
 * Reglas de negocio:
 * - Solo se puede rechazar desde estados REQUESTED o INVITED
 * - El backend valida que el usuario sea el creador
 * - REJECTED es un estado final (no hay vuelta atrás)
 *
 * @example
 * const useCase = new RejectEnrollmentUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'enroll-456');
 * console.log(enrollment.status); // "REJECTED"
 */
class RejectEnrollmentUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('RejectEnrollmentUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Object>} DTO simple del enrollment rechazado
   * @throws {Error} Si falla la operación o transición inválida
   */
  async execute(competitionId, enrollmentId) {
    // Validar entrada
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }

    // Rechazar enrollment (el backend valida permisos y transición)
    const enrollment = await this.#enrollmentRepository.reject(competitionId, enrollmentId);

    // Convertir a DTO simple para la UI
    return EnrollmentMapper.toSimpleDTO(enrollment);
  }
}

export default RejectEnrollmentUseCase;
