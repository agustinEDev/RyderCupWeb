/**
 * Cerrar las partidas sin acabar de una franja (FE #824, PR 7): completas,
 * entregadas; a medias, retirados; sin hoyos, no presentados.
 */
class CloseTeeWindowUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(roundId) {
    if (!roundId) throw new Error('Round ID is required');
    return this.teeGroupScoringRepository.closeWindow(roundId);
  }
}

export default CloseTeeWindowUseCase;
