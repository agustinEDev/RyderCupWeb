/** La clasificación de una franja, de todas las categorías o de una (FE #824, PR 7). */
class GetTeeWindowStandingsUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(roundId, category) {
    if (!roundId) throw new Error('Round ID is required');
    return this.teeGroupScoringRepository.getWindowStandings(roundId, category);
  }
}

export default GetTeeWindowStandingsUseCase;
