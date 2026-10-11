/** Borrar las partidas de una franja (FE #824, PR 6). */
class DeleteTeeGroupsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId) {
    if (!roundId) throw new Error('Round ID is required');
    return this.scheduleRepository.deleteTeeGroups(roundId);
  }
}

export default DeleteTeeGroupsUseCase;
