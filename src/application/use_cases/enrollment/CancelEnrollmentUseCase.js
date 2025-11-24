import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

/**
 * Use Case: Cancel Enrollment
 *
 * Cancela una solicitud de inscripción (REQUESTED → CANCELLED).
 * El usuario cancela su propia solicitud antes de ser aprobada.
 *
 * Flujo:
 * 1. Validar entrada (competitionId, enrollmentId)
 * 2. Cancelar enrollment en el repositorio (llama a API)
 * 3. Retornar enrollment cancelado como DTO simple
 *
 * Reglas de negocio:
 * - Solo se puede cancelar desde estados REQUESTED o INVITED
 * - El usuario solo puede cancelar sus propias solicitudes
 * - CANCELLED es un estado final (no hay vuelta atrás)
 *
 * Diferencia con withdraw:
 * - cancel: Usuario cancela ANTES de estar aprobado (REQUESTED → CANCELLED)
 * - withdraw: Usuario se retira DESPUÉS de estar aprobado (APPROVED → WITHDRAWN)
 *
 * @example
 * const useCase = new CancelEnrollmentUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'enroll-456');
 * console.log(enrollment.status); // "CANCELLED"
 */
class CancelEnrollmentUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('CancelEnrollmentUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Object>} DTO simple del enrollment cancelado
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

    // Cancelar enrollment (el backend valida permisos y transición)
    const enrollment = await this.#enrollmentRepository.cancel(competitionId, enrollmentId);

    // Convertir a DTO simple para la UI
    return EnrollmentMapper.toSimpleDTO(enrollment);
  }
}

export default CancelEnrollmentUseCase;
