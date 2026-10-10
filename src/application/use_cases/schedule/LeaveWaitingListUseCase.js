/**
 * Salir de la espera de una franja (FE #824): uno mismo, o el organizador.
 */
class LeaveWaitingListUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, userId) {
    if (!roundId) throw new Error('Round ID is required');
    if (!userId) throw new Error('User ID is required');
    return this.scheduleRepository.leaveWaitingList(roundId, userId);
  }
}

export default LeaveWaitingListUseCase;
