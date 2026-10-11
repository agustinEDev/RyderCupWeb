// Los órdenes que admite el backend (RyderCupAm#534)
const ORDENES = ['HIGH_FIRST', 'LOW_FIRST'];

/**
 * Generar las partidas de una franja por hándicap fijado (FE #824, PR 6):
 * altos o bajos primero. Sustituye las que hubiera.
 */
class GenerateTeeGroupsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, order) {
    if (!roundId) throw new Error('Round ID is required');
    if (!ORDENES.includes(order)) throw new Error(`Invalid order: ${order}`);
    return this.scheduleRepository.generateTeeGroups(roundId, order);
  }
}

export default GenerateTeeGroupsUseCase;
