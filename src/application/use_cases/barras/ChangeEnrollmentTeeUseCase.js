import { exigeColorONull, exigeTexto } from './validacion';

/** @typedef {import('../../../domain/repositories/IBarrasRepository').default} IBarrasRepository */

/**
 * Use Case: cambiar la barra general de una inscripción (FE #1214,
 * RyderCupAm#912). Cada campo la usa si la tiene (ver barras por campo).
 *
 * Quién puede y hasta cuándo lo decide el backend (la pantalla solo ofrece el
 * botón a quien puede, con `puedeCambiarLaBarra`): el propio jugador antes de
 * empezar, el capitán de su equipo, el organizador o un admin. Al cambiarla,
 * el backend rehace lo que le queda por jugar. `null` vuelve a la habitual
 * de su género.
 */
class ChangeEnrollmentTeeUseCase {
  #barrasRepository;

  /**
   * @param {IBarrasRepository} barrasRepository
   */
  constructor(barrasRepository) {
    if (!barrasRepository)
      throw new Error('ChangeEnrollmentTeeUseCase requires barrasRepository');
    this.#barrasRepository = barrasRepository;
  }

  /**
   * @param {string} enrollmentId - UUID del enrollment
   * @param {string|null} teeColor - Una de `TeeColor`, o null
   * @returns {Promise<{id: string, teeColor: string|null}>} La barra que quedó
   */
  async execute(enrollmentId, teeColor) {
    exigeTexto(enrollmentId, 'enrollmentId');
    exigeColorONull(teeColor);
    return this.#barrasRepository.changeTee(enrollmentId, teeColor);
  }
}

export default ChangeEnrollmentTeeUseCase;
