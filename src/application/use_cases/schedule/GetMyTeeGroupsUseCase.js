/** Mis partidas en una competición, por jornada (FE #824, PR 6). */
class GetMyTeeGroupsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId) {
    if (!competitionId) throw new Error('Competition ID is required');
    return this.scheduleRepository.getMyTeeGroups(competitionId);
  }
}

export default GetMyTeeGroupsUseCase;
