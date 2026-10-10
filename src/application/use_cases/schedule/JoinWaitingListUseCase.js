/**
 * Apuntarse a la espera de una franja llena (FE #824): solo uno mismo.
 */
class JoinWaitingListUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId) {
    if (!roundId) throw new Error('Round ID is required');
    return this.scheduleRepository.joinWaitingList(roundId);
  }
}

export default JoinWaitingListUseCase;
