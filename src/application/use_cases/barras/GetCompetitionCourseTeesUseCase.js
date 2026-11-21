import { exigeTexto } from './validacion';

/** @typedef {import('../../../domain/repositories/IBarrasRepository').default} IBarrasRepository */

/**
 * Use Case: lo fijado en cada campo de una competición para todos los de un
 * género (tabla del 21 nov 2026, A). Solo el organizador o un admin; el
 * backend responde 403 a los demás.
 */
class GetCompetitionCourseTeesUseCase {
  #barrasRepository;

  /** @param {IBarrasRepository} barrasRepository */
  constructor(barrasRepository) {
    if (!barrasRepository)
      throw new Error(
        'GetCompetitionCourseTeesUseCase requires barrasRepository',
      );
    this.#barrasRepository = barrasRepository;
  }

  /** @param {string} competitionId */
  async execute(competitionId) {
    exigeTexto(competitionId, 'competitionId');
    return this.#barrasRepository.getCourseTees(competitionId);
  }
}

export default GetCompetitionCourseTeesUseCase;
