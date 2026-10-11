/** La clasificación scratch de un Stableford o un Medal (FE #824, PR 8). */
class GetScratchStandingsUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(competitionId) {
    if (!competitionId) throw new Error('Competition ID is required');
    return this.teeGroupScoringRepository.getScratchStandings(competitionId);
  }
}

export default GetScratchStandingsUseCase;
