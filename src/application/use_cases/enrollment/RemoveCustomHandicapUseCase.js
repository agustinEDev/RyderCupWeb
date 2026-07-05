import EnrollmentAssembler from '../../assemblers/EnrollmentAssembler';

/**
 * Use Case: Remove Custom Handicap
 *
 * Elimina el handicap personalizado de un enrollment, volviendo a usar
 * el handicap oficial del jugador (RFEG/perfil).
 * Solo el creador de la competición (o un admin) puede ejecutar esta acción.
 *
 * @example
 * const useCase = new RemoveCustomHandicapUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'enroll-456');
 * console.log(enrollment.hasCustomHandicap); // false
 */
class RemoveCustomHandicapUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('RemoveCustomHandicapUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @returns {Promise<Object>} DTO simple del enrollment actualizado
   * @throws {Error} Si falla la operación
   */
  async execute(competitionId, enrollmentId) {
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }

    const enrollment = await this.#enrollmentRepository.removeCustomHandicap(
      competitionId,
      enrollmentId
    );

    return EnrollmentAssembler.toSimpleDTO(enrollment);
  }
}

export default RemoveCustomHandicapUseCase;
