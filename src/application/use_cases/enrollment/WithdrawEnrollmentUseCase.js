import EnrollmentAssembler from '../../assemblers/EnrollmentAssembler';

/**
 * Use Case: Withdraw Enrollment
 *
 * Retira una inscripción aprobada (APPROVED → WITHDRAWN).
 * El usuario se retira de la competición después de estar inscrito.
 *
 * Flujo:
 * 1. Validar entrada (competitionId, enrollmentId)
 * 2. Retirar enrollment en el repositorio (llama a API)
 * 3. Retornar enrollment retirado como DTO simple
 *
 * Reglas de negocio:
 * - Solo se puede retirar desde estado APPROVED
 * - El usuario solo puede retirar sus propias inscripciones
 * - WITHDRAWN es un estado final (no hay vuelta atrás)
 *
 * Diferencia con cancel:
 * - cancel: Usuario cancela ANTES de estar aprobado (REQUESTED → CANCELLED)
 * - withdraw: Usuario se retira DESPUÉS de estar aprobado (APPROVED → WITHDRAWN)
 *
 * @example
 * const useCase = new WithdrawEnrollmentUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'enroll-456');
 * console.log(enrollment.status); // "WITHDRAWN"
 */
class WithdrawEnrollmentUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('WithdrawEnrollmentUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Object>} DTO simple del enrollment retirado
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

    // Retirar enrollment (el backend valida permisos y transición)
    const enrollment = await this.#enrollmentRepository.withdraw(competitionId, enrollmentId);

    // Convertir a DTO simple para la UI
    return EnrollmentAssembler.toSimpleDTO(enrollment);
  }
}

export default WithdrawEnrollmentUseCase;
