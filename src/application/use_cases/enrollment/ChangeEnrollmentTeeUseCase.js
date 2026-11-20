import TeeColor from '../../../domain/value_objects/TeeColor';

/** @typedef {import('../../../domain/repositories/IEnrollmentRepository').default} IEnrollmentRepository */

/**
 * Use Case: cambiar la barra de una inscripción (FE #1214, RyderCupAm#912).
 *
 * Quién puede y hasta cuándo lo decide el backend (la pantalla solo ofrece el
 * botón a quien puede, con `puedeCambiarLaBarra`): el propio jugador antes de
 * empezar, el capitán de su equipo, el organizador o un admin. Al cambiarla,
 * el backend rehace lo que le queda por jugar. `null` vuelve a la barra de
 * por defecto (la habitual de su género).
 */
class ChangeEnrollmentTeeUseCase {
  #enrollmentRepository;

  /**
   * @param {IEnrollmentRepository} enrollmentRepository
   */
  constructor(enrollmentRepository) {
    if (!enrollmentRepository) {
      throw new Error(
        'ChangeEnrollmentTeeUseCase requires enrollmentRepository',
      );
    }
    this.#enrollmentRepository = enrollmentRepository;
  }

  /**
   * @param {string} enrollmentId - UUID del enrollment
   * @param {string|null} teeColor - Una de `TeeColor`, o null
   * @returns {Promise<{id: string, teeColor: string|null}>} La barra que quedó
   */
  async execute(enrollmentId, teeColor) {
    if (!enrollmentId || typeof enrollmentId !== 'string') {
      throw new Error('enrollmentId es requerido y debe ser un string');
    }
    // `undefined` llegaría a la API como ausencia de campo (422 sin decir qué)
    if (teeColor !== null && !TeeColor.isValid(teeColor)) {
      throw new Error(`teeColor no válido: ${teeColor}`);
    }
    return this.#enrollmentRepository.changeTee(enrollmentId, teeColor);
  }
}

export default ChangeEnrollmentTeeUseCase;
