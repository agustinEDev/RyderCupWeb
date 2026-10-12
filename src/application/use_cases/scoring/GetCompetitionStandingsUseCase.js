/** La clasificación general de un Stableford o un Medal, de todas o de una categoría (FE #824, PR 8). */
class GetCompetitionStandingsUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(competitionId, category) {
    if (!competitionId) throw new Error('Competition ID is required');
    return this.teeGroupScoringRepository.getCompetitionStandings(competitionId, category);
  }
}

export default GetCompetitionStandingsUseCase;
