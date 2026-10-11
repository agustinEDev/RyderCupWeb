/**
 * Mover a un jugador de partida (FE #824, PR 6): a una con sitio, a una llena
 * intercambiándolo con otro, o sin `groupId` a una nueva al final. Intercambiar
 * pide saber con qué partida.
 */
class MoveTeeGroupPlayerUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, { userId, groupId, swapWithUserId } = {}) {
    if (!roundId) throw new Error('Round ID is required');
    if (!userId) throw new Error('User ID is required');
    if (swapWithUserId && !groupId) throw new Error('Swapping needs a group');
    return this.scheduleRepository.moveTeeGroupPlayer(roundId, {
      userId,
      ...(groupId ? { groupId } : {}),
      ...(swapWithUserId ? { swapWithUserId } : {}),
    });
  }
}

export default MoveTeeGroupPlayerUseCase;
