import { exigeColorONull, exigeTexto } from './validacion';

/** @typedef {import('../../../domain/repositories/IBarrasRepository').default} IBarrasRepository */

/**
 * Use Case: la barra de un jugador en un campo (barras por campo, R1): pisa
 * la del campo y su general en ese campo; null la quita. Mismos permisos y
 * plazos que la general; lo decide el backend.
 */
class ChangeEnrollmentCourseTeeUseCase {
  #barrasRepository;

  /** @param {IBarrasRepository} barrasRepository */
  constructor(barrasRepository) {
    if (!barrasRepository)
      throw new Error(
        'ChangeEnrollmentCourseTeeUseCase requires barrasRepository',
      );
    this.#barrasRepository = barrasRepository;
  }

  /**
   * @param {string} enrollmentId
   * @param {string} golfCourseId
   * @param {string|null} teeColor
   */
  async execute(enrollmentId, golfCourseId, teeColor) {
    exigeTexto(enrollmentId, 'enrollmentId');
    exigeTexto(golfCourseId, 'golfCourseId');
    exigeColorONull(teeColor);
    return this.#barrasRepository.changeCourseTee(
      enrollmentId,
      golfCourseId,
      teeColor,
    );
  }
}

export default ChangeEnrollmentCourseTeeUseCase;
