import EnrollmentAssembler from '../../assemblers/EnrollmentAssembler';

/**
 * Use Case: Set Custom Handicap
 *
 * Establece un handicap personalizado para un enrollment.
 * Solo el creador de la competición puede ejecutar esta acción.
 *
 * Flujo:
 * 1. Validar entrada (competitionId, enrollmentId, customHandicap)
 * 2. Establecer handicap en el repositorio (llama a API)
 * 3. Retornar enrollment actualizado como DTO simple
 *
 * Reglas de negocio:
 * - El handicap debe estar en rango válido (-10.0 a 54.0)
 * - Solo el creador puede establecer handicaps personalizados
 * - Se puede override el handicap oficial del usuario para equilibrar equipos
 *
 * @example
 * const useCase = new SetCustomHandicapUseCase(enrollmentRepository);
 * const enrollment = await useCase.execute('comp-123', 'enroll-456', 18.5);
 * console.log(enrollment.customHandicap); // 18.5
 * console.log(enrollment.hasCustomHandicap); // true
 */
class SetCustomHandicapUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('SetCustomHandicapUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * Ejecutar caso de uso
   *
   * @param {string} competitionId - UUID de la competición
   * @param {string} enrollmentId - UUID del enrollment
   * @param {number} customHandicap - Valor del handicap (-10.0 a 54.0)
   * @returns {Promise<Object>} DTO simple del enrollment actualizado
   * @throws {Error} Si falla la operación o el handicap es inválido
   */
  async execute(competitionId, enrollmentId, customHandicap) {
    // Validar entrada
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId es requerido y debe ser un string');
    }

    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }

    if (typeof customHandicap !== 'number' || isNaN(customHandicap)) {
      throw new Error('customHandicap debe ser un número válido');
    }

    // Validar rango del handicap (frontend validation, backend también valida)
    const MIN_HANDICAP = -10.0;
    const MAX_HANDICAP = 54.0;

    if (customHandicap < MIN_HANDICAP || customHandicap > MAX_HANDICAP) {
      throw new Error(
        `El handicap debe estar entre ${MIN_HANDICAP} y ${MAX_HANDICAP}. Recibido: ${customHandicap}`
      );
    }

    // Establecer handicap (el backend valida permisos)
    const enrollment = await this.#enrollmentRepository.setCustomHandicap(
      competitionId,
      enrollmentId,
      customHandicap
    );

    // Convertir a DTO simple para la UI
    return EnrollmentAssembler.toSimpleDTO(enrollment);
  }
}

export default SetCustomHandicapUseCase;
