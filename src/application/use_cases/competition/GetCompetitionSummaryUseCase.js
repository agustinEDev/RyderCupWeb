/**
 * Use Case: Get Competition Summary
 *
 * El resumen público de una competición, sin sesión (release social 3): con él
 * la página de la clasificación sabe si es una Ryder o un stroke play, y si es
 * privada, sin la ficha (que pide sesión).
 */
class GetCompetitionSummaryUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} El resumen.
   * @throws {Error} If competitionId is not provided.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    return this.competitionRepository.findSummary(competitionId);
  }
}

export default GetCompetitionSummaryUseCase;
