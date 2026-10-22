import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Get Shared Quick Match (K)
 *
 * La partida rápida terminada de otro, para verla en solo lectura: el mismo
 * DTO que `GetQuickMatchUseCase` más `readOnly` y `viewerIsParticipant`. Los
 * nombres pueden llegar en null; quien la pinta decide cómo leerlos.
 */
class GetSharedQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('GetSharedQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const { quickMatch, readOnly, viewerIsParticipant } =
      await this.#quickMatchRepository.getShared(quickMatchId);
    return {
      ...QuickMatchAssembler.toSimpleDTO(quickMatch),
      readOnly,
      viewerIsParticipant,
    };
  }
}

export default GetSharedQuickMatchUseCase;
