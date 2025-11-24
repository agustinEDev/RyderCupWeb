import EnrollmentMapper from '../../../infrastructure/mappers/EnrollmentMapper';

/**
 * Use Case: List Enrollments
 *
 * Lista todos los enrollments de una competición con filtros opcionales.
 *
 * Flujo:
 * 1. Validar entrada (competitionId)
 * 2. Buscar enrollments en el repositorio con filtros
 * 3. Convertir a DTOs simples para la UI
 *
 * Filtros disponibles:
 * - status: Filtrar por estado (ej: "APPROVED", "REQUESTED")
 * - userId: Filtrar por usuario específico
 * - teamId: Filtrar por equipo específico
 *
 * @example
 * const useCase = new ListEnrollmentsUseCase(enrollmentRepository);
 * const enrollments = await useCase.execute('comp-123', { status: 'APPROVED' });
 * console.log(enrollments.length); // 10
 */
class ListEnrollmentsUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('ListEnrollmentsUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {Object} filters - Filtros opcionales
   * @param {string} filters.status - Filtrar por estado
   * @param {string} filters.userId - Filtrar por usuario
   * @param {string} filters.teamId - Filtrar por equipo
   * @returns {Promise<Array<Object>>} Array de DTOs simples
   * @throws {Error} Si falla la operación
   */
  async execute(competitionId, filters = {}) {
    // Validar entrada
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    // Buscar enrollments con filtros
    const enrollments = await this.#enrollmentRepository.findByCompetition(
      competitionId,
      filters
    );

    // Convertir a DTOs simples para la UI, preservando campos extra de la API
    return enrollments.map((enrollment) =>
      EnrollmentMapper.toSimpleDTO(enrollment, enrollment._apiData)
    );
  }
}

export default ListEnrollmentsUseCase;
