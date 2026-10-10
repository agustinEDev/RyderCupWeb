/**
 * Soltar la plaza de una franja (FE #824): uno mismo, o el organizador a otro
 * mientras las inscripciones siguen abiertas.
 */
class ReleaseTeeWindowPlaceUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, userId) {
    if (!roundId) throw new Error('Round ID is required');
    if (!userId) throw new Error('User ID is required');
    return this.scheduleRepository.releasePlace(roundId, userId);
  }
}

export default ReleaseTeeWindowPlaceUseCase;
