/**
 * «Entendido» a una plaza asignada desde la espera (FE #824).
 */
class AcknowledgeAssignedPlaceUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId) {
    if (!roundId) throw new Error('Round ID is required');
    return this.scheduleRepository.acknowledgeAssignedPlace(roundId);
  }
}

export default AcknowledgeAssignedPlaceUseCase;
