/** El orden de salida de las partidas de una franja (FE #824, PR 6). */
class ReorderTeeGroupsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, groupIds) {
    if (!roundId) throw new Error('Round ID is required');
    if (!groupIds?.length) throw new Error('Group IDs are required');
    return this.scheduleRepository.reorderTeeGroups(roundId, groupIds);
  }
}

export default ReorderTeeGroupsUseCase;
