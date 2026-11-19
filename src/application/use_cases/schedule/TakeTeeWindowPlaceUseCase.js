/**
 * Coger plaza en una franja (FE #824): para uno mismo, o el organizador para
 * otro (`userId`). Con `insteadOfRoundId` es cambiarse desde esa en un solo
 * paso: si la nueva falla, no se pierde la vieja.
 */
class TakeTeeWindowPlaceUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  /**
   * @param {string} roundId
   * @param {Object} [opciones]
   * @param {string} [opciones.userId] - Otro jugador (el organizador); sin él, uno mismo
   * @param {string} [opciones.insteadOfRoundId] - La franja que se deja a cambio
   */
  async execute(roundId, { userId, insteadOfRoundId } = {}) {
    if (!roundId) throw new Error('Round ID is required');
    return this.scheduleRepository.takePlace(roundId, {
      ...(userId ? { userId } : {}),
      ...(insteadOfRoundId ? { insteadOfRoundId } : {}),
    });
  }
}

export default TakeTeeWindowPlaceUseCase;
