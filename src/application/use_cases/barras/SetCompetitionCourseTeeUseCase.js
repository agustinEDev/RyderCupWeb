import { Gender } from '../../../domain/value_objects/Gender';
import { exigeColorONull, exigeTexto } from './validacion';

/** @typedef {import('../../../domain/repositories/IBarrasRepository').default} IBarrasRepository */

/**
 * Use Case: la barra de un campo para todos los de un género (barras por
 * campo, R2): solo el organizador o un admin. Pisa la general de los de ese
 * género en ese campo, no el cambio propio de nadie; null la quita.
 */
class SetCompetitionCourseTeeUseCase {
  #barrasRepository;

  /** @param {IBarrasRepository} barrasRepository */
  constructor(barrasRepository) {
    if (!barrasRepository)
      throw new Error(
        'SetCompetitionCourseTeeUseCase requires barrasRepository',
      );
    this.#barrasRepository = barrasRepository;
  }

  /**
   * @param {string} competitionId
   * @param {string} golfCourseId
   * @param {string} gender - Uno de `Gender`
   * @param {string|null} teeColor
   */
  async execute(competitionId, golfCourseId, gender, teeColor) {
    exigeTexto(competitionId, 'competitionId');
    exigeTexto(golfCourseId, 'golfCourseId');
    if (
      !(
        /** @type {readonly string[]} */ (Object.values(Gender)).includes(
          gender,
        )
      )
    )
      throw new Error(`gender no válido: ${gender}`);
    exigeColorONull(teeColor);
    return this.#barrasRepository.setCourseTee(
      competitionId,
      golfCourseId,
      gender,
      teeColor,
    );
  }
}

export default SetCompetitionCourseTeeUseCase;
