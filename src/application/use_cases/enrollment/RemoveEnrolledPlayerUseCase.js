/**
 * Use Case: el organizador quita a un inscrito (release social 2, 27 oct 2026).
 *
 * Antes de que empiece la competición, con los mismos efectos que si se
 * retirara él. El backend valida quién lo pide y cuándo, y contesta con su
 * código cuando no se puede (organizador, empezada, partidos, draft abierto).
 * Se le avisa en su Actividad; luego se le puede volver a invitar.
 */
class RemoveEnrolledPlayerUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error('RemoveEnrolledPlayerUseCase requires enrollmentRepository');
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * @param {string} enrollmentId - UUID de la inscripción
   * @returns {Promise<void>}
   * @throws {Error} Si no se puede (con `status` y `errorCode` del servidor)
   */
  async execute(enrollmentId) {
    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }
    await this.#enrollmentRepository.remove(enrollmentId);
  }
}

export default RemoveEnrolledPlayerUseCase;
