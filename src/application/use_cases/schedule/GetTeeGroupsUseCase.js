/** Las partidas de una franja (FE #824, PR 6): cualquiera con sesión. */
class GetTeeGroupsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId) {
    if (!roundId) throw new Error('Round ID is required');
    return this.scheduleRepository.getTeeGroups(roundId);
  }
}

export default GetTeeGroupsUseCase;
