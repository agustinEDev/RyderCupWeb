import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

/**
 * Use Case: Approve Enrollment
 *
 * Aprueba una solicitud de inscripción (REQUESTED → APPROVED).
 * Solo el creador de la competición puede ejecutar esta acción.
 *
 * Flujo:
 * 1. Validar entrada (competitionId, enrollmentId)
 * 2. Aprobar enrollment en el repositorio (llama a API)
 * 3. Opcionalmente asignar equipo
 * 4. Retornar enrollment aprobado como DTO simple
 *
 * Reglas de negocio:
 * - Solo se puede aprobar desde estados REQUESTED o INVITED
 * - El backend valida que el usuario sea el creador
 * - Se puede asignar equipo al momento de aprobar
 *
 * @example
 * const useCase = new ApproveEnrollmentUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'enroll-456', '1');
 * console.log(enrollment.status); // "APPROVED"
 * console.log(enrollment.teamId); // "1"
 */
class ApproveEnrollmentUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('ApproveEnrollmentUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @param {string|null} teamId - ID del equipo a asignar (opcional)
   * @returns {Promise<Object>} DTO simple del enrollment aprobado
   * @throws {Error} Si falla la operación o transición inválida
   */
  async execute(competitionId, enrollmentId, teamId = null) {
    // Validar entrada
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }

    // Aprobar enrollment (el backend valida permisos y transición)
    const enrollment = await this.#enrollmentRepository.approve(
      competitionId,
      enrollmentId,
      teamId
    );

    // Convertir a DTO simple para la UI
    return EnrollmentMapper.toSimpleDTO(enrollment);
  }
}

export default ApproveEnrollmentUseCase;
